/**
 * API Routes for Project Mosaic
 */

import express, { Request, Response } from 'express';
import { UserService } from '../services/user/user.service';
import { authenticate, authorize } from './middleware/auth.middleware';
import { authRoutes } from './routes/auth.routes';
import { errorHandler } from './middleware/error.middleware';

// Create Express app
const app = express();

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Create services
const userService = new UserService();

// Define routes
const router = express.Router();

// User routes
router.get(
  '/users/:id',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response) => {
    try {
      const user = await userService.getUser(req.params.id);
      res.json(user);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
);

router.get('/users', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { page, limit, ...filters } = req.query;
    const users = await userService.listUsers({
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 10,
      ...filters,
    });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.post('/users', authenticate, authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

router.put(
  '/users/:id',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      res.json(user);
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
);

router.delete(
  '/users/:id',
  authenticate,
  authorize(['admin']),
  async (req: Request, res: Response) => {
    try {
      await userService.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(404).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
);

// Mount auth routes
app.use('/api/v1/auth', authRoutes);

// Mount other API routes
app.use('/api', router);

// Add error handling middleware (must be last)
app.use(errorHandler);

/**
 * Setup routes for the Express application
 * @param app Express application instance
 */
export const setupRoutes = (app: express.Express): void => {
  // Mount auth routes
  app.use('/api/v1/auth', authRoutes);

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

export { app };
