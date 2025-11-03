/**
 * API Routes - Simple, user-friendly REST API
 */
import { Router } from 'express';
import { AgentManager } from '../agents/agent-manager';
import { logger } from '../core/logger';

export function createRouter(agentManager: AgentManager): Router {
  const router = Router();

  /**
   * POST /agents - Create a new agent with a task
   *
   * Body: {
   *   "name": "MyAgent",
   *   "task": "Create a summary of today's tech news"
   * }
   */
  router.post('/agents', async (req, res) => {
    try {
      const { name, task, maxSteps } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required',
        });
      }

      const agent = await agentManager.createAgent({ name, task, maxSteps });

      res.json({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          status: agent.status,
          task,
        },
      });
    } catch (error: any) {
      logger.error('Failed to create agent', { error });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /agents - List all agents
   */
  router.get('/agents', (req, res) => {
    try {
      const agents = agentManager.getAllAgents();

      res.json({
        success: true,
        data: agents.map((agent) => ({
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
        })),
      });
    } catch (error: any) {
      logger.error('Failed to list agents', { error });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /agents/:id - Get agent details
   */
  router.get('/agents/:id', (req, res) => {
    try {
      const { id } = req.params;
      const progress = agentManager.getAgentProgress(id);

      if (!progress) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      res.json({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      logger.error('Failed to get agent', { error });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /agents/:id/start - Start an agent
   */
  router.post('/agents/:id/start', async (req, res) => {
    try {
      const { id } = req.params;
      await agentManager.startAgent(id);

      res.json({
        success: true,
        message: 'Agent started',
      });
    } catch (error: any) {
      logger.error('Failed to start agent', { error });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /agents/:id/stop - Stop an agent
   */
  router.post('/agents/:id/stop', async (req, res) => {
    try {
      const { id } = req.params;
      await agentManager.stopAgent(id);

      res.json({
        success: true,
        message: 'Agent stopped',
      });
    } catch (error: any) {
      logger.error('Failed to stop agent', { error });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /agents/:id - Delete an agent
   */
  router.delete('/agents/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await agentManager.deleteAgent(id);

      res.json({
        success: true,
        message: 'Agent deleted',
      });
    } catch (error: any) {
      logger.error('Failed to delete agent', { error });
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /health - Health check
   */
  router.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
