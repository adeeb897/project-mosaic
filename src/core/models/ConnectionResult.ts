/**
 * Result of a connection attempt to an agent
 */
export interface ConnectionResult {
  /**
   * Whether the connection was successful
   */
  success: boolean;

  /**
   * Error message if the connection failed
   */
  error?: string;

  /**
   * Agent ID
   */
  agentId?: string;

  /**
   * Agent information
   */
  agentInfo?: {
    /**
     * Name of the agent
     */
    name: string;

    /**
     * Description of the agent
     */
    description: string;

    /**
     * Version of the agent
     */
    version: string;

    /**
     * Additional agent information
     */
    [key: string]: any;
  };

  /**
   * Connection ID
   */
  connectionId?: string;

  /**
   * Connection timestamp
   */
  timestamp?: Date;

  /**
   * Connection metadata
   */
  metadata?: Record<string, any>;
}
