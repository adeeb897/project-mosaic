/**
 * User notification settings
 */
export interface NotificationSettings {
  /**
   * Whether notifications are enabled
   */
  enabled: boolean;

  /**
   * Types of notifications to receive
   */
  types: {
    /**
     * System notifications
     */
    system: boolean;

    /**
     * Message notifications
     */
    messages: boolean;

    /**
     * Module update notifications
     */
    moduleUpdates: boolean;

    /**
     * Security notifications
     */
    security: boolean;
  };

  /**
   * Notification delivery methods
   */
  deliveryMethods: {
    /**
     * In-app notifications
     */
    inApp: boolean;

    /**
     * Email notifications
     */
    email: boolean;

    /**
     * Push notifications
     */
    push: boolean;
  };

  /**
   * Quiet hours settings
   */
  quietHours?: {
    /**
     * Whether quiet hours are enabled
     */
    enabled: boolean;

    /**
     * Start time (24-hour format, e.g., "22:00")
     */
    start: string;

    /**
     * End time (24-hour format, e.g., "07:00")
     */
    end: string;

    /**
     * Days of the week to apply quiet hours
     */
    days: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[];
  };
}
