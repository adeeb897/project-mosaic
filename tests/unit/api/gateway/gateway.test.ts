/**
 * API Gateway Tests
 */

import express from 'express';
import request from 'supertest';
import { ApiGateway, createApiGateway, GatewayError, ErrorCode } from '../../../../src/api/gateway';
import { logger } from '../../../../src/utils/logger';

// Mock logger to avoid console output during tests
jest.mock('../../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock auth middleware
jest.mock('../../../../src/api/middleware/auth.middleware', () => ({
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = { id: 'test-user', email: 'test@example.com', roles: ['user'] };
    next();
  }),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe('API Gateway', () => {
  let app: express.Express;
  let gateway: ApiGateway;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    gateway = createApiGateway(app);
  });

  afterEach(() => {
    if (gateway.isReady()) {
      gateway.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize successfully', () => {
      expect(() => gateway.initialize()).not.toThrow();
      expect(gateway.isReady()).toBe(true);
    });

    it('should not initialize twice', () => {
      gateway.initialize();
      expect(gateway.isReady()).toBe(true);

      // Should not throw but should warn
      gateway.initialize();
      expect(logger.warn).toHaveBeenCalledWith('API Gateway is already initialized');
    });

    it('should throw error when adding middleware before initialization', () => {
      expect(() => {
        gateway.use((req, res, next) => next());
      }).toThrow('Gateway must be initialized before adding custom middleware');
    });
  });

  describe('Configuration', () => {
    it('should use default configuration', () => {
      const config = gateway.getConfig();
      expect(config.monitoring.enableMetrics).toBe(true);
      expect(config.validation.enableRequestValidation).toBe(true);
    });

    it('should merge custom configuration', () => {
      const customGateway = createApiGateway(app, {
        monitoring: {
          enableMetrics: false,
          enableTracing: false,
          enableHealthChecks: false,
          metricsEndpoint: '/metrics',
          healthEndpoint: '/health',
        },
      });

      const config = customGateway.getConfig();
      expect(config.monitoring.enableMetrics).toBe(false);
    });

    it('should not allow configuration updates after initialization', () => {
      gateway.initialize();
      expect(() => {
        gateway.updateConfig({
          monitoring: {
            enableMetrics: false,
            enableTracing: false,
            enableHealthChecks: false,
            metricsEndpoint: '/metrics',
            healthEndpoint: '/health',
          },
        });
      }).toThrow('Cannot update configuration after gateway is initialized');
    });
  });

  describe('Health Endpoint', () => {
    beforeEach(() => {
      gateway.initialize();
    });

    it('should respond to health check', async () => {
      const response = await request(app).get('/api/v1/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('timestamp');
      expect(response.body.data).toHaveProperty('uptime');
      expect(response.body.data).toHaveProperty('checks');
    });
  });

  describe('Metrics Endpoint', () => {
    beforeEach(() => {
      gateway.initialize();
    });

    it('should respond to metrics endpoint', async () => {
      const response = await request(app).get('/api/v1/metrics');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('system');
      expect(response.body.data).toHaveProperty('requests');
    });

    it('should respond to prometheus metrics endpoint', async () => {
      const response = await request(app).get('/api/v1/metrics/prometheus');

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('http_requests_total');
    });
  });

  describe('Response Formatting', () => {
    beforeEach(() => {
      gateway.initialize();
    });

    it('should format 404 responses', async () => {
      const response = await request(app).get('/test/error');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body).toHaveProperty('metadata');
    });
  });

  describe('Rate Limiting', () => {
    beforeEach(() => {
      // Add a test route
      const routes = new Map<string, express.RequestHandler>();
      routes.set('/api/test', (req, res) => {
        res.json({ message: 'test' });
      });
      gateway.initialize(routes);
    });

    it('should add rate limit headers', async () => {
      const response = await request(app).get('/api/test');

      expect(response.headers).toHaveProperty('x-ratelimit-limit');
      expect(response.headers).toHaveProperty('x-ratelimit-remaining');
      expect(response.headers).toHaveProperty('x-ratelimit-reset');
    });
  });

  describe('Request Context', () => {
    beforeEach(() => {
      // Add a test route that uses context
      const routes = new Map<string, express.RequestHandler>();
      routes.set('/test/context', (req, res) => {
        res.json({
          requestId: req.context?.requestId,
          hasContext: !!req.context,
        });
      });
      gateway.initialize(routes);
    });

    it('should add request context', async () => {
      const response = await request(app).get('/test/context');

      expect(response.status).toBe(200);
      expect(response.body.data.hasContext).toBe(true);
      expect(response.body.data.requestId).toBeDefined();
      expect(response.headers).toHaveProperty('x-request-id');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      // Add test routes that throw errors
      const routes = new Map<string, express.RequestHandler>();
      routes.set('/test/gateway-error', (req, res, next) => {
        const error = new GatewayError(ErrorCode.VALIDATION_ERROR, 'Test validation error', 400);
        next(error);
      });
      routes.set('/test/generic-error', (req, res, next) => {
        const error = new Error('Generic error');
        next(error);
      });
      gateway.initialize(routes);
    });

    it('should handle gateway errors', async () => {
      const response = await request(app).get('/test/gateway-error');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.message).toBe('Test validation error');
    });

    it('should handle generic errors', async () => {
      const response = await request(app).get('/test/generic-error');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('INTERNAL_SERVER_ERROR');
    });

    it('should handle 404 errors', async () => {
      const response = await request(app).get('/nonexistent-route');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe('Route not found');
    });
  });

  describe('Authentication', () => {
    beforeEach(() => {
      // Add protected route
      const routes = new Map<string, express.RequestHandler>();
      routes.set('/api/v1/protected', (req, res) => {
        res.json({ user: req.user });
      });
      gateway.initialize(routes);
    });

    it('should allow access to public routes', async () => {
      const response = await request(app).get('/api/v1/health');
      expect(response.status).toBe(200);
    });

    it('should authenticate protected routes', async () => {
      const response = await request(app)
        .get('/api/v1/protected')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.data.user).toBeDefined();
    });
  });

  describe('Graceful Shutdown', () => {
    it('should shutdown gracefully', async () => {
      gateway.initialize();
      expect(gateway.isReady()).toBe(true);

      await expect(gateway.shutdown()).resolves.not.toThrow();
      expect(logger.info).toHaveBeenCalledWith('API Gateway shutdown completed');
    });
  });
});
