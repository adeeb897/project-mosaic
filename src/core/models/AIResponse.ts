/**
 * Represents a response from an AI model
 */
import { MessageContent } from './UserMessage';

export interface AIResponse {
  /**
   * Unique identifier for the response
   */
  id: string;

  /**
   * Conversation ID this response belongs to
   */
  conversationId: string;

  /**
   * Content of the response
   */
  content: MessageContent[];

  /**
   * Timestamp when the response was created
   */
  timestamp: Date;

  /**
   * Response metadata
   */
  metadata: {
    /**
     * Model that generated the response
     */
    model: string;

    /**
     * Token usage statistics
     */
    tokenUsage?: {
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
     * Tool calls made during generation
     */
    toolCalls?: ToolCall[];

    /**
     * Generation parameters
     */
    parameters?: Record<string, any>;

    /**
     * Additional metadata
     */
    [key: string]: any;
  };
}

/**
 * Tool call made during response generation
 */
export interface ToolCall {
  /**
   * Tool ID
   */
  toolId: string;

  /**
   * Parameters passed to the tool
   */
  parameters: Record<string, any>;

  /**
   * Result returned by the tool
   */
  result: any;

  /**
   * Error message if the tool call failed
   */
  error?: string;

  /**
   * Start time of the tool call
   */
  startTime: Date;

  /**
   * End time of the tool call
   */
  endTime: Date;
}
