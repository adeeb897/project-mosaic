/**
 * Authentication configuration for an agent
 */
export interface AuthenticationConfig {
  /**
   * Type of authentication
   */
  type: 'api_key' | 'oauth' | 'jwt' | 'custom';

  /**
   * Credentials for authentication
   */
  credentials: Record<string, string>;

  /**
   * Refresh strategy for authentication
   */
  refreshStrategy?: RefreshStrategy;

  /**
   * Scope of the authentication
   */
  scope?: string[];

  /**
   * Additional authentication parameters
   */
  parameters?: Record<string, any>;
}

/**
 * Refresh strategy for authentication
 */
export interface RefreshStrategy {
  /**
   * Type of refresh strategy
   */
  type: 'periodic' | 'on_error' | 'manual';

  /**
   * Refresh interval in milliseconds (for periodic refresh)
   */
  refreshInterval?: number;

  /**
   * Refresh endpoint
   */
  refreshEndpoint?: string;

  /**
   * Refresh parameters
   */
  refreshParameters?: Record<string, any>;

  /**
   * Refresh token
   */
  refreshToken?: string;
}
