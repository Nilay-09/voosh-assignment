import express from 'express';
import { chatRoutes } from './chat.js';
import { adminRoutes } from './admin.js';
import { testRoutes } from './test.js';

export function setupRoutes(app) {
  // API routes
  app.use('/api/chat', chatRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/test', testRoutes);
  
  // Root endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'RAG News Chatbot API',
      version: '1.0.0',
      endpoints: {
        chat: '/api/chat',
        admin: '/api/admin',
        test: '/api/test',
        health: '/api/health'
      }
    });
  });
}
