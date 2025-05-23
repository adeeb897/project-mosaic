import { AuthService, TokenType, OAuthProvider } from '../../../src/services/auth/auth.service';
import { UserService } from '../../../src/services/user/user.service';
import { UserStatus } from '../../../src/types';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

// Mock dependencies
jest.mock('../../../src/services/user/user.service');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');
jest.mock('crypto');

// Mock database collection
const mockCollection = {
  findOne: jest.fn(),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
};

// Mock the database module
jest.mock('../../../src/persistence/database', () => ({
  getCollection: jest.fn(() => mockCollection),
}));

// Mock Google OAuth client
const mockGoogleOAuthClient = {
  generateAuthUrl: jest.fn(),
  getToken: jest.fn(),
  verifyIdToken: jest.fn(),
};

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn(() => mockGoogleOAuthClient),
}));

describe('AuthService', () => {
  let authService: AuthService;
  let mockUserService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock user service
    mockUserService = {
      createUser: jest.fn(),
      getUser: jest.fn(),
      getUserByEmail: jest.fn(),
      getUserByUsername: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      listUsers: jest.fn(),
    };

    // Mock UserService constructor
    (UserService as jest.MockedClass<typeof UserService>).mockImplementation(() => mockUserService);

    // Create auth service instance
    authService = new AuthService();

    // Mock crypto.randomUUID
    (crypto.randomUUID as jest.Mock).mockReturnValue('mock-uuid');

    // Mock bcrypt.hash
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    // Mock bcrypt.compare
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);

    // Mock jwt.sign
    (jwt.sign as jest.Mock).mockReturnValue('mock-token');

    // Mock jwt.verify
    (jwt.verify as jest.Mock).mockReturnValue({
      id: 'user-id',
      email: 'user@example.com',
      roles: ['user'],
      type: TokenType.REFRESH,
      jti: 'token-id',
    });
  });

  describe('register', () => {
    it('should register a new user and return tokens', async () => {
      // Mock user service createUser
      mockUserService.createUser.mockResolvedValue({
        id: 'user-id',
        username: 'testuser',
        email: 'user@example.com',
      });

      // Mock collection for token storage
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'token-doc-id' });

      const result = await authService.register(
        'testuser',
        'user@example.com',
        'password123',
        'Test User'
      );

      expect(result).toEqual({
        user: {
          id: 'user-id',
          username: 'testuser',
          email: 'user@example.com',
        },
        tokens: {
          accessToken: 'mock-token',
          refreshToken: 'mock-token',
          expiresIn: 900,
        },
      });

      expect(mockUserService.createUser).toHaveBeenCalledWith({
        username: 'testuser',
        email: 'user@example.com',
        password: 'hashed-password',
        displayName: 'Test User',
      });
    });
  });

  describe('login', () => {
    it('should login a user and return tokens', async () => {
      // Mock user service getUserByEmail
      mockUserService.getUserByEmail.mockResolvedValue({
        id: 'user-id',
        username: 'testuser',
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.ACTIVE,
        roles: [{ name: 'user' }],
      });

      // Mock user service updateUser
      mockUserService.updateUser.mockResolvedValue({
        id: 'user-id',
        username: 'testuser',
        email: 'user@example.com',
      });

      // Mock collection for token storage
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'token-doc-id' });

      const result = await authService.login('user@example.com', 'password123');

      expect(result).toEqual({
        user: {
          id: 'user-id',
          username: 'testuser',
          email: 'user@example.com',
          passwordHash: 'hashed-password',
          status: UserStatus.ACTIVE,
          roles: [{ name: 'user' }],
        },
        tokens: {
          accessToken: 'mock-token',
          refreshToken: 'mock-token',
          expiresIn: 900,
        },
      });

      expect(mockUserService.getUserByEmail).toHaveBeenCalledWith('user@example.com');
      expect(mockUserService.updateUser).toHaveBeenCalledWith('user-id', {
        lastLoginAt: expect.any(Date),
      });
    });

    it('should throw an error if credentials are invalid', async () => {
      // Mock user service getUserByEmail
      mockUserService.getUserByEmail.mockResolvedValue(null);

      await expect(authService.login('user@example.com', 'password123')).rejects.toThrow(
        'Invalid credentials'
      );
    });

    it('should throw an error if account is not active', async () => {
      // Mock user service getUserByEmail
      mockUserService.getUserByEmail.mockResolvedValue({
        id: 'user-id',
        username: 'testuser',
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.SUSPENDED,
        roles: [{ name: 'user' }],
      });

      await expect(authService.login('user@example.com', 'password123')).rejects.toThrow(
        'Account is not active'
      );
    });

    it('should throw an error if password is invalid', async () => {
      // Mock user service getUserByEmail
      mockUserService.getUserByEmail.mockResolvedValue({
        id: 'user-id',
        username: 'testuser',
        email: 'user@example.com',
        passwordHash: 'hashed-password',
        status: UserStatus.ACTIVE,
        roles: [{ name: 'user' }],
      });

      // Mock bcrypt.compare to return false
      (bcrypt.compare as jest.Mock).mockResolvedValueOnce(false);

      // Mock user service updateUser for failed login attempts
      mockUserService.getUser.mockResolvedValue({
        id: 'user-id',
        failedLoginAttempts: 0,
      });
      mockUserService.updateUser.mockResolvedValue({});

      await expect(authService.login('user@example.com', 'password123')).rejects.toThrow(
        'Invalid credentials'
      );
    });
  });

  describe('refreshToken', () => {
    it('should refresh a token and return new tokens', async () => {
      // Mock token verification
      (jwt.verify as jest.Mock).mockReturnValue({
        id: 'user-id',
        email: 'user@example.com',
        roles: ['user'],
        type: TokenType.REFRESH,
        jti: 'token-id',
      });

      // Mock isTokenRevoked
      mockCollection.findOne.mockResolvedValue(null);

      // Mock user service getUser
      mockUserService.getUser.mockResolvedValue({
        id: 'user-id',
        username: 'testuser',
        email: 'user@example.com',
        status: UserStatus.ACTIVE,
        roles: [{ name: 'user' }],
      });

      // Mock collection for token storage
      mockCollection.insertOne.mockResolvedValue({ insertedId: 'token-doc-id' });
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await authService.refreshToken('refresh-token');

      expect(result).toEqual({
        accessToken: 'mock-token',
        refreshToken: 'mock-token',
        expiresIn: 900,
      });

      expect(jwt.verify).toHaveBeenCalledWith('refresh-token', expect.any(String));
    });

    it('should throw an error if token is invalid', async () => {
      // Mock token verification to throw an error
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(authService.refreshToken('refresh-token')).rejects.toThrow(
        'Invalid refresh token'
      );
    });

    it('should throw an error if token type is not refresh', async () => {
      // Mock token verification
      (jwt.verify as jest.Mock).mockReturnValue({
        id: 'user-id',
        email: 'user@example.com',
        roles: ['user'],
        type: TokenType.ACCESS,
        jti: 'token-id',
      });

      await expect(authService.refreshToken('refresh-token')).rejects.toThrow('Invalid token type');
    });

    it('should throw an error if token is revoked', async () => {
      // Mock token verification
      (jwt.verify as jest.Mock).mockReturnValue({
        id: 'user-id',
        email: 'user@example.com',
        roles: ['user'],
        type: TokenType.REFRESH,
        jti: 'token-id',
      });

      // Mock isTokenRevoked
      mockCollection.findOne.mockResolvedValue({ revoked: true });

      await expect(authService.refreshToken('refresh-token')).rejects.toThrow(
        'Token has been revoked'
      );
    });
  });

  describe('logout', () => {
    it('should revoke a specific token', async () => {
      // Mock revokeToken
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await authService.logout('user-id', 'token-id');

      expect(result).toBe(true);
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { tokenId: 'token-id' },
        { $set: { revoked: true, revokedAt: expect.any(Date) } }
      );
    });

    it('should revoke all tokens for a user', async () => {
      // Mock revokeAllUserTokens
      mockCollection.updateOne.mockResolvedValue({ modifiedCount: 1 });

      const result = await authService.logout('user-id');

      expect(result).toBe(true);
      expect(mockCollection.updateOne).toHaveBeenCalledWith(
        { userId: 'user-id' },
        { $set: { revoked: true, revokedAt: expect.any(Date) } }
      );
    });
  });

  describe('isTokenRevoked', () => {
    it('should return true if token is revoked', async () => {
      // Mock findOne
      mockCollection.findOne.mockResolvedValue({ revoked: true });

      const result = await authService.isTokenRevoked('token-id');

      expect(result).toBe(true);
      expect(mockCollection.findOne).toHaveBeenCalledWith({
        tokenId: 'token-id',
        revoked: true,
      });
    });

    it('should return false if token is not revoked', async () => {
      // Mock findOne
      mockCollection.findOne.mockResolvedValue(null);

      const result = await authService.isTokenRevoked('token-id');

      expect(result).toBe(false);
    });
  });

  describe('OAuth methods', () => {
    it('should generate an OAuth authorization URL', () => {
      // Mock generateAuthUrl
      mockGoogleOAuthClient.generateAuthUrl.mockReturnValue('https://oauth-provider.com/auth');

      const result = authService.getOAuthAuthorizationUrl(OAuthProvider.GOOGLE, 'state-value');

      expect(result).toBe('https://oauth-provider.com/auth');
      expect(mockGoogleOAuthClient.generateAuthUrl).toHaveBeenCalledWith({
        access_type: 'offline',
        scope: ['profile', 'email'],
        state: 'state-value',
      });
    });
  });
});
