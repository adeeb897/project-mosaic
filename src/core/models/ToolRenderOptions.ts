/**
 * Options for rendering a tool in the UI
 */
export interface ToolRenderOptions {
  /**
   * Default view mode
   */
  defaultView: 'compact' | 'expanded' | 'detailed';

  /**
   * Whether to show the tool icon
   */
  showIcon: boolean;

  /**
   * Whether to show the tool name
   */
  showName: boolean;

  /**
   * Whether to show the tool description
   */
  showDescription: boolean;

  /**
   * Whether to show the tool version
   */
  showVersion: boolean;

  /**
   * Whether to show the tool parameters
   */
  showParameters: boolean;

  /**
   * Whether to show the tool result
   */
  showResult: boolean;

  /**
   * Whether to show the tool execution time
   */
  showExecutionTime: boolean;

  /**
   * Whether to show the tool execution status
   */
  showExecutionStatus: boolean;

  /**
   * Whether to show the tool execution errors
   */
  showErrors: boolean;

  /**
   * Custom render options
   */
  custom?: Record<string, any>;
}
