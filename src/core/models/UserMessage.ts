/**
 * Represents a message from a user
 */
export interface UserMessage {
  /**
   * Unique identifier for the message
   */
  id: string;

  /**
   * Conversation ID this message belongs to
   */
  conversationId: string;

  /**
   * Content of the message
   */
  content: MessageContent[];

  /**
   * Timestamp when the message was created
   */
  timestamp: Date;

  /**
   * Optional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Content of a message, which can be of different types
 */
export interface MessageContent {
  /**
   * Type of content
   */
  type: string;

  /**
   * Value of the content
   */
  value: any;
}
