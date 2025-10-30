/**
 * Agent Management API Routes
 */

import { Router } from 'express';
import { GoalOrientedAgent } from '../../agents/goal-oriented-agent';
import { GoalManager } from '../../services/goal/goal-manager.service';
import { SessionManager } from '../../services/session/session-manager.service';
import { LLMProviderPlugin, MCPServerPlugin } from '@mosaic/shared';
import { getMemoryManager } from '../../services/memory/memory-manager.service';
import { EventBus } from '../../core/event-bus';
import { getDatabase } from '../../persistence/database';
import { AgentRepository } from '../../persistence/repositories/agent.repository';

export function createAgentRoutes(
  goalManager: GoalManager,
  sessionManager: SessionManager,
  llmProvider: LLMProviderPlugin,
  mcpServers: MCPServerPlugin[]
) {
  const router = Router();

  // Store active agents
  const activeAgents = new Map<string, GoalOrientedAgent>();

  // Initialize agent repository
  const db = getDatabase();
  const agentRepo = new AgentRepository(db.getDb());

  // Restore agents from database on startup
  const restoreAgents = () => {
    try {
      const savedAgents = agentRepo.findAll();

      // Access eventBus from goalManager
      interface GoalManagerWithEventBus {
        eventBus: EventBus;
      }

      for (const savedAgent of savedAgents) {
        // Skip agents without sessionId
        if (!savedAgent.sessionId) {
          console.warn(`Skipping agent ${savedAgent.id} without sessionId`);
          continue;
        }

        const agent = new GoalOrientedAgent({
          id: savedAgent.id,
          name: savedAgent.name,
          rootGoal: savedAgent.rootGoal || undefined,
          llmProvider,
          mcpServers,
          eventBus: (goalManager as unknown as GoalManagerWithEventBus).eventBus,
          goalManager,
          sessionManager,
          sessionId: savedAgent.sessionId,
          maxDepth: 3,
        });

        // Restore status (but don't auto-start)
        agent.status = 'idle'; // Always restore as idle for safety
        activeAgents.set(agent.id, agent);
      }

      console.log(`Restored ${savedAgents.length} agents from database`);
    } catch (error) {
      console.error('Failed to restore agents:', error);
    }
  };

  // Restore agents immediately
  restoreAgents();

  /**
   * GET /api/agents
   * List all active agents
   */
  router.get('/', async (req, res) => {
    try {
      const agents = Array.from(activeAgents.values()).map((agent) => ({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        rootGoal: agent.metadata.rootGoal,
        sessionId: (agent as GoalOrientedAgent).getConfiguration().sessionId,
        createdAt: agent.metadata.createdAt,
      }));

      res.json({ success: true, data: agents });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * POST /api/agents
   * Create a new agent
   */
  router.post('/', async (req, res) => {
    try {
      const { name, rootGoal, sessionId, maxDepth } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required',
        });
      }

      // Use existing session or create new one
      let session;
      if (sessionId) {
        session = sessionManager.getSession(sessionId);
        if (!session) {
          return res.status(404).json({
            success: false,
            error: `Session ${sessionId} not found`,
          });
        }
      } else {
        session = await sessionManager.createSession(`Session for ${name}`, {
          recordScreenshots: true,
        });
      }

      // Access eventBus from goalManager
      interface GoalManagerWithEventBus {
        eventBus: EventBus;
      }

      const agent = new GoalOrientedAgent({
        name,
        rootGoal,
        llmProvider,
        mcpServers,
        eventBus: (goalManager as unknown as GoalManagerWithEventBus).eventBus,
        goalManager,
        sessionManager,
        sessionId: session.id,
        maxDepth: maxDepth || 3,
      });

      // Persist agent to database
      agentRepo.save({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        config: { ...agent.config } as Record<string, unknown>,
        metadata: agent.metadata || {},
        rootGoal,
        sessionId: session.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      activeAgents.set(agent.id, agent);

      res.json({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
          rootGoal,
          sessionId: session.id,
          createdAt: agent.metadata.createdAt,
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * GET /api/agents/:id
   * Get agent details
   */
  router.get('/:id', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      res.json({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
          rootGoal: agent.metadata.rootGoal,
          createdAt: agent.metadata.createdAt,
          state: agent.getState(),
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * GET /api/agents/:id/config
   * Get full agent configuration
   */
  router.get('/:id/config', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const config = (agent as GoalOrientedAgent).getConfiguration();

      res.json({
        success: true,
        data: config,
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * POST /api/agents/:id/start
   * Start an agent
   */
  router.post('/:id/start', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      // Start agent asynchronously
      agent.start().catch((error) => {
        console.error(`Agent ${agent.id} failed:`, error);
      });

      res.json({
        success: true,
        data: {
          id: agent.id,
          status: agent.status,
          message: 'Agent started',
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * POST /api/agents/:id/stop
   * Stop an agent
   */
  router.post('/:id/stop', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      await agent.stop();

      res.json({
        success: true,
        data: {
          id: agent.id,
          status: agent.status,
          message: 'Agent stopped',
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * DELETE /api/agents/:id
   * Remove an agent
   */
  router.delete('/:id', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      if (agent.status === 'running') {
        await agent.stop();
      }

      // Remove from memory and database
      activeAgents.delete(req.params.id);
      agentRepo.delete(req.params.id);

      res.json({
        success: true,
        data: { message: 'Agent removed' },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ===== Memory Endpoints =====

  /**
   * GET /api/agents/:id/memory
   * Get agent memory snapshot
   */
  router.get('/:id/memory', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const memoryManager = getMemoryManager();
      const sessionId = (agent as GoalOrientedAgent).metadata.sessionId || '';
      const snapshot = await memoryManager.getAgentSnapshot(agent.id, sessionId);

      res.json({
        success: true,
        data: snapshot,
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * GET /api/agents/:id/memory/search
   * Search agent memories
   */
  router.get('/:id/memory/search', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { q, limit } = req.query;
      
      if (!q || typeof q !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Query parameter "q" is required',
        });
      }

      const memoryManager = getMemoryManager();
      const memories = await memoryManager.searchMemories(
        agent.id,
        q,
        limit ? parseInt(limit as string, 10) : undefined
      );

      res.json({
        success: true,
        data: memories,
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * GET /api/agents/:id/memory/recent
   * Get recent memories
   */
  router.get('/:id/memory/recent', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { limit } = req.query;
      const memoryManager = getMemoryManager();
      const memories = await memoryManager.getRecentMemories(
        agent.id,
        limit ? parseInt(limit as string, 10) : 20
      );

      res.json({
        success: true,
        data: memories,
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * POST /api/agents/:id/memory
   * Create a memory entry
   */
  router.post('/:id/memory', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { type, importance, title, content, metadata, tags, relatedGoalId, expiresAt } = req.body;

      if (!type || !importance || !title || !content) {
        return res.status(400).json({
          success: false,
          error: 'type, importance, title, and content are required',
        });
      }

      const memoryManager = getMemoryManager();
      const sessionId = (agent as GoalOrientedAgent).metadata.sessionId || '';
      
      const memory = await memoryManager.createMemory(agent.id, sessionId, {
        type,
        importance,
        title,
        content,
        metadata,
        tags,
        relatedGoalId,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      res.json({
        success: true,
        data: memory,
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * PATCH /api/agents/:id/memory/:memoryId
   * Update a memory entry
   */
  router.patch('/:id/memory/:memoryId', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { memoryId } = req.params;
      const { title, content, importance, metadata, tags, expiresAt } = req.body;

      const memoryManager = getMemoryManager();
      const updated = await memoryManager.updateMemory({
        memoryId,
        title,
        content,
        importance,
        metadata,
        tags,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
      });

      if (!updated) {
        return res.status(404).json({
          success: false,
          error: 'Memory not found',
        });
      }

      res.json({
        success: true,
        data: updated,
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * DELETE /api/agents/:id/memory/:memoryId
   * Delete a memory entry
   */
  router.delete('/:id/memory/:memoryId', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { memoryId } = req.params;
      const memoryManager = getMemoryManager();
      const deleted = await memoryManager.deleteMemory(memoryId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Memory not found',
        });
      }

      res.json({
        success: true,
        data: { message: 'Memory deleted' },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  return router;
}

