import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import path from 'path';
import { setupRoutes } from '@api/routes';
import { setupMiddleware } from '@api/middleware';
import { initializeServices } from '@services/init';
import { connectDatabase } from '@persistence/database';
import { logger } from '@utils/logger';

// Load environment variables
dotenv.config();

// Create Express application
const app = express();
const port = process.env.PORT || 3000;

// Configure CORS with proper headers for static assets
const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? process.env.ALLOWED_ORIGINS?.split(',') || []
      : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

// Initialize middleware
app.use(cors(corsOptions));

// Serve static files with proper CORS headers
app.use(
  express.static(path.join(__dirname, '../public'), {
    setHeaders: (res, path) => {
      // Set CORP header for all static assets
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

      // Set specific headers for different file types
      if (path.endsWith('.ico')) {
        res.setHeader('Content-Type', 'image/x-icon');
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day cache
      } else if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      } else if (path.endsWith('.js') || path.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache
      }
    },
  })
);

app.use(express.json());
setupMiddleware(app);

// Initialize services
initializeServices()
  .then(() => {
    // Connect to database
    return connectDatabase();
  })
  .then(() => {
    // Setup API routes
    setupRoutes(app);

    // Start server
    app.listen(port, () => {
      logger.info(`ModularAI server started on port ${port}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch(error => {
    logger.error('Failed to start server:', error);
    process.exit(1);
  });

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  // Implement cleanup logic here
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  // Implement cleanup logic here
  process.exit(0);
});

export default app;
