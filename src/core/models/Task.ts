/**
 * Task created by an agent
 */
import { AgentTask } from './AgentTask';

export interface Task {
  /**
   * Task ID
   */
  id: string;

  /**
   * Original task request
   */
  request: AgentTask;

  /**
   * Status of the task
   */
  status: TaskStatus;

  /**
   * Progress of the task (0-100)
   */
  progress?: number;

  /**
   * Result of the task
   */
  result?: any;

  /**
   * Error message if the task failed
   */
  error?: string;

  /**
   * Error code if the task failed
   */
  errorCode?: string;

  /**
   * Creation timestamp
   */
  createdAt: Date;

  /**
   * Last update timestamp
   */
  updatedAt: Date;

  /**
   * Completion timestamp
   */
  completedAt?: Date;

  /**
   * Estimated completion time
   */
  estimatedCompletionTime?: Date;

  /**
   * Task metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Status of a task
 */
export enum TaskStatus {
  QUEUED = 'queued',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMED_OUT = 'timed_out',
}
