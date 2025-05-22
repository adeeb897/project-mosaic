/**
 * Example of tool usage
 */
export interface ToolExample {
  /**
   * Parameters for the example
   */
  parameters: Record<string, any>;

  /**
   * Result of the example
   */
  result: any;

  /**
   * Description of the example
   */
  description: string;

  /**
   * Title of the example
   */
  title?: string;

  /**
   * Tags for the example
   */
  tags?: string[];

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}
