/**
 * Ethical boundaries for AI behavior
 */
export interface EthicalBoundaries {
  /**
   * Content policy description
   */
  contentPolicy: string;

  /**
   * Safety level
   */
  safetyLevel: 'strict' | 'moderate' | 'minimal';

  /**
   * How to handle refusals
   */
  refusalBehavior: 'polite' | 'direct' | 'redirect';

  /**
   * Whether to be transparent about limitations
   */
  transparency: boolean;

  /**
   * Whether to acknowledge potential biases
   */
  biasAwareness: boolean;
}
