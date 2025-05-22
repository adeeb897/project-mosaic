/**
 * Represents a user message after processing by a personality module
 */
import { UserMessage, MessageContent } from './UserMessage';

export interface ProcessedMessage {
  /**
   * Original user message
   */
  original: UserMessage;

  /**
   * Modified content after processing
   */
  processed: MessageContent[];

  /**
   * Context additions derived from the message
   */
  contextAdditions?: ContextAddition[];

  /**
   * Detected intents
   */
  intents?: DetectedIntent[];

  /**
   * Detected entities
   */
  entities?: DetectedEntity[];

  /**
   * Detected sentiment
   */
  sentiment?: SentimentAnalysis;

  /**
   * Processing metadata
   */
  metadata: {
    /**
     * Processing timestamp
     */
    processedAt: Date;

    /**
     * Module that processed the message
     */
    processorId: string;

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
 * Context addition derived from a message
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
}

/**
 * Detected intent in a message
 */
export interface DetectedIntent {
  /**
   * Name of the intent
   */
  name: string;

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Parameters extracted for this intent
   */
  parameters?: Record<string, any>;
}

/**
 * Entity detected in a message
 */
export interface DetectedEntity {
  /**
   * Type of entity
   */
  type: string;

  /**
   * Value of the entity
   */
  value: any;

  /**
   * Start position in the text
   */
  startPosition?: number;

  /**
   * End position in the text
   */
  endPosition?: number;

  /**
   * Confidence score (0-1)
   */
  confidence: number;
}

/**
 * Sentiment analysis result
 */
export interface SentimentAnalysis {
  /**
   * Overall sentiment score (-1 to 1, negative to positive)
   */
  score: number;

  /**
   * Magnitude of sentiment (0-1)
   */
  magnitude: number;

  /**
   * Detected emotions
   */
  emotions?: {
    /**
     * Emotion name
     */
    name: string;

    /**
     * Emotion score (0-1)
     */
    score: number;
  }[];
}
