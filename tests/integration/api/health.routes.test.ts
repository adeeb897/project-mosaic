/**
 * Integration tests for Health API routes
 */

import request from 'supertest';
import { app } from '../../../src/api/routes';
import { getDatabaseStatus } from '../../../src/persistence/database';

// Mock the database module
jest.mock('../../../src/persistence/database', () => ({
  getDatabaseStatus: jest.fn().mockReturnValue({
    connected: true,
    status: 'connected',
  }),
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Health API Routes', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      // Act
      const response = await request(app).get('/api/health');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'ok',
          timestamp: expect.any(String),
          uptime: expect.any(Number),
          database: {
            connected: true,
            status: 'connected',
          },
          memory: expect.objectContaining({
            rss: expect.any(String),
            heapTotal: expect.any(String),
            heapUsed: expect.any(String),
          }),
          environment: expect.any(String),
        })
      );
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      (getDatabaseStatus as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      // Act
      const response = await request(app).get('/api/health');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'error',
          message: 'Health check failed',
          error: 'Database connection failed',
        })
      );
    });
  });

  describe('GET /api/health/readiness', () => {
    it('should return ready status when database is connected', async () => {
      // Arrange
      (getDatabaseStatus as jest.Mock).mockReturnValue({
        connected: true,
        status: 'connected',
      });

      // Act
      const response = await request(app).get('/api/health/readiness');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        message: 'Application is ready',
      });
    });

    it('should return not ready status when database is disconnected', async () => {
      // Arrange
      (getDatabaseStatus as jest.Mock).mockReturnValue({
        connected: false,
        status: 'disconnected',
      });

      // Act
      const response = await request(app).get('/api/health/readiness');

      // Assert
      expect(response.status).toBe(503);
      expect(response.body).toEqual({
        status: 'error',
        message: 'Application is not ready',
        details: 'Database connection is not established',
      });
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      (getDatabaseStatus as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Database status check failed');
      });

      // Act
      const response = await request(app).get('/api/health/readiness');

      // Assert
      expect(response.status).toBe(500);
      expect(response.body).toEqual(
        expect.objectContaining({
          status: 'error',
          message: 'Readiness check failed',
          error: 'Database status check failed',
        })
      );
    });
  });

  describe('GET /api/health/liveness', () => {
    it('should return alive status', async () => {
      // Act
      const response = await request(app).get('/api/health/liveness');

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'ok',
        message: 'Application is alive',
      });
    });
  });
});
