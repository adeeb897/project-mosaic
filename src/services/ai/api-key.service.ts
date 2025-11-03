import { logger } from '@utils/logger';
import { getEncryptionService, IEncryptionService } from '../security/encryption.service';
import { ApiKey, IApiKeyDocument } from '../../persistence/models/api-key.model';
import { getLLMService } from './llm.service';
import { LLMProvider } from './llm.service';
import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * API Key service interface
 */
export interface IApiKeyService {
  /**
   * Save an API key for a user and provider
   */
  saveApiKey(userId: string, provider: LLMProvider, apiKey: string): Promise<void>;

  /**
   * Get an API key for a user and provider
   */
  getApiKey(userId: string, provider: LLMProvider): Promise<string | null>;

  /**
   * Update an API key for a user and provider
   */
  updateApiKey(userId: string, provider: LLMProvider, newKey: string): Promise<void>;

  /**
   * Delete an API key for a user and provider
   */
  deleteApiKey(userId: string, provider: LLMProvider): Promise<void>;

  /**
   * Validate an API key for a provider
   */
  validateApiKey(provider: LLMProvider, apiKey: string): Promise<boolean>;

  /**
   * Track usage of an API key
   */
  trackUsage(userId: string, provider: LLMProvider): Promise<void>;

  /**
   * Get all providers configured for a user
   */
  getUserProviders(userId: string): Promise<LLMProvider[]>;

  /**
   * Get usage statistics for a user's API keys
   */
  getUsageStats(userId: string): Promise<Record<LLMProvider, { usageCount: number; lastUsed?: Date }>>;

  /**
   * Check if a user has a valid API key for a provider
   */
  hasValidApiKey(userId: string, provider: LLMProvider): Promise<boolean>;
}

/**
 * API Key service implementation
 */
export class ApiKeyService implements IApiKeyService {
  private encryptionService: IEncryptionService;

  constructor() {
    this.encryptionService = getEncryptionService();
  }

