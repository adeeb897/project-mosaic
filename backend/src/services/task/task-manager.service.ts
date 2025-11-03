/**
 * Task Manager Service
 *
 * Manages the task hierarchy, enabling agents to break down high-level tasks
 * into sub-tasks and track progress across the entire tree.
 * Tasks are independent entities that can be fully managed independently of agents.
 */

import {
  Task,
  CreateTaskRequest,
  UpdateTaskRequest,
  TaskDecomposition,
  TaskQuery,
  TaskTree,
} from '@mosaic/shared';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../core/logger';
import { EventBus } from '../../core/event-bus';
import { TaskRepository } from '../../persistence/repositories/task.repository';
import { getDatabase } from '../../persistence/database';

export class TaskManager extends EventEmitter {
  private tasks: Map<string, Task> = new Map();
  private taskRepo: TaskRepository;
  public eventBus: EventBus;
  private managerLogger = logger.child({ service: 'task-manager' });

  constructor(eventBus: EventBus) {
    super();
    this.eventBus = eventBus;
    const db = getDatabase();
    this.taskRepo = new TaskRepository(db.getDb());

    // Load all tasks from database into memory
    this.restoreTasks();
  }

  /**
   * Restore tasks from database into memory on startup
   */
  private restoreTasks(): void {
    try {
      const savedTasks = this.taskRepo.list();
      savedTasks.forEach((task: Task) => {
        this.tasks.set(task.id, task);
      });
      this.managerLogger.info(`Restored ${savedTasks.length} tasks from database`);
    } catch (error) {
      this.managerLogger.error('Failed to restore tasks from database', { error });
    }
  }

  /**
   * Create a new task
   */
  async createTask(request: CreateTaskRequest): Promise<Task> {
    const task: Task = {
      id: uuidv4(),
      title: request.title,
      description: request.description,
      status: 'open',
      priority: request.priority || 'medium',
      parentTaskId: request.parentTaskId,
      childTaskIds: [],
      createdBy: request.createdBy,
      assignedTo: request.assignedTo,
      tags: request.tags || [],
      metadata: request.metadata || {},
      createdAt: new Date(),
      lastUpdatedAt: new Date(),
    };

    // Add to memory
    this.tasks.set(task.id, task);

    // Add to parent's children if applicable
    if (task.parentTaskId) {
      const parent = this.tasks.get(task.parentTaskId);
      if (parent) {
        parent.childTaskIds.push(task.id);
        parent.lastUpdatedAt = new Date();
        this.tasks.set(parent.id, parent);
        this.taskRepo.save(parent); // Persist to DB
      }
    }

    // Persist to DB
    this.taskRepo.save(task);

    this.managerLogger.info('Task created', {
      id: task.id,
      title: task.title,
      createdBy: task.createdBy,
      parentTaskId: task.parentTaskId,
    });

    // Publish event
    await this.eventBus.publish('task.created', {
      id: uuidv4(),
      type: 'task.created',
      source: 'task-manager',
      timestamp: new Date().toISOString(),
      data: { task },
    });

    return task;
  }

  /**
   * Update task status and details
   */
  async updateTask(request: UpdateTaskRequest): Promise<Task> {
    const task = this.tasks.get(request.taskId);
    if (!task) {
      throw new Error(`Task ${request.taskId} not found`);
    }

    const oldStatus = task.status;
    const oldAssignedTo = task.assignedTo;

    // Update fields
    if (request.title !== undefined) task.title = request.title;
    if (request.description !== undefined) task.description = request.description;
    if (request.status) task.status = request.status;
    if (request.assignedTo !== undefined) task.assignedTo = request.assignedTo;
    if (request.priority !== undefined) task.priority = request.priority;
    if (request.strategy) task.strategy = request.strategy;
    if (request.actualSteps !== undefined) task.actualSteps = request.actualSteps;
    if (request.result !== undefined) task.result = request.result;
    if (request.errorMessage !== undefined) task.errorMessage = request.errorMessage;
    if (request.agentNotes !== undefined) task.agentNotes = request.agentNotes;
    if (request.tags !== undefined) task.tags = request.tags;
    if (request.metadata) {
      task.metadata = { ...task.metadata, ...request.metadata };
    }

    task.lastUpdatedAt = new Date();

    // Track timing
    if (request.status === 'in_progress' && !task.startedAt) {
      task.startedAt = new Date();
    }
    if (
      (request.status === 'completed' || request.status === 'failed') &&
      !task.completedAt
    ) {
      task.completedAt = new Date();
    }

    // Update memory and persist to DB
    this.tasks.set(task.id, task);
    this.taskRepo.save(task);

    this.managerLogger.info('Task updated', {
      id: task.id,
      title: task.title,
      oldStatus,
      newStatus: task.status,
    });

    // Publish event
    await this.eventBus.publish('task.updated', {
      id: uuidv4(),
      type: 'task.updated',
      source: 'task-manager',
      timestamp: new Date().toISOString(),
      data: { task, oldStatus, oldAssignedTo },
    });

    // Auto-update parent if all children completed
    if (task.parentTaskId) {
      await this.checkParentCompletion(task.parentTaskId);
    }

    return task;
  }

