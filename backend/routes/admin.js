import express from 'express';

const router = express.Router();

// POST /api/admin/ingest - Trigger news ingestion
router.post('/ingest', async (req, res) => {
  try {
    const { source } = req.body;
    const { newsIngestionService, logger } = req.app.locals;

    logger.info('Starting news ingestion', { source: source || 'all' });

    let result;
    if (source) {
      result = await newsIngestionService.ingestSingleSource(source);
    } else {
      result = await newsIngestionService.ingestAllSources();
    }

    logger.info('News ingestion completed', result);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    req.app.locals.logger.error('News ingestion error:', error);
    res.status(500).json({
      error: 'Failed to ingest news',
      message: error.message
    });
  }
});

// GET /api/admin/stats - Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const { redisService, ragService, newsIngestionService } = req.app.locals;

    const [redisStats, ragStats, ingestionStats] = await Promise.all([
      redisService.getStats(),
      ragService.getCollectionStats(),
      newsIngestionService.getIngestionStats()
    ]);

    res.json({
      success: true,
      stats: {
        redis: redisStats,
        rag: ragStats,
        ingestion: ingestionStats,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    req.app.locals.logger.error('Get stats error:', error);
    res.status(500).json({
      error: 'Failed to get stats',
      message: error.message
    });
  }
});

// GET /api/admin/sources - Get available news sources
router.get('/sources', async (req, res) => {
  try {
    const { newsIngestionService } = req.app.locals;
    const sources = newsIngestionService.getAvailableSources();

    res.json({
      success: true,
      sources
    });

  } catch (error) {
    req.app.locals.logger.error('Get sources error:', error);
    res.status(500).json({
      error: 'Failed to get sources',
      message: error.message
    });
  }
});

// DELETE /api/admin/articles - Clear all articles
router.delete('/articles', async (req, res) => {
  try {
    const { newsIngestionService, logger } = req.app.locals;

    logger.info('Clearing all articles');
    const cleared = await newsIngestionService.clearAllArticles();

    if (cleared) {
      logger.info('All articles cleared successfully');
      res.json({
        success: true,
        message: 'All articles cleared successfully'
      });
    } else {
      res.status(500).json({
        error: 'Failed to clear articles'
      });
    }

  } catch (error) {
    req.app.locals.logger.error('Clear articles error:', error);
    res.status(500).json({
      error: 'Failed to clear articles',
      message: error.message
    });
  }
});

// POST /api/admin/test-scrape - Test article scraping
router.post('/test-scrape', async (req, res) => {
  try {
    const { url } = req.body;
    const { newsIngestionService } = req.app.locals;

    if (!url) {
      return res.status(400).json({
        error: 'URL is required'
      });
    }

    const result = await newsIngestionService.testSingleArticle(url);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    req.app.locals.logger.error('Test scrape error:', error);
    res.status(500).json({
      error: 'Failed to test scraping',
      message: error.message
    });
  }
});

export { router as adminRoutes };
