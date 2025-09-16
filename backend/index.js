import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import winston from 'winston';
import { createClient } from 'redis';
import { v4 as uuidv4 } from 'uuid';

// Import custom modules
import { setupRoutes } from './routes/index.js';
import { setupSocketHandlers } from './socket/handlers.js';
import { RedisService } from './services/redis.js';
import { RAGService } from './services/rag.js';
import { NewsIngestionService } from './services/newsIngestion.js';

// Load environment variables
dotenv.config();

// Configure logger
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:5173",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.headers['x-session-id']
  });
  next();
});

// Initialize services
let redisService, ragService, newsIngestionService;

async function initializeServices() {
  try {
    // Initialize Redis
    redisService = new RedisService();
    await redisService.connect();
    logger.info('Redis connected successfully');

    // Initialize RAG service
    ragService = new RAGService();
    await ragService.initialize();
    logger.info('RAG service initialized successfully');

    // Initialize News Ingestion service
    newsIngestionService = new NewsIngestionService(ragService);
    logger.info('News ingestion service initialized successfully');

    // Make services available globally
    app.locals.redisService = redisService;
    app.locals.ragService = ragService;
    app.locals.newsIngestionService = newsIngestionService;
    app.locals.logger = logger;

  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const redisStatus = await redisService.ping();
    const ragStatus = await ragService.healthCheck();
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        redis: redisStatus ? 'connected' : 'disconnected',
        rag: ragStatus ? 'ready' : 'not ready',
        server: 'running'
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Setup routes
setupRoutes(app);

// Setup Socket.IO handlers
setupSocketHandlers(io, { redisService, ragService, logger });

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.originalUrl} not found`
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    if (redisService) {
      redisService.disconnect();
    }
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('HTTP server closed');
    if (redisService) {
      redisService.disconnect();
    }
    process.exit(0);
  });
});

// Start server
async function startServer() {
  try {
    await initializeServices();
    
    server.listen(PORT, () => {
      logger.info(`RAG News Chatbot server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
