/**
 * Definition of a tool
 */
import { ParameterDefinition } from './ParameterDefinition';
import { ReturnDefinition } from './ReturnDefinition';
import { ToolExample } from './ToolExample';

export interface ToolDefinition {
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
   * Type of tool
   */
  toolType: string;

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
   * Execution model (local, remote, hybrid)
   */
  executionModel: 'local' | 'remote' | 'hybrid';

  /**
   * Timeout in milliseconds
   */
  timeoutMs: number;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}
