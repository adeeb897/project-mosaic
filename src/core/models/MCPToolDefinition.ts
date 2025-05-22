/**
 * Definition of a tool for the Model Context Protocol (MCP)
 */
import { ParameterDefinition } from './ParameterDefinition';
import { ReturnDefinition } from './ReturnDefinition';
import { ToolExample } from './ToolExample';

export interface MCPToolDefinition {
  /**
   * Unique identifier for the tool
   */
  id: string;

  /**
   * Name of the tool
   */
  name: string;

  /**
   * Description of the tool
   */
  description: string;

  /**
   * Version of the tool
   */
  version: string;

  /**
   * Parameters for the tool
   */
  parameters: ParameterDefinition[];

  /**
   * Return value definition
   */
  returns: ReturnDefinition;

  /**
   * Examples of tool usage
   */
  examples?: ToolExample[];

  /**
   * Whether the tool supports streaming
   */
  supportsStreaming?: boolean;

  /**
   * Whether the tool requires authentication
   */
  requiresAuth?: boolean;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}
