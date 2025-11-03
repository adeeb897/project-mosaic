/**
 * Represents a capability provided by a module
 */
export interface ModuleCapability {
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
   * Version of the capability
   */
  version: string;

  /**
   * Whether this capability is optional
   */
  optional: boolean;

  /**
   * Additional metadata for the capability
   */
  metadata?: Record<string, any>;
}
