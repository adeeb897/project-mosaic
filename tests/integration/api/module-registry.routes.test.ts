/**
 * Integration tests for Module Registry API routes
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../../src/api/routes';
import { generateTestToken } from '../../utils/test-utils';
import { generateId } from '../../utils/mock-data-generator';

// Mock the database module
jest.mock('../../../src/persistence/database', () => ({
  getCollection: jest.fn().mockImplementation(() => ({
    findOne: jest.fn().mockResolvedValue(null),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
    }),
    insertOne: jest.fn().mockResolvedValue({ insertedId: generateId() }),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
  })),
}));

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock the module registry service
jest.mock('../../../src/services/module/module-registry.service', () => ({
  getModuleRegistryService: jest.fn().mockReturnValue({
    registerModule: jest.fn().mockResolvedValue({
      id: 'test-module-123',
      name: 'Test Module',
      version: '1.0.0',
    }),
    searchModules: jest.fn().mockResolvedValue({
      modules: [],
      total: 0,
    }),
    getModuleById: jest.fn().mockResolvedValue({
      id: 'test-module-123',
      name: 'Test Module',
      version: '1.0.0',
    }),
    updateModule: jest.fn().mockResolvedValue({
      id: 'test-module-123',
      name: 'Updated Test Module',
      version: '1.0.1',
    }),
    addModuleVersion: jest.fn().mockResolvedValue({
      id: 'test-module-123',
      version: '1.1.0',
    }),
    getModuleVersions: jest.fn().mockResolvedValue([
      { version: '1.0.0', createdAt: new Date() },
      { version: '1.1.0', createdAt: new Date() },
    ]),
    getLatestVersion: jest.fn().mockResolvedValue({
      version: '1.1.0',
      createdAt: new Date(),
    }),
    installModule: jest.fn().mockResolvedValue({
      moduleId: 'test-module-123',
      installedAt: new Date(),
    }),
    getInstalledModules: jest.fn().mockResolvedValue([]),
    updateInstallation: jest.fn().mockResolvedValue({
      moduleId: 'test-module-123',
      updatedAt: new Date(),
    }),
    uninstallModule: jest.fn().mockResolvedValue({
      moduleId: 'test-module-123',
      uninstalledAt: new Date(),
    }),
    getModuleDependencies: jest.fn().mockResolvedValue([]),
    checkConflicts: jest.fn().mockResolvedValue({
      conflicts: [],
      warnings: [],
    }),
  }),
}));

// Mock the auth middleware
jest.mock('../../../src/api/middleware/auth.middleware', () => {
  const authenticate = jest.fn().mockImplementation((req: any, res: any, next: any) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    try {
      const secret = process.env.JWT_SECRET || 'test_jwt_secret';
      const decoded = jwt.verify(token, secret) as any;
      req.user = {
        id: decoded.id,
        email: decoded.email,
        roles: decoded.roles,
      };
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Invalid token' });
    }
  });

  const authorize = jest.fn().mockImplementation((roles: string[]) => (req: any, res: any, next: any) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (roles && !req.user.roles.some((role: string) => roles.includes(role))) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  });

  return {
    authenticate,
    authorize,
    authMiddleware: [authenticate, authorize(['user', 'admin'])],
    adminMiddleware: [authenticate, authorize(['admin'])],
  };
});

describe('Module Registry API Routes', () => {
  const validToken = generateTestToken(generateId(), ['user']);

  describe('POST /api/modules/register', () => {
    it('should register a new module with valid data', async () => {
      // Arrange
      const moduleData = {
        name: 'Test Module',
        description: 'A test module',
        version: '1.0.0',
        type: 'AGENT',
        author: {
          id: 'author-123',
          name: 'Test Author',
        },
        metadata: {
          schemaVersion: '1.0',
          license: 'MIT',
          compatibility: {
            minPlatformVersion: '1.0.0',
            targetPlatformVersion: '1.0.0',
          },
        },
      };

      // Act
      const response = await request(app)
        .post('/api/modules/register')
        .set('Authorization', `Bearer ${validToken}`)
        .send(moduleData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: expect.any(String),
          name: 'Test Module',
          version: '1.0.0',
        }),
      });
    });

    it('should return 400 for missing required fields', async () => {
      // Arrange
      const invalidModuleData = {
        name: 'Test Module',
        // Missing required fields
      };

      // Act
      const response = await request(app)
        .post('/api/modules/register')
        .set('Authorization', `Bearer ${validToken}`)
        .send(invalidModuleData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should return 401 for unauthenticated requests', async () => {
      // Act
      const response = await request(app)
        .post('/api/modules/register')
        .send({});

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/modules/search', () => {
    it('should search modules with query parameters', async () => {
      // Act
      const response = await request(app)
        .get('/api/modules/search')
        .set('Authorization', `Bearer ${validToken}`)
        .query({ query: 'test' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          modules: expect.any(Array),
          total: expect.any(Number),
        }),
      });
    });

    it('should search modules without query parameters', async () => {
      // Act
      const response = await request(app)
        .get('/api/modules/search')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          modules: expect.any(Array),
          total: expect.any(Number),
        }),
      });
    });
  });

  describe('GET /api/modules/:moduleId', () => {
    it('should get module by ID', async () => {
      // Arrange
      const moduleId = 'test-module-123';

      // Act
      const response = await request(app)
        .get(`/api/modules/${moduleId}`)
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: moduleId,
          name: expect.any(String),
          version: expect.any(String),
        }),
      });
    });
  });

  describe('PUT /api/modules/:moduleId', () => {
    it('should update module with valid data', async () => {
      // Arrange
      const moduleId = 'test-module-123';
      const updateData = {
        name: 'Updated Test Module',
        description: 'Updated description',
        version: '1.0.1',
        type: 'AGENT',
        author: {
          id: 'author-123',
          name: 'Test Author',
        },
        metadata: {
          schemaVersion: '1.0',
          license: 'MIT',
          compatibility: {
            minPlatformVersion: '1.0.0',
            targetPlatformVersion: '1.0.1',
          },
        },
      };

      // Act
      const response = await request(app)
        .put(`/api/modules/${moduleId}`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: moduleId,
          name: 'Updated Test Module',
        }),
      });
    });
  });

  describe('POST /api/modules/:moduleId/versions', () => {
    it('should add a new version to a module', async () => {
      // Arrange
      const moduleId = 'test-module-123';
      const versionData = {
        version: '1.1.0',
        changelog: 'Added new features',
        releaseNotes: 'This version includes bug fixes',
      };

      // Act
      const response = await request(app)
        .post(`/api/modules/${moduleId}/versions`)
        .set('Authorization', `Bearer ${validToken}`)
        .send(versionData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          id: moduleId,
          version: '1.1.0',
        }),
      });
    });
  });

  describe('GET /api/modules/:moduleId/versions', () => {
    it('should get all versions of a module', async () => {
      // Arrange
      const moduleId = 'test-module-123';

      // Act
      const response = await request(app)
        .get(`/api/modules/${moduleId}/versions`)
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.any(Array),
      });
    });
  });

  describe('POST /api/modules/:moduleId/install', () => {
    it('should install a module', async () => {
      // Arrange
      const moduleId = 'test-module-123';

      // Act
      const response = await request(app)
        .post(`/api/modules/${moduleId}/install`)
        .set('Authorization', `Bearer ${validToken}`)
        .send({ version: '1.0.0' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.objectContaining({
          moduleId: moduleId,
          installedAt: expect.any(String),
        }),
      });
    });
  });

  describe('GET /api/modules/installations', () => {
    it('should get installed modules', async () => {
      // Act
      const response = await request(app)
        .get('/api/modules/installations')
        .set('Authorization', `Bearer ${validToken}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: expect.any(Array),
      });
    });
  });
});