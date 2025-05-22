import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
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

// Initialize middleware
app.use(cors());
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
