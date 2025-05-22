/**
 * User accessibility settings
 */
export interface AccessibilitySettings {
  /**
   * Font settings
   */
  font: {
    /**
     * Font size (in pixels)
     */
    size: number;

    /**
     * Font family
     */
    family: string;

    /**
     * Font weight
     */
    weight: 'normal' | 'bold' | number;
  };

  /**
   * Color settings
   */
  color: {
    /**
     * High contrast mode
     */
    highContrast: boolean;

    /**
     * Color blindness mode
     */
    colorBlindnessMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia';

    /**
     * Custom color overrides
     */
    customColors?: Record<string, string>;
  };

  /**
   * Motion settings
   */
  motion: {
    /**
     * Reduce motion
     */
    reduceMotion: boolean;

    /**
     * Animation speed (1 = normal, < 1 = faster, > 1 = slower)
     */
    animationSpeed: number;
  };

  /**
   * Screen reader settings
   */
  screenReader: {
    /**
     * Optimize for screen readers
     */
    optimized: boolean;

    /**
     * Additional text descriptions
     */
    enhancedDescriptions: boolean;
  };

  /**
   * Keyboard settings
   */
  keyboard: {
    /**
     * Enable keyboard shortcuts
     */
    shortcuts: boolean;

    /**
     * Custom keyboard shortcuts
     */
    customShortcuts?: Record<string, string>;

    /**
     * Keyboard navigation mode
     */
    navigationMode: 'standard' | 'enhanced';
  };

  /**
   * Other accessibility features
   */
  other: {
    /**
     * Auto-play media
     */
    autoPlayMedia: boolean;

    /**
     * Show captions for audio/video
     */
    showCaptions: boolean;

    /**
     * Focus indicators
     */
    enhancedFocus: boolean;
  };
}
