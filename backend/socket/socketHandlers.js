import crypto from 'crypto';

export function setupSocketHandlers(io, { redisService, ragService, logger }) {
  io.on('connection', (socket) => {
    logger.info('New socket connection', { socketId: socket.id });

    // Join session room
    socket.on('join_session', async (data) => {
      try {
        const { sessionId } = data;
        
        logger.info('Attempting to join session', { socketId: socket.id, sessionId });
        
        if (!sessionId) {
          logger.error('No session ID provided');
          socket.emit('error', { message: 'Session ID is required' });
          return;
        }

        // Get or create session
        let session = await redisService.getSession(sessionId);
        logger.info('Session lookup result', { sessionId, sessionExists: !!session });
        
        if (!session) {
          logger.info('Creating new session for socket join', { sessionId });
          session = await redisService.createSession(sessionId, {
            socketId: socket.id,
            connectedAt: new Date().toISOString()
          });
        }

        // Join the session room
        socket.join(sessionId);
        socket.sessionId = sessionId;

        logger.info('Socket successfully joined session', { socketId: socket.id, sessionId });

        // Send session info and chat history
        const chatHistory = await redisService.getChatHistory(sessionId, 20);
        
        socket.emit('session_joined', {
          sessionId,
          session,
          chatHistory
        });

        // Notify others in the session (if any)
        socket.to(sessionId).emit('user_joined', {
          socketId: socket.id,
          timestamp: new Date().toISOString()
        });

      } catch (error) {
        logger.error('Join session error:', error);
        socket.emit('error', { message: `Failed to join session: ${error.message}` });
      }
    });

    // Handle chat messages
    socket.on('message', async (data) => {
      try {
        const { message, sessionId } = data;
        
        if (!message || !sessionId) {
          socket.emit('error', { message: 'Message and session ID are required' });
          return;
        }

        if (!socket.sessionId || socket.sessionId !== sessionId) {
          socket.emit('error', { message: 'Not joined to this session' });
          return;
        }

        logger.info('Processing socket message', { 
          socketId: socket.id, 
          sessionId, 
          messageLength: message.length 
        });

        // Emit typing indicator to others
        socket.to(sessionId).emit('user_typing', {
          socketId: socket.id,
          typing: false
        });

        // Get chat history for context
        const chatHistory = await redisService.getChatHistory(sessionId, 10);

        // Add user message to history
        const userMessage = await redisService.addChatMessage(sessionId, {
          role: 'user',
          content: message,
          socketId: socket.id
        });

        // Emit user message to all clients in the session
        io.to(sessionId).emit('user_message', userMessage);

        // Generate query hash for caching
        const queryHash = crypto.createHash('md5')
          .update(message + JSON.stringify(chatHistory.slice(-3)))
          .digest('hex');

        // Check cache first
        let cachedResult = await redisService.getCachedQueryResult(queryHash);
        
        let response;
        if (cachedResult) {
          logger.info('Using cached response for socket', { sessionId, queryHash });
          response = cachedResult;
        } else {
          // Emit typing indicator for assistant
          io.to(sessionId).emit('assistant_typing', { typing: true });

          try {
            // Process query with RAG
            response = await ragService.processQuery(message, chatHistory);
            
            // Cache the result
            await redisService.cacheQueryResult(queryHash, response, 30 * 60);
          } catch (ragError) {
            logger.error('RAG processing error:', ragError);
            response = {
              response: "I'm sorry, I'm having trouble processing your request right now. Please try again in a moment.",
              sources: []
            };
          }
        }

        // Stop typing indicator
        io.to(sessionId).emit('assistant_typing', { typing: false });

        // Add assistant response to history
        const assistantMessage = await redisService.addChatMessage(sessionId, {
          role: 'assistant',
          content: response.response,
          sources: response.sources,
          cached: !!cachedResult
        });

        // Emit assistant response to all clients in the session
        io.to(sessionId).emit('assistant_message', assistantMessage);

        // Update session activity
        await redisService.getSession(sessionId);

      } catch (error) {
        logger.error('Socket message error:', error);
        socket.emit('error', { message: 'Failed to process message' });
        
        // Stop typing indicator on error
        if (socket.sessionId) {
          io.to(socket.sessionId).emit('assistant_typing', { typing: false });
        }
      }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
      try {
        const { sessionId, typing } = data;
        
        if (socket.sessionId === sessionId) {
          socket.to(sessionId).emit('user_typing', {
            socketId: socket.id,
            typing
          });
        }
      } catch (error) {
        logger.error('Typing indicator error:', error);
      }
    });

    // Handle session clearing
    socket.on('clear_session', async (data) => {
      try {
        const { sessionId } = data;
        
        if (!sessionId || socket.sessionId !== sessionId) {
          socket.emit('error', { message: 'Invalid session' });
          return;
        }

        const deleted = await redisService.deleteSession(sessionId);
        
        if (deleted) {
          // Notify all clients in the session
          io.to(sessionId).emit('session_cleared', {
            sessionId,
            timestamp: new Date().toISOString()
          });
          
          logger.info('Session cleared via socket', { sessionId, socketId: socket.id });
        }

      } catch (error) {
        logger.error('Clear session error:', error);
        socket.emit('error', { message: 'Failed to clear session' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { 
        socketId: socket.id, 
        sessionId: socket.sessionId,
        reason 
      });

      // Notify others in the session
      if (socket.sessionId) {
        socket.to(socket.sessionId).emit('user_left', {
          socketId: socket.id,
          timestamp: new Date().toISOString(),
          reason
        });
      }
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error('Socket error:', { 
        socketId: socket.id, 
        sessionId: socket.sessionId,
        error: error.message 
      });
    });

    // Heartbeat for connection monitoring
    socket.on('ping', () => {
      socket.emit('pong', {
        timestamp: new Date().toISOString(),
        sessionId: socket.sessionId
      });
    });
  });

  // Handle server-level events
  io.engine.on('connection_error', (err) => {
    logger.error('Socket.IO connection error:', err);
  });

  logger.info('Socket.IO handlers setup complete');
}
