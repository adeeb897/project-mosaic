/**
 * API Routes for Project Mosaic
 */

import express, { Request, Response } from 'express';
import { authRoutes } from './routes/auth.routes';
import moduleRegistryRoutes from './routes/module-registry.routes';
import { userRoutes } from './routes/user.routes';
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

  // Mount the API router
  app.use('/api', router);

  // Add health check route
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
