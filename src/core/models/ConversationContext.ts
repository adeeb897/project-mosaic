/**
 * Context for a conversation
 */
import { UserContextProfile } from './UserContextProfile';
import { EnvironmentContext } from './EnvironmentContext';

export interface ConversationContext {
  /**
   * System prompt for the conversation
   */
  systemPrompt: string;

  /**
   * Personality attributes for the conversation
   */
  personaAttributes: Record<string, any>;

  /**
   * Memory elements for the conversation
   */
  memoryElements: MemoryElement[];

  /**
   * Active tools for the conversation
   */
  activeTools: string[];

  /**
   * User profile context
   */
  userProfile: UserContextProfile;

  /**
   * Environment context
   */
  environmentContext: EnvironmentContext;

  /**
   * Custom data
   */
  customData: Record<string, any>;
}

/**
 * Memory element for conversation context
 */
export interface MemoryElement {
  /**
   * Unique identifier for the memory element
   */
  id: string;

  /**
   * Type of memory element
   */
  type: string;

  /**
   * Content of the memory element
   */
  content: any;

  /**
   * Relevance score (0-1)
   */
  relevanceScore?: number;

  /**
   * Timestamp when the memory element was created
   */
  timestamp: Date;

  /**
   * Source of the memory element
   */
  source: string;
}
