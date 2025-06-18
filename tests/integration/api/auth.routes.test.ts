/**
 * Integration tests for Authentication API routes
 */

import request from 'supertest';
import { app } from '../../../src/api/routes';
import { UserStatus } from '../../../src/types';
import { generateMockUser, generateId } from '../../utils/mock-data-generator';

// Define types for our mock data
interface MockUser {
  id: string;
  username: string;
  email: string;
  passwordHash?: string;
  status?: UserStatus;
  roles?: Array<{ name: string }>;
  failedLoginAttempts?: number;
  lockUntil?: Date;
  [key: string]: unknown;
}

interface MockToken {
  userId: string;
  accessTokenId: string;
  refreshTokenId: string;
  revoked: boolean;
  revokedAt?: Date;
  [key: string]: unknown;
}

// Mock Google OAuth client - must be declared before jest.mock
jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => ({
    generateAuthUrl: jest
      .fn()
      .mockReturnValue('https://accounts.google.com/oauth/authorize?test=true'),
    getToken: jest.fn(),
    verifyIdToken: jest.fn(),
  })),
}));

// Mock JWT to avoid signing issues in tests
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-jwt-token'),
  verify: jest.fn().mockImplementation((token: string) => {
    if (token === 'mock-jwt-token' || token.startsWith('valid-')) {
      return {
        id: 'user-id',
        email: 'user@example.com',
        roles: ['user'],
        type: 'refresh',
        jti: 'token-id',
      };
    }
    throw new Error('Invalid token');
  }),
}));

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockImplementation(async (password: string) => `hashed_${password}`),
  compare: jest.fn().mockImplementation(async (password: string, hash: string) => {
    return hash === `hashed_${password}`;
  }),
}));

// Mock crypto with proper createHash for Express ETags
jest.mock('crypto', () => {
  const actualCrypto = jest.requireActual('crypto');
  return {
    ...actualCrypto,
    randomUUID: jest.fn().mockImplementation(() => `uuid_${Date.now()}_${Math.random()}`),
    randomBytes: jest.fn().mockImplementation((size: number) => ({
      toString: () => `random_${size}_bytes`,
    })),
    createHash: actualCrypto.createHash, // Use real createHash for Express
  };
});

// Mock the database module
jest.mock('../../../src/persistence/database', () => {
  // Store mock data in memory for the duration of the tests
  const users: Record<string, MockUser> = {};
  const tokens: Record<string, MockToken> = {};

  return {
    // Function to clear all data (for testing)
    __clearAllData: () => {
      Object.keys(users).forEach(key => delete users[key]);
      Object.keys(tokens).forEach(key => delete tokens[key]);
    },
    getCollection: jest.fn().mockImplementation((collectionName: string) => {
      if (collectionName === 'users') {
        return {
          findOne: jest.fn().mockImplementation(async query => {
            if (query.id) {
              return users[query.id] || null;
            } else if (query.username) {
              return (
                Object.values(users).find((user: MockUser) => user.username === query.username) ||
                null
              );
            } else if (query.email) {
              return (
                Object.values(users).find((user: MockUser) => user.email === query.email) || null
              );
            }
            return null;
          }),
          insertOne: jest.fn().mockImplementation(async user => {
            const id = user.id || generateId();
            user.id = id;
            users[id] = user;
            return { insertedId: id };
          }),
          updateOne: jest.fn().mockImplementation(async (query, update) => {
            const user = users[query.id] as MockUser;
            if (!user) {
              return { modifiedCount: 0 };
            }

            if (update.$set) {
              Object.assign(user, update.$set);
            }

            return { modifiedCount: 1 };
          }),
        };
      } else if (collectionName === 'tokens') {
        return {
          findOne: jest.fn().mockImplementation(async query => {
            if (query.tokenId) {
              return (
                Object.values(tokens).find(
                  (token: MockToken) =>
                    (token.accessTokenId === query.tokenId ||
                      token.refreshTokenId === query.tokenId) &&
                    query.revoked === token.revoked
                ) || null
              );
            }
            return null;
          }),
          insertOne: jest.fn().mockImplementation(async token => {
            const id = generateId();
            tokens[id] = { ...token, id };
            return { insertedId: id };
          }),
          updateOne: jest.fn().mockImplementation(async (query, update) => {
            const tokenEntry = Object.values(tokens).find(
              (token: MockToken) =>
                token.accessTokenId === query.tokenId ||
                token.refreshTokenId === query.tokenId ||
                token.userId === query.userId
            );

            if (!tokenEntry) {
              return { modifiedCount: 0 };
            }

            if (update.$set) {
              Object.assign(tokenEntry, update.$set);
            }

            return { modifiedCount: 1 };
          }),
        };
      }

      return {
        findOne: jest.fn().mockResolvedValue(null),
        insertOne: jest.fn().mockResolvedValue({ insertedId: generateId() }),
        updateOne: jest.fn().mockResolvedValue({ modifiedCount: 0 }),
      };
    }),
  };
});

