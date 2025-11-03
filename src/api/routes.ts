/**
 * API Routes for Project Mosaic
 */

import express, { Request, Response } from 'express';
import { authRoutes } from './routes/auth.routes';
import moduleRegistryRoutes from './routes/module-registry.routes';
import { userRoutes } from './routes/user.routes';
import { healthRoutes } from './routes/health.routes';
import { marketplaceRoutes } from './routes/marketplace.routes';
import { chatRoutes } from './routes/chat.routes';
import { moduleRoutes } from './routes/module.routes';
import { profileRoutes } from './routes/profile.routes';
import { aiRoutes } from './routes/ai.routes';
import { errorHandler } from './middleware/error.middleware';

/**
 * Setup routes for the Express application
 * @param app Express application instance
 */
export const setupRoutes = (app: express.Express): void => {
  // Define API router
  const router = express.Router();

  // Mount auth routes
  app.use('/api/v1/auth', authRoutes);

  // Mount module registry routes
  app.use('/api/modules', moduleRegistryRoutes);

  // Mount user routes
  app.use('/api/users', userRoutes);

  // Mount health routes
  app.use('/api/health', healthRoutes);

  // Mount marketplace routes
  app.use('/api/v1/marketplace', marketplaceRoutes);

  // Mount chat routes
  app.use('/api/v1/chat', chatRoutes);

  // Mount module routes
  app.use('/api/v1/modules', moduleRoutes);

  // Mount profile routes
  app.use('/api/v1/profiles', profileRoutes);

  // Mount AI routes
  app.use('/api/v1/ai', aiRoutes);

  // Mount the API router
  app.use('/api', router);

  // Add simple health check route
  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });

  // Serve React app for all non-API routes (SPA fallback)
  app.get('*', (req: Request, res: Response) => {
    // Only serve the React app for non-API routes
    if (!req.path.startsWith('/api') && !req.path.startsWith('/health')) {
      res.sendFile('index.html', { root: 'public' });
    } else {
      res.status(404).json({ error: 'Route not found' });
    }
  });

  // Add error handling middleware (must be last)
  app.use(errorHandler);
};

// Create Express app
const app = express();

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Setup routes
setupRoutes(app);

export { app };
