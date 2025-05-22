/**
 * Result of invoking an agent capability
 */
export interface CapabilityResult {
  /**
   * Result data
   */
  result: any;

  /**
   * Whether the invocation was successful
   */
  success: boolean;

  /**
   * Error message if the invocation failed
   */
  error?: string;

  /**
   * Error code if the invocation failed
   */
  errorCode?: string;

  /**
   * Invocation metadata
   */
  metadata?: {
    /**
     * Capability ID
     */
    capabilityId: string;

    /**
     * Agent ID
     */
    agentId: string;

    /**
     * Start time of the invocation
     */
    startTime: Date;

    /**
     * End time of the invocation
     */
    endTime: Date;

    /**
     * Duration of the invocation in milliseconds
     */
    durationMs: number;

    /**
     * Whether the result was cached
     */
    cached?: boolean;

    /**
     * Additional metadata
     */
    [key: string]: any;
  };
}
