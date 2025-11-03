/**
 * Message for the Agent-to-Agent (A2A) protocol
 */
export interface A2AMessage {
  /**
   * Content of the message
   */
  content: string | MessageContent[];

  /**
   * Role of the message sender
   */
  role?: 'user' | 'assistant' | 'system';

  /**
   * Conversation ID
   */
  conversation_id?: string;

  /**
   * Message metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Content of a message
 */
export interface MessageContent {
  /**
   * Type of content
   */
  type: string;

  /**
   * Content value
   */
  value: any;
}

/**
 * Response to an A2A message
 */
export interface A2AResponse {
  /**
   * Response message
   */
  message: A2AMessage;

  /**
   * Conversation ID
   */
  conversation_id: string;

  /**
   * Response metadata
   */
  metadata?: {
    /**
     * Processing time in milliseconds
     */
    processing_time: number;

    /**
     * Token usage
     */
    token_usage?: {
      /**
       * Prompt tokens
       */
      prompt: number;

      /**
       * Completion tokens
       */
      completion: number;

      /**
       * Total tokens
       */
      total: number;
    };

    /**
     * Additional metadata
     */
    [key: string]: any;
  };
}

/**
 * Chunk of an A2A message for streaming
 */
export interface A2AMessageChunk {
  /**
   * Chunk of the message
   */
  chunk: {
    /**
     * Content of the chunk
     */
    content: string;

    /**
     * Role of the message sender
     */
    role?: 'assistant';
  };

  /**
   * Whether this is the last chunk
   */
  is_last: boolean;

  /**
   * Conversation ID
   */
  conversation_id: string;
}
