/**
 * Integration tests for User API routes
 */

import request from 'supertest';
import jwt from 'jsonwebtoken';
import { app } from '../../../src/api/routes';
import { UserStatus } from '../../../src/types';
import { generateMockUser, generateId } from '../../utils/mock-data-generator';
import { generateTestToken } from '../../utils/test-utils';

// Define a type for our mock user
interface MockUser {
  id: string;
  username: string;
  email: string;
  status?: UserStatus;
  [key: string]: unknown;
}

// Mock the database module
jest.mock('../../../src/persistence/database', () => {
  // Store mock data in memory for the duration of the tests
  const users: Record<string, any> = {};
  const mockGenerateId = () => Math.random().toString(36).substring(2, 9);
  
  return {
    // Function to clear all data (for testing)
    __clearAllUsers: () => {
      Object.keys(users).forEach(key => delete users[key]);
    },
    getCollection: jest.fn().mockImplementation((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          findOne: jest.fn().mockImplementation(async query => {
            if (query.id) {
              return users[query.id] || null;
            } else if (query.username) {
              return (
                Object.values(users).find((user: any) => user.username === query.username) ||
                null
              );
            } else if (query.email) {
              return (
                Object.values(users).find((user: any) => user.email === query.email) || null
              );
            }
            return null;
          }),
          find: jest.fn().mockImplementation((query = {}) => {
            let filteredUsers = Object.values(users);

            // Apply filters
            if (query.status) {
              filteredUsers = filteredUsers.filter(
                (user: any) => user.status === query.status
              );
            }

            return {
              sort: jest.fn().mockReturnThis(),
              skip: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              toArray: jest.fn().mockResolvedValue(filteredUsers),
            };
          }),
          insertOne: jest.fn().mockImplementation(async user => {
            const id = user.id || mockGenerateId();
            user.id = id;
            users[id] = user;
            return { insertedId: id };
          }),
          updateOne: jest.fn().mockImplementation(async (query, update) => {
            const user = users[query.id];
            if (!user) {
              return { modifiedCount: 0 };
            }

            if (update.$set) {
              // Handle nested paths like 'preferences.theme'
              const updateSet = update.$set as Record<string, unknown>;
              Object.entries(updateSet).forEach(([key, value]) => {
                if (key.includes('.')) {
                  const [parent, child] = key.split('.');
                  if (!user[parent]) {
                    user[parent] = {};
                  }
                  user[parent][child] = value;
                } else {
                  user[key] = value;
                }
              });
            }

            return { modifiedCount: 1 };
          }),
          deleteOne: jest.fn().mockImplementation(async query => {
            if (users[query.id]) {
              delete users[query.id];
              return { deletedCount: 1 };
            }
            return { deletedCount: 0 };
          }),
        };
      }

      return {
        findOne: jest.fn().mockResolvedValue(null),
        find: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue([]),
        insertOne: jest.fn().mockResolvedValue({ insertedId: mockGenerateId() }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
        deleteOne: jest.fn().mockResolvedValue({ deletedCount: 0 }),
      };
    }),
  };
});

// Define types for Express request and response
interface MockRequest {
  headers: {
    authorization?: string;
    [key: string]: unknown;
  };
  user?: {
    id: string;
    email: string;
    roles: string[];
  };
  [key: string]: unknown;
}

interface MockResponse {
  status: (code: number) => MockResponse;
  json: (data: Record<string, unknown>) => MockResponse;
  [key: string]: unknown;
}

