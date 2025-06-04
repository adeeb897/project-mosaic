/**
 * Authentication Middleware Tests
 */

import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../../../src/api/middleware/auth.middleware';

// Mock the auth service
jest.mock('../../../../src/services/auth/auth.service', () => ({
  AuthService: jest.fn().mockImplementation(() => ({
    isTokenRevoked: jest.fn().mockResolvedValue(false),
  })),
  TokenType: {
    ACCESS: 'access',
    REFRESH: 'refresh',
  },
}));

// Mock jwt
jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}));

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();

    // Reset environment variables
    delete process.env.NODE_ENV;
    delete process.env.BYPASS_AUTH_IN_DEV;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Authentication Bypass in Development', () => {
    it('should bypass authentication when NODE_ENV=development and BYPASS_AUTH_IN_DEV=true', async () => {
      // Set environment variables for bypass
      process.env.NODE_ENV = 'development';
      process.env.BYPASS_AUTH_IN_DEV = 'true';

      // Mock console.log to capture the bypass message
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Should set mock user
      expect(mockRequest.user).toEqual({
        id: 'dev-user-id',
        email: 'dev@example.com',
        roles: ['user', 'admin'],
      });

      // Should call next() without errors
      expect(mockNext).toHaveBeenCalledWith();

      // Should log bypass message
      expect(consoleSpy).toHaveBeenCalledWith('🔓 Authentication bypassed for development');

      // Should not call response methods
      expect(mockResponse.status).not.toHaveBeenCalled();
      expect(mockResponse.json).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should NOT bypass authentication when NODE_ENV is not development', async () => {
      // Set production environment
      process.env.NODE_ENV = 'production';
      process.env.BYPASS_AUTH_IN_DEV = 'true';

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not set mock user
      expect(mockRequest.user).toBeUndefined();

      // Should return 401 error
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });

      // Should not call next()
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should NOT bypass authentication when BYPASS_AUTH_IN_DEV is not true', async () => {
      // Set development environment but bypass disabled
      process.env.NODE_ENV = 'development';
      process.env.BYPASS_AUTH_IN_DEV = 'false';

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not set mock user
      expect(mockRequest.user).toBeUndefined();

      // Should return 401 error
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });

      // Should not call next()
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should NOT bypass authentication when BYPASS_AUTH_IN_DEV is undefined', async () => {
      // Set development environment but bypass not set
      process.env.NODE_ENV = 'development';
      // BYPASS_AUTH_IN_DEV is undefined

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Should not set mock user
      expect(mockRequest.user).toBeUndefined();

      // Should return 401 error
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });

      // Should not call next()
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('Normal Authentication Flow', () => {
    it('should require Authorization header when bypass is disabled', async () => {
      // Normal production environment
      process.env.NODE_ENV = 'production';

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Should return 401 error
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });

      // Should not call next()
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should require Bearer token format', async () => {
      // Set invalid authorization header
      mockRequest.headers = {
        authorization: 'Basic invalid-token',
      };

      await authenticate(mockRequest as Request, mockResponse as Response, mockNext);

      // Should return 401 error
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({ error: 'Unauthorized' });

      // Should not call next()
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
