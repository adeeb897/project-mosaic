/**
 * Unified API Gateway
 * Main gateway class that orchestrates all middleware components
 */

import { Express, Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { GatewayConfig, GatewayError } from './types';
import {
  contextMiddleware,
  responseTimeMiddleware,
  createAdvancedRateLimit,
  defaultRateLimitConfig,
  cleanupRateLimit,
  createValidationMiddleware,
  validators,
  metricsMiddleware,
  healthEndpoint,
  metricsEndpoint,
  prometheusMetrics,
  cleanupMonitoring,
  responseFormattingMiddleware,
  responseHelpersMiddleware,
} from './middleware';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { logger } from '@utils/logger';

/**
 * Default gateway configuration
 */
const defaultGatewayConfig: GatewayConfig = {
  rateLimit: defaultRateLimitConfig,
  authentication: {
    jwtSecret: process.env.JWT_SECRET || 'jwt_secret',
    jwtExpiresIn: '1h',
    refreshTokenExpiresIn: '7d',
    publicRoutes: [
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/health',
      '/api/v1/metrics',
    ],
    adminRoutes: ['/api/v1/admin'],
  },
  validation: {
    enableRequestValidation: true,
    enableResponseValidation: false,
    strictMode: true,
    customValidators: {},
  },
  monitoring: {
    enableMetrics: true,
    enableTracing: true,
    enableHealthChecks: true,
    metricsEndpoint: '/api/v1/metrics',
    healthEndpoint: '/api/v1/health',
  },
  cors: {
    origin: process.env.CORS_ORIGIN || true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin',
      'X-Requested-With',
      'Content-Type',
      'Accept',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'X-Correlation-ID',
    ],
    credentials: true,
  },
};

/**
 * API Gateway class
 */
export class ApiGateway {
  private app: Express;
  private config: GatewayConfig;
  private isInitialized: boolean = false;

  constructor(app: Express, config?: Partial<GatewayConfig>) {
    this.app = app;
    this.config = { ...defaultGatewayConfig, ...config };
  }

  /**
   * Initialize the API Gateway with all middleware
   */
  public initialize(testRoutes?: Map<string, RequestHandler>): void {
    if (this.isInitialized) {
      logger.warn('API Gateway is already initialized');
      return;
    }

    logger.info('Initializing API Gateway...');

    try {
      // 1. Security middleware (first)
      this.setupSecurity();

      // 2. CORS middleware
      this.setupCors();

      // 3. Request context and timing
      this.setupRequestContext();

      // 4. Response formatting
      this.setupResponseFormatting();

      // 5. Monitoring and metrics
      this.setupMonitoring();

      // 6. Rate limiting
      this.setupRateLimit();

      // 7. Authentication (before validation)
      this.setupAuthentication();

      // 8. Request validation
      this.setupValidation();

      // 9. Health and metrics endpoints
      this.setupSystemEndpoints();

      // 10. Test routes (if provided)
      if (testRoutes) {
        testRoutes.forEach((handler, path) => {
          this.app.use(path, handler);
        });
        logger.debug('Test routes configured');
      }

      // 11. Global error handling (last)
      this.setupErrorHandling();

      this.isInitialized = true;
      logger.info('API Gateway initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize API Gateway', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Setup security middleware
   */
  private setupSecurity(): void {
    // Helmet for security headers
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
        hsts: {
          maxAge: 31536000,
          includeSubDomains: true,
          preload: true,
        },
      })
    );

    logger.debug('Security middleware configured');
  }

  /**
   * Setup CORS middleware
   */
  private setupCors(): void {
    this.app.use(cors(this.config.cors));
    logger.debug('CORS middleware configured');
  }

  /**
   * Setup request context and timing middleware
   */
  private setupRequestContext(): void {
    this.app.use(contextMiddleware);
    this.app.use(responseTimeMiddleware);
    logger.debug('Request context middleware configured');
  }

  /**
   * Setup response formatting middleware
   */
  private setupResponseFormatting(): void {
    this.app.use(responseHelpersMiddleware);
    this.app.use(responseFormattingMiddleware);
    logger.debug('Response formatting middleware configured');
  }

  /**
   * Setup monitoring and metrics middleware
   */
  private setupMonitoring(): void {
    if (this.config.monitoring.enableMetrics) {
      this.app.use(metricsMiddleware);
      logger.debug('Metrics middleware configured');
    }
  }

  /**
   * Setup rate limiting middleware
   */
  private setupRateLimit(): void {
    const rateLimitMiddleware = createAdvancedRateLimit(this.config.rateLimit);
    this.app.use('/api', rateLimitMiddleware);
    logger.debug('Rate limiting middleware configured');
  }

