import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import dotenv from 'dotenv';

// Import core services
import { RedisService } from './services/redisService.js';
import { RAGService } from './services/ragService.js';
import { NewsIngestionService } from './services/newsIngestionService.js';

// Import API routes
import apiRoutes from './routes/index.js';

// Import WebSocket handlers
import { setupSocketHandlers } from './socket/socketHandlers.js';

// Load environment configuration
dotenv.config();

// Configure production-ready logger
const applicationLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
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
    new winston.transports.File({ 
      filename: process.env.ERROR_LOG_FILE_PATH || 'logs/error.log', 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: process.env.LOG_FILE_PATH || 'logs/application.log' 
    })
  ]
});

// Initialize Express app
const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_APPLICATION_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

const SERVER_PORT = process.env.SERVER_PORT || 3003;

// Production rate limiting configuration
const apiRateLimiter = rateLimit({
  windowMs: parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Rate limit exceeded',
    message: 'Too many requests from this IP, please try again later.',
    retryAfter: Math.ceil(parseInt(process.env.API_RATE_LIMIT_WINDOW_MS) / 1000) || 900
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.CORS_ALLOWED_ORIGINS?.split(',') || [process.env.FRONTEND_APPLICATION_URL || "http://localhost:5173"],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Session-ID']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', apiRateLimiter);

// Production request logging middleware
app.use((req, res, next) => {
  applicationLogger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    sessionId: req.headers['x-session-id'],
    timestamp: new Date().toISOString()
  });
  next();
});

// Initialize core application services
let redisService, ragService, newsIngestionService;

async function initializeServices() {
  try {
    // Initialize Redis
    redisService = new RedisService();
    await redisService.connect();
    applicationLogger.info('Redis service connected successfully');

    // Initialize RAG service
    ragService = new RAGService();
    await ragService.initialize();
    applicationLogger.info('RAG service initialized successfully');

    // Initialize News Ingestion service
    newsIngestionService = new NewsIngestionService(ragService);
    applicationLogger.info('News ingestion service initialized successfully');

    // Make services available globally
    app.locals.redisService = redisService;
    app.locals.ragService = ragService;
    app.locals.newsIngestionService = newsIngestionService;
    app.locals.logger = applicationLogger;

    // Setup Socket.IO handlers after services are initialized
    setupSocketHandlers(io, { redisService, ragService, logger: applicationLogger });

  } catch (error) {
    applicationLogger.error('Failed to initialize services:', error);
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
    applicationLogger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Setup routes
app.use('/api', apiRoutes);

// Production error handling middleware
app.use((err, req, res, next) => {
  applicationLogger.error('Unhandled application error:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
    timestamp: new Date().toISOString()
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
  applicationLogger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    applicationLogger.info('HTTP server closed');
    if (redisService) {
      redisService.disconnect();
    }
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  applicationLogger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    applicationLogger.info('HTTP server closed');
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
    
    server.listen(SERVER_PORT, () => {
      applicationLogger.info(`News Chatbot API server running on port ${SERVER_PORT}`);
      applicationLogger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      applicationLogger.info(`API Version: ${process.env.API_VERSION || 'v1'}`);
    });
  } catch (error) {
    applicationLogger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
