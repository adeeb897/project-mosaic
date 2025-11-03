/**
 * Capabilities of a device
 */
export interface DeviceCapabilities {
  /**
   * Device type
   */
  deviceType: DeviceType;

  /**
   * Operating system
   */
  operatingSystem: OperatingSystem;

  /**
   * Browser information (if applicable)
   */
  browser?: BrowserInfo;

  /**
   * Hardware capabilities
   */
  hardware: HardwareCapabilities;

  /**
   * Input capabilities
   */
  input: InputCapabilities;

  /**
   * Output capabilities
   */
  output: OutputCapabilities;

  /**
   * Network capabilities
   */
  network: NetworkCapabilities;

  /**
   * Storage capabilities
   */
  storage: StorageCapabilities;

  /**
   * Available APIs
   */
  apis: string[];

  /**
   * Granted permissions
   */
  permissions: string[];

  /**
   * Accessibility features
   */
  accessibility: AccessibilityCapabilities;

  /**
   * Additional capabilities
   */
  additional?: Record<string, any>;
}

/**
 * Type of device
 */
export enum DeviceType {
  DESKTOP = 'desktop',
  LAPTOP = 'laptop',
  TABLET = 'tablet',
  MOBILE = 'mobile',
  TV = 'tv',
  WEARABLE = 'wearable',
  IOT = 'iot',
  OTHER = 'other',
}

/**
 * Operating system information
 */
export interface OperatingSystem {
  /**
   * Name of the operating system
   */
  name: string;

  /**
   * Version of the operating system
   */
  version: string;

  /**
   * Platform (e.g., Windows, macOS, Linux, iOS, Android)
   */
  platform: string;

  /**
   * Architecture (e.g., x86, x64, arm)
   */
  architecture?: string;
}

/**
 * Browser information
 */
export interface BrowserInfo {
  /**
   * Name of the browser
   */
  name: string;

  /**
   * Version of the browser
   */
  version: string;

  /**
   * Engine of the browser
   */
  engine?: string;

  /**
   * User agent string
   */
  userAgent?: string;
}

/**
 * Hardware capabilities
 */
export interface HardwareCapabilities {
  /**
   * CPU information
   */
  cpu?: {
    /**
     * Number of cores
     */
    cores?: number;

    /**
     * Architecture
     */
    architecture?: string;

    /**
     * Clock speed in MHz
     */
    clockSpeed?: number;
  };

  /**
   * Memory information
   */
  memory?: {
    /**
     * Total memory in MB
     */
    totalMemory?: number;

    /**
     * Available memory in MB
     */
    availableMemory?: number;
  };

  /**
   * GPU information
   */
  gpu?: {
    /**
     * Name of the GPU
     */
    name?: string;

    /**
     * Memory in MB
     */
    memory?: number;

    /**
     * Whether WebGL is supported
     */
    webglSupport?: boolean;

    /**
     * WebGL version
     */
    webglVersion?: string;
  };

  /**
   * Screen information
   */
  screen?: {
    /**
     * Width in pixels
     */
    width: number;

    /**
     * Height in pixels
     */
    height: number;

    /**
     * Pixel ratio
     */
    pixelRatio: number;

    /**
     * Color depth
     */
    colorDepth?: number;

    /**
     * Whether touch is supported
     */
    touchSupport?: boolean;
  };

  /**
   * Battery information
   */
  battery?: {
    /**
     * Whether battery is available
     */
    available?: boolean;

    /**
     * Battery level (0-1)
     */
    level?: number;

    /**
     * Whether the device is charging
     */
    charging?: boolean;
  };
}

/**
 * Input capabilities
 */
export interface InputCapabilities {
  /**
   * Whether keyboard is available
   */
  keyboard: boolean;

  /**
   * Whether mouse is available
   */
  mouse: boolean;

  /**
   * Whether touch is available
   */
  touch: boolean;

  /**
   * Whether stylus is available
   */
  stylus?: boolean;

  /**
   * Whether microphone is available
   */
  microphone?: boolean;

  /**
   * Whether camera is available
   */
  camera?: boolean;

  /**
   * Whether geolocation is available
   */
  geolocation?: boolean;

  /**
   * Whether accelerometer is available
   */
  accelerometer?: boolean;

  /**
   * Whether gyroscope is available
   */
  gyroscope?: boolean;

  /**
   * Whether ambient light sensor is available
   */
  ambientLightSensor?: boolean;

  /**
   * Whether proximity sensor is available
   */
  proximitySensor?: boolean;
}

/**
 * Output capabilities
 */
