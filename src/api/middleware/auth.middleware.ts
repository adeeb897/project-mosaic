/**
 * Authentication and Authorization Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request type to include user property
import 'express';

// Module augmentation for Express Request
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
 * Authenticate middleware
 * Verifies JWT token and sets user on request object
 */
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const secret = process.env.JWT_SECRET || 'test_jwt_secret';
    const decoded = jwt.verify(token, secret) as {
      id: string;
      email: string;
      roles: string[];
    };

    // Set user on request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Authorize middleware
 * Checks if user has required roles
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (roles && !req.user.roles.some(role => roles.includes(role))) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
};

/**
 * Auth middleware for protected routes
 * Combines authenticate and authorize middleware
 */
export const authMiddleware = [authenticate, authorize(['user', 'admin'])];
