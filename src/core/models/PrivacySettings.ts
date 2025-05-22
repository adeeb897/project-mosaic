/**
 * User privacy settings
 */
export interface PrivacySettings {
  /**
   * Data collection settings
   */
  dataCollection: {
    /**
     * Whether to collect usage data
     */
    usageData: boolean;

    /**
     * Whether to collect diagnostic data
     */
    diagnosticData: boolean;

    /**
     * Whether to collect conversation data for improvement
     */
    conversationData: boolean;
  };

  /**
   * Data retention settings
   */
  dataRetention: {
    /**
     * How long to retain conversation history (in days, 0 = forever)
     */
    conversationHistory: number;

    /**
     * How long to retain usage logs (in days, 0 = forever)
     */
    usageLogs: number;
  };

  /**
   * Sharing settings
   */
  sharing: {
    /**
     * Whether to allow sharing of user profiles
     */
    allowProfileSharing: boolean;

    /**
     * Whether to allow sharing of conversation history
     */
    allowConversationSharing: boolean;

    /**
     * Whether to allow sharing of module configurations
     */
    allowModuleConfigSharing: boolean;
  };

  /**
   * Third-party integration settings
   */
  thirdPartyIntegrations: {
    /**
     * Whether to allow third-party integrations
     */
    enabled: boolean;

    /**
     * List of approved third-party services
     */
    approvedServices: string[];
  };
}
