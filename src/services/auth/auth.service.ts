/**
 * Authentication Service for Project Mosaic
 *
 * This service handles authentication-related operations such as user registration,
 * login, token management, and OAuth 2.0/OpenID Connect integration.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { UserService } from '../user/user.service';
import { getCollection } from '../../persistence/database';
import { UserStatus } from '../../types';
import { ApiError } from '../../api/middleware';

/**
 * Token types
 */
export enum TokenType {
  ACCESS = 'access',
  REFRESH = 'refresh',
  ID = 'id',
}

/**
 * Authentication tokens interface
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  idToken?: string;
  expiresIn: number;
}

/**
 * OAuth provider types
 */
export enum OAuthProvider {
  GOOGLE = 'google',
  GITHUB = 'github',
  MICROSOFT = 'microsoft',
  FACEBOOK = 'facebook',
}

/**
 * OAuth user profile interface
 */
export interface OAuthUserProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
  provider: OAuthProvider;
  providerUserId: string;
  accessToken?: string;
  refreshToken?: string;
}

/**
 * Token payload interface
 */
export interface TokenPayload {
  id: string;
  email: string;
  roles: string[];
  type: TokenType;
  jti: string; // JWT ID for token revocation
}

/**
 * Authentication service class
 */
export class AuthService {
  private readonly userService: UserService;
  private readonly tokenCollection = 'tokens';
  private readonly saltRounds = 12;
  private readonly accessTokenExpiry = '15m'; // 15 minutes
  private readonly refreshTokenExpiry = '7d'; // 7 days
  private readonly googleOAuthClient: OAuth2Client;

  /**
   * Constructor
   */
  constructor() {
    this.userService = new UserService();

    // Initialize OAuth clients
    this.googleOAuthClient = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
  }

  /**
   * Register a new user
   *
   * @param username Username
   * @param email Email
   * @param password Password
   * @param displayName Optional display name
   * @returns The created user and tokens
   */
  async register(
    username: string,
    email: string,
    password: string,
    displayName?: string
  ): Promise<{ user: Record<string, unknown>; tokens: AuthTokens }> {
    // Hash password
    const passwordHash = await this.hashPassword(password);

    // Create user
    const user = await this.userService.createUser({
      username,
      email,
      password: passwordHash,
      displayName,
    });

    // Generate tokens
    const tokens = await this.generateTokens(user.id as string, email, ['user']);

    return { user, tokens };
  }

  /**
   * Login a user with email and password
   *
   * @param email Email
   * @param password Password
   * @returns The user and tokens
   * @throws ApiError if credentials are invalid
   */
  async login(
    email: string,
    password: string
  ): Promise<{ user: Record<string, unknown>; tokens: AuthTokens }> {
    // Get user by email
    const user = await this.userService.getUserByEmail(email);
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      throw new ApiError(401, 'Account is not active');
    }

    // Verify password
    const isPasswordValid = await this.verifyPassword(password, user.passwordHash as string);
    if (!isPasswordValid) {
      // Increment failed login attempts
      await this.incrementFailedLoginAttempts(user.id as string);
      throw new ApiError(401, 'Invalid credentials');
    }

    // Reset failed login attempts
    await this.resetFailedLoginAttempts(user.id as string);

    // Update last login time
    await this.userService.updateUser(user.id as string, { lastLoginAt: new Date() });

    // Extract roles
    const roles = (user.roles as Array<{ name: string }>).map(role => role.name);

    // Generate tokens
    const tokens = await this.generateTokens(user.id as string, email, roles);

