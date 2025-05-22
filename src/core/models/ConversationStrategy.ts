/**
 * Strategy for handling conversations with an agent
 */
export interface ConversationStrategy {
  /**
   * Format of messages
   */
  messageFormat: 'text' | 'json' | 'binary' | 'custom';

  /**
   * How to handle context
   */
  contextHandling: 'full' | 'summary' | 'none';

  /**
   * State management approach
   */
  stateManagement: 'stateful' | 'stateless';

  /**
   * Number of messages to retain in history
   */
  messageRetention: number;

  /**
   * Whether to include system messages in the conversation
   */
  includeSystemMessages?: boolean;

  /**
   * Whether to include metadata in messages
   */
  includeMetadata?: boolean;

  /**
   * Format for message IDs
   */
  messageIdFormat?: string;

  /**
   * Custom message processor
   */
  messageProcessor?: string;

  /**
   * Additional strategy parameters
   */
  parameters?: Record<string, any>;
}
