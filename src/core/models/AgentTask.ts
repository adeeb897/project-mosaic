/**
 * Task for an agent
 */
export interface AgentTask {
  /**
   * Type of task
   */
  type: string;

  /**
   * Description of the task
   */
  description: string;

  /**
   * Parameters for the task
   */
  parameters: Record<string, any>;

  /**
   * Priority of the task
   */
  priority?: 'high' | 'normal' | 'low';

  /**
   * Callback URL for task completion
   */
  callbackUrl?: string;

  /**
   * Task ID (optional, will be generated if not provided)
   */
  id?: string;

  /**
   * User ID
   */
  userId?: string;

  /**
   * Conversation ID
   */
  conversationId?: string;

  /**
   * Timeout in milliseconds
   */
  timeoutMs?: number;

  /**
   * Additional task metadata
   */
  metadata?: Record<string, any>;
}
