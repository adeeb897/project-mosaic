/**
 * User profile information for conversation context
 */
export interface UserContextProfile {
  /**
   * User preferences
   */
  preferences: Record<string, any>;

  /**
   * Historical interactions
   */
  history: HistoricalInteraction[];

  /**
   * Known facts about the user
   */
  knownFacts: Record<string, any>;
}

/**
 * Historical interaction with the user
 */
export interface HistoricalInteraction {
  /**
   * Type of interaction
   */
  type: string;

  /**
   * Timestamp of the interaction
   */
  timestamp: Date;

  /**
   * Summary of the interaction
   */
  summary: string;

  /**
   * Relevance score (0-1)
   */
  relevanceScore: number;
}
