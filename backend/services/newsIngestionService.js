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
    
    // Comprehensive high-authority news sources (DA 30+)
    this.rssSources = [
      // World News & Politics
      {
        name: 'BBC News',
        url: 'http://feeds.bbci.co.uk/news/rss.xml',
        category: 'world',
        region: 'UK'
      },
      {
        name: 'CNN Top Stories',
        url: 'http://rss.cnn.com/rss/edition.rss',
        category: 'world',
        region: 'US'
      },
      {
        name: 'Reuters World',
        url: 'https://feeds.reuters.com/reuters/worldNews',
        category: 'world',
        region: 'Global'
      },
      {
        name: 'Associated Press',
        url: 'https://feeds.apnews.com/rss/apf-topnews',
        category: 'world',
        region: 'US'
      },
      {
        name: 'The Guardian',
        url: 'https://www.theguardian.com/world/rss',
        category: 'world',
        region: 'UK'
      },
      {
        name: 'NPR News',
        url: 'https://feeds.npr.org/1001/rss.xml',
        category: 'world',
        region: 'US'
      },
      {
        name: 'Al Jazeera',
        url: 'https://www.aljazeera.com/xml/rss/all.xml',
        category: 'world',
        region: 'Qatar'
      },
      {
        name: 'Deutsche Welle',
        url: 'https://rss.dw.com/xml/rss-en-all',
        category: 'world',
        region: 'Germany'
      },
      {
        name: 'France24',
        url: 'https://www.france24.com/en/rss',
        category: 'world',
        region: 'France'
      },
      
      // Technology
      {
        name: 'TechCrunch',
        url: 'https://techcrunch.com/feed/',
        category: 'technology',
        region: 'US'
      },
      {
        name: 'Ars Technica',
        url: 'http://feeds.arstechnica.com/arstechnica/index',
        category: 'technology',
        region: 'US'
      },
      {
        name: 'The Verge',
        url: 'https://www.theverge.com/rss/index.xml',
        category: 'technology',
        region: 'US'
      },
      {
        name: 'Wired',
        url: 'https://www.wired.com/feed/rss',
        category: 'technology',
        region: 'US'
      },
      {
        name: 'Engadget',
        url: 'https://www.engadget.com/rss.xml',
        category: 'technology',
        region: 'US'
      },
      {
        name: 'MIT Technology Review',
        url: 'https://www.technologyreview.com/feed/',
        category: 'technology',
        region: 'US'
      },
      {
        name: 'IEEE Spectrum',
        url: 'https://spectrum.ieee.org/rss/fulltext',
        category: 'technology',
        region: 'US'
      },
      
      // Business & Finance
      {
        name: 'Wall Street Journal',
        url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',
        category: 'business',
        region: 'US'
      },
      {
        name: 'Financial Times',
        url: 'https://www.ft.com/rss/home',
        category: 'business',
        region: 'UK'
      },
      {
        name: 'Bloomberg',
        url: 'https://feeds.bloomberg.com/markets/news.rss',
        category: 'business',
        region: 'US'
      },
      {
        name: 'Forbes',
        url: 'https://www.forbes.com/real-time/feed2/',
        category: 'business',
        region: 'US'
      },
      {
        name: 'CNBC',
        url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',
        category: 'business',
        region: 'US'
      },
      
      // Science & Health
      {
        name: 'Nature News',
        url: 'https://www.nature.com/nature.rss',
        category: 'science',
        region: 'Global'
      },
      {
        name: 'Science Magazine',
        url: 'https://www.science.org/rss/news_current.xml',
        category: 'science',
        region: 'US'
      },
      {
        name: 'Scientific American',
        url: 'https://rss.sciam.com/ScientificAmerican-Global',
        category: 'science',
        region: 'US'
      },
      {
        name: 'New Scientist',
        url: 'https://www.newscientist.com/feed/home/',
        category: 'science',
        region: 'UK'
      },
      {
        name: 'WebMD Health News',
        url: 'https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC',
        category: 'health',
        region: 'US'
      },
      
      // Sports
      {
        name: 'ESPN',
        url: 'https://www.espn.com/espn/rss/news',
        category: 'sports',
        region: 'US'
      },
      {
        name: 'BBC Sport',
        url: 'http://feeds.bbci.co.uk/sport/rss.xml',
        category: 'sports',
        region: 'UK'
      },
      {
        name: 'Sky Sports',
        url: 'https://www.skysports.com/rss/12040',
        category: 'sports',
        region: 'UK'
      },
      
      // Entertainment & Culture
      {
        name: 'Entertainment Weekly',
        url: 'https://ew.com/feed/',
        category: 'entertainment',
        region: 'US'
      },
      {
        name: 'Variety',
        url: 'https://variety.com/feed/',
        category: 'entertainment',
        region: 'US'
      },
      {
        name: 'The Hollywood Reporter',
        url: 'https://www.hollywoodreporter.com/feed/',
        category: 'entertainment',
        region: 'US'
      },
      
      // Indian News Sources
      {
        name: 'Times of India',
        url: 'https://timesofindia.indiatimes.com/rssfeedstopstories.cms',
        category: 'world',
        region: 'India'
      },
      {
        name: 'Hindustan Times',
        url: 'https://www.hindustantimes.com/feeds/rss/news/rssfeed.xml',
        category: 'world',
        region: 'India'
      },
      {
        name: 'The Hindu',
        url: 'https://www.thehindu.com/feeder/default.rss',
        category: 'world',
        region: 'India'
      },
      {
        name: 'Indian Express',
        url: 'https://indianexpress.com/feed/',
        category: 'world',
        region: 'India'
      },
      {
        name: 'NDTV News',
        url: 'https://feeds.feedburner.com/ndtvnews-top-stories',
        category: 'world',
        region: 'India'
      },
      {
        name: 'India Today',
        url: 'https://www.indiatoday.in/rss/1206514',
        category: 'world',
        region: 'India'
      },
      {
        name: 'News18 India',
        url: 'https://www.news18.com/rss/india.xml',
        category: 'world',
        region: 'India'
      },
      {
        name: 'Zee News',
        url: 'https://zeenews.india.com/rss/india-national-news.xml',
        category: 'world',
        region: 'India'
      },
      {
        name: 'The Wire',
        url: 'https://thewire.in/feed',
        category: 'world',
        region: 'India'
      },
      {
        name: 'Scroll.in',
        url: 'https://scroll.in/feed',
        category: 'world',
        region: 'India'
      },
      
      // Indian Business & Technology
      {
        name: 'Economic Times',
        url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms',
        category: 'business',
        region: 'India'
      },
      {
        name: 'Business Standard',
        url: 'https://www.business-standard.com/rss/home_page_top_stories.rss',
        category: 'business',
        region: 'India'
      },
      {
        name: 'Mint',
        url: 'https://www.livemint.com/rss/news',
        category: 'business',
        region: 'India'
      },
      {
        name: 'MoneyControl',
        url: 'https://www.moneycontrol.com/rss/news.xml',
        category: 'business',
        region: 'India'
      },
      {
        name: 'YourStory',
        url: 'https://yourstory.com/feed',
        category: 'technology',
        region: 'India'
      },
      {
        name: 'Inc42',
        url: 'https://inc42.com/feed/',
        category: 'technology',
        region: 'India'
      },
      {
        name: 'MediaNama',
        url: 'https://www.medianama.com/feed/',
        category: 'technology',
        region: 'India'
      },
      {
        name: 'The Ken',
        url: 'https://the-ken.com/feed/',
        category: 'technology',
        region: 'India'
      },
      
      // Indian Sports & Entertainment
      {
        name: 'Cricbuzz',
        url: 'https://www.cricbuzz.com/rss-feed/news',
        category: 'sports',
        region: 'India'
      },
      {
        name: 'Sportskeeda',
        url: 'https://www.sportskeeda.com/rss/news',
        category: 'sports',
        region: 'India'
      },
      {
        name: 'Bollywood Hungama',
        url: 'https://www.bollywoodhungama.com/rss/news.xml',
        category: 'entertainment',
        region: 'India'
      },
      {
        name: 'Pinkvilla',
        url: 'https://www.pinkvilla.com/rss.xml',
        category: 'entertainment',
        region: 'India'
      },
      
      // Regional Indian Sources
      {
        name: 'Deccan Herald',
        url: 'https://www.deccanherald.com/rss-feed',
        category: 'world',
        region: 'India'
      },
      {
        name: 'The New Indian Express',
        url: 'https://www.newindianexpress.com/nation.rss',
        category: 'world',
        region: 'India'
      },
      {
        name: 'Outlook India',
        url: 'https://www.outlookindia.com/rss/main/magazine',
        category: 'world',
        region: 'India'
      },
      {
        name: 'Firstpost',
        url: 'https://www.firstpost.com/rss/india.xml',
        category: 'world',
        region: 'India'
      },
      {
        name: 'The Quint',
        url: 'https://www.thequint.com/feed',
        category: 'world',
        region: 'India'
      },
      
      // Other International
      {
        name: 'South China Morning Post',
        url: 'https://www.scmp.com/rss/91/feed',
        category: 'world',
        region: 'Hong Kong'
      },
      {
        name: 'Japan Times',
        url: 'https://www.japantimes.co.jp/feed/',
        category: 'world',
        region: 'Japan'
      },
      {
        name: 'Australian Broadcasting Corporation',
        url: 'https://www.abc.net.au/news/feed/51120/rss.xml',
        category: 'world',
        region: 'Australia'
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
      
      // Process up to 15 items per source to handle more sources efficiently
      const items = feed.items.slice(0, 15);
      
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

      // Limit content length to prevent token limit issues (approx 6000 chars = ~1500 tokens)
      if (content.length > 6000) {
        content = content.substring(0, 6000) + '...';
      }

      return {
        id: articleId,
        title: this.cleanText(item.title || 'Untitled'),
        content: content,
        url: item.link || '',
        publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
        source: source.name,
        category: source.category,
        region: source.region || 'Unknown',
        author: item.creator || item['dc:creator'] || 'Unknown',
        tags: this.extractTags(item),
        summary: this.generateSummary(content),
        wordCount: content.split(' ').length,
        language: this.detectLanguage(content),
        mediaUrl: item['media:content'] || item['media:thumbnail'] || null
      };
    } catch (error) {
      console.error('Failed to process RSS item:', error);
      return null;
    }
  }

  async scrapeFullArticle(url) {
    try {
      const response = await axios.get(url, {
        timeout: 15000,
        maxRedirects: 5,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Remove unwanted elements
      $('script, style, nav, header, footer, aside, .advertisement, .ads, .social-share, .comments, .related-articles').remove();
      
      // Enhanced content selectors for better extraction
      const contentSelectors = [
        'article p',
        '.article-body p',
        '.story-body p',
        '.post-content p',
        '.entry-content p',
        '.content p',
        'main p',
        '[data-module="ArticleBody"] p',
        '.StandardArticleBody_body p',
        '.article-content p',
        '.story-content p',
        '.news-content p',
        '.body-content p'
      ];
      
      let content = '';
      
      // Try paragraph-based extraction first
      for (const selector of contentSelectors) {
        const paragraphs = $(selector);
        if (paragraphs.length > 0) {
          content = paragraphs.map((i, el) => $(el).text().trim()).get()
            .filter(text => text.length > 20)
            .join(' ');
          if (content.length > 300) {
            break;
          }
        }
      }
      
      // Fallback to broader selectors
      if (content.length < 300) {
        const fallbackSelectors = [
          'article',
          '.article-body',
          '.story-body',
          '.post-content',
          '.entry-content',
          '.content',
          'main'
        ];
        
        for (const selector of fallbackSelectors) {
          const element = $(selector);
          if (element.length > 0) {
            content = element.text().trim();
            if (content.length > 300) {
              break;
            }
          }
        }
      }
      
      // Final fallback - all paragraphs
      if (content.length < 300) {
        content = $('p').map((i, el) => $(el).text().trim()).get()
          .filter(text => text.length > 20)
          .join(' ');
      }
      
      // Clean and limit content
      content = this.cleanText(content);
      
      // Limit to prevent token issues (max 5000 chars)
      if (content.length > 5000) {
        content = content.substring(0, 5000) + '...';
      }
      
      return content.length > 200 ? content : null;
    } catch (error) {
      // Only log non-404 errors to reduce noise
      if (error.response?.status !== 404) {
        console.error(`Failed to scrape article (${error.response?.status || error.code}):`, url);
      }
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

  extractTags(item) {
    const tags = [];
    
    // Extract from categories
    if (item.categories && Array.isArray(item.categories)) {
      tags.push(...item.categories);
    }
    
    // Extract from title and content keywords
    const text = `${item.title || ''} ${item.contentSnippet || ''}`.toLowerCase();
    const keywords = [
      'breaking', 'urgent', 'exclusive', 'analysis', 'opinion', 'interview',
      'covid', 'climate', 'election', 'economy', 'technology', 'ai', 'crypto',
      'sports', 'health', 'science', 'politics', 'business', 'entertainment'
    ];
    
    keywords.forEach(keyword => {
      if (text.includes(keyword)) {
        tags.push(keyword);
      }
    });
    
    return [...new Set(tags)]; // Remove duplicates
  }

  generateSummary(content) {
    if (!content || content.length < 200) return content;
    
    // Extract first 2-3 sentences as summary
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    return sentences.slice(0, 3).join('. ') + '.';
  }

  detectLanguage(content) {
    if (!content) return 'unknown';
    
    // Simple language detection based on common words
    const englishWords = ['the', 'and', 'is', 'in', 'to', 'of', 'a', 'that', 'it', 'with'];
    const words = content.toLowerCase().split(' ').slice(0, 50);
    
    let englishCount = 0;
    words.forEach(word => {
      if (englishWords.includes(word)) englishCount++;
    });
    
    return englishCount > words.length * 0.1 ? 'en' : 'unknown';
  }

  async ingestWithDeduplication() {
    try {
      console.log('Starting enhanced news ingestion with deduplication...');
      const allArticles = [];
      const seenUrls = new Set();
      const seenTitles = new Set();
      
      for (const source of this.rssSources) {
        try {
          console.log(`Ingesting from ${source.name} (${source.region})...`);
          const articles = await this.ingestFromRSS(source);
          
          // Deduplicate articles
          const uniqueArticles = articles.filter(article => {
            const titleKey = article.title.toLowerCase().replace(/[^\w\s]/g, '');
            const urlKey = article.url;
            
            if (seenUrls.has(urlKey) || seenTitles.has(titleKey)) {
              return false;
            }
            
            seenUrls.add(urlKey);
            seenTitles.add(titleKey);
            return true;
          });
          
          allArticles.push(...uniqueArticles);
          console.log(`  - Collected ${uniqueArticles.length} unique articles from ${source.name}`);
          
          // Respectful delay between sources
          await new Promise(resolve => setTimeout(resolve, 1500));
        } catch (error) {
          console.error(`Failed to ingest from ${source.name}:`, error.message);
        }
      }

      console.log(`Total unique articles collected: ${allArticles.length}`);
      
      if (allArticles.length > 0) {
        // Store articles in batches
        const storedIds = await this.ragService.storeBatchDocuments(allArticles);
        console.log(`Successfully stored ${storedIds.length} articles`);
        
        return {
          totalCollected: allArticles.length,
          totalStored: storedIds.length,
          sources: this.rssSources.length,
          categories: [...new Set(allArticles.map(a => a.category))],
          regions: [...new Set(allArticles.map(a => a.region))]
        };
      }
      
      return {
        totalCollected: 0,
        totalStored: 0,
        sources: this.rssSources.length,
        categories: [],
        regions: []
      };
    } catch (error) {
      console.error('Failed to ingest news with deduplication:', error);
      throw error;
    }
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
