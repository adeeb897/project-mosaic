import crypto from 'crypto';
import { logger } from '@utils/logger';

/**
 * Encryption service interface
 */
export interface IEncryptionService {
  /**
   * Encrypt a plain text string
   */
  encrypt(plainText: string): Promise<string>;

  /**
   * Decrypt an encrypted string
   */
  decrypt(encryptedText: string): Promise<string>;

  /**
   * Generate a hash of the API key for validation without decryption
   */
  generateKeyHash(apiKey: string): string;

  /**
   * Verify if a plain text matches the hash
   */
  verifyKeyHash(plainText: string, hash: string): boolean;
}

/**
 * AES-256-CBC encryption service implementation
 */
export class EncryptionService implements IEncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  private readonly keyLength = 32; // 256 bits
  private readonly ivLength = 16; // 128 bits
  private readonly saltLength = 32; // 256 bits

  private masterKey: Buffer;

  constructor() {
    // Get master key from environment variable
    const masterKeyHex = process.env.ENCRYPTION_MASTER_KEY;

    if (!masterKeyHex) {
      throw new Error('ENCRYPTION_MASTER_KEY environment variable is required');
    }

    try {
      this.masterKey = Buffer.from(masterKeyHex, 'hex');

      if (this.masterKey.length !== this.keyLength) {
        throw new Error(`Master key must be ${this.keyLength} bytes (${this.keyLength * 2} hex characters)`);
      }
    } catch (error) {
      throw new Error(`Invalid ENCRYPTION_MASTER_KEY format: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt a plain text string using AES-256-CBC
   */
  async encrypt(plainText: string): Promise<string> {
    try {
      // Generate random IV and salt
      const iv = crypto.randomBytes(this.ivLength);
      const salt = crypto.randomBytes(this.saltLength);

      // Derive key using PBKDF2
      const key = crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha256');

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt the data
      let encrypted = cipher.update(plainText, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Combine all components: salt + iv + encrypted data
      const combined = Buffer.concat([
        salt,
        iv,
        Buffer.from(encrypted, 'hex')
      ]);

      return combined.toString('base64');
    } catch (error) {
      logger.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt an encrypted string using AES-256-CBC
   */
  async decrypt(encryptedText: string): Promise<string> {
    try {
      // Parse the combined data
      const combined = Buffer.from(encryptedText, 'base64');

      if (combined.length < this.saltLength + this.ivLength) {
        throw new Error('Invalid encrypted data format');
      }

      // Extract components
      const salt = combined.subarray(0, this.saltLength);
      const iv = combined.subarray(this.saltLength, this.saltLength + this.ivLength);
      const encrypted = combined.subarray(this.saltLength + this.ivLength);

      // Derive key using the same parameters
      const key = crypto.pbkdf2Sync(this.masterKey, salt, 100000, this.keyLength, 'sha256');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

      // Decrypt the data
      let decrypted = decipher.update(encrypted, undefined, 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      logger.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Generate a secure hash of the API key for validation
   */
  generateKeyHash(apiKey: string): string {
    try {
      // Use PBKDF2 with a fixed salt for consistent hashing
      const salt = crypto.createHash('sha256').update(this.masterKey).digest();
      const hash = crypto.pbkdf2Sync(apiKey, salt, 100000, 32, 'sha256');
      return hash.toString('hex');
    } catch (error) {
      logger.error('Hash generation failed:', error);
      throw new Error('Failed to generate key hash');
    }
  }

  /**
   * Verify if a plain text matches the hash
   */
  verifyKeyHash(plainText: string, hash: string): boolean {
    try {
      const computedHash = this.generateKeyHash(plainText);
      return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(hash, 'hex'));
    } catch (error) {
      logger.error('Hash verification failed:', error);
      return false;
    }
  }

  /**
   * Generate a new master key (for setup/rotation)
   */
  static generateMasterKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}

// Singleton instance
let encryptionServiceInstance: EncryptionService | null = null;

/**
 * Get the encryption service instance
 */
export const getEncryptionService = (): EncryptionService => {
  if (!encryptionServiceInstance) {
    encryptionServiceInstance = new EncryptionService();
  }
  return encryptionServiceInstance;
};

/**
 * Initialize encryption service (mainly for validation)
 */
export const initializeEncryptionService = (): void => {
  try {
    getEncryptionService();
    logger.info('Encryption service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize encryption service:', error);
    throw error;
  }
};
