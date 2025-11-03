/**
 * Definition of a parameter for a tool
 */
export interface ParameterDefinition {
  /**
   * Name of the parameter
   */
  name: string;

  /**
   * Type of the parameter
   */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file' | 'date';

  /**
   * Description of the parameter
   */
  description: string;

  /**
   * Whether the parameter is required
   */
  required: boolean;

  /**
   * Default value for the parameter
   */
  default?: any;

  /**
   * Validation rules for the parameter
   */
  validation?: ValidationRule[];

  /**
   * UI hints for rendering the parameter input
   */
  uiHints?: UIHint[];
}

/**
 * Validation rule for a parameter
 */
export interface ValidationRule {
  /**
   * Type of validation
   */
  type: 'min' | 'max' | 'regex' | 'enum' | 'custom';

  /**
   * Value for the validation rule
   */
  value: any;

  /**
   * Error message to display if validation fails
   */
  message: string;
}

/**
 * UI hint for rendering a parameter input
 */
export interface UIHint {
  /**
   * Type of control to use
   */
  control: 'text' | 'select' | 'checkbox' | 'slider' | 'date' | 'file' | 'custom';

  /**
   * Options for select controls
   */
  options?: any[];

  /**
   * Placeholder text
   */
  placeholder?: string;

  /**
   * Helper text to display
   */
  helperText?: string;
}