    return { user, tokens };
  }

  /**
   * Refresh access token using a refresh token
   *
   * @param refreshToken Refresh token
   * @returns New tokens
   * @throws ApiError if refresh token is invalid
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      // Verify refresh token
      const secret =
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'refresh_jwt_secret';
      const decoded = jwt.verify(refreshToken, secret) as TokenPayload;

      // Check if token type is refresh
      if (decoded.type !== TokenType.REFRESH) {
        throw new ApiError(401, 'Invalid token type');
      }

      // Check if token is in the blacklist
      const isRevoked = await this.isTokenRevoked(decoded.jti);
      if (isRevoked) {
        throw new ApiError(401, 'Token has been revoked');
      }

      // Get user
      const user = await this.userService.getUser(decoded.id);
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        throw new ApiError(401, 'Account is not active');
      }

      // Extract roles
      const roles = (user.roles as Array<{ name: string }>).map(role => role.name);

      // Generate new tokens
      const tokens = await this.generateTokens(decoded.id, decoded.email, roles);

      // Revoke old refresh token
      await this.revokeToken(decoded.jti);

      return tokens;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(401, 'Invalid refresh token');
    }
  }

  /**
   * Logout a user by revoking their tokens
   *
   * @param userId User ID
   * @param tokenId JWT ID to revoke (optional, if not provided all tokens will be revoked)
   * @returns True if successful
   */
  async logout(userId: string, tokenId?: string): Promise<boolean> {
    if (tokenId) {
      // Revoke specific token
      await this.revokeToken(tokenId);
    } else {
      // Revoke all tokens for user
      await this.revokeAllUserTokens(userId);
    }
    return true;
  }

  /**
   * Authenticate with OAuth provider
   *
   * @param provider OAuth provider
   * @param code Authorization code
   * @returns User and tokens
   */
  async authenticateWithOAuth(
    provider: OAuthProvider,
    code: string
  ): Promise<{ user: Record<string, unknown>; tokens: AuthTokens; isNewUser: boolean }> {
    // Get user profile from OAuth provider
    const profile = await this.getOAuthUserProfile(provider, code);

    // Check if user exists
    let user = await this.userService.getUserByEmail(profile.email);
    let isNewUser = false;

    if (!user) {
      // Create new user
      const username = await this.generateUniqueUsername(
        profile.name || profile.email.split('@')[0]
      );

      user = await this.userService.createUser({
        username,
        email: profile.email,
        password: await this.hashPassword(crypto.randomBytes(20).toString('hex')), // Random password
        displayName: profile.name,
      });

      isNewUser = true;
    }

    // Update OAuth provider info
    await this.updateUserOAuthInfo(user.id as string, profile);

    // Extract roles
    const roles = (user.roles as Array<{ name: string }>).map(role => role.name);

    // Generate tokens
    const tokens = await this.generateTokens(user.id as string, profile.email, roles);

    return { user, tokens, isNewUser };
  }

  /**
   * Verify ID token from OAuth provider
   *
   * @param provider OAuth provider
   * @param idToken ID token
   * @returns User and tokens
   */
  async verifyIdToken(
    provider: OAuthProvider,
    idToken: string
  ): Promise<{ user: Record<string, unknown>; tokens: AuthTokens; isNewUser: boolean }> {
    let email: string;
    let name: string | undefined;
    let picture: string | undefined;
    let providerId: string;

    // Verify ID token based on provider
    switch (provider) {
      case OAuthProvider.GOOGLE: {
        const ticket = await this.googleOAuthClient.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();
        if (!payload || !payload.email) {
          throw new ApiError(401, 'Invalid ID token');
        }
        email = payload.email;
        name = payload.name;
        picture = payload.picture;
        providerId = payload.sub;
        break;
      }

      // Add other providers here

      default:
        throw new ApiError(400, 'Unsupported OAuth provider');
    }

    // Check if user exists
    let user = await this.userService.getUserByEmail(email);
    let isNewUser = false;

    if (!user) {
      // Create new user
      const username = await this.generateUniqueUsername(name || email.split('@')[0]);

      user = await this.userService.createUser({
        username,
        email,
        password: await this.hashPassword(crypto.randomBytes(20).toString('hex')), // Random password
        displayName: name,
      });

      isNewUser = true;
    }

    // Update OAuth provider info
    await this.updateUserOAuthInfo(user.id as string, {
      id: user.id as string,
      email,
      name,
      picture,
      provider,
      providerUserId: providerId,
    });

    // Extract roles
    const roles = (user.roles as Array<{ name: string }>).map(role => role.name);

    // Generate tokens
    const tokens = await this.generateTokens(user.id as string, email, roles);

    return { user, tokens, isNewUser };
  }

  /**
   * Generate OAuth authorization URL
   *
   * @param provider OAuth provider
   * @param state State parameter for CSRF protection
   * @returns Authorization URL
   */
  getOAuthAuthorizationUrl(provider: OAuthProvider, state: string): string {
    switch (provider) {
      case OAuthProvider.GOOGLE:
        return this.googleOAuthClient.generateAuthUrl({
          access_type: 'offline',
          scope: ['profile', 'email'],
          state,
        });

      // Add other providers here

      default:
        throw new ApiError(400, 'Unsupported OAuth provider');
    }
  }

  /**
   * Check if a token has been revoked
   *
   * @param tokenId JWT ID
   * @returns True if token is revoked
   */
  async isTokenRevoked(tokenId: string): Promise<boolean> {
    const collection = getCollection(this.tokenCollection);
    const token = await collection.findOne({ tokenId, revoked: true });
    return !!token;
  }

  /**
   * Revoke a token
   *
   * @param tokenId JWT ID
   * @returns True if successful
   */
  async revokeToken(tokenId: string): Promise<boolean> {
    const collection = getCollection(this.tokenCollection);
    await collection.updateOne({ tokenId }, { $set: { revoked: true, revokedAt: new Date() } });
    return true;
  }

  /**
   * Revoke all tokens for a user
   *
   * @param userId User ID
   * @returns True if successful
   */
  async revokeAllUserTokens(userId: string): Promise<boolean> {
    const collection = getCollection(this.tokenCollection);
    await collection.updateOne({ userId }, { $set: { revoked: true, revokedAt: new Date() } });
    return true;
  }

  /**
   * Generate authentication tokens
   *
   * @param userId User ID
   * @param email User email
   * @param roles User roles
   * @returns Authentication tokens
   */
  private async generateTokens(
    userId: string,
    email: string,
    roles: string[]
  ): Promise<AuthTokens> {
    // Generate JWT IDs
    const accessTokenId = crypto.randomUUID();
    const refreshTokenId = crypto.randomUUID();

    // Generate access token
    const accessToken = this.generateJWT(
      {
        id: userId,
        email,
        roles,
        type: TokenType.ACCESS,
        jti: accessTokenId,
      },
      this.accessTokenExpiry,
      process.env.JWT_SECRET || 'jwt_secret'
    );

    // Generate refresh token
    const refreshToken = this.generateJWT(
      {
        id: userId,
        email,
        roles,
        type: TokenType.REFRESH,
        jti: refreshTokenId,
      },
      this.refreshTokenExpiry,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'refresh_jwt_secret'
    );

    // Store tokens in database
    const collection = getCollection(this.tokenCollection);
    await collection.insertOne({
      userId,
      accessTokenId,
      refreshTokenId,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.getExpiryInMs(this.refreshTokenExpiry)),
      revoked: false,
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: this.getExpiryInSeconds(this.accessTokenExpiry),
    };
  }

  /**
   * Generate a JWT
   *
   * @param payload Token payload
   * @param expiresIn Expiration time
   * @param secret Secret key
   * @returns JWT
   */
  private generateJWT(payload: TokenPayload, expiresIn: string, secret: string): string {
    return jwt.sign(payload, secret, { expiresIn } as jwt.SignOptions);
  }

  /**
   * Hash a password
   *
   * @param password Plain text password
   * @returns Hashed password
   */
  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify a password
   *
   * @param password Plain text password
   * @param hash Hashed password
   * @returns True if password is valid
   */
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Increment failed login attempts
   *
   * @param userId User ID
   * @returns Updated user
   */
  private async incrementFailedLoginAttempts(userId: string): Promise<Record<string, unknown>> {
    const user = await this.userService.getUser(userId);
    const failedAttempts = ((user.failedLoginAttempts as number) || 0) + 1;

    const updates: Record<string, unknown> = { failedLoginAttempts: failedAttempts };

    // Lock account after 5 failed attempts
    if (failedAttempts >= 5) {
      // Lock for 15 minutes
      updates.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
    }

    return this.userService.updateUser(userId, updates);
  }

  /**
   * Reset failed login attempts
   *
   * @param userId User ID
   * @returns Updated user
   */
  private async resetFailedLoginAttempts(userId: string): Promise<Record<string, unknown>> {
    return this.userService.updateUser(userId, {
      failedLoginAttempts: 0,
      lockUntil: undefined,
    });
  }

  /**
   * Get OAuth user profile
   *
   * @param provider OAuth provider
   * @param code Authorization code
   * @returns OAuth user profile
   */
  private async getOAuthUserProfile(
    provider: OAuthProvider,
    code: string
  ): Promise<OAuthUserProfile> {
    switch (provider) {
      case OAuthProvider.GOOGLE:
        return this.getGoogleUserProfile(code);

      // Add other providers here

      default:
        throw new ApiError(400, 'Unsupported OAuth provider');
    }
  }

  /**
   * Get Google user profile
   *
   * @param code Authorization code
   * @returns OAuth user profile
   */
  private async getGoogleUserProfile(code: string): Promise<OAuthUserProfile> {
    try {
      // Exchange code for tokens
      const { tokens } = await this.googleOAuthClient.getToken(code);

      // Get user info
      const ticket = await this.googleOAuthClient.verifyIdToken({
        idToken: tokens.id_token!,
        audience: process.env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new Error('Invalid ID token');
      }

      return {
        id: '', // Will be set when user is created or retrieved
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        provider: OAuthProvider.GOOGLE,
        providerUserId: payload.sub,
        accessToken: tokens.access_token || undefined,
        refreshToken: tokens.refresh_token || undefined,
      };
    } catch (error) {
      throw new ApiError(401, 'Failed to authenticate with Google');
    }
  }

  /**
   * Update user OAuth info
   *
   * @param userId User ID
   * @param profile OAuth user profile
   * @returns Updated user
   */
  private async updateUserOAuthInfo(
    userId: string,
    profile: OAuthUserProfile
  ): Promise<Record<string, unknown>> {
    // Update user with OAuth info
    const updates: Record<string, unknown> = {
      [`oauthProviders.${profile.provider}`]: {
        providerUserId: profile.providerUserId,
        lastLogin: new Date(),
      },
      lastLoginAt: new Date(),
    };

    // Update profile picture if provided
    if (profile.picture) {
      updates.profilePicture = profile.picture;
    }

    return this.userService.updateUser(userId, updates);
  }

  /**
   * Generate a unique username
   *
   * @param baseUsername Base username
   * @returns Unique username
   */
  private async generateUniqueUsername(baseUsername: string): Promise<string> {
    // Sanitize username
    let username = baseUsername
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '')
      .substring(0, 20);

    // Check if username exists
    let user = await this.userService.getUserByUsername(username);
    let counter = 1;

    // If username exists, append a number
    while (user) {
      const suffix = counter.toString();
      username = `${baseUsername.substring(0, 20 - suffix.length)}${suffix}`;
      user = await this.userService.getUserByUsername(username);
      counter++;
    }

    return username;
  }

  /**
   * Get expiry time in milliseconds
   *
   * @param expiry Expiry string (e.g., '15m', '7d')
   * @returns Expiry in milliseconds
   */
  private getExpiryInMs(expiry: string): number {
    const unit = expiry.charAt(expiry.length - 1);
    const value = parseInt(expiry.substring(0, expiry.length - 1), 10);

    switch (unit) {
      case 's':
        return value * 1000;
      case 'm':
        return value * 60 * 1000;
      case 'h':
        return value * 60 * 60 * 1000;
      case 'd':
        return value * 24 * 60 * 60 * 1000;
      default:
        return 0;
    }
  }

  /**
   * Get expiry time in seconds
   *
   * @param expiry Expiry string (e.g., '15m', '7d')
   * @returns Expiry in seconds
   */
  private getExpiryInSeconds(expiry: string): number {
    return Math.floor(this.getExpiryInMs(expiry) / 1000);
  }
}

/**
 * Initialize the authentication service
 * This function is called during application startup
 */
export const initAuthService = async (): Promise<void> => {
  // Perform any initialization tasks for the authentication service
  return Promise.resolve();
};
