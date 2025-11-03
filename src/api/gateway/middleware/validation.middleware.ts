/**
 * Request Validation Middleware
 * Validates request body, query parameters, and headers using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';
import { ValidationSchema, GatewayError, ErrorCode, GatewayMiddleware } from '../types';
import { logger } from '@utils/logger';

/**
 * Create validation middleware for request validation
 */
export function createValidationMiddleware(schema: ValidationSchema): GatewayMiddleware {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate request body
      if (schema.body) {
        const bodyResult = schema.body.safeParse(req.body);
        if (!bodyResult.success) {
          throw new GatewayError(
            ErrorCode.VALIDATION_ERROR,
            'Request body validation failed',
            400,
            {
              field: 'body',
              errors: formatZodErrors(bodyResult.error),
            }
          );
        }
        req.body = bodyResult.data;
      }

      // Validate query parameters
      if (schema.query) {
        const queryResult = schema.query.safeParse(req.query);
        if (!queryResult.success) {
          throw new GatewayError(
            ErrorCode.VALIDATION_ERROR,
            'Query parameters validation failed',
            400,
            {
              field: 'query',
              errors: formatZodErrors(queryResult.error),
            }
          );
        }
        req.query = queryResult.data;
      }

      // Validate route parameters
      if (schema.params) {
        const paramsResult = schema.params.safeParse(req.params);
        if (!paramsResult.success) {
          throw new GatewayError(
            ErrorCode.VALIDATION_ERROR,
            'Route parameters validation failed',
            400,
            {
              field: 'params',
              errors: formatZodErrors(paramsResult.error),
            }
          );
        }
        req.params = paramsResult.data;
      }

      // Validate headers
      if (schema.headers) {
        const headersResult = schema.headers.safeParse(req.headers);
        if (!headersResult.success) {
          throw new GatewayError(ErrorCode.VALIDATION_ERROR, 'Headers validation failed', 400, {
            field: 'headers',
            errors: formatZodErrors(headersResult.error),
          });
        }
      }

      next();
    } catch (error) {
      if (error instanceof GatewayError) {
        logger.warn('Request validation failed', {
          requestId: req.context?.requestId,
          path: req.path,
          method: req.method,
          error: error.message,
          details: error.details,
        });

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
          },
        });
      } else {
        next(error);
      }
    }
  };
}

/**
 * Format Zod validation errors into a more readable format
 */
function formatZodErrors(error: ZodError): Array<{ path: string; message: string; code: string }> {
  return error.errors.map(err => ({
    path: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination schema
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),

  // ID parameter schema
  idParam: z.object({
    id: z.string().uuid('Invalid ID format'),
  }),

  // Search query schema
  search: z.object({
    q: z.string().min(1).max(100),
    filters: z.string().optional(),
  }),

  // Date range schema
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),

  // User creation schema
  userCreation: z.object({
    username: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9_-]+$/),
    email: z.string().email(),
    password: z.string().min(8).max(128),
    displayName: z.string().min(1).max(100).optional(),
  }),

  // User update schema
  userUpdate: z.object({
    username: z
      .string()
      .min(3)
      .max(50)
      .regex(/^[a-zA-Z0-9_-]+$/)
      .optional(),
    email: z.string().email().optional(),
    displayName: z.string().min(1).max(100).optional(),
  }),

  // Module installation schema
  moduleInstall: z.object({
    moduleId: z.string().uuid(),
    version: z.string().optional(),
    config: z.record(z.any()).optional(),
  }),

  // Chat message schema
  chatMessage: z.object({
    content: z.array(
      z.object({
        type: z.string(),
        value: z.any(),
      })
    ),
    conversationId: z.string().uuid().optional(),
    metadata: z.record(z.any()).optional(),
  }),

  // Profile creation schema
  profileCreation: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
    modules: z
      .array(
        z.object({
          moduleId: z.string().uuid(),
          version: z.string(),
          config: z.record(z.any()).default({}),
          priority: z.number().int().min(0).max(100).default(50),
          isActive: z.boolean().default(true),
        })
      )
      .default([]),
    defaultModality: z.string().default('text'),
    tags: z.array(z.string()).default([]),
  }),

  // API key headers
  apiKeyHeaders: z.object({
    'x-api-key': z.string().min(1),
  }),

  // Content type headers
  jsonHeaders: z.object({
    'content-type': z.literal('application/json'),
  }),
};

/**
 * Validation middleware factory functions
 */
export const validate = {
  body: (schema: ZodSchema) => createValidationMiddleware({ body: schema }),
  query: (schema: ZodSchema) => createValidationMiddleware({ query: schema }),
  params: (schema: ZodSchema) => createValidationMiddleware({ params: schema }),
  headers: (schema: ZodSchema) => createValidationMiddleware({ headers: schema }),
  all: (schema: ValidationSchema) => createValidationMiddleware(schema),
};

/**
 * Pre-built validation middleware for common use cases
 */
export const validators = {
  // Pagination validation
  pagination: validate.query(commonSchemas.pagination),

  // ID parameter validation
  idParam: validate.params(commonSchemas.idParam),

  // Search validation
  search: validate.query(commonSchemas.search),

  // Date range validation
  dateRange: validate.query(commonSchemas.dateRange),

  // User validation
  userCreation: validate.body(commonSchemas.userCreation),
  userUpdate: validate.body(commonSchemas.userUpdate),

  // Module validation
  moduleInstall: validate.body(commonSchemas.moduleInstall),

  // Chat validation
  chatMessage: validate.body(commonSchemas.chatMessage),

  // Profile validation
  profileCreation: validate.body(commonSchemas.profileCreation),

  // Header validation
  requireApiKey: validate.headers(commonSchemas.apiKeyHeaders),
  requireJson: validate.headers(commonSchemas.jsonHeaders),
};

/**
 * Sanitization functions
 */
export const sanitize = {
  /**
   * Sanitize HTML content to prevent XSS
   */
  html: (content: string): string => {
    return content
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  },

  /**
   * Sanitize SQL content to prevent injection
   */
  sql: (content: string): string => {
    return content
      .replace(/'/g, "''")
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
  },

  /**
   * Sanitize file paths
   */
  path: (path: string): string => {
    return path
      .replace(/\.\./g, '')
      .replace(/[<>:"|?*]/g, '')
      .replace(/\\/g, '/')
      .replace(/\/+/g, '/');
  },

  /**
   * Sanitize email addresses
   */
  email: (email: string): string => {
    return email.toLowerCase().trim();
  },

  /**
   * Sanitize usernames
   */
  username: (username: string): string => {
    return username
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_-]/g, '');
  },
};

/**
 * Custom validation functions
 */
export const customValidators = {
  /**
   * Validate password strength
   */
  strongPassword: (password: string): boolean => {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength && hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar
    );
  },

  /**
   * Validate module ID format
   */
  moduleId: (id: string): boolean => {
    return /^[a-z0-9-]+$/.test(id) && id.length >= 3 && id.length <= 50;
  },

  /**
   * Validate semantic version
   */
  semver: (version: string): boolean => {
    return /^\d+\.\d+\.\d+(-[a-zA-Z0-9-]+)?(\+[a-zA-Z0-9-]+)?$/.test(version);
  },

  /**
   * Validate URL format
   */
  url: (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate JSON string
   */
  json: (jsonString: string): boolean => {
    try {
      JSON.parse(jsonString);
      return true;
    } catch {
      return false;
    }
  },
};
