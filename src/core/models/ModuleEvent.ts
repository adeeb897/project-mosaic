/**
 * Represents an event in the module system
 */
export interface ModuleEvent {
  /**
   * The type of event
   */
  type: string;

  /**
   * The source of the event (usually a module ID)
   */
  source: string;

  /**
   * Timestamp when the event was created
   */
  timestamp: Date;

  /**
   * Optional event payload
   */
  payload?: any;

  /**
   * Optional metadata
   */
  metadata?: Record<string, any>;
}
