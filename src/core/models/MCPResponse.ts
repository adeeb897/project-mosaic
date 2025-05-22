/**
 * Response for the Model Context Protocol (MCP)
 */
export interface MCPResponse {
  /**
   * Type of response
   */
  type:
    | 'tool_result'
    | 'tool_result_chunk'
    | 'tool_info'
    | 'tools_list'
    | 'auth_result'
    | 'session_created'
    | 'session_ended'
    | 'context_set'
    | 'context_info'
    | 'error';

  /**
   * Response payload
   */
  payload: any;

  /**
   * Request ID that this response is for
   */
  request_id?: string;

  /**
   * Session ID
   */
  session_id?: string;

  /**
   * Response timestamp
   */
  timestamp?: Date;

  /**
   * Response metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Error response for the Model Context Protocol (MCP)
 */
export interface MCPErrorResponse extends MCPResponse {
  /**
   * Type of response (always 'error' for error responses)
   */
  type: 'error';

  /**
   * Error payload
   */
  payload: {
    /**
     * Error code
     */
    code: string;

    /**
     * Error message
     */
    message: string;

    /**
     * Error details
     */
    details?: any;
  };
}
