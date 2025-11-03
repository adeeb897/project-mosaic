/**
 * Output from a modality
 */
import { OutputContent } from './OutputContent';
import { OutputOptions } from './OutputContent';

export interface ModalityOutput {
  /**
   * Content of the output
   */
  content: OutputContent;

  /**
   * Options used to generate the output
   */
  options: OutputOptions;

  /**
   * Generation metadata
   */
  metadata: {
    /**
     * Timestamp when the output was generated
     */
    generatedAt: Date;

    /**
     * Generator ID
     */
    generatorId: string;

    /**
     * Generation time in milliseconds
     */
    generationTimeMs: number;

    /**
     * Generation stages
     */
    stages?: GenerationStageResult[];

    /**
     * Additional metadata
     */
    [key: string]: any;
  };

  /**
   * Alternative outputs
   */
  alternatives?: AlternativeOutput[];

  /**
   * Error message if generation failed
   */
  error?: string;
}

/**
 * Result of a generation stage
 */
export interface GenerationStageResult {
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
   * Generation time in milliseconds
   */
  generationTimeMs: number;

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
 * Alternative output
 */
export interface AlternativeOutput {
  /**
   * Content of the alternative output
   */
  content: OutputContent;

  /**
   * Quality score (0-100)
   */
  quality: number;

  /**
   * Reason for the alternative
   */
  reason?: string;
}

/**
 * Modality data for translation between modalities
 */
export interface ModalityData {
  /**
   * Type of modality
   */
  modalityType: string;

  /**
   * Data representation
   */
  data: any;

  /**
   * Format of the data
   */
  format: string;

  /**
   * Schema of the data
   */
  schema?: any;

  /**
   * Metadata about the data
   */
  metadata?: Record<string, any>;
}
