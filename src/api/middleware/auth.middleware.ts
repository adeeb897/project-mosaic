import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ApiError } from '../middleware';
import { logger } from '@utils/logger';

/**
 * Interface for JWT payload
 */
interface JwtPayload {
  userId: string;
  email: string;
  roles: string[];
  iat: number;
  exp: number;
}

/**
 * Extend Express Request interface to include user
 */
// Augment the Express Request interface
import 'express';

declare module 'express' {
  interface Request {
    user?: {
      id: string;
      email: string;
      roles: string[];
    };
  }
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw new ApiError(401, 'No authorization token provided');
    }

    // Check if it's a Bearer token
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new ApiError(401, 'Invalid authorization format');
    }

    const token = parts[1];

    // Verify token
    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload;

    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      roles: decoded.roles,
    };

    // Continue to next middleware
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Invalid token'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Token expired'));
    } else if (error instanceof ApiError) {
      next(error);
    } else {
      logger.error('Authentication error:', error);
      next(new ApiError(500, 'Authentication failed'));
    }
  }
};

/**
 * Role-based authorization middleware
 * @param roles Array of allowed roles
 */
export const authorize = (roles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'User not authenticated');
      }

      const hasRole = req.user.roles.some(role => roles.includes(role));

      if (!hasRole) {
        throw new ApiError(403, 'Insufficient permissions');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};
