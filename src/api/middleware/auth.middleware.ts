/**
 * Authentication and Authorization Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthService, TokenType } from '../../services/auth/auth.service';
import { ApiError } from '../middleware';

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
 * Get AuthService instance (lazy initialization)
 */
const getAuthService = (): AuthService => {
  return new AuthService();
};

/**
 * Authenticate middleware
 * Verifies JWT token and sets user on request object
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check for Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Unauthorized');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const secret = process.env.JWT_SECRET || 'jwt_secret';
    const decoded = jwt.verify(token, secret as jwt.Secret) as {
      id: string;
      email: string;
      roles: string[];
      type: TokenType;
      jti: string;
    };

    // Check if token type is access
    if (decoded.type !== TokenType.ACCESS) {
      throw new ApiError(401, 'Invalid token type');
    }

    // Check if token is revoked
    const authService = getAuthService();
    const isRevoked = await authService.isTokenRevoked(decoded.jti);
    if (isRevoked) {
      throw new ApiError(401, 'Token has been revoked');
    }

    // Set user on request
    req.user = {
      id: decoded.id,
      email: decoded.email,
      roles: decoded.roles,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ error: error.message });
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  }
};

/**
 * Authorize middleware
 * Checks if user has required roles
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Unauthorized');
      }

      if (roles && !req.user.roles.some(role => roles.includes(role))) {
        throw new ApiError(403, 'Forbidden');
      }

      next();
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ error: error.message });
      } else {
        res.status(500).json({ error: 'Internal server error' });
      }
    }
  };
};

/**
 * Auth middleware for protected routes
 * Combines authenticate and authorize middleware
 */
export const authMiddleware = [authenticate, authorize(['user', 'admin'])];

/**
 * Admin middleware for admin-only routes
 * Combines authenticate and authorize middleware with admin role
 */
export const adminMiddleware = [authenticate, authorize(['admin'])];
