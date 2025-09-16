import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

const router = express.Router();

// POST /api/chat/message - Send chat message
router.post('/message', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const { redisService, ragService, logger } = req.app.locals;

    if (!message || !sessionId) {
      return res.status(400).json({
        error: 'Message and sessionId are required'
      });
    }

    // Get or create session
    let session = await redisService.getSession(sessionId);
    if (!session) {
      session = await redisService.createSession(sessionId);
    }

    // Get chat history for context
    const chatHistory = await redisService.getChatHistory(sessionId, 10);

    // Add user message to history
    const userMessage = await redisService.addChatMessage(sessionId, {
      role: 'user',
      content: message
    });

    // Generate query hash for caching
    const queryHash = crypto.createHash('md5')
      .update(message + JSON.stringify(chatHistory.slice(-3)))
      .digest('hex');

    // Check cache first
    let cachedResult = await redisService.getCachedQueryResult(queryHash);
    
    let response;
    if (cachedResult) {
      logger.info('Using cached response', { sessionId, queryHash });
      response = cachedResult;
    } else {
      // Process query with RAG
      logger.info('Processing new query', { sessionId, message: message.substring(0, 100) });
      response = await ragService.processQuery(message, chatHistory);
      
      // Cache the result
      await redisService.cacheQueryResult(queryHash, response, 30 * 60); // 30 minutes
    }

    // Add assistant response to history
    const assistantMessage = await redisService.addChatMessage(sessionId, {
      role: 'assistant',
      content: response.response,
      sources: response.sources
    });

    // Update session activity
    await redisService.getSession(sessionId); // This updates lastActivity

    res.json({
      success: true,
      userMessage,
      assistantMessage,
      sources: response.sources,
      cached: !!cachedResult
    });

  } catch (error) {
    req.app.locals.logger.error('Chat message error:', error);
    res.status(500).json({
      error: 'Failed to process message',
      message: error.message
    });
  }
});

// GET /api/chat/history/:sessionId - Get chat history
router.get('/history/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { limit = 50 } = req.query;
    const { redisService, logger } = req.app.locals;

    if (!sessionId) {
      return res.status(400).json({
        error: 'SessionId is required'
      });
    }

    const history = await redisService.getChatHistory(sessionId, parseInt(limit));
    const session = await redisService.getSession(sessionId);

    res.json({
      success: true,
      sessionId,
      history,
      session: session ? {
        id: session.id,
        createdAt: session.createdAt,
        lastActivity: session.lastActivity
      } : null
    });

  } catch (error) {
    req.app.locals.logger.error('Get chat history error:', error);
    res.status(500).json({
      error: 'Failed to get chat history',
      message: error.message
    });
  }
});

// DELETE /api/chat/session/:sessionId - Clear session
router.delete('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { redisService, logger } = req.app.locals;

    if (!sessionId) {
      return res.status(400).json({
        error: 'SessionId is required'
      });
    }

    const deleted = await redisService.deleteSession(sessionId);

    if (deleted) {
      logger.info('Session deleted', { sessionId });
      res.json({
        success: true,
        message: 'Session cleared successfully'
      });
    } else {
      res.status(404).json({
        error: 'Session not found'
      });
    }

  } catch (error) {
    req.app.locals.logger.error('Delete session error:', error);
    res.status(500).json({
      error: 'Failed to delete session',
      message: error.message
    });
  }
});

// POST /api/chat/session - Create new session
router.post('/session', async (req, res) => {
  try {
    const { redisService, logger } = req.app.locals;
    const sessionId = uuidv4();

    const session = await redisService.createSession(sessionId, {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });

    logger.info('New session created', { sessionId });

    res.json({
      success: true,
      session
    });

  } catch (error) {
    req.app.locals.logger.error('Create session error:', error);
    res.status(500).json({
      error: 'Failed to create session',
      message: error.message
    });
  }
});

// GET /api/chat/sessions - Get active sessions (for debugging)
router.get('/sessions', async (req, res) => {
  try {
    const { redisService } = req.app.locals;
    
    // This is a simple implementation - in production you'd want pagination
    const stats = await redisService.getStats();
    
    res.json({
      success: true,
      stats
    });

  } catch (error) {
    req.app.locals.logger.error('Get sessions error:', error);
    res.status(500).json({
      error: 'Failed to get sessions',
      message: error.message
    });
  }
});

export { router as chatRoutes };
