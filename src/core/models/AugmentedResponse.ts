/**
 * Represents an AI response after augmentation by a personality module
 */
import { AIResponse } from './AIResponse';
import { MessageContent } from './UserMessage';

export interface AugmentedResponse {
  /**
   * Original AI response
   */
  original: AIResponse;

  /**
   * Modified content after augmentation
   */
  augmented: MessageContent[];

  /**
   * Annotations added to the response
   */
  annotations?: Annotation[];

  /**
   * Citations added to the response
   */
  citations?: Citation[];

  /**
   * Augmentation metadata
   */
  metadata: {
    /**
     * Augmentation timestamp
     */
    augmentedAt: Date;

    /**
     * Module that augmented the response
     */
    augmenterId: string;

    /**
     * Augmentation time in milliseconds
     */
    augmentationTimeMs: number;

    /**
     * Changes made during augmentation
     */
    changes?: AugmentationChange[];

    /**
     * Additional metadata
     */
    [key: string]: any;
  };
}

/**
 * Annotation added to a response
 */
export interface Annotation {
  /**
   * Type of annotation
   */
  type: string;

  /**
   * Start index in the text
   */
  startIndex: number;

  /**
   * End index in the text
   */
  endIndex: number;

  /**
   * Annotation content
   */
  content: any;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Citation added to a response
 */
export interface Citation {
  /**
   * Citation text
   */
  text: string;

  /**
   * Source of the citation
   */
  source: string;

  /**
   * URL to the source (if available)
   */
  url?: string;

  /**
   * Start index in the text
   */
  startIndex?: number;

  /**
   * End index in the text
   */
  endIndex?: number;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Change made during augmentation
 */
export interface AugmentationChange {
  /**
   * Type of change
   */
  type: 'addition' | 'deletion' | 'modification' | 'formatting';

  /**
   * Description of the change
   */
  description: string;

  /**
   * Location of the change
   */
  location?: {
    /**
     * Start index
     */
    startIndex: number;

    /**
     * End index
     */
    endIndex: number;
  };

  /**
   * Reason for the change
   */
  reason?: string;
}
