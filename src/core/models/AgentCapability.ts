/**
 * Capability of an agent
 */
import { ParameterDefinition } from './ParameterDefinition';
import { ReturnDefinition } from './ReturnDefinition';

export interface AgentCapability {
  /**
   * Unique identifier for the capability
   */
  id: string;

  /**
   * Name of the capability
   */
  name: string;

  /**
   * Description of the capability
   */
  description: string;

  /**
   * Parameters for the capability
   */
  parameters: ParameterDefinition[];

  /**
   * Return value definition
   */
  returns: ReturnDefinition;

  /**
   * Examples of capability usage
   */
  examples?: CapabilityExample[];

  /**
   * Whether the capability is required
   */
  required?: boolean;

  /**
   * Whether the capability supports streaming
   */
  supportsStreaming?: boolean;

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Example of capability usage
 */
export interface CapabilityExample {
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
}
