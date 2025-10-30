/**
 * Goal Manager Service
 *
 * Manages the goal hierarchy, enabling agents to break down high-level goals
 * into sub-goals and track progress across the entire tree.
 */

import {
  Goal,
  CreateGoalRequest,
  UpdateGoalRequest,
  GoalDecomposition,
  GoalQuery,
  GoalTree,
} from '@mosaic/shared';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../core/logger';
import { EventBus } from '../../core/event-bus';
import { GoalRepository } from '../../persistence/repositories/goal.repository';
import { getDatabase } from '../../persistence/database';

export class GoalManager extends EventEmitter {
  private goals: Map<string, Goal> = new Map();
  private goalRepo: GoalRepository;
  private eventBus: EventBus;
  private managerLogger = logger.child({ service: 'goal-manager' });

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    const db = getDatabase();
    this.goalRepo = new GoalRepository(db.getDb());

    // Load all goals from database into memory
    this.restoreGoals();
  }

  /**
   * Restore goals from database into memory on startup
   */
  private restoreGoals(): void {
    try {
      const savedGoals = this.goalRepo.list();
      savedGoals.forEach((goal: Goal) => {
        this.goals.set(goal.id, goal);
      });
      this.managerLogger.info(`Restored ${savedGoals.length} goals from database`);
    } catch (error) {
      this.managerLogger.error('Failed to restore goals from database', { error });
    }
  }

  /**
   * Create a new goal
   */
  async createGoal(request: CreateGoalRequest): Promise<Goal> {
    const goal: Goal = {
      id: uuidv4(),
      title: request.title,
      description: request.description,
      status: 'pending',
      priority: request.priority || 'medium',
      parentGoalId: request.parentGoalId,
      childGoalIds: [],
      createdBy: request.createdBy,
      assignedTo: request.assignedTo,
      tags: request.tags || [],
      metadata: request.metadata || {},
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
    };

    // Add to memory
    this.goals.set(goal.id, goal);

    // Add to parent's children if applicable
    if (goal.parentGoalId) {
      const parent = this.goals.get(goal.parentGoalId);
      if (parent) {
        parent.childGoalIds.push(goal.id);
        parent.lastUpdatedAt = new Date();
        this.goals.set(parent.id, parent);
        this.goalRepo.save(parent); // Persist to DB
      }
    }

    // Persist to DB
    this.goalRepo.save(goal);

    this.managerLogger.info('Goal created', {
      id: goal.id,
      title: goal.title,
      createdBy: goal.createdBy,
      parentGoalId: goal.parentGoalId,
    });

    // Publish event
    await this.eventBus.publish('goal.created', {
      id: uuidv4(),
      type: 'goal.created',
      source: 'goal-manager',
      timestamp: new Date().toISOString(),
      data: { goal },
    });

    return goal;
  }

  /**
   * Update goal status and details
   */
  async updateGoal(request: UpdateGoalRequest): Promise<Goal> {
    const goal = this.goals.get(request.goalId);
    if (!goal) {
      throw new Error(`Goal ${request.goalId} not found`);
    }

    const oldStatus = goal.status;

    // Update fields
    if (request.status) goal.status = request.status;
    if (request.assignedTo !== undefined) goal.assignedTo = request.assignedTo;
    if (request.strategy) goal.strategy = request.strategy;
    if (request.actualSteps !== undefined) goal.actualSteps = request.actualSteps;
    if (request.result !== undefined) goal.result = request.result;
    if (request.errorMessage !== undefined) goal.errorMessage = request.errorMessage;
    if (request.metadata) {
      goal.metadata = { ...goal.metadata, ...request.metadata };
    }

    goal.lastUpdatedAt = new Date();

    // Track timing
    if (request.status === 'in_progress' && !goal.startedAt) {
      goal.startedAt = new Date();
    }
    if (
      (request.status === 'completed' || request.status === 'failed') &&
      !goal.completedAt
    ) {
      goal.completedAt = new Date();
    }

    // Update memory and persist to DB
    this.goals.set(goal.id, goal);
    this.goalRepo.save(goal);

    this.managerLogger.info('Goal updated', {
      id: goal.id,
      title: goal.title,
      oldStatus,
      newStatus: goal.status,
    });

    // Publish event
    await this.eventBus.publish('goal.updated', {
      id: uuidv4(),
      type: 'goal.updated',
      source: 'goal-manager',
      timestamp: new Date().toISOString(),
      data: { goal, oldStatus },
    });

    // Auto-update parent if all children completed
    if (goal.parentGoalId) {
      await this.checkParentCompletion(goal.parentGoalId);
    }

    return goal;
  }

  /**
   * Decompose a goal into sub-goals
   * This is what agents use to break down high-level goals
   */
  async decomposeGoal(decomposition: GoalDecomposition): Promise<Goal[]> {
    const parentGoal = this.goalRepo.findById(decomposition.goalId);
    if (!parentGoal) {
      throw new Error(`Goal ${decomposition.goalId} not found`);
    }

    this.managerLogger.info('Decomposing goal', {
      goalId: decomposition.goalId,
      title: parentGoal.title,
      subGoalCount: decomposition.subGoals.length,
      reasoning: decomposition.reasoning,
    });

    const createdSubGoals: Goal[] = [];

    for (const subGoalSpec of decomposition.subGoals) {
      const subGoal = await this.createGoal({
        title: subGoalSpec.title,
        description: subGoalSpec.description,
        priority: subGoalSpec.priority,
        parentGoalId: decomposition.goalId,
        createdBy: parentGoal.assignedTo || parentGoal.createdBy,
        assignedTo: parentGoal.assignedTo, // Inherit assignment from parent
        tags: parentGoal.tags,
        metadata: {
          estimatedSteps: subGoalSpec.estimatedSteps,
          dependencies: subGoalSpec.dependencies || [],
          decompositionReasoning: decomposition.reasoning,
        },
      });

      createdSubGoals.push(subGoal);
    }

    // Update parent goal strategy
    await this.updateGoal({
      goalId: decomposition.goalId,
      strategy: decomposition.reasoning,
      metadata: {
        decomposed: true,
        decomposedAt: new Date().toISOString(),
      },
    });

    return createdSubGoals;
  }

  /**
   * Query goals using in-memory Map
   */
  queryGoals(query: GoalQuery): Goal[] {
    let results = Array.from(this.goals.values());

    // Filter by status
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      results = results.filter((g: Goal) => statuses.includes(g.status));
    }

    // Filter by assignedTo
    if (query.assignedTo) {
      results = results.filter((g: Goal) => g.assignedTo === query.assignedTo);
    }

    // Filter by createdBy
    if (query.createdBy) {
      results = results.filter((g: Goal) => g.createdBy === query.createdBy);
    }

    // Filter by parentGoalId
    if (query.parentGoalId !== undefined) {
      if (query.parentGoalId === null) {
        results = results.filter((g: Goal) => !g.parentGoalId);
      } else {
        results = results.filter((g: Goal) => g.parentGoalId === query.parentGoalId);
      }
    }

    // Filter by priority
    if (query.priority && query.priority.length > 0) {
      results = results.filter((g: Goal) => query.priority!.includes(g.priority));
    }

    // Filter by tags
    if (query.tags && query.tags.length > 0) {
      results = results.filter((g: Goal) =>
        query.tags!.some((tag) => g.tags.includes(tag))
      );
    }

    return results;
  }

  /**
   * Get goal by ID
   */
  getGoal(id: string): Goal | undefined {
    return this.goals.get(id);
  }

  /**
   * Get goal tree for visualization
   */
  getGoalTree(rootGoalId: string): GoalTree | null {
    const goal = this.goals.get(rootGoalId);
    if (!goal) return null;

    return this.buildGoalTree(goal, 0);
  }

  /**
   * Get all root goals (no parent)
   */
  getRootGoals(): Goal[] {
    return Array.from(this.goals.values()).filter(
      (goal) => !goal.parentGoalId
    );
  }

  /**
   * Check if all children of a goal are completed and update parent
   */
  private async checkParentCompletion(parentGoalId: string): Promise<void> {
    const parent = this.goals.get(parentGoalId);
    if (!parent || parent.childGoalIds.length === 0) return;

    const children = parent.childGoalIds
      .map((id: string) => this.goals.get(id))
      .filter((g): g is Goal => g !== undefined);

    const allCompleted = children.every((c: Goal) => c.status === 'completed');
    const anyFailed = children.some((c: Goal) => c.status === 'failed');

    if (allCompleted && parent.status !== 'completed') {
      await this.updateGoal({
        goalId: parentGoalId,
        status: 'completed',
        result: {
          summary: 'All sub-goals completed successfully',
          childResults: children.map((c: Goal) => ({
            id: c.id,
            title: c.title,
            result: c.result,
          })),
        },
      });
    } else if (anyFailed && parent.status !== 'failed') {
      await this.updateGoal({
        goalId: parentGoalId,
        status: 'failed',
        errorMessage: 'One or more sub-goals failed',
      });
    }
  }

  /**
   * Recursively build goal tree
   */
  private buildGoalTree(goal: Goal, depth: number): GoalTree {
    const children = goal.childGoalIds
      .map((id: string) => this.goals.get(id))
      .filter((g): g is Goal => g !== undefined)
      .map((childGoal: Goal) => this.buildGoalTree(childGoal, depth + 1));

    return {
      goal,
      children,
      depth,
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const goals: Goal[] = Array.from(this.goals.values());
    return {
      total: goals.length,
      byStatus: {
        pending: goals.filter((g: Goal) => g.status === 'pending').length,
        in_progress: goals.filter((g: Goal) => g.status === 'in_progress').length,
        completed: goals.filter((g: Goal) => g.status === 'completed').length,
        failed: goals.filter((g: Goal) => g.status === 'failed').length,
        blocked: goals.filter((g: Goal) => g.status === 'blocked').length,
      },
      byPriority: {
        critical: goals.filter((g: Goal) => g.priority === 'critical').length,
        high: goals.filter((g: Goal) => g.priority === 'high').length,
        medium: goals.filter((g: Goal) => g.priority === 'medium').length,
        low: goals.filter((g: Goal) => g.priority === 'low').length,
      },
      rootGoals: goals.filter((g: Goal) => !g.parentGoalId).length,
    };
  }

  /**
   * Delete a goal (only if not active)
   * Active goals are those with status 'in_progress' or 'blocked'
   */
  async deleteGoal(goalId: string): Promise<boolean> {
    const goal = this.goals.get(goalId);

    if (!goal) {
      throw new Error(`Goal ${goalId} not found`);
    }

    // Check if goal is active
    if (goal.status === 'in_progress' || goal.status === 'blocked') {
      throw new Error(`Cannot delete active goal (status: ${goal.status}). Only pending, completed, or failed goals can be deleted.`);
    }

    // Check if goal has active children
    if (goal.childGoalIds && goal.childGoalIds.length > 0) {
      const children = goal.childGoalIds
        .map((id: string) => this.goals.get(id))
        .filter((g): g is Goal => g !== undefined);

      const hasActiveChildren = children.some(
        (c: Goal) => c.status === 'in_progress' || c.status === 'blocked'
      );

      if (hasActiveChildren) {
        throw new Error('Cannot delete goal with active child goals');
      }
    }

    // Remove from parent's children if applicable
    if (goal.parentGoalId) {
      const parent = this.goals.get(goal.parentGoalId);
      if (parent) {
        parent.childGoalIds = parent.childGoalIds.filter((id: string) => id !== goalId);
        parent.lastUpdatedAt = new Date();
        this.goals.set(parent.id, parent);
        this.goalRepo.save(parent); // Persist to DB
      }
    }

    // Delete from memory and DB
    this.goals.delete(goalId);
    const deleted = this.goalRepo.delete(goalId);

    if (deleted) {
      this.managerLogger.info('Goal deleted', {
        id: goalId,
        title: goal.title,
        status: goal.status,
      });

      // Publish event
      await this.eventBus.publish('goal.deleted', {
        id: uuidv4(),
        type: 'goal.deleted',
        source: 'goal-manager',
        timestamp: new Date().toISOString(),
        data: { goalId, title: goal.title },
      });
    }

    return deleted;
  }
}
