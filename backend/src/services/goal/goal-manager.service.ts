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
  private goalRepo: GoalRepository;
  private eventBus: EventBus;
  private managerLogger = logger.child({ service: 'goal-manager' });

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    const db = getDatabase();
    this.goalRepo = new GoalRepository(db.getDb());
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

    // Add to parent's children if applicable
    if (goal.parentGoalId) {
      const parent = this.goalRepo.findById(goal.parentGoalId);
      if (parent) {
        parent.childGoalIds.push(goal.id);
        parent.lastUpdatedAt = new Date();
        this.goalRepo.save(parent);
      }
    }

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
    const goal = this.goalRepo.findById(request.goalId);
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
   * Query goals using repository
   */
  queryGoals(query: GoalQuery): Goal[] {
    // Use repository list method for basic queries
    if (query.status && !Array.isArray(query.status)) {
      return this.goalRepo.findByStatus(query.status);
    }

    if (query.assignedTo) {
      let results = this.goalRepo.list({ assignedTo: query.assignedTo });
      
      // Apply additional filters
      if (query.status) {
        const statuses = Array.isArray(query.status) ? query.status : [query.status];
        results = results.filter((g: Goal) => statuses.includes(g.status));
      }
      
      return results;
    }

    if (query.parentGoalId !== undefined) {
      return this.goalRepo.findByParentId(query.parentGoalId);
    }

    // For complex queries, get all and filter
    // This could be optimized with more specific repository methods
    return this.goalRepo.list();
  }

  /**
   * Get goal by ID
   */
  getGoal(id: string): Goal | undefined {
    return this.goalRepo.findById(id) || undefined;
  }

  /**
   * Get goal tree for visualization
   */
  getGoalTree(rootGoalId: string): GoalTree | null {
    const goal = this.goalRepo.findById(rootGoalId);
    if (!goal) return null;

    return this.buildGoalTree(goal, 0);
  }

  /**
   * Get all root goals (no parent)
   */
  getRootGoals(): Goal[] {
    return this.goalRepo.findRootGoals();
  }

  /**
   * Check if all children of a goal are completed and update parent
   */
  private async checkParentCompletion(parentGoalId: string): Promise<void> {
    const parent = this.goalRepo.findById(parentGoalId);
    if (!parent || parent.childGoalIds.length === 0) return;

    const children = parent.childGoalIds
      .map((id: string) => this.goalRepo.findById(id))
      .filter((g): g is Goal => g !== null);

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
      .map((id: string) => this.goalRepo.findById(id))
      .filter((g): g is Goal => g !== null)
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
    const goals: Goal[] = this.goalRepo.list();
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
    const goal = this.goalRepo.findById(goalId);

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
        .map((id: string) => this.goalRepo.findById(id))
        .filter((g): g is Goal => g !== null);

      const hasActiveChildren = children.some(
        (c: Goal) => c.status === 'in_progress' || c.status === 'blocked'
      );

      if (hasActiveChildren) {
        throw new Error('Cannot delete goal with active child goals');
      }
    }

    // Remove from parent's children if applicable
    if (goal.parentGoalId) {
      const parent = this.goalRepo.findById(goal.parentGoalId);
      if (parent) {
        parent.childGoalIds = parent.childGoalIds.filter((id: string) => id !== goalId);
        parent.lastUpdatedAt = new Date();
        this.goalRepo.save(parent);
      }
    }

    // Delete the goal
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
