/**
 * User preference for a specific modality
 */
export interface ModalityPreference {
  /**
   * Type of modality
   */
  type: string;

  /**
   * Priority of this modality (higher number = higher priority)
   */
  priority: number;

  /**
   * Whether this modality is enabled
   */
  enabled: boolean;

  /**
   * Modality-specific settings
   */
  settings?: Record<string, any>;
}
