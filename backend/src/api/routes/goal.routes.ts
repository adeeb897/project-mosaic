/**
 * Goal Management API Routes
 */

import { Router } from 'express';
import { GoalManager } from '../../services/goal/goal-manager.service';

export function createGoalRoutes(goalManager: GoalManager) {
  const router = Router();

  /**
   * GET /api/goals
   * Query goals with filters
   */
  router.get('/', async (req, res) => {
    try {
      const { status, assignedTo, createdBy, parentGoalId, priority, tags } = req.query;

      const goals = goalManager.queryGoals({
        status: status as any,
        assignedTo: assignedTo as string,
        createdBy: createdBy as string,
        parentGoalId: parentGoalId as string,
        priority: priority ? [priority as any] : undefined,
        tags: tags ? (tags as string).split(',') : undefined,
      });

      res.json({ success: true, data: goals });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/goals
   * Create a new goal
   */
  router.post('/', async (req, res) => {
    try {
      const {
        title,
        description,
        priority,
        parentGoalId,
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

      const goal = await goalManager.createGoal({
        title,
        description,
        priority,
        parentGoalId,
        createdBy,
        assignedTo,
        tags,
        metadata,
      });

      res.json({ success: true, data: goal });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/goals/roots
   * Get all root goals (no parent)
   */
  router.get('/roots', async (req, res) => {
    try {
      const roots = goalManager.getRootGoals();
      res.json({ success: true, data: roots });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/goals/stats
   * Get goal statistics
   */
  router.get('/stats', async (req, res) => {
    try {
      const stats = goalManager.getStats();
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/goals/:id
   * Get goal details
   */
  router.get('/:id', async (req, res) => {
    try {
      const goal = goalManager.getGoal(req.params.id);

      if (!goal) {
        return res.status(404).json({
          success: false,
          error: 'Goal not found',
        });
      }

      res.json({ success: true, data: goal });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/goals/:id/tree
   * Get goal tree (hierarchy)
   */
  router.get('/:id/tree', async (req, res) => {
    try {
      const tree = goalManager.getGoalTree(req.params.id);

      if (!tree) {
        return res.status(404).json({
          success: false,
          error: 'Goal not found',
        });
      }

      res.json({ success: true, data: tree });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * PATCH /api/goals/:id
   * Update goal
   */
  router.patch('/:id', async (req, res) => {
    try {
      const { status, assignedTo, strategy, actualSteps, result, errorMessage, metadata } =
        req.body;

      const goal = await goalManager.updateGoal({
        goalId: req.params.id,
        status,
        assignedTo,
        strategy,
        actualSteps,
        result,
        errorMessage,
        metadata,
      });

      res.json({ success: true, data: goal });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/goals/:id/decompose
   * Decompose a goal into sub-goals
   */
  router.post('/:id/decompose', async (req, res) => {
    try {
      const { reasoning, subGoals } = req.body;

      if (!reasoning || !subGoals || !Array.isArray(subGoals)) {
        return res.status(400).json({
          success: false,
          error: 'Reasoning and subGoals array are required',
        });
      }

      const createdSubGoals = await goalManager.decomposeGoal({
        goalId: req.params.id,
        reasoning,
        subGoals,
      });

      res.json({ success: true, data: createdSubGoals });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * DELETE /api/goals/:id
   * Delete a goal (only if not active)
   */
  router.delete('/:id', async (req, res) => {
    try {
      const deleted = await goalManager.deleteGoal(req.params.id);

      if (deleted) {
        res.json({
          success: true,
          data: { message: 'Goal deleted successfully' },
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Goal not found',
        });
      }
    } catch (error: any) {
      // Check if it's a validation error (active goal, has active children, etc.)
      if (error.message.includes('Cannot delete')) {
        res.status(400).json({ success: false, error: error.message });
      } else {
        res.status(500).json({ success: false, error: error.message });
      }
    }
  });

  return router;
}