describe('Authentication API Routes', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    // Clear the mock database before each test
    const mockDb = await import('../../../src/persistence/database');
    (mockDb as any).__clearAllData();
  });

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .set('Content-Type', 'application/json')
        .send('invalid json{');

      // Assert
      expect(response.status).toBe(400);
    });

    it('should handle missing required fields', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({});

      // Assert
      expect(response.status).toBe(400);
    });

    it('should handle malformed authorization header', async () => {
      // Act
      const response = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', 'malformed-header');

      // Assert
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      // Arrange
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        displayName: 'Test User',
      };

      // Act
      const response = await request(app).post('/api/v1/auth/register').send(userData);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        message: 'User registered successfully',
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: expect.any(String),
            username: userData.username,
            email: userData.email,
            displayName: userData.displayName,
          }),
          tokens: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            expiresIn: expect.any(Number),
          }),
        }),
      });
    });

    it('should return 400 if username already exists', async () => {
      // Arrange
      const existingUser = generateMockUser();
      const { getCollection } = await import('../../../src/persistence/database');
      const collection = getCollection('users');
      await collection.insertOne(existingUser);

      const userData = {
        username: existingUser.username,
        email: 'different@example.com',
        password: 'password123',
      };

      // Act
      const response = await request(app).post('/api/v1/auth/register').send(userData);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('Username already exists'),
        })
      );
    });

    it('should return 400 if required fields are missing', async () => {
      // Arrange
      const incompleteData = {
        username: 'testuser',
        // Missing email and password
      };

      // Act
      const response = await request(app).post('/api/v1/auth/register').send(incompleteData);

      // Assert
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Arrange
      const password = 'password123';
      const user = {
        ...generateMockUser(),
        passwordHash: `hashed_${password}`,
        status: UserStatus.ACTIVE,
        roles: [{ name: 'user' }],
      };

      const { getCollection } = await import('../../../src/persistence/database');
      const collection = getCollection('users');
      await collection.insertOne(user);

      const loginData = {
        email: user.email,
        password: password,
      };

      // Act
      const response = await request(app).post('/api/v1/auth/login').send(loginData);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'User logged in successfully',
        data: expect.objectContaining({
          user: expect.objectContaining({
            id: user.id,
            email: user.email,
          }),
          tokens: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            expiresIn: expect.any(Number),
          }),
        }),
      });
    });

    it('should return 401 for invalid email', async () => {
      // Arrange
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123',
      };

      // Act
      const response = await request(app).post('/api/v1/auth/login').send(loginData);

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('Invalid credentials'),
        })
      );
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh token successfully', async () => {
      // Arrange - Create user with the specific ID that JWT mock returns
      const user = {
        id: 'user-id', // Match the ID from JWT mock
        username: 'testuser',
        email: 'user@example.com', // Match the email from JWT mock
        status: UserStatus.ACTIVE,
        roles: [{ name: 'user' }],
        failedLoginAttempts: 0,
      };

      const { getCollection } = await import('../../../src/persistence/database');
      const userCollection = getCollection('users');
      await userCollection.insertOne(user);

      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: 'valid-refresh-token' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Token refreshed successfully',
        data: expect.objectContaining({
          tokens: expect.objectContaining({
            accessToken: expect.any(String),
            refreshToken: expect.any(String),
            expiresIn: expect.any(Number),
          }),
        }),
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      // Arrange
      const invalidToken = 'invalid.token.here';

      // Act
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .send({ refreshToken: invalidToken });

      // Assert
      expect(response.status).toBe(401);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('Invalid refresh token'),
        })
      );
    });
  });

  describe('GET /api/v1/auth/oauth/:provider', () => {
    it('should return OAuth authorization URL for Google', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/auth/oauth/google')
        .query({ state: 'test-state' });

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        status: 'success',
        data: expect.objectContaining({
          authUrl: expect.any(String),
        }),
      });
    });

    it('should return 400 for unsupported provider', async () => {
      // Act
      const response = await request(app)
        .get('/api/v1/auth/oauth/unsupported')
        .query({ state: 'test-state' });

      // Assert
      expect(response.status).toBe(400);
      expect(response.body).toEqual(
        expect.objectContaining({
          error: expect.stringContaining('Invalid OAuth provider'),
        })
      );
    });

    it('should return 400 if state parameter is missing', async () => {
      // Act
      const response = await request(app).get('/api/v1/auth/oauth/google');

      // Assert
      expect(response.status).toBe(400);
    });
  });
});
