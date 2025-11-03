/**
 * Agent Management API Routes
 */

import { Router } from 'express';
import { TaskOrientedAgent } from '../../agents/task-oriented-agent';
import { TaskManager } from '../../services/task/task-manager.service';
import { SessionManager } from '../../services/session/session-manager.service';
import { LLMProviderPlugin, MCPServerPlugin } from '@mosaic/shared';
import { getMemoryManager } from '../../services/memory/memory-manager.service';
import { EventBus } from '../../core/event-bus';
import { getDatabase } from '../../persistence/database';
import { AgentRepository } from '../../persistence/repositories/agent.repository';

export function createAgentRoutes(
  taskManager: TaskManager,
  sessionManager: SessionManager,
  llmProvider: LLMProviderPlugin,
  mcpServers: MCPServerPlugin[]
) {
  const router = Router();

  // Store active agents
  const activeAgents = new Map<string, TaskOrientedAgent>();

  // Initialize agent repository
  const db = getDatabase();
  const agentRepo = new AgentRepository(db.getDb());

  // Restore agents from database on startup
  const restoreAgents = () => {
    try {
      const savedAgents = agentRepo.findAll();

      // Access eventBus from taskManager
      interface TaskManagerWithEventBus {
        eventBus: EventBus;
      }

      for (const savedAgent of savedAgents) {
        // Skip agents without sessionId
        if (!savedAgent.sessionId) {
          console.warn(`Skipping agent ${savedAgent.id} without sessionId`);
          continue;
        }

        // Restore MCP servers from config if available
        let restoredMcpServers = mcpServers;
        if (savedAgent.config && typeof savedAgent.config === 'object') {
          const config = savedAgent.config as { mcpServerNames?: string[] };
          if (config.mcpServerNames && Array.isArray(config.mcpServerNames)) {
            restoredMcpServers = mcpServers.filter(server =>
              config.mcpServerNames!.includes(server.name)
            );
          }
        }

        const agent = new TaskOrientedAgent({
          id: savedAgent.id,
          name: savedAgent.name,
          rootTask: savedAgent.rootTask || undefined,
          llmProvider,
          mcpServers: restoredMcpServers,
          eventBus: (taskManager as unknown as TaskManagerWithEventBus).eventBus,
          taskManager,
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
        rootTask: agent.metadata.rootTask,
        sessionId: (agent as TaskOrientedAgent).getConfiguration().sessionId,
        createdAt: agent.metadata.createdAt,
        config: agent.getConfiguration()
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
      const { name, rootTask, sessionId, maxDepth, mcpServerNames } = req.body;

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

      // Filter MCP servers based on selection (if provided)
      let selectedMcpServers = mcpServers;
      if (mcpServerNames && Array.isArray(mcpServerNames) && mcpServerNames.length > 0) {
        selectedMcpServers = mcpServers.filter(server => mcpServerNames.includes(server.name));
      }

      // Access eventBus from taskManager
      interface TaskManagerWithEventBus {
        eventBus: EventBus;
      }

      const agent = new TaskOrientedAgent({
        name,
        rootTask,
        llmProvider,
        mcpServers: selectedMcpServers,
        eventBus: (taskManager as unknown as TaskManagerWithEventBus).eventBus,
        taskManager,
        sessionManager,
        sessionId: session.id,
        maxDepth: maxDepth || 3,
      });

      // Persist agent to database with mcpServerNames
      agentRepo.save({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        config: {
          ...agent.config,
          mcpServerNames: selectedMcpServers.map(s => s.name)
        } as Record<string, unknown>,
        metadata: agent.metadata || {},
        rootTask,
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
          rootTask,
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
          rootTask: agent.metadata.rootTask,
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

      const config = (agent as TaskOrientedAgent).getConfiguration();

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
   * POST /api/agents/:id/pause
   * Pause a running agent
   */
  router.post('/:id/pause', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      if (agent.status !== 'running') {
        return res.status(400).json({
          success: false,
          error: 'Agent is not running',
        });
      }

      await agent.pause();

      res.json({
        success: true,
        data: {
          id: agent.id,
          status: agent.status,
          message: 'Agent paused',
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * POST /api/agents/:id/resume
   * Resume a paused agent
   */
  router.post('/:id/resume', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      if (agent.status !== 'paused') {
        return res.status(400).json({
          success: false,
          error: 'Agent is not paused',
        });
      }

      await agent.resume();

      res.json({
        success: true,
        data: {
          id: agent.id,
          status: agent.status,
          message: 'Agent resumed',
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

  /**
   * GET /api/mcp-servers
   * List all available MCP servers
   */
  router.get('/mcp-servers', async (req, res) => {
    try {
      const servers = mcpServers.map(server => ({
        name: server.name,
        version: server.version,
        description: server.metadata?.description || '',
        tools: server.getTools().map(tool => ({
          name: tool.name,
          description: tool.description,
        })),
      }));

      res.json({
        success: true,
        data: servers,
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * PATCH /api/agents/:id/config
   * Update agent configuration
   */
  router.patch('/:id/config', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      if (agent.status === 'running') {
        return res.status(400).json({
          success: false,
          error: 'Cannot update configuration while agent is running. Stop the agent first.',
        });
      }

      const { mcpServerNames, maxDepth, rootTask } = req.body;

      // Update MCP servers if provided
      if (mcpServerNames && Array.isArray(mcpServerNames)) {
        const selectedMcpServers = mcpServers.filter(server =>
          mcpServerNames.includes(server.name)
        );

        // Access private field to update MCP servers (TypeScript workaround)
        const agentWithMcpServers = agent as any;
        agentWithMcpServers.mcpServers = new Map();
        selectedMcpServers.forEach(server => {
          agentWithMcpServers.mcpServers.set(server.name, server);
        });

        // Update config in database
        agent.config = {
          ...agent.config,
          tools: selectedMcpServers.map(s => s.name),
        };
      }

      // Update maxDepth if provided
      if (maxDepth !== undefined) {
        const agentWithMaxDepth = agent as any;
        agentWithMaxDepth.maxDepth = maxDepth;
      }

      // Update rootTask if provided
      if (rootTask !== undefined) {
        agent.metadata.rootTask = rootTask;
      }

      // Save to database
      agentRepo.save({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        config: { ...agent.config } as Record<string, unknown>,
        metadata: agent.metadata || {},
        rootTask: agent.metadata.rootTask,
        sessionId: (agent as TaskOrientedAgent).getConfiguration().sessionId,
        createdAt: new Date(agent.metadata.createdAt),
        updatedAt: new Date(),
      });

      res.json({
        success: true,
        data: {
          id: agent.id,
          message: 'Agent configuration updated',
          config: (agent as TaskOrientedAgent).getConfiguration(),
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ===== Task Management Endpoints =====

  /**
   * GET /api/agents/:id/tasks
   * Get all tasks assigned to an agent
   */
  router.get('/:id/tasks', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      // Get tasks from taskManager where assignedTo or agentId matches
      const tasks = taskManager.queryTasks({
        assignedTo: agent.id,
      });

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * POST /api/agents/:id/tasks
   * Assign an existing task to an agent
   */
  router.post('/:id/tasks', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { taskId: taskId } = req.body;

      if (!taskId) {
        return res.status(400).json({
          success: false,
          error: 'taskId is required',
        });
      }

      const task = taskManager.getTask(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
        });
      }

      // Update task to assign to this agent
      await taskManager.updateTask({
        taskId: taskId,
        assignedTo: agent.id,
      });

      // Add to agent's active tasks
      if (!agent.metadata.activeTaskIds) {
        agent.metadata.activeTaskIds = [];
      }
      if (!agent.metadata.activeTaskIds.includes(taskId)) {
        agent.metadata.activeTaskIds.push(taskId);
      }

      // Update database
      agentRepo.save({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        config: { ...agent.config } as Record<string, unknown>,
        metadata: agent.metadata || {},
        rootTask: agent.metadata.rootTask,
        sessionId: (agent as TaskOrientedAgent).getConfiguration().sessionId,
        createdAt: new Date(agent.metadata.createdAt),
        updatedAt: new Date(),
      });

      res.json({
        success: true,
        data: {
          message: 'Task assigned to agent',
          task: taskManager.getTask(taskId),
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * DELETE /api/agents/:id/tasks/:taskId
   * Unassign a task from an agent
   */
  router.delete('/:id/tasks/:taskId', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { taskId: taskId } = req.params;

      // Remove from agent's active tasks
      if (agent.metadata.activeTaskIds) {
        agent.metadata.activeTaskIds = agent.metadata.activeTaskIds.filter(
          (id: string) => id !== taskId
        );
      }

      // Update task to unassign
      await taskManager.updateTask({
        taskId: taskId,
        assignedTo: undefined,
      });

      // Update database
      agentRepo.save({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        config: { ...agent.config } as Record<string, unknown>,
        metadata: agent.metadata || {},
        rootTask: agent.metadata.rootTask,
        sessionId: (agent as TaskOrientedAgent).getConfiguration().sessionId,
        createdAt: new Date(agent.metadata.createdAt),
        updatedAt: new Date(),
      });

      res.json({
        success: true,
        data: { message: 'Task unassigned from agent' },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * POST /api/agents/:id/tasks/:taskId/start
   * Start working on a specific task
   */
  router.post('/:id/tasks/:taskId/start', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      if (agent.status === 'running') {
        return res.status(400).json({
          success: false,
          error: 'Agent is already running',
        });
      }

      const { taskId } = req.params;
      const task = taskManager.getTask(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
        });
      }

      // Set as current root task
      agent.metadata.rootTask = task.title;
      (agent as any).rootTaskId = taskId;

      // Start the agent
      await agent.start();

      res.json({
        success: true,
        data: {
          id: agent.id,
          status: agent.status,
          taskId: taskId,
          message: 'Agent started with task',
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ===== Task Management Endpoints =====

  /**
   * GET /api/agents/:id/tasks
   * Get all tasks assigned to an agent
   */
  router.get('/:id/tasks', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const tasks = taskManager.queryTasks({
        assignedTo: agent.id,
      });

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * POST /api/agents/:id/tasks
   * Assign an existing task to an agent
   */
  router.post('/:id/tasks', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { taskId } = req.body;

      if (!taskId) {
        return res.status(400).json({
          success: false,
          error: 'taskId is required',
        });
      }

      const task = taskManager.getTask(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
        });
      }

      // Assign task to this agent
      await taskManager.updateTask({
        taskId,
        assignedTo: agent.id,
      });

      // Add to agent's active tasks
      if (!agent.metadata.activeTaskIds) {
        agent.metadata.activeTaskIds = [];
      }
      if (!agent.metadata.activeTaskIds.includes(taskId)) {
        agent.metadata.activeTaskIds.push(taskId);
      }

      // Update database
      agentRepo.save({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        config: { ...agent.config } as Record<string, unknown>,
        metadata: agent.metadata || {},
        rootTask: agent.metadata.rootTask,
        sessionId: (agent as TaskOrientedAgent).getConfiguration().sessionId,
        createdAt: new Date(agent.metadata.createdAt),
        updatedAt: new Date(),
      });

      res.json({
        success: true,
        data: {
          message: 'Task assigned to agent',
          task: taskManager.getTask(taskId),
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * DELETE /api/agents/:id/tasks/:taskId
   * Unassign a task from an agent
   */
  router.delete('/:id/tasks/:taskId', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { taskId } = req.params;

      // Remove from agent's active tasks
      if (agent.metadata.activeTaskIds) {
        agent.metadata.activeTaskIds = agent.metadata.activeTaskIds.filter(
          (id: string) => id !== taskId
        );
      }

      // Unassign task
      await taskManager.updateTask({
        taskId,
        assignedTo: undefined,
      });

      // Auto-pause agent if no tasks left
      if (!agent.metadata.activeTaskIds || agent.metadata.activeTaskIds.length === 0) {
        if (agent.status === 'running') {
          await agent.pause();
          console.log(`Agent ${agent.id} auto-paused: no tasks assigned`);
        }
      }

      // Update database
      agentRepo.save({
        id: agent.id,
        name: agent.name,
        type: agent.type,
        status: agent.status,
        config: { ...agent.config } as Record<string, unknown>,
        metadata: agent.metadata || {},
        rootTask: agent.metadata.rootTask,
        sessionId: (agent as TaskOrientedAgent).getConfiguration().sessionId,
        createdAt: new Date(agent.metadata.createdAt),
        updatedAt: new Date(),
      });

      res.json({
        success: true,
        data: {
          message: agent.metadata.activeTaskIds?.length === 0
            ? 'Task unassigned and agent auto-paused'
            : 'Task unassigned from agent',
          agentStatus: agent.status,
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * POST /api/agents/:id/tasks/:taskId/start
   * Start working on a specific task (switches active task)
   */
  router.post('/:id/tasks/:taskId/start', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { taskId } = req.params;
      const task = taskManager.getTask(taskId);

      if (!task) {
        return res.status(404).json({
          success: false,
          error: 'Task not found',
        });
      }

      // Set as current active task
      agent.metadata.currentTaskId = taskId;
      agent.metadata.rootTask = task.title;
      (agent as any).rootTaskId = taskId;

      // Start or resume the agent
      if (agent.status !== 'running') {
        await agent.start();
      }

      res.json({
        success: true,
        data: {
          id: agent.id,
          status: agent.status,
          taskId,
          message: 'Agent started with task',
        },
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
      const sessionId = (agent as TaskOrientedAgent).metadata.sessionId || '';
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

      const { type, importance, title, content, metadata, tags, relatedTaskId, expiresAt } = req.body;

      if (!type || !importance || !title || !content) {
        return res.status(400).json({
          success: false,
          error: 'type, importance, title, and content are required',
        });
      }

      const memoryManager = getMemoryManager();
      const sessionId = (agent as TaskOrientedAgent).metadata.sessionId || '';
      
      const memory = await memoryManager.createMemory(agent.id, sessionId, {
        type,
        importance,
        title,
        content,
        metadata,
        tags,
        relatedTaskId,
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

