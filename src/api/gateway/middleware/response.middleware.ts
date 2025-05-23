/**
 * Response Formatting Middleware
 * Standardizes API response format and handles response transformation
 */

import { Request, Response, NextFunction } from 'express';
import { ApiResponse, ResponseMetadata, GatewayMiddleware } from '../types';

/**
 * Response formatting middleware that standardizes all API responses
 */
export const responseFormattingMiddleware: GatewayMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Store original json method
  const originalJson = res.json;

  // Override res.json to format responses
  res.json = function (data: any): Response {
    const startTime = req.context?.startTime || Date.now();
    const processingTime = Date.now() - startTime;

    // Create standardized response metadata
    const metadata: ResponseMetadata = {
      requestId: req.context?.requestId || 'unknown',
      timestamp: new Date().toISOString(),
      processingTime,
      version: process.env.API_VERSION || '1.0.0',
    };

    // Add rate limit info if available
    if (req.rateLimitInfo) {
      metadata.rateLimit = req.rateLimitInfo;
    }

    // Check if data is already in our standard format
    if (data && typeof data === 'object' && 'success' in data && 'metadata' in data) {
      // Update metadata with our values
      data.metadata = {
        ...data.metadata,
        ...metadata,
      };
      return originalJson.call(this, data);
    }

    // Format response based on status code
    let formattedResponse: ApiResponse;

    if (res.statusCode >= 400) {
      // Error response
      formattedResponse = {
        success: false,
        error: data?.error || {
          code: getErrorCodeFromStatus(res.statusCode),
          message: data?.message || getDefaultErrorMessage(res.statusCode),
          details: data?.details,
        },
        metadata,
      };
    } else {
      // Success response
      formattedResponse = {
        success: true,
        data,
        metadata,
      };
    }

    return originalJson.call(this, formattedResponse);
  };

  next();
};

/**
 * Get error code from HTTP status code
 */
function getErrorCodeFromStatus(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 422:
      return 'VALIDATION_ERROR';
    case 429:
      return 'RATE_LIMIT_EXCEEDED';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 504:
      return 'GATEWAY_TIMEOUT';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * Get default error message from HTTP status code
 */
function getDefaultErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 409:
      return 'Conflict';
    case 422:
      return 'Validation Error';
    case 429:
      return 'Rate Limit Exceeded';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 504:
      return 'Gateway Timeout';
    default:
      return 'Unknown Error';
  }
}

/**
 * Helper functions for creating standardized responses
 */
export const responseHelpers = {
  /**
   * Create a success response
   */
  success: <T = any>(data: T, metadata?: Partial<ResponseMetadata>): ApiResponse<T> => ({
    success: true,
    data,
    metadata: {
      requestId: 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: 0,
      version: process.env.API_VERSION || '1.0.0',
      ...metadata,
    },
  }),

  /**
   * Create an error response
   */
  error: (
    code: string,
    message: string,
    details?: any,
    metadata?: Partial<ResponseMetadata>
  ): ApiResponse => ({
    success: false,
    error: {
      code,
      message,
      details,
    },
    metadata: {
      requestId: 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: 0,
      version: process.env.API_VERSION || '1.0.0',
      ...metadata,
    },
  }),

  /**
   * Create a paginated response
   */
  paginated: <T = any>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    },
    metadata?: Partial<ResponseMetadata>
  ): ApiResponse<{
    items: T[];
    pagination: typeof pagination;
  }> => ({
    success: true,
    data: {
      items: data,
      pagination,
    },
    metadata: {
      requestId: 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: 0,
      version: process.env.API_VERSION || '1.0.0',
      ...metadata,
    },
  }),

  /**
   * Create a validation error response
   */
  validationError: (
    errors: Array<{ field: string; message: string; code?: string }>,
    metadata?: Partial<ResponseMetadata>
  ): ApiResponse => ({
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: { errors },
    },
    metadata: {
      requestId: 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: 0,
      version: process.env.API_VERSION || '1.0.0',
      ...metadata,
    },
  }),

  /**
   * Create a not found response
   */
  notFound: (resource: string, metadata?: Partial<ResponseMetadata>): ApiResponse => ({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `${resource} not found`,
    },
    metadata: {
      requestId: 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: 0,
      version: process.env.API_VERSION || '1.0.0',
      ...metadata,
    },
  }),

  /**
   * Create an unauthorized response
   */
  unauthorized: (message?: string, metadata?: Partial<ResponseMetadata>): ApiResponse => ({
    success: false,
    error: {
      code: 'UNAUTHORIZED',
      message: message || 'Unauthorized',
    },
    metadata: {
      requestId: 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: 0,
      version: process.env.API_VERSION || '1.0.0',
      ...metadata,
    },
  }),

  /**
   * Create a forbidden response
   */
  forbidden: (message?: string, metadata?: Partial<ResponseMetadata>): ApiResponse => ({
    success: false,
    error: {
      code: 'FORBIDDEN',
      message: message || 'Forbidden',
    },
    metadata: {
      requestId: 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: 0,
      version: process.env.API_VERSION || '1.0.0',
      ...metadata,
    },
  }),

  /**
   * Create a rate limit exceeded response
   */
  rateLimitExceeded: (retryAfter?: number, metadata?: Partial<ResponseMetadata>): ApiResponse => ({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Rate limit exceeded',
      details: retryAfter ? { retryAfter } : undefined,
    },
    metadata: {
      requestId: 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: 0,
      version: process.env.API_VERSION || '1.0.0',
      ...metadata,
    },
  }),

  /**
   * Create an internal server error response
   */
  internalError: (
    message?: string,
    details?: any,
    metadata?: Partial<ResponseMetadata>
  ): ApiResponse => ({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: message || 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? details : undefined,
    },
    metadata: {
      requestId: 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: 0,
      version: process.env.API_VERSION || '1.0.0',
      ...metadata,
    },
  }),
};

