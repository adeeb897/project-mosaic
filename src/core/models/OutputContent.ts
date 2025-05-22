/**
 * Content for modality output
 */
export interface OutputContent {
  /**
   * Type of content
   */
  type: string;

  /**
   * Content data
   */
  data: any;

  /**
   * Format of the content
   */
  format: string;

  /**
   * MIME type of the content
   */
  mimeType?: string;

  /**
   * Language of the content (if applicable)
   */
  language?: string;

  /**
   * Encoding of the content
   */
  encoding?: string;

  /**
   * Size of the content in bytes
   */
  size?: number;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Options for generating modality output
 */
export interface OutputOptions {
  /**
   * Target modality
   */
  targetModality: string;

  /**
   * Quality level (0-100)
   */
  quality?: number;

  /**
   * Format options
   */
  formatOptions?: Record<string, any>;

  /**
   * Style options
   */
  styleOptions?: Record<string, any>;

  /**
   * Rendering options
   */
  renderingOptions?: Record<string, any>;

  /**
   * Accessibility options
   */
  accessibilityOptions?: Record<string, any>;

  /**
   * Device capabilities
   */
  deviceCapabilities?: Record<string, any>;

  /**
   * User preferences
   */
  userPreferences?: Record<string, any>;

  /**
   * Context information
   */
  context?: Record<string, any>;
}
