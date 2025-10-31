/**
 * Task Hierarchy System
 *
 * Enables agents to break down high-level tasks into manageable sub-tasks
 * that can be distributed among agents. Tasks are independent entities that
 * can be fully managed (created, edited, deleted) independently of agents.
 */

export type TaskStatus = 'open' | 'in_progress' | 'completed' | 'failed' | 'blocked';
export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Represents a task at any level of the hierarchy
 */
export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;

  // Hierarchy
  parentTaskId?: string;
  childTaskIds: string[];

  // Ownership
  createdBy: string; // Agent ID or 'user'
  assignedTo?: string; // Agent ID

  // Planning
  estimatedSteps?: number;
  actualSteps?: number;
  strategy?: string; // High-level approach

  // Progress tracking
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  lastUpdatedAt: Date;

  // Results
  result?: TaskResult;
  errorMessage?: string;

  // Context
  tags: string[];
  metadata: Record<string, any>;
}

export interface TaskResult {
  taskId: string;
  result: any;
  success: boolean;
  errorMessage?: string;
}

/**
 * Request to create a new task
 */
export interface CreateTaskRequest {
  title: string;
  description: string;
  priority?: TaskPriority;
  parentTaskId?: string;
  createdBy: string;
  assignedTo?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Update task status and progress
 */
export interface UpdateTaskRequest {
  taskId: string;
  title?: string;
  description?: string;
  status?: TaskStatus;
  assignedTo?: string;
  priority?: TaskPriority;
  strategy?: string;
  actualSteps?: number;
  result?: any;
  errorMessage?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Task decomposition - agent breaks down a task into sub-tasks
 */
export interface TaskDecomposition {
  taskId: string;
  reasoning: string;
  subTasks: Array<{
    title: string;
    description: string;
    priority: TaskPriority;
    estimatedSteps?: number;
    dependencies?: string[]; // IDs of tasks that must complete first
  }>;
}

/**
 * Query tasks with filters
 */
export interface TaskQuery {
  status?: TaskStatus | TaskStatus[];
  assignedTo?: string;
  createdBy?: string;
  parentTaskId?: string;
  tags?: string[];
  priority?: TaskPriority[];
  includeChildren?: boolean;
}

/**
 * Task tree for visualization
 */
export interface TaskTree {
  task: Task;
  children: TaskTree[];
  depth: number;
}