  /**
   * Setup authentication middleware
   */
  private setupAuthentication(): void {
    // Skip authentication for public routes
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const isPublicRoute = this.config.authentication.publicRoutes.some(route =>
        req.path.startsWith(route)
      );

      if (isPublicRoute) {
        return next();
      }

      // Apply authentication for protected routes
      authenticate(req, res, next);
    });

    logger.debug('Authentication middleware configured');
  }

  /**
   * Setup request validation middleware
   */
  private setupValidation(): void {
    if (!this.config.validation.enableRequestValidation) {
      return;
    }

    // Add common validation middleware for specific routes
    this.app.use('/api/v1/users/:id', validators.idParam);
    this.app.use('/api/v1/modules/:id', validators.idParam);
    this.app.use('/api/v1/profiles/:id', validators.idParam);
    this.app.use('/api/v1/chat/:id', validators.idParam);

    logger.debug('Validation middleware configured');
  }

  /**
   * Setup system endpoints (health, metrics)
   */
  private setupSystemEndpoints(): void {
    if (this.config.monitoring.enableHealthChecks) {
      this.app.get(this.config.monitoring.healthEndpoint, healthEndpoint);
    }

    if (this.config.monitoring.enableMetrics) {
      this.app.get(this.config.monitoring.metricsEndpoint, metricsEndpoint);
      this.app.get('/api/v1/metrics/prometheus', prometheusMetrics);
    }

    logger.debug('System endpoints configured');
  }

  /**
   * Setup global error handling middleware
   */
  private setupErrorHandling(): void {
    // 404 handler for unmatched routes
    this.app.use('*', (req: Request, res: Response) => {
      res.notFound('Route');
    });

    // Global error handler
    this.app.use(
      (error: Error | GatewayError, req: Request, res: Response, _next: NextFunction) => {
        // Log the error
        logger.error('Unhandled error in API Gateway', {
          error: error.message,
          stack: error.stack,
          requestId: req.context?.requestId,
          path: req.path,
          method: req.method,
          userAgent: req.get('User-Agent'),
          ip: req.ip,
        });

        // Handle different error types
        if (error instanceof GatewayError) {
          return res.status(error.statusCode).json({
            success: false,
            error: {
              code: error.code,
              message: error.message,
              details: error.details,
            },
            metadata: {
              requestId: req.context?.requestId || 'unknown',
              timestamp: new Date().toISOString(),
              processingTime: Date.now() - (req.context?.startTime || Date.now()),
              version: process.env.API_VERSION || '1.0.0',
            },
          });
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
          return res.validationError([
            {
              field: 'unknown',
              message: error.message,
              code: 'VALIDATION_ERROR',
            },
          ]);
        }

        // Handle JWT errors
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
          return res.unauthorized('Invalid or expired token');
        }

        // Default to internal server error
        res.internalError(
          process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
          process.env.NODE_ENV === 'development' ? { stack: error.stack } : undefined
        );
      }
    );

    logger.debug('Error handling middleware configured');
  }

  /**
   * Add custom middleware to the gateway
   */
  public use(middleware: (req: Request, res: Response, next: NextFunction) => void): void {
    if (!this.isInitialized) {
      throw new Error('Gateway must be initialized before adding custom middleware');
    }
    this.app.use(middleware);
  }

  /**
   * Add route-specific validation
   */
  public addValidation(path: string, validation: any): void {
    if (!this.isInitialized) {
      throw new Error('Gateway must be initialized before adding validation');
    }
    this.app.use(path, createValidationMiddleware(validation));
  }

  /**
   * Add admin-only route protection
   */
  public protectAdminRoute(path: string): void {
    if (!this.isInitialized) {
      throw new Error('Gateway must be initialized before protecting routes');
    }
    this.app.use(path, authenticate, authorize(['admin']));
  }

  /**
   * Get gateway configuration
   */
  public getConfig(): GatewayConfig {
    return { ...this.config };
  }

  /**
   * Update gateway configuration (only before initialization)
   */
  public updateConfig(config: Partial<GatewayConfig>): void {
    if (this.isInitialized) {
      throw new Error('Cannot update configuration after gateway is initialized');
    }
    this.config = { ...this.config, ...config };
  }

  /**
   * Graceful shutdown
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down API Gateway...');

    try {
      // Cleanup rate limiting
      cleanupRateLimit();

      // Cleanup monitoring
      cleanupMonitoring();

      logger.info('API Gateway shutdown completed');
    } catch (error) {
      logger.error('Error during API Gateway shutdown', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Check if gateway is initialized
   */
  public isReady(): boolean {
    return this.isInitialized;
  }
}

/**
 * Create and configure API Gateway instance
 */
export function createApiGateway(app: Express, config?: Partial<GatewayConfig>): ApiGateway {
  return new ApiGateway(app, config);
}

/**
 * Export types and middleware for external use
 */
export * from './types';
export * from './middleware';
