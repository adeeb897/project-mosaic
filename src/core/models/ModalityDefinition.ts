/**
 * Definition of a modality
 */
export interface ModalityDefinition {
  /**
   * Type of modality
   */
  modalityType: ModalityType;

  /**
   * Processing pipeline for the modality
   */
  processingPipeline: ProcessingStage[];

  /**
   * Output rendering configuration
   */
  outputRendering: RenderingConfig;

  /**
   * Constraints for the modality
   */
  constraints: ModalityConstraints;

  /**
   * Fallback strategy if the modality is not supported
   */
  fallbackStrategy: FallbackStrategy;

  /**
   * Device requirements for the modality
   */
  deviceRequirements: DeviceRequirements;

  /**
   * Accessibility features
   */
  accessibilityFeatures: AccessibilityFeature[];
}

/**
 * Types of modalities
 */
export enum ModalityType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
  VIDEO = 'video',
  DATA_VISUALIZATION = 'data_visualization',
  DOCUMENT = 'document',
  CUSTOM = 'custom',
}

/**
 * Processing stage in a modality pipeline
 */
export interface ProcessingStage {
  /**
   * Stage ID
   */
  id: string;

  /**
   * Type of stage
   */
  type: string;

  /**
   * Processor implementation
   */
  processor: string;

  /**
   * Configuration for the processor
   */
  config: Record<string, any>;

  /**
   * Next stages in the pipeline
   */
  nextStages: string[];

  /**
   * Error stage
   */
  errorStage?: string;
}

/**
 * Rendering configuration for a modality
 */
export interface RenderingConfig {
  /**
   * Renderer implementation
   */
  renderer: string;

  /**
   * Options for the renderer
   */
  options: Record<string, any>;

  /**
   * Templates for rendering
   */
  templates: Record<string, string>;

  /**
   * Style options
   */
  styleOptions: Record<string, any>;

  /**
   * Animations
   */
  animations?: AnimationConfig[];
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  /**
   * Trigger for the animation
   */
  trigger: string;

  /**
   * Animation name
   */
  animation: string;

  /**
   * Duration in milliseconds
   */
  duration: number;

  /**
   * Easing function
   */
  easing: string;

  /**
   * Delay in milliseconds
   */
  delay?: number;
}

/**
 * Constraints for a modality
 */
export interface ModalityConstraints {
  /**
   * Maximum input size
   */
  maxInputSize?: number;

  /**
   * Maximum output size
   */
  maxOutputSize?: number;

  /**
   * Supported formats
   */
  supportedFormats: string[];

  /**
   * Processing time limit in milliseconds
   */
  processingTimeLimit?: number;

  /**
   * Quality settings
   */
  qualitySettings: Record<string, number>;
}

/**
 * Fallback strategy for a modality
 */
export interface FallbackStrategy {
  /**
   * Target modality to fall back to
   */
  targetModality: string;

  /**
   * Conversion method
   */
  conversionMethod: string;

  /**
   * Quality preservation (0-100)
   */
  qualityPreservation: number;

  /**
   * Whether to notify the user
   */
  userNotification: boolean;
}

/**
 * Device requirements for a modality
 */
export interface DeviceRequirements {
  /**
   * Minimum CPU requirements
   */
  minimumCPU?: string;

  /**
   * Minimum memory requirements
   */
  minimumMemory?: string;

  /**
   * Minimum bandwidth requirements
   */
  minimumBandwidth?: string;

  /**
   * Required APIs
   */
  requiredAPIs: string[];

  /**
   * Required permissions
   */
  requiredPermissions: string[];

  /**
   * Supported browsers
   */
  supportedBrowsers?: string[];
}

/**
 * Accessibility feature for a modality
 */
export interface AccessibilityFeature {
  /**
   * Type of accessibility feature
   */
  type: string;

  /**
   * Whether the feature is enabled
   */
  enabled: boolean;

  /**
   * Options for the feature
   */
  options: Record<string, any>;
}
