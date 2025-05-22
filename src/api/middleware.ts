import { Express, Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { stream } from '@utils/logger';
import { authMiddleware } from './middleware/auth.middleware';
import { errorHandler } from './middleware/error.middleware';

/**
 * Setup all middleware for the Express application
 * @param app Express application instance
 */
export const setupMiddleware = (app: Express): void => {
  // Security middleware
  app.use(helmet());

  // Request logging
  app.use(morgan('combined', { stream }));

  // Rate limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: 'Too many requests from this IP, please try again later',
  });
  app.use('/api', limiter);

  // CORS handling is done at the top level in index.ts

  // Authentication middleware for protected routes
  app.use('/api/v1/users', authMiddleware);
  app.use('/api/v1/modules', authMiddleware);
  app.use('/api/v1/chat', authMiddleware);
  app.use('/api/v1/profiles', authMiddleware);

  // Error handling middleware (should be last)
  app.use(errorHandler);
};

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Async handler to catch errors in async route handlers
 */
export const asyncHandler =
  (fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) =>
  (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
