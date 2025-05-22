/**
 * Components that make up a system prompt
 */
export interface SystemPromptComponents {
  /**
   * Introduction to the AI's role and purpose
   */
  introduction: string;

  /**
   * Description of the AI's expertise and knowledge areas
   */
  expertise: string;

  /**
   * Constraints and limitations on the AI's behavior
   */
  constraints: string;

  /**
   * Goals and objectives for the AI
   */
  goals: string;

  /**
   * Example interactions to guide the AI's behavior
   */
  examples: Example[];

  /**
   * Custom instructions that don't fit into other categories
   */
  customInstructions: string;
}

/**
 * Example interaction between user and assistant
 */
export interface Example {
  /**
   * User message
   */
  user: string;

  /**
   * Assistant response
   */
  assistant: string;

  /**
   * Optional explanation of why this is a good example
   */
  explanation?: string;
}