  /**
   * Save an API key for a user and provider
   */
  async saveApiKey(userId: string, provider: LLMProvider, apiKey: string): Promise<void> {
    try {
      // Validate the API key first
      const isValid = await this.validateApiKey(provider, apiKey);
      if (!isValid) {
        throw new Error('Invalid API key provided');
      }

      // Encrypt the API key
      const encryptedKey = await this.encryptionService.encrypt(apiKey);
      const keyHash = this.encryptionService.generateKeyHash(apiKey);

      // Convert userId to ObjectId, handling dev user case
      const userObjectId = this.getUserObjectId(userId);

      // Check if an API key already exists for this user and provider
      const existingKey = await ApiKey.findOne({
        userId: userObjectId,
        provider,
      });

      if (existingKey) {
        // Update existing key
        existingKey.encryptedKey = encryptedKey;
        existingKey.keyHash = keyHash;
        existingKey.isActive = true;
        existingKey.updatedAt = new Date();
        await existingKey.save();
      } else {
        // Create new key
        const newApiKey = new ApiKey({
          userId: userObjectId,
          provider,
          encryptedKey,
          keyHash,
          isActive: true,
          usageCount: 0,
        });
        await newApiKey.save();
      }

      logger.info(`API key saved for user ${userId} and provider ${provider}`);
    } catch (error) {
      logger.error('Failed to save API key:', error);
      throw new Error(`Failed to save API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get an API key for a user and provider
   */
  async getApiKey(userId: string, provider: LLMProvider): Promise<string | null> {
    try {
      const apiKeyDoc = await ApiKey.findOne({
        userId: this.getUserObjectId(userId),
        provider,
        isActive: true,
      });

      if (!apiKeyDoc) {
        return null;
      }

      // Decrypt the API key
      const decryptedKey = await this.encryptionService.decrypt(apiKeyDoc.encryptedKey);
      return decryptedKey;
    } catch (error) {
      logger.error('Failed to get API key:', error);
      return null;
    }
  }

  /**
   * Update an API key for a user and provider
   */
  async updateApiKey(userId: string, provider: LLMProvider, newKey: string): Promise<void> {
    // Use the same logic as saveApiKey since it handles both create and update
    await this.saveApiKey(userId, provider, newKey);
  }

  /**
   * Delete an API key for a user and provider
   */
  async deleteApiKey(userId: string, provider: LLMProvider): Promise<void> {
    try {
      const result = await ApiKey.findOneAndDelete({
        userId: this.getUserObjectId(userId),
        provider,
      });

      if (!result) {
        throw new Error('API key not found');
      }

      logger.info(`API key deleted for user ${userId} and provider ${provider}`);
    } catch (error) {
      logger.error('Failed to delete API key:', error);
      throw new Error(`Failed to delete API key: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate an API key for a provider
   */
  async validateApiKey(provider: LLMProvider, apiKey: string): Promise<boolean> {
    try {
      const llmService = getLLMService();
      return await llmService.validateApiKey(provider, apiKey);
    } catch (error) {
      logger.warn(`API key validation failed for provider ${provider}:`, error);
      return false;
    }
  }

  /**
   * Track usage of an API key
   */
  async trackUsage(userId: string, provider: LLMProvider): Promise<void> {
    try {
      const apiKeyDoc = await ApiKey.findOne({
        userId: this.getUserObjectId(userId),
        provider,
        isActive: true,
      });

      if (apiKeyDoc) {
        await apiKeyDoc.incrementUsage();
      }
    } catch (error) {
      logger.warn('Failed to track API key usage:', error);
      // Don't throw error for usage tracking failures
    }
  }

  /**
   * Get all providers configured for a user
   */
  async getUserProviders(userId: string): Promise<LLMProvider[]> {
    try {
      const apiKeys = await ApiKey.find({
        userId: this.getUserObjectId(userId),
        isActive: true,
      }).select('provider');

      return apiKeys.map(key => key.provider as LLMProvider);
    } catch (error) {
      logger.error('Failed to get user providers:', error);
      return [];
    }
  }

  /**
   * Get usage statistics for a user's API keys
   */
  async getUsageStats(userId: string): Promise<Record<LLMProvider, { usageCount: number; lastUsed?: Date }>> {
    try {
      const apiKeys = await ApiKey.find({
        userId: this.getUserObjectId(userId),
        isActive: true,
      }).select('provider usageCount lastUsed');

      const stats: Record<string, { usageCount: number; lastUsed?: Date }> = {};

      for (const key of apiKeys) {
        stats[key.provider] = {
          usageCount: key.usageCount,
          lastUsed: key.lastUsed,
        };
      }

      return stats as Record<LLMProvider, { usageCount: number; lastUsed?: Date }>;
    } catch (error) {
      logger.error('Failed to get usage stats:', error);
      return {} as Record<LLMProvider, { usageCount: number; lastUsed?: Date }>;
    }
  }

  /**
   * Check if a user has a valid API key for a provider
   */
  async hasValidApiKey(userId: string, provider: LLMProvider): Promise<boolean> {
    try {
      const apiKey = await this.getApiKey(userId, provider);
      return apiKey !== null;
    } catch (error) {
      logger.error('Failed to check API key validity:', error);
      return false;
    }
  }

  /**
   * Convert userId to ObjectId, handling development user case
   */
  private getUserObjectId(userId: string): mongoose.Types.ObjectId {
    // Handle development user ID that's not a valid ObjectId
    if (userId === 'dev-user-id' || !mongoose.Types.ObjectId.isValid(userId)) {
      // Generate a consistent ObjectId for dev user
      const devUserHash = crypto.createHash('md5').update(userId).digest('hex');
      return new mongoose.Types.ObjectId(devUserHash.substring(0, 24));
    }

    return new mongoose.Types.ObjectId(userId);
  }

  /**
   * Get API key document (for internal use)
   */
  private async getApiKeyDocument(userId: string, provider: LLMProvider): Promise<IApiKeyDocument | null> {
    try {
      return await ApiKey.findOne({
        userId: this.getUserObjectId(userId),
        provider,
        isActive: true,
      });
    } catch (error) {
      logger.error('Failed to get API key document:', error);
      return null;
    }
  }

  /**
   * Deactivate all API keys for a user (for account deletion/suspension)
   */
  async deactivateUserApiKeys(userId: string): Promise<void> {
    try {
      await ApiKey.updateMany(
        { userId: this.getUserObjectId(userId) },
        { isActive: false, updatedAt: new Date() }
      );

      logger.info(`All API keys deactivated for user ${userId}`);
    } catch (error) {
      logger.error('Failed to deactivate user API keys:', error);
      throw new Error('Failed to deactivate API keys');
    }
  }

  /**
   * Clean up old unused API keys (for maintenance)
   */
  async cleanupOldApiKeys(daysOld: number = 90): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await ApiKey.deleteMany({
        isActive: false,
        updatedAt: { $lt: cutoffDate },
      });

      logger.info(`Cleaned up ${result.deletedCount} old API keys`);
      return result.deletedCount || 0;
    } catch (error) {
      logger.error('Failed to cleanup old API keys:', error);
      return 0;
    }
  }
}

// Singleton instance
let apiKeyServiceInstance: ApiKeyService | null = null;

/**
 * Get the API key service instance
 */
export const getApiKeyService = (): ApiKeyService => {
  if (!apiKeyServiceInstance) {
    apiKeyServiceInstance = new ApiKeyService();
  }
  return apiKeyServiceInstance;
};

/**
 * Initialize the API key service
 */
export const initializeApiKeyService = (): void => {
  try {
    getApiKeyService();
    logger.info('API key service initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize API key service:', error);
    throw error;
  }
};
