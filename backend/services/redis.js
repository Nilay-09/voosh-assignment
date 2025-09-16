import { createClient } from 'redis';

export class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  async connect() {
    try {
      this.client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        password: process.env.REDIS_PASSWORD || undefined,
        socket: {
          reconnectStrategy: (retries) => Math.min(retries * 50, 500)
        }
      });

      this.client.on('error', (err) => {
        console.error('Redis Client Error:', err);
        this.isConnected = false;
      });

      this.client.on('connect', () => {
        console.log('Redis Client Connected');
        this.isConnected = true;
      });

      this.client.on('disconnect', () => {
        console.log('Redis Client Disconnected');
        this.isConnected = false;
      });

      await this.client.connect();
      return true;
    } catch (error) {
      console.error('Failed to connect to Redis:', error);
      throw error;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
    }
  }

  async ping() {
    try {
      if (!this.isConnected || !this.client) return false;
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis ping failed:', error);
      return false;
    }
  }

  // Session management
  async createSession(sessionId, data = {}) {
    try {
      const sessionData = {
        id: sessionId,
        createdAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        ...data
      };
      
      await this.client.setEx(
        `session:${sessionId}`, 
        24 * 60 * 60, // 24 hours TTL
        JSON.stringify(sessionData)
      );
      
      return sessionData;
    } catch (error) {
      console.error('Failed to create session:', error);
      throw error;
    }
  }

  async getSession(sessionId) {
    try {
      const data = await this.client.get(`session:${sessionId}`);
      if (!data) return null;
      
      const sessionData = JSON.parse(data);
      
      // Update last activity
      sessionData.lastActivity = new Date().toISOString();
      await this.client.setEx(
        `session:${sessionId}`, 
        24 * 60 * 60,
        JSON.stringify(sessionData)
      );
      
      return sessionData;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  async deleteSession(sessionId) {
    try {
      await this.client.del(`session:${sessionId}`);
      await this.client.del(`chat_history:${sessionId}`);
      return true;
    } catch (error) {
      console.error('Failed to delete session:', error);
      return false;
    }
  }

  // Chat history management
  async addChatMessage(sessionId, message) {
    try {
      const chatMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString(),
        ...message
      };

      await this.client.lPush(
        `chat_history:${sessionId}`, 
        JSON.stringify(chatMessage)
      );
      
      // Keep only last 100 messages
      await this.client.lTrim(`chat_history:${sessionId}`, 0, 99);
      
      // Set TTL for chat history
      await this.client.expire(`chat_history:${sessionId}`, 24 * 60 * 60);
      
      return chatMessage;
    } catch (error) {
      console.error('Failed to add chat message:', error);
      throw error;
    }
  }

  async getChatHistory(sessionId, limit = 50) {
    try {
      const messages = await this.client.lRange(`chat_history:${sessionId}`, 0, limit - 1);
      return messages.map(msg => JSON.parse(msg)).reverse(); // Reverse to get chronological order
    } catch (error) {
      console.error('Failed to get chat history:', error);
      return [];
    }
  }

  // Query caching
  async cacheQueryResult(queryHash, result, ttl = 30 * 60) { // 30 minutes default TTL
    try {
      await this.client.setEx(
        `query_cache:${queryHash}`, 
        ttl,
        JSON.stringify(result)
      );
      return true;
    } catch (error) {
      console.error('Failed to cache query result:', error);
      return false;
    }
  }

  async getCachedQueryResult(queryHash) {
    try {
      const data = await this.client.get(`query_cache:${queryHash}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get cached query result:', error);
      return null;
    }
  }

  // Generic key-value operations
  async set(key, value, ttl = null) {
    try {
      if (ttl) {
        await this.client.setEx(key, ttl, JSON.stringify(value));
      } else {
        await this.client.set(key, JSON.stringify(value));
      }
      return true;
    } catch (error) {
      console.error('Failed to set key:', error);
      return false;
    }
  }

  async get(key) {
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Failed to get key:', error);
      return null;
    }
  }

  async del(key) {
    try {
      await this.client.del(key);
      return true;
    } catch (error) {
      console.error('Failed to delete key:', error);
      return false;
    }
  }

  // Analytics and monitoring
  async incrementCounter(key, ttl = 24 * 60 * 60) {
    try {
      const result = await this.client.incr(key);
      if (result === 1) {
        await this.client.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error('Failed to increment counter:', error);
      return 0;
    }
  }

  async getStats() {
    try {
      const info = await this.client.info('memory');
      const keyspace = await this.client.info('keyspace');
      
      return {
        connected: this.isConnected,
        memory: info,
        keyspace: keyspace
      };
    } catch (error) {
      console.error('Failed to get Redis stats:', error);
      return { connected: false };
    }
  }
}
