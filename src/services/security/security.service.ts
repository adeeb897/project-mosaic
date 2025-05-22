import { logger } from '@utils/logger';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * User authentication data
 */
export interface AuthData {
  userId: string;
  email: string;
  roles: string[];
}

/**
 * Token pair
 */
export interface TokenPair {
  token: string;
  refreshToken: string;
}

/**
 * Security service interface
 */
export interface SecurityService {
  generateTokens(authData: AuthData): Promise<TokenPair>;
  verifyToken(token: string): Promise<AuthData | null>;
  refreshToken(refreshToken: string): Promise<TokenPair | null>;
  revokeToken(token: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
}

/**
 * Security service implementation
 */
class SecurityServiceImpl implements SecurityService {
  private refreshTokens: Map<string, { authData: AuthData; expiresAt: Date }> = new Map();
  private revokedTokens: Set<string> = new Set();

  /**
   * Generate JWT tokens for authentication
   * @param authData User authentication data
   * @returns Token pair
   */
  async generateTokens(authData: AuthData): Promise<TokenPair> {
    logger.debug(`Generating tokens for user: ${authData.userId}`);

    const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';
    const jwtExpiration = process.env.JWT_EXPIRATION || '1d';
    const refreshExpiration = process.env.REFRESH_TOKEN_EXPIRATION || '7d';

    // Generate access token
    // Use a type-safe approach without 'any'
    const payload = authData as unknown as object;
    // Use a more specific type for the JWT secret
    const options = { expiresIn: jwtExpiration };
    // @ts-expect-error - Working around type issues with jsonwebtoken
    const token = jwt.sign(payload, jwtSecret, options);

    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString('hex');

    // Store refresh token
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + parseInt(refreshExpiration, 10) || 7);
    this.refreshTokens.set(refreshToken, { authData, expiresAt });

    return { token, refreshToken };
  }

  /**
   * Verify JWT token
   * @param token JWT token
   * @returns Auth data if valid, null otherwise
   */
  async verifyToken(token: string): Promise<AuthData | null> {
    logger.debug('Verifying token');

    // Check if token is revoked
    if (this.revokedTokens.has(token)) {
      logger.warn('Token is revoked');
      return null;
    }

    try {
      const jwtSecret = process.env.JWT_SECRET || 'default_jwt_secret';
      // Verify the JWT token with proper typing
      const decoded = jwt.verify(token, jwtSecret) as unknown as AuthData;
      return decoded;
    } catch (error) {
      logger.warn('Token verification failed:', error);
      return null;
    }
  }

  /**
   * Refresh token
   * @param refreshToken Refresh token
   * @returns New token pair if valid, null otherwise
   */
  async refreshToken(refreshToken: string): Promise<TokenPair | null> {
    logger.debug('Refreshing token');

    const storedData = this.refreshTokens.get(refreshToken);
    if (!storedData) {
      logger.warn('Refresh token not found');
      return null;
    }

    // Check if refresh token is expired
    if (storedData.expiresAt < new Date()) {
      logger.warn('Refresh token expired');
      this.refreshTokens.delete(refreshToken);
      return null;
    }

    // Generate new tokens
    const newTokens = await this.generateTokens(storedData.authData);

    // Delete old refresh token
    this.refreshTokens.delete(refreshToken);

    return newTokens;
  }

  /**
   * Revoke token
   * @param token JWT token
   * @returns True if revoked
   */
  async revokeToken(token: string): Promise<boolean> {
    logger.debug('Revoking token');

    try {
      // Decode token without verification
      const decoded = jwt.decode(token) as { exp: number } | null;

      if (decoded && decoded.exp) {
        // Add to revoked tokens
        this.revokedTokens.add(token);

        // Schedule cleanup of revoked token
        const expiresIn = decoded.exp * 1000 - Date.now();
        if (expiresIn > 0) {
          setTimeout(() => {
            this.revokedTokens.delete(token);
          }, expiresIn);
        } else {
          // Token already expired, no need to store it
          this.revokedTokens.delete(token);
        }

        return true;
      }

      return false;
    } catch (error) {
      logger.warn('Token revocation failed:', error);
      return false;
    }
  }

  /**
   * Hash password
   * @param password Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    logger.debug('Hashing password');

    // In a real implementation, use a proper password hashing library like bcrypt
    // This is a simple implementation for demonstration purposes
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    return `${salt}:${hash}`;
  }

  /**
   * Verify password
   * @param password Plain text password
   * @param hash Hashed password
   * @returns True if password matches hash
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    logger.debug('Verifying password');

    // In a real implementation, use a proper password hashing library like bcrypt
    // This is a simple implementation for demonstration purposes
    const [salt, storedHash] = hash.split(':');
    const calculatedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');

    return storedHash === calculatedHash;
  }
}

// Create singleton instance
const securityServiceInstance = new SecurityServiceImpl();

/**
 * Initialize security service
 */
export const initSecurityService = async (): Promise<void> => {
  logger.info('Initializing security service');
  // Add initialization logic here
};

/**
 * Get security service instance
 * @returns Security service instance
 */
export const getSecurityService = (): SecurityService => {
  return securityServiceInstance;
};
