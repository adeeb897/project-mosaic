/**
 * Addition to a conversation context
 */
export interface ContextAddition {
  /**
   * Type of context addition
   */
  type: string;

  /**
   * Content of the context addition
   */
  content: any;

  /**
   * Relevance score (0-1)
   */
  relevance: number;

  /**
   * Source of the context addition
   */
  source: string;

  /**
   * Timestamp when the context addition was created
   */
  timestamp: Date;

  /**
   * Expiration time for the context addition (if applicable)
   */
  expiresAt?: Date;

  /**
   * Priority of the context addition (higher number = higher priority)
   */
  priority?: number;

  /**
   * Tags for the context addition
   */
  tags?: string[];

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}
