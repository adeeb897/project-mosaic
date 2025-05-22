/**
 * Agent card for the Agent-to-Agent (A2A) protocol
 */
export interface A2AAgentCard {
  /**
   * Unique identifier for the agent
   */
  id: string;

  /**
   * Name of the agent
   */
  name: string;

  /**
   * Description of the agent
   */
  description: string;

  /**
   * Version of the agent
   */
  version: string;

  /**
   * Capabilities of the agent
   */
  capabilities: A2ACapability[];

  /**
   * APIs exposed by the agent
   */
  apis: A2AAPI[];

  /**
   * Authentication requirements
   */
  authentication: A2AAuthentication;

  /**
   * Additional metadata
   */
  meta: Record<string, any>;
}

/**
 * Capability of an A2A agent
 */
export interface A2ACapability {
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
  parameters: A2AParameterDefinition[];

  /**
   * Return value definition
   */
  returns: A2AReturnDefinition;
}

/**
 * API exposed by an A2A agent
 */
export interface A2AAPI {
  /**
   * Unique identifier for the API
   */
  id: string;

  /**
   * Endpoint URL
   */
  endpoint: string;

  /**
   * HTTP method
   */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';

  /**
   * Description of the API
   */
  description: string;

  /**
   * Parameters for the API
   */
  parameters?: A2AParameterDefinition[];

  /**
   * Return value definition
   */
  returns?: A2AReturnDefinition;
}

/**
 * Authentication requirements for an A2A agent
 */
export interface A2AAuthentication {
  /**
   * Type of authentication
   */
  type: 'api_key' | 'bearer' | 'oauth2' | 'none';

  /**
   * Location of the authentication token
   */
  location?: 'header' | 'query';

  /**
   * Name of the authentication parameter
   */
  name?: string;
}

/**
 * Parameter definition for an A2A capability or API
 */
export interface A2AParameterDefinition {
  /**
   * Name of the parameter
   */
  name: string;

  /**
   * Type of the parameter
   */
  type: string;

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
}

/**
 * Return value definition for an A2A capability or API
 */
export interface A2AReturnDefinition {
  /**
   * Type of the return value
   */
  type: string;

  /**
   * Description of the return value
   */
  description: string;

  /**
   * Schema for the return value
   */
  schema?: any;
}
