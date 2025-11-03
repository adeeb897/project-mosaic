/**
 * Definition of a return value for a tool
 */
export interface ReturnDefinition {
  /**
   * Type of the return value
   */
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'file' | 'stream';

  /**
   * JSON schema for the return value (for complex types)
   */
  schema?: any; // JSONSchema7

  /**
   * Description of the return value
   */
  description: string;

  /**
   * Examples of return values
   */
  examples?: any[];

  /**
   * MIME type for file or stream returns
   */
  mimeType?: string;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}
