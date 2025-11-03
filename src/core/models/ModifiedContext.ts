/**
 * Represents a conversation context after modification by a personality module
 */
import { ConversationContext } from './ConversationContext';

export interface ModifiedContext {
  /**
   * Original conversation context
   */
  original: ConversationContext;

  /**
   * Modified conversation context
   */
  modified: ConversationContext;

  /**
   * Changes made to the context
   */
  changes: ContextChange[];

  /**
   * Metadata about the modification
   */
  metadata: {
    /**
     * Timestamp when the context was modified
     */
    modifiedAt: Date;

    /**
     * Module that modified the context
     */
    modifierId: string;

    /**
     * Processing time in milliseconds
     */
    processingTimeMs: number;

    /**
     * Additional metadata
     */
    [key: string]: any;
  };
}

/**
 * Represents a change made to a conversation context
 */
export interface ContextChange {
  /**
   * Type of change
   */
  type: 'addition' | 'removal' | 'modification';

  /**
   * Path to the changed element
   */
  path: string;

  /**
   * Previous value (for removal or modification)
   */
  previousValue?: any;

  /**
   * New value (for addition or modification)
   */
  newValue?: any;

  /**
   * Reason for the change
   */
  reason?: string;

  /**
   * Importance of the change (0-1)
   */
  importance?: number;
}
