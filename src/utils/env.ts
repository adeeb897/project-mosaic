import dotenv from 'dotenv';
import { logger } from './logger';

// Load environment variables from .env file
dotenv.config();

/**
 * Environment variable configuration
 */
export interface EnvConfig {
  // Application
  NODE_ENV: string;
  PORT: number;
  LOG_LEVEL: string;

  // Database
  MONGODB_URI: string;
  REDIS_URI: string;

  // Authentication
  JWT_SECRET: string;
  JWT_EXPIRATION: string;
  REFRESH_TOKEN_EXPIRATION: string;

  // API Rate Limiting
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;

  // Security
  CORS_ORIGIN: string;

  // Feature Flags
  ENABLE_MARKETPLACE: boolean;
  ENABLE_MODALITY_VOICE: boolean;
  ENABLE_MODALITY_IMAGE: boolean;
}

/**
 * Get environment variable with validation
 * @param key Environment variable key
 * @param defaultValue Default value if not found
 * @param required Whether the variable is required
 * @returns The environment variable value
 */
export function getEnv(key: string, defaultValue?: string, required = false): string {
  const value = process.env[key] || defaultValue;

  if (required && !value) {
    const errorMessage = `Required environment variable ${key} is missing`;
    logger.error(errorMessage);
    throw new Error(errorMessage);
  }

  return value || '';
}

/**
 * Get environment variable as number
 * @param key Environment variable key
 * @param defaultValue Default value if not found
 * @returns The environment variable value as number
 */
export function getEnvNumber(key: string, defaultValue?: number): number {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue || 0;
  }

  const numValue = parseInt(value, 10);

  if (isNaN(numValue)) {
    logger.warn(`Environment variable ${key} is not a valid number, using default value`);
    return defaultValue || 0;
  }

  return numValue;
}

/**
 * Get environment variable as boolean
 * @param key Environment variable key
 * @param defaultValue Default value if not found
 * @returns The environment variable value as boolean
 */
export function getEnvBoolean(key: string, defaultValue?: boolean): boolean {
  const value = process.env[key];

  if (value === undefined) {
    return defaultValue || false;
  }

  return value.toLowerCase() === 'true';
}

/**
 * Get all environment variables as a typed config object
 * @returns Environment configuration
 */
export function getConfig(): EnvConfig {
  return {
    // Application
    NODE_ENV: getEnv('NODE_ENV', 'development'),
    PORT: getEnvNumber('PORT', 3000),
    LOG_LEVEL: getEnv('LOG_LEVEL', 'info'),

    // Database
    MONGODB_URI: getEnv('MONGODB_URI', 'mongodb://localhost:27017/project-mosaic', true),
    REDIS_URI: getEnv('REDIS_URI', 'redis://localhost:6379', true),

    // Authentication
    JWT_SECRET: getEnv('JWT_SECRET', 'default_jwt_secret', true),
    JWT_EXPIRATION: getEnv('JWT_EXPIRATION', '1d'),
    REFRESH_TOKEN_EXPIRATION: getEnv('REFRESH_TOKEN_EXPIRATION', '7d'),

    // API Rate Limiting
    RATE_LIMIT_WINDOW_MS: getEnvNumber('RATE_LIMIT_WINDOW_MS', 900000), // 15 minutes
    RATE_LIMIT_MAX: getEnvNumber('RATE_LIMIT_MAX', 100),

    // Security
    CORS_ORIGIN: getEnv('CORS_ORIGIN', '*'),

    // Feature Flags
    ENABLE_MARKETPLACE: getEnvBoolean('ENABLE_MARKETPLACE', true),
    ENABLE_MODALITY_VOICE: getEnvBoolean('ENABLE_MODALITY_VOICE', true),
    ENABLE_MODALITY_IMAGE: getEnvBoolean('ENABLE_MODALITY_IMAGE', true),
  };
}

/**
 * Check if running in production environment
 * @returns True if in production
 */
export function isProduction(): boolean {
  return getEnv('NODE_ENV') === 'production';
}

/**
 * Check if running in development environment
 * @returns True if in development
 */
export function isDevelopment(): boolean {
  return getEnv('NODE_ENV') === 'development';
}

/**
 * Check if running in test environment
 * @returns True if in test
 */
export function isTest(): boolean {
  return getEnv('NODE_ENV') === 'test';
}

// Export config as a singleton
export const config = getConfig();
