import axios from 'axios';
import { QdrantClient } from '@qdrant/js-client-rest';
import crypto from 'crypto';

export class RAGService {
  constructor() {
    this.qdrantClient = null;
    this.jinaApiKey = process.env.JINA_API_KEY;
    this.geminiApiKey = process.env.GEMINI_API_KEY;
    this.collectionName = 'news_articles';
    this.embeddingDimension = 768; // Jina embeddings v2-base-en dimension
  }

  async initialize() {
    try {
      // Initialize Qdrant client
      this.qdrantClient = new QdrantClient({
        url: process.env.QDRANT_URL || 'http://localhost:6333',
        apiKey: process.env.QDRANT_API_KEY || undefined,
      });

      // Try to connect and create collection, but don't fail if Qdrant is not available
      try {
        await this.ensureCollection();
        console.log('RAG service initialized successfully with Qdrant');
        this.isQdrantAvailable = true;
      } catch (qdrantError) {
        console.warn('Qdrant not available, RAG service will work in limited mode:', qdrantError.message);
        this.isQdrantAvailable = false;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to initialize RAG service:', error);
      this.isQdrantAvailable = false;
      return true; // Don't fail the entire service
    }
  }

  async healthCheck() {
    try {
      if (!this.qdrantClient || !this.isQdrantAvailable) return false;
      
      // Check Qdrant connection
      const collections = await this.qdrantClient.getCollections();
      
      // Check if our collection exists
      const hasCollection = collections.collections.some(
        col => col.name === this.collectionName
      );
      
      return hasCollection;
    } catch (error) {
      console.error('RAG health check failed:', error);
      return false;
    }
  }

  async ensureCollection() {
    try {
      const collections = await this.qdrantClient.getCollections();
      const collectionExists = collections.collections.some(
        col => col.name === this.collectionName
      );

      if (collectionExists) {
        // Check if collection has correct dimensions
        try {
          const collectionInfo = await this.qdrantClient.getCollection(this.collectionName);
          const currentDimension = collectionInfo.config.params.vectors.size;
          
          if (currentDimension !== this.embeddingDimension) {
            console.log(`Collection has wrong dimensions (${currentDimension}), recreating with ${this.embeddingDimension}...`);
            await this.qdrantClient.deleteCollection(this.collectionName);
            await this.createNewCollection();
          }
        } catch (error) {
          console.log('Error checking collection info, recreating...');
          await this.qdrantClient.deleteCollection(this.collectionName);
          await this.createNewCollection();
        }
      } else {
        await this.createNewCollection();
      }
    } catch (error) {
      console.error('Failed to ensure collection:', error);
      throw error;
    }
  }

  async createNewCollection() {
    await this.qdrantClient.createCollection(this.collectionName, {
      vectors: {
        size: this.embeddingDimension,
        distance: 'Cosine'
      },
      optimizers_config: {
        default_segment_number: 2
      },
      replication_factor: 1
    });
    console.log(`Created collection: ${this.collectionName} with dimension ${this.embeddingDimension}`);
  }

  async generateEmbedding(text) {
    try {
      if (!this.jinaApiKey) {
        throw new Error('Jina API key not configured');
      }

      const response = await axios.post(
        'https://api.jina.ai/v1/embeddings',
        {
          model: 'jina-embeddings-v2-base-en',
          input: [text]
        },
        {
          headers: {
            'Authorization': `Bearer ${this.jinaApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.data && response.data.data[0]) {
        return response.data.data[0].embedding;
      } else {
        throw new Error('Invalid response from Jina API');
      }
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      throw error;
    }
  }

  async storeDocument(document) {
    try {
      const { id, title, content, url, publishedAt, source } = document;
      
      // Generate embedding for the content
      const embedding = await this.generateEmbedding(content);
      
      // Create point for Qdrant
      const point = {
        id: id,
        vector: embedding,
        payload: {
          title,
          content,
          url,
          publishedAt,
          source,
          createdAt: new Date().toISOString()
        }
      };

      await this.qdrantClient.upsert(this.collectionName, {
        wait: true,
        points: [point]
      });

      return true;
    } catch (error) {
      console.error('Failed to store document:', error);
      throw error;
    }
  }

  async storeBatchDocuments(documents) {
    try {
      const batchSize = 10;
      const results = [];

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const points = [];

        // Generate embeddings for batch
        for (const doc of batch) {
          try {
            const embedding = await this.generateEmbedding(doc.content);
            points.push({
              id: doc.id,
              vector: embedding,
              payload: {
                title: doc.title,
                content: doc.content,
                url: doc.url,
                publishedAt: doc.publishedAt,
                source: doc.source,
                createdAt: new Date().toISOString()
              }
            });
          } catch (error) {
            console.error(`Failed to process document ${doc.id}:`, error);
          }
        }

        if (points.length > 0) {
          await this.qdrantClient.upsert(this.collectionName, {
            wait: true,
            points: points
          });
          results.push(...points.map(p => p.id));
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return results;
    } catch (error) {
      console.error('Failed to store batch documents:', error);
      throw error;
    }
  }

  async searchSimilarDocuments(query, limit = 5) {
    try {
      // Check if Qdrant is available
      if (!this.isQdrantAvailable) {
        console.log('Qdrant not available, returning empty results');
        return [];
      }

      // Generate embedding for the query
      const queryEmbedding = await this.generateEmbedding(query);
      
      // Search in Qdrant
      const searchResult = await this.qdrantClient.search(this.collectionName, {
        vector: queryEmbedding,
        limit: limit,
        with_payload: true,
        score_threshold: 0.7 // Only return results with similarity > 0.7
      });

      return searchResult.map(result => ({
        id: result.id,
        score: result.score,
        ...result.payload
      }));
    } catch (error) {
      console.error('Failed to search similar documents:', error);
      // Return empty array instead of throwing error
      return [];
    }
  }

  async generateResponse(query, context, chatHistory = []) {
    try {
      if (!this.geminiApiKey) {
        throw new Error('Gemini API key not configured');
      }

      // Prepare context from retrieved documents
      const contextText = context.length > 0 
        ? context.map(doc => 
            `Title: ${doc.title}\nContent: ${doc.content}\nSource: ${doc.source}\nPublished: ${doc.publishedAt}\n---`
          ).join('\n')
        : 'No news articles available in the database.';

      // Prepare chat history for context
      const historyText = chatHistory.slice(-5).map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');

      const prompt = context.length > 0 
        ? `You are a helpful news assistant that provides accurate, informative responses based on the latest news articles. Use the provided context to answer the user's question.

Context from recent news articles:
${contextText}

Previous conversation:
${historyText}

User question: ${query}

Instructions:
1. Provide a comprehensive answer based on the news context provided
2. If the context doesn't contain relevant information, say so clearly
3. Always cite your sources when referencing specific information
4. Be objective and factual
5. If asked about recent events, focus on the most current information available
6. Keep responses conversational but informative

Response:`
        : `You are a helpful assistant. The news database is currently empty, so you cannot provide news-specific information. Please respond helpfully to the user's question while explaining that news data is not yet available.

Previous conversation:
${historyText}

User question: ${query}

Instructions:
1. Be helpful and conversational
2. Explain that the news database is currently empty
3. Suggest that an administrator needs to run news ingestion
4. Offer to help with general questions
5. Keep responses friendly and informative

Response:`;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`,
        {
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (response.data && response.data.candidates && response.data.candidates[0]) {
        const generatedText = response.data.candidates[0].content.parts[0].text;
        return {
          response: generatedText,
          sources: context.map(doc => ({
            title: doc.title,
            url: doc.url,
            source: doc.source,
            publishedAt: doc.publishedAt
          }))
        };
      } else {
        throw new Error('Invalid response from Gemini API');
      }
    } catch (error) {
      console.error('Failed to generate response:', error);
      throw error;
    }
  }

  async processQuery(query, chatHistory = []) {
    try {
      // Generate query hash for caching
      const queryHash = crypto.createHash('md5')
        .update(query + JSON.stringify(chatHistory.slice(-3)))
        .digest('hex');

      // If Qdrant is not available, return a fallback response
      if (!this.isQdrantAvailable) {
        return {
          response: "I'm currently unable to access the news database. The RAG service is running in limited mode. Please ensure Qdrant is properly configured and try again later.",
          sources: [],
          queryHash,
          relevantDocsCount: 0
        };
      }

      // Search for relevant documents
      const relevantDocs = await this.searchSimilarDocuments(query, 5);
      
      if (relevantDocs.length === 0) {
        // Generate a helpful response even without news data
        const fallbackResponse = await this.generateResponse(query, [], chatHistory);
        return {
          response: fallbackResponse.response || "I don't have any news articles in my database yet. To get started, an administrator needs to run the news ingestion process. In the meantime, I can help answer general questions!",
          sources: [],
          queryHash,
          relevantDocsCount: 0
        };
      }

      // Generate response using LLM
      const result = await this.generateResponse(query, relevantDocs, chatHistory);
      
      return {
        ...result,
        queryHash,
        relevantDocsCount: relevantDocs.length
      };
    } catch (error) {
      console.error('Failed to process query:', error);
      throw error;
    }
  }

  async getCollectionStats() {
    try {
      const info = await this.qdrantClient.getCollection(this.collectionName);
      return {
        pointsCount: info.points_count,
        status: info.status,
        vectorsCount: info.vectors_count,
        indexedVectorsCount: info.indexed_vectors_count
      };
    } catch (error) {
      console.error('Failed to get collection stats:', error);
      return null;
    }
  }

  async deleteDocument(documentId) {
    try {
      await this.qdrantClient.delete(this.collectionName, {
        wait: true,
        points: [documentId]
      });
      return true;
    } catch (error) {
      console.error('Failed to delete document:', error);
      return false;
    }
  }

  async clearCollection() {
    try {
      await this.qdrantClient.delete(this.collectionName, {
        wait: true,
        filter: {} // Delete all points
      });
      return true;
    } catch (error) {
      console.error('Failed to clear collection:', error);
      return false;
    }
  }
}