  /**
   * Decompose a task into sub-tasks
   * This is what agents use to break down high-level tasks
   */
  async decomposeTask(decomposition: TaskDecomposition): Promise<Task[]> {
    const parentTask = this.taskRepo.findById(decomposition.taskId);
    if (!parentTask) {
      throw new Error(`Task ${decomposition.taskId} not found`);
    }

    this.managerLogger.info('Decomposing task', {
      taskId: decomposition.taskId,
      title: parentTask.title,
      subTaskCount: decomposition.subTasks.length,
      reasoning: decomposition.reasoning,
    });

    const createdSubTasks: Task[] = [];

    for (const subTaskSpec of decomposition.subTasks) {
      const subTask = await this.createTask({
        title: subTaskSpec.title,
        description: subTaskSpec.description,
        priority: subTaskSpec.priority,
        parentTaskId: decomposition.taskId,
        createdBy: parentTask.assignedTo || parentTask.createdBy,
        assignedTo: parentTask.assignedTo, // Inherit assignment from parent
        tags: parentTask.tags,
        metadata: {
          estimatedSteps: subTaskSpec.estimatedSteps,
          dependencies: subTaskSpec.dependencies || [],
          decompositionReasoning: decomposition.reasoning,
        },
      });

      createdSubTasks.push(subTask);
    }

    // Update parent task strategy
    await this.updateTask({
      taskId: decomposition.taskId,
      strategy: decomposition.reasoning,
      metadata: {
        decomposed: true,
        decomposedAt: new Date().toISOString(),
      },
    });

    return createdSubTasks;
  }

  /**
   * Query tasks using in-memory Map
   */
  queryTasks(query: TaskQuery): Task[] {
    let results = Array.from(this.tasks.values());

    // Filter by status
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      results = results.filter((t: Task) => statuses.includes(t.status));
    }

    // Filter by assignedTo
    if (query.assignedTo) {
      results = results.filter((t: Task) => t.assignedTo === query.assignedTo);
    }

    // Filter by priority
    if (query.priority && query.priority.length > 0) {
      results = results.filter((t: Task) => query.priority!.includes(t.priority));
    }

    return results;
  }

  /**
   * Get task by ID
   */
  getTask(id: string): Task | undefined {
    return this.tasks.get(id);
  }

  /**
   * Get task tree for visualization
   */
  getTaskTree(rootTaskId: string): TaskTree | null {
    const task = this.tasks.get(rootTaskId);
    if (!task) return null;

    return this.buildTaskTree(task, 0);
  }

  /**
   * Get all root tasks (no parent)
   */
  getRootTasks(): Task[] {
    return Array.from(this.tasks.values()).filter(
      (task) => !task.parentTaskId
    );
  }

  /**
   * Check if all children of a task are completed and update parent
   */
  private async checkParentCompletion(parentTaskId: string): Promise<void> {
    const parent = this.tasks.get(parentTaskId);
    if (!parent || parent.childTaskIds.length === 0) return;

    const children = parent.childTaskIds
      .map((id: string) => this.tasks.get(id))
      .filter((t: any): t is Task => t !== undefined);

    const allCompleted = children.every((c: Task) => c.status === 'completed');
    const anyFailed = children.some((c: Task) => c.status === 'failed');

    if (allCompleted && parent.status !== 'completed') {
      await this.updateTask({
        taskId: parentTaskId,
        status: 'completed',
        result: {
          summary: 'All sub-tasks completed successfully',
          childResults: children.map((c: Task) => ({
            id: c.id,
            title: c.title,
            result: c.result,
          })),
        },
      });
    } else if (anyFailed && parent.status !== 'failed') {
      await this.updateTask({
        taskId: parentTaskId,
        status: 'failed',
        errorMessage: 'One or more sub-tasks failed',
      });
    }
  }

  /**
   * Recursively build task tree
   */
  private buildTaskTree(task: Task, depth: number): TaskTree {
    const children = task.childTaskIds
      .map((id: string) => this.tasks.get(id))
      .filter((t: any): t is Task => t !== undefined)
      .map((childTask: Task) => this.buildTaskTree(childTask, depth + 1));

    return {
      task,
      children,
      depth,
    };
  }

  /**
   * Get statistics
   */
  getStats() {
    const tasks: Task[] = Array.from(this.tasks.values());
    return {
      total: tasks.length,
      byStatus: {
        open: tasks.filter((t: Task) => t.status === 'open').length,
        in_progress: tasks.filter((t: Task) => t.status === 'in_progress').length,
        completed: tasks.filter((t: Task) => t.status === 'completed').length,
        failed: tasks.filter((t: Task) => t.status === 'failed').length,
        blocked: tasks.filter((t: Task) => t.status === 'blocked').length,
      },
      byPriority: {
        critical: tasks.filter((t: Task) => t.priority === 'critical').length,
        high: tasks.filter((t: Task) => t.priority === 'high').length,
        medium: tasks.filter((t: Task) => t.priority === 'medium').length,
        low: tasks.filter((t: Task) => t.priority === 'low').length,
      },
      rootTasks: tasks.filter((t: Task) => !t.parentTaskId).length,
    };
  }

  /**
   * Delete a task (only if not active)
   * Active tasks are those with status 'in_progress' or 'blocked'
   */
  async deleteTask(taskId: string): Promise<boolean> {
    const task = this.tasks.get(taskId);

    if (!task) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Check if task is active
    if (task.status === 'in_progress' || task.status === 'blocked') {
      throw new Error(`Cannot delete active task (status: ${task.status}). Only open, completed, or failed tasks can be deleted.`);
    }

    // Delete from memory and DB
    this.tasks.delete(taskId);
    const deleted = this.taskRepo.delete(taskId);

    if (deleted) {
      this.managerLogger.info('Task deleted', {
        id: taskId,
        title: task.title,
        status: task.status,
      });

      // Publish event
      await this.eventBus.publish('task.deleted', {
        id: uuidv4(),
        type: 'task.deleted',
        source: 'task-manager',
        timestamp: new Date().toISOString(),
        data: { taskId, title: task.title },
      });
    }

    return deleted;
  }
}
