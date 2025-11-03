/**
 * User preferences model
 */
import { ModalityPreference } from './ModalityPreference';
import { NotificationSettings } from './NotificationSettings';
import { PrivacySettings } from './PrivacySettings';
import { AccessibilitySettings } from './AccessibilitySettings';

export interface UserPreferences {
  /**
   * UI theme preference
   */
  theme: 'light' | 'dark' | 'system';

  /**
   * Default profile ID
   */
  defaultProfile: string;

  /**
   * Preferred modalities for interaction
   */
  preferredModalities: ModalityPreference[];

  /**
   * Message bubble style preference
   */
  messageBubbleStyle: string;

  /**
   * Notification settings
   */
  notificationSettings: NotificationSettings;

  /**
   * Privacy settings
   */
  privacySettings: PrivacySettings;

  /**
   * Accessibility settings
   */
  accessibilitySettings: AccessibilitySettings;
}