export interface OutputCapabilities {
  /**
   * Whether display is available
   */
  display: boolean;

  /**
   * Whether audio is available
   */
  audio: boolean;

  /**
   * Whether haptic feedback is available
   */
  haptic?: boolean;

  /**
   * Whether notifications are available
   */
  notifications?: boolean;

  /**
   * Display capabilities
   */
  displayCapabilities?: {
    /**
     * Maximum resolution
     */
    maxResolution?: {
      width: number;
      height: number;
    };

    /**
     * Color gamut
     */
    colorGamut?: string;

    /**
     * Maximum refresh rate
     */
    maxRefreshRate?: number;

    /**
     * Whether HDR is supported
     */
    hdrSupport?: boolean;
  };

  /**
   * Audio capabilities
   */
  audioCapabilities?: {
    /**
     * Supported audio formats
     */
    formats?: string[];

    /**
     * Number of channels
     */
    channels?: number;

    /**
     * Sample rate
     */
    sampleRate?: number;

    /**
     * Bit depth
     */
    bitDepth?: number;
  };
}

/**
 * Network capabilities
 */
export interface NetworkCapabilities {
  /**
   * Whether online
   */
  online: boolean;

  /**
   * Connection type
   */
  connectionType?: string;

  /**
   * Downlink speed in Mbps
   */
  downlinkSpeed?: number;

  /**
   * Uplink speed in Mbps
   */
  uplinkSpeed?: number;

  /**
   * Round-trip time in ms
   */
  rtt?: number;

  /**
   * Whether the connection is metered
   */
  metered?: boolean;

  /**
   * Whether the connection is low-bandwidth
   */
  lowBandwidth?: boolean;

  /**
   * Maximum concurrent connections
   */
  maxConcurrentConnections?: number;
}

/**
 * Storage capabilities
 */
export interface StorageCapabilities {
  /**
   * Whether local storage is available
   */
  localStorage: boolean;

  /**
   * Whether session storage is available
   */
  sessionStorage: boolean;

  /**
   * Whether IndexedDB is available
   */
  indexedDB?: boolean;

  /**
   * Whether WebSQL is available
   */
  webSQL?: boolean;

  /**
   * Whether cookies are enabled
   */
  cookies?: boolean;

  /**
   * Whether file system access is available
   */
  fileSystem?: boolean;

  /**
   * Quota information
   */
  quota?: {
    /**
     * Total quota in MB
     */
    totalQuota?: number;

    /**
     * Used quota in MB
     */
    usedQuota?: number;
  };
}

/**
 * Accessibility capabilities
 */
export interface AccessibilityCapabilities {
  /**
   * Whether screen reader is active
   */
  screenReader?: boolean;

  /**
   * Whether high contrast is active
   */
  highContrast?: boolean;

  /**
   * Whether reduced motion is active
   */
  reducedMotion?: boolean;

  /**
   * Whether color inversion is active
   */
  invertedColors?: boolean;

  /**
   * Whether grayscale is active
   */
  grayscale?: boolean;

  /**
   * Whether reduced transparency is active
   */
  reducedTransparency?: boolean;

  /**
   * Font size multiplier
   */
  fontSizeMultiplier?: number;
}

/**
 * Result of checking compatibility with device capabilities
 */
export interface CompatibilityResult {
  /**
   * Whether the device is compatible
   */
  compatible: boolean;

  /**
   * Compatibility score (0-100)
   */
  score: number;

  /**
   * Issues found during compatibility check
   */
  issues?: CompatibilityIssue[];

  /**
   * Recommendations for improving compatibility
   */
  recommendations?: CompatibilityRecommendation[];
}

/**
 * Issue found during compatibility check
 */
export interface CompatibilityIssue {
  /**
   * Type of issue
   */
  type: string;

  /**
   * Severity of the issue
   */
  severity: 'critical' | 'major' | 'minor' | 'info';

  /**
   * Description of the issue
   */
  description: string;

  /**
   * Component that has the issue
   */
  component: string;

  /**
   * Required capability
   */
  requiredCapability: string;

  /**
   * Actual capability
   */
  actualCapability?: string;
}

/**
 * Recommendation for improving compatibility
 */
export interface CompatibilityRecommendation {
  /**
   * Type of recommendation
   */
  type: string;

  /**
   * Description of the recommendation
   */
  description: string;

  /**
   * Priority of the recommendation
   */
  priority: 'high' | 'medium' | 'low';

  /**
   * Impact of implementing the recommendation
   */
  impact: string;

  /**
   * Effort required to implement the recommendation
   */
  effort: string;
}
