/**
 * Context for tool execution
 */
export interface ExecutionContext {
  /**
   * User ID
   */
  userId: string;

  /**
   * Conversation ID
   */
  conversationId: string;

  /**
   * Message ID that triggered the tool execution
   */
  messageId: string;

  /**
   * Tool ID
   */
  toolId: string;

  /**
   * Execution ID (unique for each execution)
   */
  executionId: string;

  /**
   * Timestamp when the execution started
   */
  startTime: Date;

  /**
   * Timeout in milliseconds
   */
  timeoutMs: number;

  /**
   * Authentication context
   */
  auth?: AuthContext;

  /**
   * Environment variables
   */
  env?: Record<string, string>;

  /**
   * User preferences
   */
  userPreferences?: Record<string, any>;

  /**
   * Additional context data
   */
  data?: Record<string, any>;
}

/**
 * Authentication context for tool execution
 */
export interface AuthContext {
  /**
   * Type of authentication
   */
  type: 'api_key' | 'oauth' | 'bearer_token' | 'basic_auth' | 'custom';

  /**
   * Credentials
   */
  credentials: Record<string, string>;

  /**
   * Scope of the authentication
   */
  scope?: string[];

  /**
   * Expiration time
   */
  expiresAt?: Date;
}
