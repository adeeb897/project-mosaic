/**
 * Environment context for a conversation
 */
export interface EnvironmentContext {
  /**
   * Timezone of the user
   */
  timezone: string;

  /**
   * Locale of the user
   */
  locale: string;

  /**
   * Device information
   */
  device: DeviceInfo;

  /**
   * Location information (if available)
   */
  location?: LocationInfo;

  /**
   * Current time
   */
  currentTime: Date;
}

/**
 * Device information
 */
export interface DeviceInfo {
  /**
   * Type of device
   */
  type: string;

  /**
   * Screen size (if applicable)
   */
  screenSize?: {
    /**
     * Width in pixels
     */
    width: number;

    /**
     * Height in pixels
     */
    height: number;
  };

  /**
   * Device capabilities
   */
  capabilities: string[];
}

/**
 * Location information
 */
export interface LocationInfo {
  /**
   * Country
   */
  country: string;

  /**
   * Region/state/province
   */
  region?: string;

  /**
   * City
   */
  city?: string;

  /**
   * Coordinates (if available)
   */
  coordinates?: {
    /**
     * Latitude
     */
    latitude: number;

    /**
     * Longitude
     */
    longitude: number;
  };
}