// Mock the auth middleware
jest.mock('../../../src/api/middleware/auth.middleware', () => {
  const authenticate = jest
    .fn()
    .mockImplementation((req: MockRequest, res: MockResponse, next: () => void) => {
      // Check for Authorization header
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = authHeader.split(' ')[1];

      try {
        // Verify token
        const secret = process.env.JWT_SECRET || 'test_jwt_secret';
        interface DecodedToken {
          id: string;
          email: string;
          roles: string[];
          [key: string]: unknown;
        }

        const decoded = jwt.verify(token, secret) as DecodedToken;

        // Set user on request
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

  const authorize = jest
    .fn()
    .mockImplementation(
      (roles: string[]) => (req: MockRequest, res: MockResponse, next: () => void) => {
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        if (roles && !req.user.roles.some((role: string) => roles.includes(role))) {
          return res.status(403).json({ error: 'Forbidden' });
        }

        next();
      }
    );

  return {
    authenticate,
    authorize,
    authMiddleware: [authenticate, authorize(['user', 'admin'])],
    adminMiddleware: [authenticate, authorize(['admin'])],
  };
});

describe('User API Routes', () => {
  beforeEach(async () => {
    // Clear the mock database before each test
    const mockDb = await import('../../../src/persistence/database');
    (mockDb as any).__clearAllUsers();
  });

  describe('GET /api/users/:id', () => {
    it('should return a user by ID', async () => {
      // Arrange
      const mockUser = generateMockUser();
      const token = generateTestToken(mockUser.id, ['admin']);

      // Seed the mock database
      const { getCollection } = await import('../../../src/persistence/database');
      const collection = getCollection('users');
      await collection.insertOne(mockUser);

      // Act
      const response = await request(app)
        .get(`/api/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          username: mockUser.username,
          email: mockUser.email,
        })
      );
    });

    it('should return 404 if user is not found', async () => {
      // Arrange
      const userId = generateId();
      const token = generateTestToken(generateId(), ['admin']);

      // Act
      const response = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('not found'),
        })
      );
    });

    it('should return 401 if not authenticated', async () => {
      // Arrange
      const userId = generateId();

      // Act
      const response = await request(app).get(`/api/users/${userId}`);

      // Assert
      expect(response.status).toBe(401);
    });

    it('should return 403 if not authorized', async () => {
      // Arrange
      const mockUser = generateMockUser();
      const token = generateTestToken(generateId(), ['user']); // Not an admin

      // Seed the mock database
      const { getCollection } = await import('../../../src/persistence/database');
      const collection = getCollection('users');
      await collection.insertOne(mockUser);

      // Act
      const response = await request(app)
        .get(`/api/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      // Arrange
      const adminToken = generateTestToken(generateId(), ['admin']);
      const userData = {
        username: 'newuser',
        email: 'newuser@example.com',
        password: 'password123',
        displayName: 'New User',
      };

      // Act
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          username: userData.username,
          email: userData.email,
          displayName: userData.displayName,
        })
      );
      expect(response.body).not.toHaveProperty('password'); // Password should not be returned
    });

    it('should return 400 if username already exists', async () => {
      // Arrange
      const adminToken = generateTestToken(generateId(), ['admin']);
      const existingUser = generateMockUser();
      const userData = {
        username: existingUser.username,
        email: 'different@example.com',
        password: 'password123',
      };

      // Seed the mock database
      const { getCollection } = await import('../../../src/persistence/database');
      const collection = getCollection('users');
      await collection.insertOne(existingUser);

      // Act
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('Username already exists'),
        })
      );
    });

    it('should return 400 if email already exists', async () => {
      // Arrange
      const adminToken = generateTestToken(generateId(), ['admin']);
      const existingUser = generateMockUser();
      const userData = {
        username: 'differentuser',
        email: existingUser.email,
        password: 'password123',
      };

      // Seed the mock database
      const { getCollection } = await import('../../../src/persistence/database');
      const collection = getCollection('users');
      await collection.insertOne(existingUser);

      // Act
      const response = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(userData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('Email already exists'),
        })
      );
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update an existing user', async () => {
      // Arrange
      const mockUser = generateMockUser();
      const token = generateTestToken(mockUser.id, ['admin']);
      const updateData = {
        displayName: 'Updated Name',
        preferences: {
          theme: 'dark',
        },
      };

      // Seed the mock database
      const { getCollection } = await import('../../../src/persistence/database');
      const collection = getCollection('users');
      await collection.insertOne(mockUser);

      // Act
      const response = await request(app)
        .put(`/api/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          id: mockUser.id,
          displayName: updateData.displayName,
          preferences: expect.objectContaining({
            theme: updateData.preferences.theme,
          }),
        })
      );
    });

    it('should return 404 if user is not found', async () => {
      // Arrange
      const userId = generateId();
      const token = generateTestToken(generateId(), ['admin']);
      const updateData = {
        displayName: 'Updated Name',
      };

      // Act
      const response = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateData);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('not found'),
        })
      );
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should mark a user as deleted', async () => {
      // Arrange
      const mockUser = generateMockUser();
      const token = generateTestToken(generateId(), ['admin']);

      // Seed the mock database
      const { getCollection } = await import('../../../src/persistence/database');
      const collection = getCollection('users');
      await collection.insertOne(mockUser);

      // Act
      const response = await request(app)
        .delete(`/api/users/${mockUser.id}`)
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          success: true,
        })
      );

      // Verify user is marked as deleted
      const updatedUser = await collection.findOne({ id: mockUser.id });
      expect(updatedUser?.status).toBe(UserStatus.DELETED);
    });

    it('should return 404 if user is not found', async () => {
      // Arrange
      const userId = generateId();
      const token = generateTestToken(generateId(), ['admin']);

      // Act
      const response = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${token}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('not found'),
        })
      );
    });
  });

  describe('GET /api/users', () => {
    it('should return a list of users with pagination', async () => {
      // Arrange
      const token = generateTestToken(generateId(), ['admin']);
      const mockUsers = [generateMockUser(), generateMockUser(), generateMockUser()];

      // Seed the mock database
      const { getCollection } = await import('../../../src/persistence/database');
      const collection = getCollection('users');
      for (const user of mockUsers) {
        await collection.insertOne(user);
      }

      // Act
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .query({ page: 1, limit: 10 });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(mockUsers.length);
      expect(response.body).toEqual(
        expect.arrayContaining(
          mockUsers.map(user =>
            expect.objectContaining({
              id: user.id,
              username: user.username,
            })
          )
        )
      );
    });

    it('should filter users by status', async () => {
      // Arrange
      const token = generateTestToken(generateId(), ['admin']);
      const activeUser = generateMockUser({ status: UserStatus.ACTIVE });
      const suspendedUser = generateMockUser({ status: UserStatus.SUSPENDED });

      // Seed the mock database
      const { getCollection } = await import('../../../src/persistence/database');
      const collection = getCollection('users');
      await collection.insertOne(activeUser);
      await collection.insertOne(suspendedUser);

      // Act
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${token}`)
        .query({ status: UserStatus.ACTIVE });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toEqual(
        expect.objectContaining({
          id: activeUser.id,
          status: UserStatus.ACTIVE,
        })
      );
    });
  });
});
