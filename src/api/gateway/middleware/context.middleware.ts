/**
 * Request Context Middleware
 * Adds request context information to each request
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { RequestContext } from '../types';

/**
 * Context middleware that adds request tracking information
 */
export const contextMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = uuidv4();
  const startTime = Date.now();

  // Create request context
  const context: RequestContext = {
    requestId,
    startTime,
    metadata: {
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress,
      method: req.method,
      path: req.path,
      query: req.query,
    },
  };

  // Attach context to request
  req.context = context;

  // Add request ID to response headers
  res.setHeader('X-Request-ID', requestId);

  // Add correlation ID if provided
  const correlationId = req.get('X-Correlation-ID');
  if (correlationId) {
    context.metadata.correlationId = correlationId;
    res.setHeader('X-Correlation-ID', correlationId);
  }

  next();
};

/**
 * Response time middleware that calculates and adds processing time
 */
export const responseTimeMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  // Override res.end to calculate response time
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): Response {
    const processingTime = Date.now() - startTime;

    // Add processing time to response headers
    res.setHeader('X-Response-Time', `${processingTime}ms`);

    // Update context if available
    if (req.context) {
      req.context.metadata.processingTime = processingTime;
    }

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};
