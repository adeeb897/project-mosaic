/**
 * Session & History API Routes
 */

import { Router } from 'express';
import { SessionManager } from '../../services/session/session-manager.service';

export function createSessionRoutes(sessionManager: SessionManager) {
  const router = Router();

  /**
   * GET /api/sessions
   * List all sessions
   */
  router.get('/', async (req, res) => {
    try {
      // For now, return all sessions from the manager's internal map
      // In production, this would come from a database
      const sessions: any[] = [];
      res.json({ success: true, data: sessions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * POST /api/sessions
   * Create a new session
   */
  router.post('/', async (req, res) => {
    try {
      const { name, recordScreenshots, screenshotInterval, maxHistorySize } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Session name is required',
        });
      }

      const session = await sessionManager.createSession(name, {
        recordScreenshots,
        screenshotInterval,
        maxHistorySize,
      });

      res.json({ success: true, data: session });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/sessions/:id
   * Get session details
   */
  router.get('/:id', async (req, res) => {
    try {
      const session = sessionManager.getSession(req.params.id);

      if (!session) {
        return res.status(404).json({
          success: false,
          error: 'Session not found',
        });
      }

      res.json({ success: true, data: session });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/sessions/:id/timeline
   * Get session timeline
   */
  router.get('/:id/timeline', async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const timeline = sessionManager.getTimeline(req.params.id, limit);

      res.json({ success: true, data: timeline });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/sessions/:id/actions
   * Query session actions
   */
  router.get('/:id/actions', async (req, res) => {
    try {
      const { agentId, goalId, type, status, limit, offset } = req.query;

      const actions = sessionManager.queryActions({
        sessionId: req.params.id,
        agentId: agentId as string,
        goalId: goalId as string,
        type: type as any,
        status: status as any,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      });

      res.json({ success: true, data: actions });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  /**
   * GET /api/sessions/:id/export
   * Export entire session
   */
  router.get('/:id/export', async (req, res) => {
    try {
      const exported = await sessionManager.exportSession(req.params.id);

      res.json({ success: true, data: exported });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  return router;
}
