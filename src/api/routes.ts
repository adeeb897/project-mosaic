import { Express } from 'express';
import { userRoutes } from './routes/user.routes';
import { moduleRoutes } from './routes/module.routes';
import { chatRoutes } from './routes/chat.routes';
import { profileRoutes } from './routes/profile.routes';
import { authRoutes } from './routes/auth.routes';
import { marketplaceRoutes } from './routes/marketplace.routes';
import { healthRoutes } from './routes/health.routes';
import { logger } from '@utils/logger';

/**
 * Setup all API routes
 * @param app Express application instance
 */
export const setupRoutes = (app: Express): void => {
  // API version prefix
  const apiPrefix = '/api/v1';

  // Register routes
  app.use(`${apiPrefix}/auth`, authRoutes);
  app.use(`${apiPrefix}/users`, userRoutes);
  app.use(`${apiPrefix}/modules`, moduleRoutes);
  app.use(`${apiPrefix}/chat`, chatRoutes);
  app.use(`${apiPrefix}/profiles`, profileRoutes);
  app.use(`${apiPrefix}/marketplace`, marketplaceRoutes);
  app.use('/health', healthRoutes);

  // 404 handler for API routes
  app.use(`${apiPrefix}/*`, (req, res) => {
    logger.warn(`Route not found: ${req.originalUrl}`);
    res.status(404).json({
      status: 'error',
      message: 'API endpoint not found',
    });
  });

  logger.info('API routes initialized');
};
