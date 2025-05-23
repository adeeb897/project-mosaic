/**
 * Advanced Rate Limiting Middleware
 * Supports tiered rate limiting based on user roles and API keys
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import {
  RateLimitConfig,
  RateLimitTier,
  RateLimitInfo,
  GatewayError,
  ErrorCode,
  GatewayMiddleware,
} from '../types';
import { logger } from '@utils/logger';

// In-memory store for rate limiting (in production, use Redis)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

class AdvancedRateLimitStore {
  private store: RateLimitStore = {};
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every minute
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  private cleanup(): void {
    const now = Date.now();
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetTime < now) {
        delete this.store[key];
      }
    });
  }

  increment(key: string, windowMs: number): { count: number; resetTime: number } {
    const now = Date.now();
    const resetTime = now + windowMs;

    if (!this.store[key] || this.store[key].resetTime < now) {
      this.store[key] = { count: 1, resetTime };
    } else {
      this.store[key].count++;
    }

    return this.store[key];
  }

  get(key: string): { count: number; resetTime: number } | null {
    const now = Date.now();
    if (!this.store[key] || this.store[key].resetTime < now) {
      return null;
    }
    return this.store[key];
  }

  reset(key: string): void {
    delete this.store[key];
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.store = {};
  }
}

const rateLimitStore = new AdvancedRateLimitStore();

/**
 * Create a rate limit key based on request properties
 */
function createRateLimitKey(req: Request, tier: RateLimitTier): string {
  const baseKey = `rate_limit:${tier.name}`;

  // Use user ID if authenticated
  if (req.user?.id) {
    return `${baseKey}:user:${req.user.id}`;
  }

  // Use API key if present
  const apiKey = req.get('X-API-Key');
  if (apiKey) {
    return `${baseKey}:api:${apiKey}`;
  }

  // Fall back to IP address
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  return `${baseKey}:ip:${ip}`;
}

/**
 * Find the appropriate rate limit tier for a request
 */
function findRateLimitTier(req: Request, tiers: RateLimitTier[]): RateLimitTier {
  // Find the first tier that matches the request
  for (const tier of tiers) {
    if (tier.condition(req)) {
      return tier;
    }
  }

  // Return the last tier as default (should be the most restrictive)
  return tiers[tiers.length - 1];
}

/**
 * Create advanced rate limiting middleware
 */
export function createAdvancedRateLimit(config: RateLimitConfig): GatewayMiddleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Find appropriate tier
      const tier = findRateLimitTier(req, config.tiers);
      const key = createRateLimitKey(req, tier);

      // Get current count
      const result = rateLimitStore.increment(key, tier.windowMs);
      const { count, resetTime } = result;

      // Calculate rate limit info
      const rateLimitInfo: RateLimitInfo = {
        limit: tier.max,
        remaining: Math.max(0, tier.max - count),
        reset: Math.ceil(resetTime / 1000), // Convert to seconds
      };

      // Add rate limit info to request
      req.rateLimitInfo = rateLimitInfo;

      // Set rate limit headers
      res.setHeader('X-RateLimit-Limit', tier.max);
      res.setHeader('X-RateLimit-Remaining', rateLimitInfo.remaining);
      res.setHeader('X-RateLimit-Reset', rateLimitInfo.reset);
      res.setHeader('X-RateLimit-Window', Math.ceil(tier.windowMs / 1000));

      // Check if limit exceeded
      if (count > tier.max) {
        const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);
        rateLimitInfo.retryAfter = retryAfter;

        res.setHeader('Retry-After', retryAfter);

        logger.warn('Rate limit exceeded', {
          key,
          tier: tier.name,
          count,
          limit: tier.max,
          ip: req.ip,
          userId: req.user?.id,
          path: req.path,
        });

        throw new GatewayError(
          ErrorCode.RATE_LIMIT_ERROR,
          `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
          429,
          { rateLimitInfo }
        );
      }

      next();
    } catch (error) {
      if (error instanceof GatewayError) {
        res.status(error.statusCode).json({
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          metadata: {
            requestId: req.context?.requestId || 'unknown',
            timestamp: new Date().toISOString(),
            processingTime: 0,
            version: process.env.API_VERSION || '1.0.0',
            rateLimit: error.details?.rateLimitInfo,
          },
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Default rate limit configuration
 */
export const defaultRateLimitConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Default limit
  tiers: [
    {
      name: 'admin',
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 1000, // High limit for admins
      condition: (req: Request) => req.user?.roles?.includes('admin') || false,
    },
    {
      name: 'premium',
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 500, // Higher limit for premium users
      condition: (req: Request) => req.user?.roles?.includes('premium') || false,
    },
    {
      name: 'authenticated',
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 200, // Standard limit for authenticated users
      condition: (req: Request) => !!req.user,
    },
    {
      name: 'api_key',
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 150, // Limit for API key users
      condition: (req: Request) => !!req.get('X-API-Key'),
    },
    {
      name: 'anonymous',
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 50, // Low limit for anonymous users
      condition: () => true, // Default fallback
    },
  ],
};

/**
 * Create basic rate limiting middleware (for backward compatibility)
 */
export function createBasicRateLimit(windowMs: number = 15 * 60 * 1000, max: number = 100) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: ErrorCode.RATE_LIMIT_ERROR,
        message: 'Too many requests from this IP, please try again later.',
      },
    },
    keyGenerator: (req: Request) => {
      // Use user ID if available, otherwise IP
      return req.user?.id || req.ip || 'unknown';
    },
  });
}

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupRateLimit(): void {
  rateLimitStore.destroy();
}
