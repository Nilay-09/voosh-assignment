/**
 * Production Server Configuration
 * Centralized configuration management for the News Chatbot API
 */

import dotenv from 'dotenv';
dotenv.config();

export const SERVER_CONFIG = {
  // Server Settings
  PORT: process.env.SERVER_PORT || 3003,
  NODE_ENV: process.env.NODE_ENV || 'development',
  API_VERSION: process.env.API_VERSION || 'v1',

  // Redis Configuration
  REDIS: {
    CONNECTION_URL: process.env.REDIS_CONNECTION_URL,
    CONNECTION_POOL_SIZE: parseInt(process.env.REDIS_CONNECTION_POOL_SIZE) || 10,
    SESSION_TTL: parseInt(process.env.REDIS_SESSION_TTL) || 86400, // 24 hours
    CACHE_TTL: parseInt(process.env.REDIS_CACHE_TTL) || 1800, // 30 minutes
  },

  // AI Services Configuration
  JINA: {
    API_KEY: process.env.JINA_EMBEDDINGS_API_KEY,
    MODEL: process.env.JINA_EMBEDDINGS_MODEL || 'jina-embeddings-v2-base-en',
    TIMEOUT: parseInt(process.env.JINA_API_TIMEOUT) || 30000,
  },

  GEMINI: {
    API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    MODEL: process.env.GOOGLE_GEMINI_MODEL || 'gemini-1.5-flash',
    TIMEOUT: parseInt(process.env.GEMINI_API_TIMEOUT) || 30000,
  },

  // Vector Database Configuration
  QDRANT: {
    CLUSTER_URL: process.env.QDRANT_CLUSTER_URL,
    API_KEY: process.env.QDRANT_API_KEY,
    COLLECTION_NAME: process.env.QDRANT_COLLECTION_NAME || 'news_articles_prod',
    VECTOR_DIMENSION: parseInt(process.env.QDRANT_VECTOR_DIMENSION) || 768,
  },

  // Security & CORS
  SECURITY: {
    FRONTEND_URL: process.env.FRONTEND_APPLICATION_URL || 'http://localhost:5173',
    CORS_ORIGINS: process.env.CORS_ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
    RATE_LIMIT: {
      WINDOW_MS: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
      MAX_REQUESTS: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100,
    },
  },

  // Logging Configuration
  LOGGING: {
    LEVEL: process.env.LOG_LEVEL || 'info',
    FILE_PATH: process.env.LOG_FILE_PATH || 'logs/application.log',
    ERROR_FILE_PATH: process.env.ERROR_LOG_FILE_PATH || 'logs/error.log',
  },

  // News Ingestion Settings
  NEWS_INGESTION: {
    BATCH_SIZE: parseInt(process.env.NEWS_INGESTION_BATCH_SIZE) || 50,
    CONTENT_MAX_LENGTH: parseInt(process.env.NEWS_CONTENT_MAX_LENGTH) || 5000,
    REFRESH_INTERVAL: parseInt(process.env.NEWS_SOURCES_REFRESH_INTERVAL) || 3600000, // 1 hour
  },
};

// Validation function
export function validateConfiguration() {
  const requiredEnvVars = [
    'REDIS_CONNECTION_URL',
    'JINA_EMBEDDINGS_API_KEY',
    'GOOGLE_GEMINI_API_KEY',
    'QDRANT_CLUSTER_URL',
    'QDRANT_API_KEY',
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  return true;
}
