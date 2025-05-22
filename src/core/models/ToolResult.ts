/**
 * Result of a tool execution
 */
export interface ToolResult {
  /**
   * Result data
   */
  result: any;

  /**
   * Whether the execution was successful
   */
  success: boolean;

  /**
   * Error message if the execution failed
   */
  error?: string;

  /**
   * Error code if the execution failed
   */
  errorCode?: string;

  /**
   * Execution metadata
   */
  metadata: {
    /**
     * Execution ID
     */
    executionId: string;

    /**
     * Tool ID
     */
    toolId: string;

    /**
     * Start time of the execution
     */
    startTime: Date;

    /**
     * End time of the execution
     */
    endTime: Date;

    /**
     * Duration of the execution in milliseconds
     */
    durationMs: number;

    /**
     * Whether the result was cached
     */
    cached?: boolean;

    /**
     * Cache key if the result was cached
     */
    cacheKey?: string;

    /**
     * Cache TTL in seconds
     */
    cacheTtl?: number;

    /**
     * Additional metadata
     */
    [key: string]: any;
  };
}
