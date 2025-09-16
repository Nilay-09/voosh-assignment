import express from 'express';
import chatRoutes from './chat.js';
import adminRoutes from './admin.js';
import testRoutes from './test.js';

const router = express.Router();

// API routes
router.use('/chat', chatRoutes);
router.use('/admin', adminRoutes);
router.use('/test', testRoutes);

// Root endpoint
router.get('/', (req, res) => {
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

export default router;
