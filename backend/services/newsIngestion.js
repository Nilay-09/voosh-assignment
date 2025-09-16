import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import crypto from 'crypto';

export class NewsIngestionService {
  constructor(ragService) {
    this.ragService = ragService;
    this.rssParser = new Parser({
      customFields: {
        item: ['media:content', 'media:thumbnail']
      }
    });
    
    // High-authority news sources (DA 30+)
    this.rssSources = [
      {
        name: 'BBC News',
        url: 'http://feeds.bbci.co.uk/news/rss.xml',
        category: 'world'
      },
      {
        name: 'CNN Top Stories',
        url: 'http://rss.cnn.com/rss/edition.rss',
        category: 'world'
      },
      {
        name: 'Reuters World',
        url: 'https://feeds.reuters.com/reuters/worldNews',
        category: 'world'
      },
      {
        name: 'Associated Press',
        url: 'https://feeds.apnews.com/rss/apf-topnews',
        category: 'world'
      },
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'technology'
      },
      {
        name: 'Ars Technica',
        url: 'http://feeds.arstechnica.com/arstechnica/index',
        category: 'technology'
      },
      {
        name: 'The Verge',
        url: 'https://www.theverge.com/rss/index.xml',
        category: 'technology'
      },
      {
        name: 'Wired',
        url: 'https://www.wired.com/feed/rss',
        category: 'technology'
      }
    ];
  }

  async ingestAllSources() {
    try {
      console.log('Starting news ingestion from all sources...');
      const allArticles = [];
      
      for (const source of this.rssSources) {
        try {
          console.log(`Ingesting from ${source.name}...`);
          const articles = await this.ingestFromRSS(source);
          allArticles.push(...articles);
          
          // Small delay between sources to be respectful
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to ingest from ${source.name}:`, error.message);
        }
      }

      console.log(`Total articles collected: ${allArticles.length}`);
      
      if (allArticles.length > 0) {
        // Store articles in batches
        const storedIds = await this.ragService.storeBatchDocuments(allArticles);
        console.log(`Successfully stored ${storedIds.length} articles`);
        
        return {
          totalCollected: allArticles.length,
          totalStored: storedIds.length,
          sources: this.rssSources.map(s => s.name)
        };
      }
      
      return {
        totalCollected: 0,
        totalStored: 0,
        sources: []
      };
    } catch (error) {
      console.error('Failed to ingest news:', error);
      throw error;
    }
  }

  async ingestFromRSS(source) {
    try {
      const feed = await this.rssParser.parseURL(source.url);
      const articles = [];
      
      // Process up to 20 items per source
      const items = feed.items.slice(0, 20);
      
      for (const item of items) {
        try {
          const article = await this.processRSSItem(item, source);
          if (article) {
            articles.push(article);
          }
        } catch (error) {
          console.error(`Failed to process item from ${source.name}:`, error.message);
        }
      }
      
      return articles;
    } catch (error) {
      console.error(`Failed to parse RSS from ${source.name}:`, error);
      return [];
    }
  }

  async processRSSItem(item, source) {
    try {
      // Generate unique ID for the article
      const articleId = crypto.createHash('md5')
        .update(item.link || item.guid || item.title)
        .digest('hex');

      // Extract and clean content
      let content = item.contentSnippet || item.content || item.description || '';
      
      // If content is too short, try to fetch full article
      if (content.length < 200 && item.link) {
        try {
          const fullContent = await this.scrapeFullArticle(item.link);
          if (fullContent && fullContent.length > content.length) {
            content = fullContent;
          }
        } catch (error) {
          console.log(`Could not scrape full content for ${item.title}`);
        }
      }

      // Clean and validate content
      content = this.cleanText(content);
      
      if (content.length < 100) {
        console.log(`Skipping article with insufficient content: ${item.title}`);
        return null;
      }

      return {
        id: articleId,
        title: this.cleanText(item.title || 'Untitled'),
        content: content,
        url: item.link || '',
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
        source: source.name,
        category: source.category,
        author: item.creator || item['dc:creator'] || 'Unknown'
      };
    } catch (error) {
      console.error('Failed to process RSS item:', error);
      return null;
    }
  }

  async scrapeFullArticle(url) {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share').remove();
      
      // Try different selectors for article content
      const contentSelectors = [
        'article',
        '.article-body',
        '.story-body',
        '.post-content',
        '.entry-content',
        '.content',
        'main',
        '[data-module="ArticleBody"]',
        '.StandardArticleBody_body'
      ];
      
      let content = '';
      
      for (const selector of contentSelectors) {
        const element = $(selector);
        if (element.length > 0) {
          content = element.text().trim();
          if (content.length > 200) {
            break;
          }
        }
      }
      
      // If no content found with selectors, try to get all paragraph text
      if (content.length < 200) {
        content = $('p').map((i, el) => $(el).text().trim()).get().join(' ');
      }
      
      return content.length > 200 ? content : null;
    } catch (error) {
      console.error('Failed to scrape article:', error);
      return null;
    }
  }

  cleanText(text) {
    if (!text) return '';
    
    return text
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove extra whitespace
      .replace(/\s+/g, ' ')
      // Remove special characters but keep basic punctuation
      .replace(/[^\w\s.,!?;:()\-"']/g, '')
      // Trim
      .trim();
  }

  async getIngestionStats() {
    try {
      const stats = await this.ragService.getCollectionStats();
      return {
        totalArticles: stats?.pointsCount || 0,
        lastIngestion: new Date().toISOString(),
        sources: this.rssSources.length,
        status: stats?.status || 'unknown'
      };
    } catch (error) {
      console.error('Failed to get ingestion stats:', error);
      return {
        totalArticles: 0,
        lastIngestion: null,
        sources: this.rssSources.length,
        status: 'error'
      };
    }
  }

  async ingestSingleSource(sourceName) {
    try {
      const source = this.rssSources.find(s => s.name === sourceName);
      if (!source) {
        throw new Error(`Source not found: ${sourceName}`);
      }
      
      const articles = await this.ingestFromRSS(source);
      
      if (articles.length > 0) {
        const storedIds = await this.ragService.storeBatchDocuments(articles);
        return {
          source: sourceName,
          collected: articles.length,
          stored: storedIds.length
        };
      }
      
      return {
        source: sourceName,
        collected: 0,
        stored: 0
      };
    } catch (error) {
      console.error(`Failed to ingest from ${sourceName}:`, error);
      throw error;
    }
  }

  async clearAllArticles() {
    try {
      await this.ragService.clearCollection();
      return true;
    } catch (error) {
      console.error('Failed to clear articles:', error);
      return false;
    }
  }

  getAvailableSources() {
    return this.rssSources.map(source => ({
      name: source.name,
      category: source.category,
      url: source.url
    }));
  }

  async testSingleArticle(url) {
    try {
      const content = await this.scrapeFullArticle(url);
      return {
        url,
        contentLength: content?.length || 0,
        content: content?.substring(0, 500) + '...' || 'No content extracted'
      };
    } catch (error) {
      return {
        url,
        error: error.message,
        contentLength: 0
      };
    }
  }
}
