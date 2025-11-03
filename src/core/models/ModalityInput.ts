/**
 * Input for a modality
 */
export interface ModalityInput {
  /**
   * Type of modality
   */
  modalityType: string;

  /**
   * Raw input data
   */
  data: any;

  /**
   * MIME type of the data
   */
  mimeType: string;

  /**
   * Size of the data in bytes
   */
  size: number;

  /**
   * Timestamp when the input was created
   */
  timestamp: Date;

  /**
   * Source of the input
   */
  source: string;

  /**
   * Format of the data
   */
  format?: string;

  /**
   * Encoding of the data
   */
  encoding?: string;

  /**
   * Language of the input (if applicable)
   */
  language?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Processed input from a modality
 */
export interface ProcessedInput {
  /**
   * Original input
   */
  original: ModalityInput;

  /**
   * Processed data
   */
  processed: any;

  /**
   * Type of the processed data
   */
  dataType: string;

  /**
   * Processing metadata
   */
  metadata: {
    /**
     * Timestamp when the input was processed
     */
    processedAt: Date;

    /**
     * Processor ID
     */
    processorId: string;

    /**
     * Processing time in milliseconds
     */
    processingTimeMs: number;

    /**
     * Processing stages
     */
    stages?: ProcessingStageResult[];

    /**
     * Additional metadata
     */
    [key: string]: any;
  };

  /**
   * Confidence score (0-1)
   */
  confidence?: number;

  /**
   * Alternative interpretations
   */
  alternatives?: AlternativeInterpretation[];

  /**
   * Extracted entities
   */
  entities?: ExtractedEntity[];

  /**
   * Error message if processing failed
   */
  error?: string;
}

/**
 * Result of a processing stage
 */
export interface ProcessingStageResult {
  /**
   * Stage ID
   */
  stageId: string;

  /**
   * Stage name
   */
  stageName: string;

  /**
   * Input to the stage
   */
  input: any;

  /**
   * Output from the stage
   */
  output: any;

  /**
   * Processing time in milliseconds
   */
  processingTimeMs: number;

  /**
   * Whether the stage was successful
   */
  success: boolean;

  /**
   * Error message if the stage failed
   */
  error?: string;
}

/**
 * Alternative interpretation of the input
 */
export interface AlternativeInterpretation {
  /**
   * Processed data
   */
  processed: any;

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Type of the processed data
   */
  dataType: string;
}

/**
 * Entity extracted from the input
 */
export interface ExtractedEntity {
  /**
   * Type of entity
   */
  type: string;

  /**
   * Value of the entity
   */
  value: any;

  /**
   * Confidence score (0-1)
   */
  confidence: number;

  /**
   * Start position in the original input
   */
  start?: number;

  /**
   * End position in the original input
   */
  end?: number;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}
