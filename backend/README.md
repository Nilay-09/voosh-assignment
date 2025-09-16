# RAG-Powered News Chatbot Backend

A sophisticated backend service that powers a real-time news chatbot using Retrieval-Augmented Generation (RAG) technology.

## Features

- **Real-time Chat**: WebSocket-based communication with Socket.IO
- **RAG Pipeline**: Jina embeddings + Qdrant vector database + Gemini LLM
- **News Ingestion**: Automated RSS feed processing from Reuters
- **Session Management**: Redis-based chat history and caching
- **Performance**: Query caching, rate limiting, and compression
- **Monitoring**: Health checks, logging, and analytics

## Tech Stack

- **Runtime**: Node.js with ES modules
- **Framework**: Express.js with Socket.IO
- **Database**: Qdrant (vector), Redis (cache/sessions)
- **AI Services**: Jina Embeddings API, Google Gemini API
- **News Sources**: Reuters RSS feeds with web scraping

## Quick Start

### Prerequisites

- Node.js 18+ 
- Redis server (local or cloud)
- Qdrant server (local or cloud)
- API keys for Jina and Gemini

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Configure your `.env` file with API keys and service URLs:
```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# API Keys
JINA_API_KEY=your_jina_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Qdrant Configuration
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_qdrant_api_key_here

# CORS Configuration
FRONTEND_URL=http://localhost:5173
```

### Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

## API Endpoints

### Chat Endpoints

- `POST /api/chat/message` - Send a chat message
- `GET /api/chat/history/:sessionId` - Get chat history
- `DELETE /api/chat/session/:sessionId` - Clear session
- `POST /api/chat/session` - Create new session

### Admin Endpoints

- `POST /api/admin/ingest` - Trigger news ingestion
- `GET /api/admin/stats` - Get system statistics
- `GET /api/admin/sources` - Get available news sources
- `DELETE /api/admin/articles` - Clear all articles

### System Endpoints

- `GET /api/health` - Health check
- `GET /` - API information

## WebSocket Events

### Client → Server

- `join_session` - Join a chat session
- `message` - Send a chat message
- `typing` - Send typing indicator
- `clear_session` - Clear session data
- `ping` - Connection heartbeat

### Server → Client

- `session_joined` - Session join confirmation
- `user_message` - User message broadcast
- `assistant_message` - AI response
- `user_typing` - Typing indicator
- `assistant_typing` - AI processing indicator
- `session_cleared` - Session cleared notification
- `error` - Error messages
- `pong` - Heartbeat response

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │◄──►│  Express Server │◄──►│     Redis       │
│   (React)       │    │   + Socket.IO   │    │   (Sessions)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Qdrant DB     │◄──►│  RAG Pipeline   │◄──►│  Gemini API     │
│  (Vectors)      │    │   (Embeddings)  │    │    (LLM)        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                               │
                               ▼
                       ┌─────────────────┐
                       │  News Sources   │
                       │  (RSS/Scraping) │
                       └─────────────────┘
```

## Services

### RedisService
- Session management with TTL
- Chat history storage
- Query result caching
- Analytics counters

### RAGService
- Jina embeddings generation
- Qdrant vector operations
- Gemini LLM integration
- Query processing pipeline

### NewsIngestionService
- RSS feed parsing
- Web scraping with Cheerio
- Content cleaning and validation
- Batch processing

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment | development |
| `REDIS_URL` | Redis connection URL | redis://localhost:6379 |
| `JINA_API_KEY` | Jina embeddings API key | Required |
| `GEMINI_API_KEY` | Google Gemini API key | Required |
| `QDRANT_URL` | Qdrant server URL | http://localhost:6333 |
| `FRONTEND_URL` | Frontend URL for CORS | http://localhost:5173 |

### News Sources

The system ingests from these Reuters RSS feeds:
- World News
- Business News
- Technology News
- Politics News
- Sports News

## Development

### Project Structure

```
backend/
├── index.js              # Main server file
├── routes/
│   ├── index.js          # Route setup
│   ├── chat.js           # Chat endpoints
│   └── admin.js          # Admin endpoints
├── services/
│   ├── redis.js          # Redis operations
│   ├── rag.js            # RAG pipeline
│   └── newsIngestion.js  # News processing
├── socket/
│   └── handlers.js       # Socket.IO handlers
├── logs/                 # Log files
└── .env.example          # Environment template
```

### Adding New Features

1. **New API Endpoint**: Add to appropriate route file
2. **New Service**: Create in `services/` directory
3. **New Socket Event**: Add to `socket/handlers.js`
4. **New News Source**: Update `newsIngestion.js`

## Monitoring

### Health Check

```bash
curl http://localhost:3000/api/health
```

### System Stats

```bash
curl http://localhost:3000/api/admin/stats
```

### Logs

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- Console output in development

## Deployment

### Docker (Recommended)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

### Environment Setup

1. Set up Redis (Redis Cloud recommended)
2. Set up Qdrant (Qdrant Cloud recommended)
3. Get API keys:
   - Jina AI: https://jina.ai/
   - Google Gemini: https://ai.google.dev/
4. Configure environment variables
5. Deploy to your platform (Render, Railway, etc.)

## Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Check Redis URL and credentials
   - Ensure Redis server is running

2. **Qdrant Connection Failed**
   - Verify Qdrant URL and API key
   - Check if collection exists

3. **API Key Errors**
   - Verify Jina and Gemini API keys
   - Check API quotas and limits

4. **News Ingestion Fails**
   - Check internet connectivity
   - Verify RSS feed URLs are accessible

### Debug Mode

Set `NODE_ENV=development` for detailed logging and error messages.

## Performance

- **Caching**: Query results cached for 30 minutes
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **Compression**: Gzip enabled for responses
- **Connection Pooling**: Optimized database connections

## Security

- **CORS**: Configured for frontend domain
- **Helmet**: Security headers enabled
- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Sanitized user inputs
- **Environment Variables**: Sensitive data protected

## License

MIT License - see LICENSE file for details.
