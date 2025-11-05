/**
 * Agent Management API Routes
 */

import { Router } from 'express';
import { LangGraphAgent } from '../../agents/langgraph-agent';
import { TaskManager } from '../../services/task/task-manager.service';
import { SessionManager } from '../../services/session/session-manager.service';
import { LLMProviderPlugin, MCPServerPlugin } from '@mosaic/shared';
import { getMemoryManager } from '../../services/memory/memory-manager.service';
import { EventBus } from '../../core/event-bus';
import { getDatabase } from '../../persistence/database';
import { AgentRepository } from '../../persistence/repositories/agent.repository';
import { PluginRegistry } from '../../core/plugin-registry';
import { AgentFileService } from '../../services/agent-file.service';

export function createAgentRoutes(
  taskManager: TaskManager,
  sessionManager: SessionManager,
  pluginRegistry: PluginRegistry,
  mcpServers: MCPServerPlugin[]
) {
  const router = Router();

  // Store active agents
  const activeAgents = new Map<string, LangGraphAgent>();

  // Initialize agent repository
  const db = getDatabase();
  const agentRepo = new AgentRepository(db.getDb());

  // Helper function to get LLM provider from registry by name or from llm_config
  const getLLMProvider = (input?: string | { model_endpoint_type?: string; model?: string }): LLMProviderPlugin => {
    const providers = pluginRegistry.getByType('llm-provider') as LLMProviderPlugin[];

    if (!providers || providers.length === 0) {
      throw new Error('No LLM providers available');
    }

    let providerName: string | undefined;

    // Handle string input (legacy provider name)
    if (typeof input === 'string') {
      providerName = input;
    }
    // Handle llm_config object input (.af format)
    else if (input && typeof input === 'object') {
      // Map model_endpoint_type to provider name
      const endpointType = input.model_endpoint_type;
      if (endpointType === 'openai') {
        providerName = 'openai-provider';
      } else if (endpointType === 'anthropic') {
        providerName = 'anthropic-provider';
      }
      // Fallback: try to infer from model name
      if (!providerName && input.model) {
        if (input.model.includes('gpt')) {
          providerName = 'openai-provider';
        } else if (input.model.includes('claude')) {
          providerName = 'anthropic-provider';
        }
      }
    }

    // If provider name specified, find it
    if (providerName) {
      const provider = providers.find(p => p.name === providerName);
      if (!provider) {
        throw new Error(`LLM provider '${providerName}' not found. Available: ${providers.map(p => p.name).join(', ')}`);
      }
      return provider;
    }

    // Default to first provider (OpenAI)
    return providers[0];
  };

  // Restore agents from database on startup
  const restoreAgents = async () => {
    try {
      const savedAgents = agentRepo.findAll();

      // Access eventBus from taskManager
      interface TaskManagerWithEventBus {
        eventBus: EventBus;
      }

      for (const savedAgent of savedAgents) {
        // Get Mosaic-specific metadata
        const mosaicMeta = savedAgent.metadata_?.mosaic as any;

        // Skip agents without sessionId
        if (!mosaicMeta?.sessionId) {
          console.warn(`Skipping agent ${savedAgent.id} without sessionId`);
          continue;
        }

        // Restore MCP servers from metadata if available
        let restoredMcpServers = mcpServers;
        if (mosaicMeta?.config && typeof mosaicMeta.config === 'object') {
          const config = mosaicMeta.config as { mcpServerNames?: string[]; llmProvider?: string; model?: string; useE2B?: boolean };
          if (config.mcpServerNames && Array.isArray(config.mcpServerNames)) {
            restoredMcpServers = mcpServers.filter(server =>
              config.mcpServerNames!.includes(server.name)
            );
          }
        }

        // Get the LLM provider from llm_config (.af format)
        const llmProvider = getLLMProvider(savedAgent.llm_config);
        const memoryManager = getMemoryManager();

        const agent = new LangGraphAgent({
          name: savedAgent.name,
          llmProvider,
          model: savedAgent.llm_config.model,
          mcpServers: restoredMcpServers,
          eventBus: (taskManager as unknown as TaskManagerWithEventBus).eventBus,
          taskManager,
          sessionManager,
          memoryManager,
          maxDepth: 3,
          useE2B: mosaicMeta?.config?.useE2B ?? false,
        });

        // Override the generated ID with saved ID
        agent.id = savedAgent.id;

        // Initialize the agent
        await agent.initialize();

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
  restoreAgents().catch(error => {
    console.error('Failed to restore agents on startup:', error);
  });

  /**
   * GET /api/agents/models
   * List available LLM providers and their models
   */
  router.get('/models', async (_req, res) => {
    try {
      const providers = pluginRegistry.getByType('llm-provider') as LLMProviderPlugin[];

      const providersData = await Promise.all(
        providers.map(async (provider) => ({
          id: provider.name,
          name: provider.metadata.description || provider.name,
          models: await provider.getModels(),
        }))
      );

      res.json({ success: true, data: providersData });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * GET /api/agents
   * List all active agents
   */
  router.get('/', async (req, res) => {
    try {
      const agents = Array.from(activeAgents.values()).map((agent) => {
        // Get agent record from database to include llm_config
        const agentRecord = agentRepo.findById(agent.id);
        const runtimeConfig = agent.getConfiguration();

        return {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
          rootTask: agent.metadata.rootTask,
          sessionId: (agent as LangGraphAgent).getConfiguration().sessionId,
          createdAt: agent.metadata.createdAt,
          config: {
            ...runtimeConfig,
            llm_config: agentRecord?.llm_config || {
              model: runtimeConfig.llm?.model || 'unknown',
              model_endpoint_type: runtimeConfig.llm?.provider === 'anthropic-provider' ? 'anthropic' : 'openai',
            },
          },
          metadata: agent.metadata,
        };
      });

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
      const {
        name,
        rootTask,
        sessionId,
        maxDepth,
        mcpServerNames,
        llmProvider: llmProviderName,
        model,
        useE2B,
        llm_config: providedLlmConfig
      } = req.body;

      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Name is required',
        });
      }

      // Build llm_config in .af format
      // Accept either new llm_config format or legacy llmProvider/model
      let llmConfig: any;
      if (providedLlmConfig) {
        llmConfig = providedLlmConfig;
      } else {
        // Legacy format: build llm_config from provider and model
        llmConfig = {
          model: model || 'gpt-4',
          model_endpoint_type: llmProviderName === 'anthropic-provider' ? 'anthropic' : 'openai',
          model_endpoint: llmProviderName === 'anthropic-provider'
            ? 'https://api.anthropic.com/v1'
            : 'https://api.openai.com/v1',
          context_window: 128000,
          temperature: 0.7,
        };
      }

      // Get the LLM provider from llm_config
      const llmProvider = getLLMProvider(llmConfig);

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

      const memoryManager = getMemoryManager();

      // Create LangGraph agent
      const agent = new LangGraphAgent({
        name,
        llmProvider,
        model: llmConfig.model,
        mcpServers: selectedMcpServers,
        eventBus: (taskManager as unknown as TaskManagerWithEventBus).eventBus,
        taskManager,
        sessionManager,
        memoryManager,
        maxDepth: maxDepth || 3,
        useE2B: useE2B ?? false,
      });

      // Initialize the LangGraph agent
      await agent.initialize();

      // Persist agent to database with .af format
      const now = new Date().toISOString();
      agentRepo.save({
        id: agent.id,
        name: agent.name,
        agent_type: agent.type,
        description: `Agent created on ${now}`,
        version: '1.0.0',
        system: '',
        llm_config: llmConfig,
        embedding_config: {},
        core_memory: [],
        messages: [],
        in_context_message_indices: [],
        message_buffer_autoclear: false,
        tools: [],
        tool_rules: [],
        tool_exec_environment_variables: [],
        tags: [],
        metadata_: {
          mosaic: {
            status: agent.status,
            sessionId: session.id,
            rootTask,
            config: {
              ...agent.config,
              mcpServerNames: selectedMcpServers.map(s => s.name),
              useE2B,
            },
          },
        },
        created_at: now,
        updated_at: now,
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
          config: agent.getConfiguration(),
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * GET /api/agents/:id/messages
   * Get agent conversation history from database
   */
  router.get('/:id/messages', async (req, res) => {
    try {
      const agentRecord = agentRepo.findById(req.params.id);

      if (!agentRecord) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      // Return messages from the database
      res.json({
        success: true,
        data: {
          messages: agentRecord.messages || [],
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  /**
   * GET /api/agents/:id/config
   * Get full agent configuration including .af format data
   */
  router.get('/:id/config', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);
      const agentRecord = agentRepo.findById(req.params.id);

      if (!agent && !agentRecord) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      // Get runtime configuration from active agent
      const runtimeConfig = agent ? (agent as LangGraphAgent).getConfiguration() : null;

      // Get all currently available tools from MCP servers
      const availableTools: any[] = [];
      mcpServers.forEach(server => {
        const serverTools = server.getTools();
        serverTools.forEach(tool => {
          availableTools.push({
            name: tool.name,
            description: tool.description,
            source_type: 'mcp_server',
            server: server.name,
            json_schema: {
              type: 'object',
              parameters: tool.inputSchema,
            },
          });
        });
      });

      // Identify tools that are stored but no longer available
      const storedTools = agentRecord?.tools || [];
      const availableToolNames = new Set(availableTools.map(t => `${t.server}.${t.name}`));
      const missingTools: string[] = [];

      storedTools.forEach(tool => {
        const toolIdentifier = tool.source_type === 'mcp_server' && (tool as any).server
          ? `${(tool as any).server}.${tool.name}`
          : tool.name;

        if (!availableToolNames.has(toolIdentifier)) {
          missingTools.push(tool.name);
        }
      });

      // Combine runtime config with full .af format data from database
      res.json({
        success: true,
        data: {
          // Runtime configuration (if agent is active)
          ...runtimeConfig,
          // Full .af format data from database
          agentFile: agentRecord,
          // Currently available tools from all MCP servers
          availableTools,
          // Tools that are in the agent config but no longer available
          missingTools,
        },
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
   * PATCH /api/agents/:id
   * Update agent configuration (.af format fields)
   */
  router.patch('/:id', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);
      const agentRecord = agentRepo.findById(req.params.id);

      if (!agent && !agentRecord) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      // Prevent updates while agent is running
      if (agent && agent.status === 'running') {
        return res.status(400).json({
          success: false,
          error: 'Cannot update configuration while agent is running. Stop the agent first.',
        });
      }

      const { core_memory, llm_config, tool_exec_environment_variables } = req.body;

      // Build update object with only provided fields
      const updates: any = {};

      if (core_memory !== undefined) {
        updates.core_memory = core_memory;
      }

      if (llm_config !== undefined) {
        updates.llm_config = llm_config;
      }

      if (tool_exec_environment_variables !== undefined) {
        updates.tool_exec_environment_variables = tool_exec_environment_variables;
      }

      // Update timestamp
      updates.updated_at = new Date().toISOString();

      // Update in database
      agentRepo.update(req.params.id, updates);

      res.json({
        success: true,
        data: {
          id: req.params.id,
          message: 'Agent configuration updated successfully',
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

      // Update Mosaic metadata in existing agent record
      agentRepo.updateMosaicMetadata(agent.id, {
        status: agent.status,
        sessionId: (agent as LangGraphAgent).getConfiguration().sessionId,
        rootTask: agent.metadata.rootTask,
        config: { ...agent.config },
      });

      res.json({
        success: true,
        data: {
          id: agent.id,
          message: 'Agent configuration updated',
          config: (agent as LangGraphAgent).getConfiguration(),
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
      agentRepo.updateMosaicMetadata(agent.id, {
        status: agent.status,
        config: { ...agent.config },
        rootTask: agent.metadata.rootTask,
        sessionId: (agent as LangGraphAgent).getConfiguration().sessionId,
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
      agentRepo.updateMosaicMetadata(agent.id, {
        status: agent.status,
        config: { ...agent.config },
        rootTask: agent.metadata.rootTask,
        sessionId: (agent as LangGraphAgent).getConfiguration().sessionId,
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

      // Update task status to in_progress
      await taskManager.updateTask({
        taskId,
        status: 'in_progress',
      });

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

  /**
   * POST /api/agents/:id/tasks/:taskId/stop
   * Stop working on a specific task and pause the agent
   */
  router.post('/:id/tasks/:taskId/stop', async (req, res) => {
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

      // Stop the agent if it's running
      if (agent.status === 'running') {
        await agent.stop();
      }

      // Clear current task
      agent.metadata.currentTaskId = undefined;

      // Update task status back to open so it can be resumed
      // Only update if task is currently in_progress (don't override completed/blocked/failed)
      if (task.status === 'in_progress') {
        await taskManager.updateTask({
          taskId,
          status: 'open',
          agentNotes: 'Task stopped by user - ready to resume',
        });
      }

      res.json({
        success: true,
        data: {
          id: agent.id,
          status: agent.status,
          taskId,
          message: 'Agent stopped',
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
      const sessionId = (agent as LangGraphAgent).metadata.sessionId || '';
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
      const sessionId = (agent as LangGraphAgent).metadata.sessionId || '';
      
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

  /**
   * POST /api/agents/:id/message
   * Send a message to an agent (for chat interface)
   */
  router.post('/:id/message', async (req, res) => {
    try {
      const agent = activeAgents.get(req.params.id);
      const agentRecord = agentRepo.findById(req.params.id);

      if (!agent && !agentRecord) {
        return res.status(404).json({
          success: false,
          error: 'Agent not found',
        });
      }

      const { message } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'Message is required',
        });
      }

      const now = new Date().toISOString();

      // Create user message following .af format
      const userMessage = {
        role: 'user' as const,
        content: message,
        created_at: now,
        updated_at: now,
      };

      // Get current messages from database
      const currentMessages = agentRecord ? [...agentRecord.messages] : [];
      currentMessages.push(userMessage);

      // Update agent record with new message
      if (agentRecord) {
        agentRepo.update(req.params.id, {
          messages: currentMessages,
        });
      }

      // Invoke the agent to process the message (regardless of running/stopped status)
      // Note: running/stopped only controls task queue processing
      let assistantResponseContent = 'I received your message.';

      if (agent) {
        try {
          // Invoke the agent directly with the message
          const agentInstance = agent as any;
          if (agentInstance.agent && agentInstance.checkpointer) {
            console.log('[Message Handler] Invoking agent for message processing');
            const response = await agentInstance.agent.invoke(
              {
                messages: [{ role: 'user', content: message }],
              },
              {
                configurable: {
                  thread_id: agentInstance.sessionId,
                },
              }
            );

            // Extract the assistant's response
            if (response.messages && response.messages.length > 0) {
              const lastMessage = response.messages[response.messages.length - 1];
              assistantResponseContent = lastMessage.content || 'Agent processed the message.';
            }
          }
        } catch (error) {
          console.error('[Message Handler] Error invoking agent:', error);
          assistantResponseContent = 'I encountered an error processing your message. Please try again.';
        }
      } else {
        assistantResponseContent = 'Agent instance not found. Please ensure the agent is properly initialized.';
      }

      // Create assistant response message
      const assistantMessage = {
        role: 'assistant' as const,
        content: assistantResponseContent,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Add assistant message to database
      if (agentRecord) {
        currentMessages.push(assistantMessage);
        agentRepo.update(req.params.id, {
          messages: currentMessages,
        });
      }

      res.json({
        success: true,
        data: {
          message: assistantMessage,
          reply: assistantMessage.content,
        },
      });
    } catch (error: unknown) {
      res.status(500).json({ success: false, error: error instanceof Error ? error.message : String(error) });
    }
  });

  // ============================================================================
  // Agent File (.af) Import/Export Routes
  // ============================================================================

  const agentFileService = new AgentFileService();

  /**
   * GET /api/agents/:id/export
   * Export an agent to Agent File (.af) format (JSON response)
   */
  router.get('/:id/export', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        includeMessages = 'true',
        includeTools = 'true',
        includeMemory = 'true',
        messageLimit,
        prettyPrint = 'true',
      } = req.query;

      // Get agent from database
      const agentRecord = agentRepo.findById(id);
      if (!agentRecord) {
        return res.status(404).json({
          success: false,
          error: `Agent ${id} not found`,
        });
      }

      // Export to agent file format
      const agentFile = agentFileService.exportToAgentFile(agentRecord, {
        includeMessages: includeMessages === 'true',
        includeTools: includeTools === 'true',
        includeMemory: includeMemory === 'true',
        messageLimit: messageLimit ? parseInt(messageLimit as string) : undefined,
        prettyPrint: prettyPrint === 'true',
      });

      res.json({
        success: true,
        data: agentFile,
      });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * GET /api/agents/:id/export/download
   * Export and download agent as .af file
   */
  router.get('/:id/export/download', async (req, res) => {
    try {
      const { id } = req.params;
      const {
        includeMessages = 'true',
        includeTools = 'true',
        includeMemory = 'true',
        messageLimit,
      } = req.query;

      // Get agent from database
      const agentRecord = agentRepo.findById(id);
      if (!agentRecord) {
        return res.status(404).json({
          success: false,
          error: `Agent ${id} not found`,
        });
      }

      // Export to JSON
      const json = agentFileService.exportToJson(agentRecord, {
        includeMessages: includeMessages === 'true',
        includeTools: includeTools === 'true',
        includeMemory: includeMemory === 'true',
        messageLimit: messageLimit ? parseInt(messageLimit as string) : undefined,
        prettyPrint: true,
      });

      // Set headers for file download
      const filename = `${agentRecord.name.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.af.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(json);
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * POST /api/agents/import
   * Import an agent from Agent File (.af) format (official format)
   */
  router.post('/import', async (req, res) => {
    try {
      const agentFile = req.body;
      const {
        preserveId = false,
        overwriteExisting = false,
        mergeMessages = false,
        mergeTools = false,
        conflictResolution = 'create_new',
      } = req.query;

      // Validate the agent file
      try {
        agentFileService.validateAgentFile(agentFile);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: `Invalid agent file: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      // Import the agent
      const importedAgent = agentFileService.importFromAgentFile(agentFile, {
        preserveId: preserveId === 'true',
        mergeMessages: mergeMessages === 'true',
        mergeTools: mergeTools === 'true',
        conflictResolution: conflictResolution as any,
      });

      // Check for conflicts if preserveId is true
      if (preserveId === 'true' && importedAgent.id) {
        const existing = agentRepo.findById(importedAgent.id);
        if (existing) {
          if (overwriteExisting !== 'true') {
            return res.status(409).json({
              success: false,
              error: `Agent with ID ${importedAgent.id} already exists. Use overwriteExisting=true to replace it.`,
            });
          }

          // Merge messages and tools if requested
          if (mergeMessages === 'true' && existing.messages) {
            importedAgent.messages = agentFileService.mergeMessages(
              existing.messages,
              importedAgent.messages || []
            );
          }

          if (mergeTools === 'true' && existing.tools) {
            importedAgent.tools = agentFileService.mergeTools(
              existing.tools,
              importedAgent.tools || []
            );
          }
        }
      }

      // Save to database
      agentRepo.save(importedAgent as any);

      // Create and initialize the agent in memory
      const mosaicMetadata = importedAgent.metadata_?.mosaic as any;

      // Get the LLM provider from llm_config (.af format)
      const llmProvider = getLLMProvider(importedAgent.llm_config!);
      const memoryManager = getMemoryManager();

      // Filter MCP servers if specified in config
      let selectedMcpServers = mcpServers;
      if (mosaicMetadata?.config?.mcpServerNames && Array.isArray(mosaicMetadata.config.mcpServerNames)) {
        selectedMcpServers = mcpServers.filter(server =>
          mosaicMetadata.config.mcpServerNames.includes(server.name)
        );
      }

      // Access eventBus from taskManager
      interface TaskManagerWithEventBus {
        eventBus: EventBus;
      }

      const agent = new LangGraphAgent({
        name: importedAgent.name!,
        llmProvider,
        model: importedAgent.llm_config!.model,
        mcpServers: selectedMcpServers,
        eventBus: (taskManager as unknown as TaskManagerWithEventBus).eventBus,
        taskManager,
        sessionManager,
        memoryManager,
        maxDepth: 3,
        useE2B: mosaicMetadata?.config?.useE2B ?? false,
      });

      // Override the generated ID with imported ID
      agent.id = importedAgent.id!;

      // Initialize the agent
      await agent.initialize();

      // Set status to idle
      agent.status = 'idle';
      activeAgents.set(agent.id, agent);

      res.json({
        success: true,
        data: {
          id: agent.id,
          name: agent.name,
          type: agent.type,
          status: agent.status,
          message: 'Agent imported successfully',
        },
      });
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  return router;
}

