/**
 * Request for the Model Context Protocol (MCP)
 */
export interface MCPRequest {
  /**
   * Type of request
   */
  type:
    | 'invoke_tool'
    | 'stream_tool'
    | 'cancel_stream'
    | 'get_tool'
    | 'discover_tools'
    | 'authenticate'
    | 'create_session'
    | 'end_session'
    | 'set_context'
    | 'get_context';

  /**
   * Request payload
   */
  payload: any;

  /**
   * Request ID
   */
  request_id?: string;

  /**
   * Session ID
   */
  session_id?: string;

  /**
   * Authentication token
   */
  auth_token?: string;

  /**
   * Request timestamp
   */
  timestamp?: Date;

  /**
   * Request metadata
   */
  metadata?: Record<string, any>;
}
