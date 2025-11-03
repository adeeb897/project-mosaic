import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../middleware';
import { logger } from '@utils/logger';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Log the error
  logger.error(`Error: ${err.message}`, {
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Check if it's an ApiError
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      status: 'error',
      error: err.message,
    });
    return;
  }

  // Handle validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      status: 'error',
      error: 'Validation Error',
      details: err.message,
    });
    return;
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      status: 'error',
      error: 'Invalid token',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      status: 'error',
      error: 'Token expired',
    });
    return;
  }

  // Interface for MongoDB errors
  interface MongoDBError extends Error {
    code?: number;
  }

  // Handle MongoDB errors
  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    // Handle duplicate key error
    if ((err as MongoDBError).code === 11000) {
      res.status(409).json({
        status: 'error',
        error: 'Duplicate key error',
      });
      return;
    }
  }

  // Default to 500 server error
  res.status(500).json({
    status: 'error',
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
};
