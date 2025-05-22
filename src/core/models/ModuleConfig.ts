/**
 * Base interface for module configuration
 */
export interface ModuleConfig {
  /**
   * Whether the module is enabled
   */
  enabled: boolean;

  /**
   * Module-specific configuration properties
   */
  [key: string]: any;
}
