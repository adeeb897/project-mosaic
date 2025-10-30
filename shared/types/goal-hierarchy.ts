/**
 * Goal Hierarchy System
 *
 * Enables agents to break down high-level goals (e.g., "address climate change")
 * into manageable sub-goals and tasks that can be distributed among agents.
 */

export type GoalStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'blocked';
export type GoalPriority = 'critical' | 'high' | 'medium' | 'low';

/**
 * Represents a goal at any level of the hierarchy
 */
export interface Goal {
  id: string;
  title: string;
  description: string;
  status: GoalStatus;
  priority: GoalPriority;

  // Hierarchy
  parentGoalId?: string;
  childGoalIds: string[];

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
  result?: any;
  errorMessage?: string;

  // Context
  tags: string[];
  metadata: Record<string, any>;
}

/**
 * Request to create a new goal
 */
export interface CreateGoalRequest {
  title: string;
  description: string;
  priority?: GoalPriority;
  parentGoalId?: string;
  createdBy: string;
  assignedTo?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Update goal status and progress
 */
export interface UpdateGoalRequest {
  goalId: string;
  status?: GoalStatus;
  assignedTo?: string;
  strategy?: string;
  actualSteps?: number;
  result?: any;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

/**
 * Goal decomposition - agent breaks down a goal into sub-goals
 */
export interface GoalDecomposition {
  goalId: string;
  reasoning: string;
  subGoals: Array<{
    title: string;
    description: string;
    priority: GoalPriority;
    estimatedSteps?: number;
    dependencies?: string[]; // IDs of goals that must complete first
  }>;
}

/**
 * Query goals with filters
 */
export interface GoalQuery {
  status?: GoalStatus | GoalStatus[];
  assignedTo?: string;
  createdBy?: string;
  parentGoalId?: string;
  tags?: string[];
  priority?: GoalPriority[];
  includeChildren?: boolean;
}

/**
 * Goal tree for visualization
 */
export interface GoalTree {
  goal: Goal;
  children: GoalTree[];
  depth: number;
}
