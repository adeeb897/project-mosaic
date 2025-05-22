/**
 * UI components for a tool
 */
export interface ToolUIComponents {
  /**
   * Components for rendering the tool in the UI
   */
  components: UIComponent[];

  /**
   * Default component to use
   */
  defaultComponent?: string;

  /**
   * CSS styles for the components
   */
  styles?: Record<string, any>;

  /**
   * Theme for the components
   */
  theme?: UITheme;
}

/**
 * UI component
 */
export interface UIComponent {
  /**
   * Component ID
   */
  id: string;

  /**
   * Component type
   */
  type: 'result_viewer' | 'parameter_form' | 'visualization' | 'custom';

  /**
   * Component name
   */
  name: string;

  /**
   * Component description
   */
  description?: string;

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
   * Event handlers for the component
   */
  events?: UIEventHandler[];
}

/**
 * UI event handler
 */
export interface UIEventHandler {
  /**
   * Event name
   */
  event: string;

  /**
   * Handler function name
   */
  handler: string;
}

/**
 * UI theme
 */
export interface UITheme {
  /**
   * Primary color
   */
  primaryColor?: string;

  /**
   * Secondary color
   */
  secondaryColor?: string;

  /**
   * Text color
   */
  textColor?: string;

  /**
   * Background color
   */
  backgroundColor?: string;

  /**
   * Font family
   */
  fontFamily?: string;

  /**
   * Border radius
   */
  borderRadius?: string;

  /**
   * Custom theme properties
   */
  [key: string]: any;
}
