/**
 * Strategy for handling errors in an agent
 */
export interface ErrorHandlingStrategy {
  /**
   * Whether to retry on failure
   */
  retryOnFailure: boolean;

  /**
   * Behavior when an error occurs
   */
  fallbackBehavior: 'error' | 'graceful_degradation' | 'alternative_agent';

  /**
   * How to display errors to the user
   */
  errorDisplayMode: 'user_visible' | 'hidden';

  /**
   * Level of logging
   */
  loggingLevel: 'none' | 'error' | 'warning' | 'info' | 'debug';

  /**
   * Alternative agent to use if fallbackBehavior is 'alternative_agent'
   */
  alternativeAgentId?: string;

  /**
   * Maximum number of retries
   */
  maxRetries?: number;

  /**
   * Delay between retries in milliseconds
   */
  retryDelayMs?: number;

  /**
   * Error codes to ignore
   */
  ignoreErrorCodes?: string[];

  /**
   * Custom error handler
   */
  errorHandler?: string;

  /**
   * Additional strategy parameters
   */
  parameters?: Record<string, any>;
}
