/**
 * Result of a validation operation
 */
export interface ValidationResult {
  /**
   * Whether the validation passed
   */
  valid: boolean;

  /**
   * Validation errors, if any
   */
  errors?: ValidationError[];

  /**
   * Validation warnings, if any
   */
  warnings?: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
  /**
   * Path to the property that failed validation
   */
  path: string;

  /**
   * Error message
   */
  message: string;

  /**
   * Error code
   */
  code?: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  /**
   * Path to the property that triggered the warning
   */
  path: string;

  /**
   * Warning message
   */
  message: string;

  /**
   * Warning code
   */
  code?: string;
}