/**
 * Express response extension with helper methods
 */
declare module 'express-serve-static-core' {
  interface Response {
    success<T = any>(data: T): Response;
    error(code: string, message: string, details?: any): Response;
    validationError(errors: Array<{ field: string; message: string; code?: string }>): Response;
    notFound(resource: string): Response;
    unauthorized(message?: string): Response;
    forbidden(message?: string): Response;
    rateLimitExceeded(retryAfter?: number): Response;
    internalError(message?: string, details?: any): Response;
    paginated<T = any>(
      data: T[],
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      }
    ): Response;
  }
}

/**
 * Response helper methods middleware
 * Adds helper methods to the response object
 */
export const responseHelpersMiddleware: GatewayMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Add helper methods to response object
  res.success = function <T = any>(data: T): Response {
    return this.json(
      responseHelpers.success(data, {
        requestId: req.context?.requestId,
        processingTime: Date.now() - (req.context?.startTime || Date.now()),
      })
    );
  };

  res.error = function (code: string, message: string, details?: any): Response {
    return this.json(
      responseHelpers.error(code, message, details, {
        requestId: req.context?.requestId,
        processingTime: Date.now() - (req.context?.startTime || Date.now()),
      })
    );
  };

  res.validationError = function (
    errors: Array<{ field: string; message: string; code?: string }>
  ): Response {
    return this.status(400).json(
      responseHelpers.validationError(errors, {
        requestId: req.context?.requestId,
        processingTime: Date.now() - (req.context?.startTime || Date.now()),
      })
    );
  };

  res.notFound = function (resource: string): Response {
    return this.status(404).json(
      responseHelpers.notFound(resource, {
        requestId: req.context?.requestId,
        processingTime: Date.now() - (req.context?.startTime || Date.now()),
      })
    );
  };

  res.unauthorized = function (message?: string): Response {
    return this.status(401).json(
      responseHelpers.unauthorized(message, {
        requestId: req.context?.requestId,
        processingTime: Date.now() - (req.context?.startTime || Date.now()),
      })
    );
  };

  res.forbidden = function (message?: string): Response {
    return this.status(403).json(
      responseHelpers.forbidden(message, {
        requestId: req.context?.requestId,
        processingTime: Date.now() - (req.context?.startTime || Date.now()),
      })
    );
  };

  res.rateLimitExceeded = function (retryAfter?: number): Response {
    return this.status(429).json(
      responseHelpers.rateLimitExceeded(retryAfter, {
        requestId: req.context?.requestId,
        processingTime: Date.now() - (req.context?.startTime || Date.now()),
      })
    );
  };

  res.internalError = function (message?: string, details?: any): Response {
    return this.status(500).json(
      responseHelpers.internalError(message, details, {
        requestId: req.context?.requestId,
        processingTime: Date.now() - (req.context?.startTime || Date.now()),
      })
    );
  };

  res.paginated = function <T = any>(
    data: T[],
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    }
  ): Response {
    return this.json(
      responseHelpers.paginated(data, pagination, {
        requestId: req.context?.requestId,
        processingTime: Date.now() - (req.context?.startTime || Date.now()),
      })
    );
  };

  next();
};
