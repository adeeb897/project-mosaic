/**
 * UI component for an agent
 */
export interface AgentUIComponent {
  /**
   * Type of component
   */
  type: 'status_indicator' | 'capability_launcher' | 'conversation_view' | 'custom';

  /**
   * Location where the component should be rendered
   */
  location: 'inline' | 'modal' | 'sidebar' | 'panel';

  /**
   * Component implementation (React component name or path)
   */
  component: string;

  /**
   * Default props for the component
   */
  props?: Record<string, any>;

  /**
   * Component ID
   */
  id?: string;

  /**
   * Component name
   */
  name?: string;

  /**
   * Component description
   */
  description?: string;

  /**
   * CSS styles for the component
   */
  styles?: Record<string, any>;

  /**
   * Event handlers for the component
   */
  events?: AgentUIEventHandler[];
}

/**
 * Event handler for an agent UI component
 */
export interface AgentUIEventHandler {
  /**
   * Event name
   */
  event: string;

  /**
   * Handler function name
   */
  handler: string;

  /**
   * Event options
   */
  options?: Record<string, any>;
}
