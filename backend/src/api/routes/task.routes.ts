/**
 * Task Management API Routes
 * Full CRUD operations for tasks independent of agents
 */

import { Router } from 'express';
import { TaskManager } from '../../services/task/task-manager.service';

export function createTaskRoutes(taskManager: TaskManager) {
  const router = Router();

  /**
   * GET /api/tasks
   * Query tasks with filters
   */
  router.get('/', async (req, res) => {
    try {
      const { status, assignedTo, createdBy, parentTaskId, priority, tags } = req.query;

      const tasks = taskManager.queryTasks({
        status: status as any,
        assignedTo: assignedTo as string,
        createdBy: createdBy as string,
        parentTaskId: parentTaskId as string,
        priority: priority ? [priority as any] : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
      });

      res.json({ success: true, data: tasks });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/tasks
   * Create a new task
   */
  router.post('/', async (req, res) => {
    try {
      const {
        title,
        description,
        priority,
        parentTaskId,
        createdBy,
        assignedTo,
        tags,
        metadata,
      } = req.body;

      if (!title || !description || !createdBy) {
        return res.status(400).json({
          success: false,
          error: 'Title, description, and createdBy are required',
        });
      }

      const task = await taskManager.createTask({
        title,
        description,
        priority,
        parentTaskId,
        createdBy,
        assignedTo,
        tags,
        metadata,
      });

      res.json({ success: true, data: task });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/tasks/roots
   * Get all root tasks (no parent)
   */
  router.get('/roots', async (req, res) => {
    try {
      const roots = taskManager.getRootTasks();
      res.json({ success: true, data: roots });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/tasks/stats
   * Get task statistics
   */
  router.get('/stats', async (req, res) => {
    try {
      const stats = taskManager.getStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/tasks/:id
   * Get task details
   */
  router.get('/:id', async (req, res) => {
    try {
      const task = taskManager.getTask(req.params.id);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
        });
      }

      res.json({ success: true, data: task });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/tasks/:id/tree
   * Get task tree (hierarchy)
   */
  router.get('/:id/tree', async (req, res) => {
    try {
      const tree = taskManager.getTaskTree(req.params.id);

      if (!tree) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
        });
      }

      res.json({ success: true, data: tree });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * PATCH /api/tasks/:id
   * Update task (supports full edit)
   */
  router.patch('/:id', async (req, res) => {
    try {
      const {
        title,
        description,
        status,
        assignedTo,
        priority,
        strategy,
        actualSteps,
        result,
        errorMessage,
        agentNotes,
        tags,
        metadata,
      } = req.body;

      const task = await taskManager.updateTask({
        taskId: req.params.id,
        title,
        description,
        status,
        assignedTo,
        priority,
        strategy,
        actualSteps,
        result,
        errorMessage,
        agentNotes,
        tags,
        metadata,
      });

      res.json({ success: true, data: task });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/tasks/:id/decompose
   * Decompose a task into sub-tasks
   */
  router.post('/:id/decompose', async (req, res) => {
    try {
      const { reasoning, subTasks } = req.body;

      if (!reasoning || !subTasks || !Array.isArray(subTasks)) {
        return res.status(400).json({
          success: false,
          error: 'Reasoning and subTasks array are required',
        });
      }

      const createdSubTasks = await taskManager.decomposeTask({
        taskId: req.params.id,
        reasoning,
        subTasks,
      });

      res.json({ success: true, data: createdSubTasks });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/tasks/:id
   * Delete a task (only if not active)
   */
  router.delete('/:id', async (req, res) => {
    try {
      const deleted = await taskManager.deleteTask(req.params.id);

      if (deleted) {
        res.json({
          success: true,
          data: { message: 'Task deleted successfully' },
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Task not found',
        });
      }
    } catch (error: any) {
      // Check if it's a validation error (active task, has active children, etc.)
      if (error.message.includes('Cannot delete')) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  });

  return router;
}
