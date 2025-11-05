/**
 * LangGraph-based Agent
 *
 * Replaces custom TaskOrientedAgent with battle-tested LangGraph orchestration.
 * Uses E2B for safe code execution and MCP servers for tools.
 */

import { v4 as uuidv4 } from 'uuid';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { MemorySaver } from '@langchain/langgraph';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { CodeInterpreter } from '@e2b/code-interpreter';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

import type { Agent, AgentStatus } from './base-agent';
import type { Task } from '@mosaic/shared';
import type { EventBus } from '../core/event-bus';
import type { TaskManager } from '../services/task/task-manager.service';
import type { SessionManager } from '../services/session/session-manager.service';
import type { MemoryManager } from '../services/memory/memory-manager.service';
import type { LLMProviderPlugin, MCPServerPlugin } from '@mosaic/shared';
import { convertMCPToLangChainTools } from './utils/mcp-to-langchain';
import { Logger } from '../core/logger';

interface LangGraphAgentOptions {
  name: string;
  llmProvider: LLMProviderPlugin;
  model?: string;
  mcpServers: MCPServerPlugin[];
  eventBus: EventBus;
  taskManager: TaskManager;
  sessionManager: SessionManager;
  memoryManager: MemoryManager;
  maxDepth?: number;
  useE2B?: boolean; // Enable E2B code interpreter
  sessionId?: string; // Use existing session ID or create new one
}

export class LangGraphAgent implements Agent {
  id: string;
  name: string;
  type = 'langgraph-agent';
  status: AgentStatus = 'idle';

  private llmProvider: LLMProviderPlugin;
  private model?: string;
  private mcpServers: Map<string, MCPServerPlugin>;
  private eventBus: EventBus;
  private taskManager: TaskManager;
  private sessionManager: SessionManager;
  private memoryManager: MemoryManager;
  private maxDepth: number;
  private useE2B: boolean;

  // LangGraph components
  private agent: any;
  private checkpointer: MemorySaver;
  private e2bSandbox?: CodeInterpreter;

  // Session tracking
  private sessionId: string;
  private currentTaskId?: string;

  private agentLogger: Logger;
  public metadata: Record<string, any> = {};
  public config: Record<string, any> = {};

  constructor(options: LangGraphAgentOptions) {
    this.id = uuidv4();
    this.name = options.name;
    this.llmProvider = options.llmProvider;
    this.model = options.model;
    this.mcpServers = new Map(options.mcpServers.map(s => [s.name, s]));
    this.eventBus = options.eventBus;
    this.taskManager = options.taskManager;
    this.sessionManager = options.sessionManager;
    this.memoryManager = options.memoryManager;
    this.maxDepth = options.maxDepth || 3;
    this.useE2B = options.useE2B ?? false;

    // Use provided sessionId or create new one
    this.sessionId = options.sessionId || uuidv4();
    this.checkpointer = new MemorySaver();
    this.agentLogger = new Logger({ agent: this.name });

    // Store config for persistence
    this.config = {
      name: options.name,
      type: this.type,
      llmProvider: options.llmProvider.name,
      model: options.model,
      mcpServerNames: options.mcpServers.map(s => s.name),
      useE2B: this.useE2B,
    };

    this.metadata = {
      createdAt: new Date().toISOString(),
      sessionId: this.sessionId,
    };
  }

