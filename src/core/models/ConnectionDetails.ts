/**
 * Connection details for an agent
 */
export interface ConnectionDetails {
  /**
   * Endpoint URL for the agent
   */
  endpoint: string;

  /**
   * Protocol used for communication
   */
  protocol: 'a2a' | 'custom';

  /**
   * Method of connection
   */
  connectionMethod: 'direct' | 'proxy' | 'embedded';

  /**
   * Timeout in milliseconds
   */
  timeoutMs: number;

  /**
   * Retry configuration
   */
  retryConfig?: RetryConfig;

  /**
   * Additional connection parameters
   */
  parameters?: Record<string, any>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  /**
   * Maximum number of retries
   */
  maxRetries: number;

  /**
   * Initial delay in milliseconds
   */
  initialDelayMs: number;

  /**
   * Backoff multiplier
   */
  backoffMultiplier: number;

  /**
   * Maximum delay in milliseconds
   */
  maxDelayMs: number;

  /**
   * Whether to retry on specific error codes
   */
  retryOnErrorCodes?: string[];
}