  /**
   * Initialize the LangGraph agent with tools
   */
  async initialize(): Promise<void> {
    this.agentLogger.info('Initializing LangGraph agent', {
      model: this.getModel(),
      mcpServers: Array.from(this.mcpServers.keys()),
      useE2B: this.useE2B,
    });

    // Initialize E2B sandbox if enabled
    if (this.useE2B) {
      try {
        this.agentLogger.info('Creating E2B sandbox...');
        this.e2bSandbox = await CodeInterpreter.create();
        this.agentLogger.info('E2B sandbox created', { sandboxId: this.e2bSandbox.sandboxId });
      } catch (error: any) {
        this.agentLogger.warn('Failed to create E2B sandbox, continuing without it', {
          error: error.message,
        });
      }
    }

    // Build tools from MCP servers
    const tools = this.buildTools();

    // Create LLM
    const llm = this.createLLM();

    // Create LangGraph agent with checkpointing for resumability
    this.agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: this.checkpointer,
    });

    this.agentLogger.info('LangGraph agent initialized', {
      toolCount: tools.length,
      tools: tools.map(t => t.name),
    });
  }

  /**
   * Create LLM instance based on provider
   */
  private createLLM() {
    const model = this.getModel();

    const callbacks = [{
      handleLLMStart: async (...args: any[]) => {
        this.agentLogger.info('LLM call started', { model });
      },
      handleLLMEnd: async (...args: any[]) => {
        this.agentLogger.info('LLM call completed');
      },
      handleLLMError: async (error: Error) => {
        this.agentLogger.error('LLM call failed', { error: error.message });
      },
      handleToolStart: async (tool: any, input: string) => {
        this.agentLogger.info('Tool execution started', {
          tool: tool.name || 'unknown',
          input: input.substring(0, 100)
        });
      },
      handleToolEnd: async (output: string) => {
        this.agentLogger.info('Tool execution completed', {
          output: output.substring(0, 200)
        });
      },
      handleToolError: async (error: Error) => {
        this.agentLogger.error('Tool execution failed', { error: error.message });
      },
    }];

    if (this.llmProvider.name === 'anthropic-provider') {
      return new ChatAnthropic({
        model,
        temperature: 0.7,
        apiKey: process.env.ANTHROPIC_API_KEY,
        callbacks,
        verbose: true,
      });
    } else if (this.llmProvider.name === 'openai-provider') {
      return new ChatOpenAI({
        model,
        temperature: 0.7,
        apiKey: process.env.OPENAI_API_KEY,
        callbacks,
        verbose: true,
      });
    }

    throw new Error(`Unsupported LLM provider: ${this.llmProvider.name}`);
  }

  /**
   * Build LangChain tools from MCP servers and E2B
   */
  private buildTools(): DynamicStructuredTool[] {
    const tools: DynamicStructuredTool[] = [];

    // Convert MCP servers to LangChain tools
    const mcpTools = convertMCPToLangChainTools(Array.from(this.mcpServers.values()));
    tools.push(...mcpTools);

    // Add E2B code interpreter if available
    if (this.e2bSandbox) {
      const e2bTool: DynamicStructuredTool = new DynamicStructuredTool({
        name: 'execute_python',
        description: 'Execute Python code in a secure sandbox. Use for data analysis, calculations, file processing, or any Python task. Returns the output.',
        schema: z.object({
          code: z.string().describe('Python code to execute'),
        }) as z.ZodObject<any>,
        func: async ({ code }: { code: string }) => {
          try {
            const execution = await this.e2bSandbox!.notebook.execCell(code);

            // Combine all output types
            const output = [
              execution.text,
              ...execution.results.map(r => r.text || r.data),
              execution.error ? `Error: ${execution.error}` : null,
            ].filter(Boolean).join('\n');

            return output || 'Code executed successfully (no output)';
          } catch (error: any) {
            return `Error executing code: ${error.message}`;
          }
        },
      });

      tools.push(e2bTool);
    }

    return tools;
  }

  /**
   * Get the model to use
   */
  private getModel(): string {
    if (this.model) {
      return this.model;
    }

    // Provider-specific defaults
    if (this.llmProvider.name === 'anthropic-provider') {
      return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    }

    return process.env.OPENAI_MODEL || 'gpt-4';
  }

  /**
   * Start the agent
   */
  async start(): Promise<void> {
    if (this.status === 'running') {
      this.agentLogger.warn('Agent already running');
      return;
    }

    this.status = 'running';
    this.agentLogger.info('Agent started');

    await this.eventBus.publish('agent.started', {
      id: uuidv4(),
      type: 'agent.started',
      source: this.id,
      timestamp: new Date().toISOString(),
      data: { name: this.name },
    });

    // Start autonomous task execution loop
    this.runTaskLoop().catch((error) => {
      this.agentLogger.error('Task loop failed', { error: error.message });
      this.status = 'error';
    });
  }

  /**
   * Autonomous task execution loop
   */
  private async runTaskLoop(): Promise<void> {
    this.agentLogger.info('Starting autonomous task loop', { agentId: this.id });

    while (this.status === 'running') {
      try {
        // Get next pending task assigned to this agent
        const tasks = await this.taskManager.queryTasks({
          status: ['open', 'in_progress'],
          assignedTo: this.id,
        });

        this.agentLogger.info('Task loop check', {
          agentId: this.id,
          pendingTasksFound: tasks.length,
        });

        if (tasks.length > 0) {
          const task = tasks[0];
          this.agentLogger.info('Found pending task', { taskId: task.id, title: task.title });

          await this.executeTask(task);
        } else {
          // No pending tasks, wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error: any) {
        this.agentLogger.error('Error in task loop', { error: error.message, stack: error.stack });
        // Continue the loop even if one task fails
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }

    this.agentLogger.info('Task loop stopped');
  }

  /**
   * Stop the agent
   */
  async stop(): Promise<void> {
    this.status = 'stopped';
    this.agentLogger.info('Agent stopped');

    await this.eventBus.publish('agent.stopped', {
      id: uuidv4(),
      type: 'agent.stopped',
      source: this.id,
      timestamp: new Date().toISOString(),
      data: { name: this.name },
    });
  }

  /**
   * Execute a task using LangGraph
   */
  async executeTask(task: Task): Promise<void> {
    this.currentTaskId = task.id;
    this.agentLogger.info('Executing task with LangGraph', {
      taskId: task.id,
      title: task.title,
    });

    try {
      // Update task status
      await this.taskManager.updateTask({
        taskId: task.id,
        status: 'in_progress',
      });

      // Prepare input messages
      const input = {
        messages: [
          new SystemMessage(`You are ${this.name}, an AI assistant. Execute the following task.`),
          new HumanMessage(task.description),
        ],
      };

      // Execute with LangGraph - it handles the loop, tool calling, etc.
      this.agentLogger.info('Invoking LangGraph agent', {
        taskDescription: task.description,
        model: this.getModel(),
        toolCount: this.buildTools().length,
      });

      const config = {
        configurable: {
          thread_id: task.id, // Use task ID for thread continuity
        },
      };

      this.agentLogger.info('Calling agent.invoke...');
      const result = await this.agent.invoke(input, config);
      this.agentLogger.info('agent.invoke completed', {
        messageCount: result.messages?.length || 0,
      });

      // Extract final response
      const lastMessage = result.messages[result.messages.length - 1];
      const finalResponse = lastMessage.content;

      this.agentLogger.info('Task completed by LangGraph', {
        taskId: task.id,
        response: typeof finalResponse === 'string' ? finalResponse.substring(0, 200) : 'complex response',
      });

      // Update task with completion
      await this.taskManager.updateTask({
        taskId: task.id,
        status: 'completed',
        agentNotes: typeof finalResponse === 'string' ? finalResponse : JSON.stringify(finalResponse),
      });

      // Stop agent after task completion
      await this.stop();

    } catch (error: any) {
      this.agentLogger.error('Task execution failed', {
        taskId: task.id,
        error: error.message,
        stack: error.stack,
      });

      // Check if it's a blocking situation
      const isBlocked = error.message?.toLowerCase().includes('cannot') ||
                       error.message?.toLowerCase().includes('need') ||
                       error.message?.toLowerCase().includes('require');

      await this.taskManager.updateTask({
        taskId: task.id,
        status: isBlocked ? 'blocked' : 'failed',
        errorMessage: error.message,
        agentNotes: isBlocked ? error.message : undefined,
      });

      await this.stop();
      throw error;
    }
  }

  /**
   * Get agent configuration
   */
  getConfiguration() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      sessionId: this.sessionId,
      currentTaskId: this.currentTaskId,
      llm: {
        provider: this.llmProvider.name,
        model: this.getModel(),
      },
      mcpServers: Array.from(this.mcpServers.keys()),
      useE2B: this.useE2B,
      e2bSandboxId: this.e2bSandbox?.sandboxId,
      metadata: this.metadata,
      config: this.config,
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    this.agentLogger.info('Cleaning up agent resources');

    // Close E2B sandbox if exists
    if (this.e2bSandbox) {
      try {
        await this.e2bSandbox.close();
        this.agentLogger.info('E2B sandbox closed');
      } catch (error: any) {
        this.agentLogger.warn('Failed to close E2B sandbox', { error: error.message });
      }
    }
  }

  // Implement other Agent interface methods as needed
  async pause(): Promise<void> {
    this.status = 'paused';
    this.agentLogger.info('Agent paused');
  }

  async resume(): Promise<void> {
    this.status = 'running';
    this.agentLogger.info('Agent resumed');
  }
}
