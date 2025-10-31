/**
 * Autonomous Agent - User-friendly, task-oriented agent
 *
 * Key Features:
 * - Accepts high-level tasks in natural language
 * - Breaks down tasks into steps autonomously
 * - Self-corrects when encountering errors
 * - Communicates progress in simple terms
 */
import {
  Agent,
  AgentConfig,
  AgentStatus,
  AgentState,
  Task,
  TaskResult,
  A2AMessage,
  MessageHandler,
  Unsubscribe,
  LLMProviderPlugin,
  MCPServerPlugin,
} from '@mosaic/shared';
import { EventBus, createEvent } from '../core/event-bus';
import { logger } from '../core/logger';
import { v4 as uuid } from 'uuid';

interface AutonomousAgentOptions {
  id?: string;
  name: string;
  task?: string; // High-level task in natural language
  llmProvider: LLMProviderPlugin;
  mcpServers: MCPServerPlugin[];
  eventBus: EventBus;
  maxSteps?: number; // Safety limit
}

export class AutonomousAgent implements Agent {
  id: string;
  name: string;
  type = 'autonomous';
  status: AgentStatus = 'idle';
  config: AgentConfig;
  metadata: Record<string, any> = {};

  public task: string; // Public for external access
  private llmProvider: LLMProviderPlugin;
  private mcpServers: Map<string, MCPServerPlugin> = new Map();
  private eventBus: EventBus;
  private messageHandlers: Set<MessageHandler> = new Set();
  private executionLog: string[] = [];
  private currentStep: number = 0;
  private maxSteps: number;
  private agentLogger: ReturnType<typeof logger.child>;

  constructor(options: AutonomousAgentOptions) {
    this.id = options.id || uuid();
    this.name = options.name;
    this.task = options.task || 'No task provided';
    this.llmProvider = options.llmProvider;
    this.eventBus = options.eventBus;
    this.maxSteps = options.maxSteps || 20;

    // Register MCP servers
    options.mcpServers.forEach((server) => {
      this.mcpServers.set(server.name, server);
    });

    this.config = {
      name: options.name,
      type: this.type,
      systemPrompt: this.buildSystemPrompt(),
    };

    this.agentLogger = logger.child({ agentId: this.id, agentName: this.name });
    this.metadata.createdAt = new Date().toISOString();
  }

  async start(): Promise<void> {
    if (this.status === 'running') {
      throw new Error('Agent is already running');
    }

    if (this.task.trim().length === 0) {
      throw new Error('Agent task cannot be started with an empty task');
    }

    this.status = 'running';
    this.agentLogger.info('Agent starting', { task: this.task });

    await this.eventBus.publish(
      'agent.started',
      createEvent('agent.started', this.id, {
        name: this.name,
        task: this.task,
      })
    );

    // Start autonomous execution
    this.executeTaskAutonomously().catch((error) => {
      this.agentLogger.error('Autonomous execution failed', { error });
      this.status = 'error';
    });
  }

  async stop(): Promise<void> {
    this.status = 'stopped';
    this.agentLogger.info('Agent stopped');

    await this.eventBus.publish(
      'agent.stopped',
      createEvent('agent.stopped', this.id, {
        name: this.name,
        steps: this.currentStep,
      })
    );
  }

  async pause(): Promise<void> {
    this.status = 'paused';
    this.agentLogger.info('Agent paused');
  }

  async resume(): Promise<void> {
    if (this.status !== 'paused') {
      throw new Error('Agent is not paused');
    }
    this.status = 'running';
    this.agentLogger.info('Agent resumed');
  }

  async sendMessage(message: A2AMessage): Promise<void> {
    this.agentLogger.debug('Received message', { from: message.from, type: message.type });

    // Notify handlers
    this.messageHandlers.forEach((handler) => {
      handler(message);
    });
  }

  onMessage(handler: MessageHandler): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => {
      this.messageHandlers.delete(handler);
    };
  }

  async executeTask(task: Task): Promise<TaskResult> {
    this.agentLogger.info('Executing task', { taskId: task.id, name: task.title });

    try {
      // Add task to task context
      const taskDescription = `Task: ${task.title}\nDescription: ${task.description}`;
      this.executionLog.push(`[TASK] ${taskDescription}`);

      const result = await this.executeTaskAutonomously();

      return {
        taskId: task.id,
        success: true,
        result: result
      };
    } catch (error: any) {
      this.agentLogger.error('Task execution failed', { taskId: task.id, error });
      return {
        taskId: task.id,
        result: null,
        success: false,
        errorMessage: error.message,
      };
    }
  }

  getState(): AgentState {
    return {
      status: this.status,
      memory: {
        task: this.task,
        currentStep: this.currentStep,
        executionLog: this.executionLog,
      },
    };
  }

  /**
   * Core autonomous execution loop
   * Breaks down the task and executes steps until complete
   */
  private async executeTaskAutonomously(): Promise<any> {
    this.agentLogger.info('Starting autonomous task execution', { task: this.task });

    const tools = this.getAvailableTools();

    while (this.currentStep < this.maxSteps && this.status === 'running') {
      this.currentStep++;

      try {
        // Ask LLM what to do next
        const nextAction = await this.planNextAction(tools);

        this.agentLogger.info('Planned next action', {
          step: this.currentStep,
          action: nextAction.action,
          reasoning: nextAction.reasoning,
        });

        // Publish progress update
        await this.eventBus.publish(
          'agent.progress',
          createEvent('agent.progress', this.id, {
            step: this.currentStep,
            action: nextAction.action,
            reasoning: nextAction.reasoning,
            thought: nextAction.thought, // User-friendly explanation
          })
        );

        // Check if task is complete
        if (nextAction.complete) {
          this.agentLogger.info('Task completed', {
            steps: this.currentStep,
            result: nextAction.result,
          });

          await this.eventBus.publish(
            'agent.completed',
            createEvent('agent.completed', this.id, {
              task: this.task,
              steps: this.currentStep,
              result: nextAction.result,
            })
          );

          this.status = 'idle';
          return nextAction.result;
        }

        // Execute the action
        if (nextAction.tool && nextAction.params) {
          const result = await this.executeTool(nextAction.tool, nextAction.params);
          this.executionLog.push(
            `[STEP ${this.currentStep}] Used ${nextAction.tool}: ${JSON.stringify(result)}`
          );
        }

      } catch (error: any) {
        this.agentLogger.error('Step execution failed', {
          step: this.currentStep,
          error,
        });

        // Ask LLM how to recover
        this.executionLog.push(
          `[ERROR at step ${this.currentStep}] ${error.message}`
        );

        await this.eventBus.publish(
          'agent.error',
          createEvent('agent.error', this.id, {
            step: this.currentStep,
            error: error.message,
            recovering: true,
          })
        );

        // Continue to next iteration to let LLM handle the error
      }
    }

    if (this.currentStep >= this.maxSteps) {
      const error = 'Maximum steps reached without completing task';
      this.agentLogger.warn(error);
      this.status = 'error';
      throw new Error(error);
    }

    return null;
  }

  /**
   * Plan the next action using the LLM
   */
  private async planNextAction(tools: any[]): Promise<{
    action: string;
    reasoning: string;
    thought: string; // Simple explanation for users
    complete: boolean;
    result?: any;
    tool?: string;
    params?: any;
  }> {
    const systemPrompt = this.buildSystemPrompt();
    const contextPrompt = this.buildContextPrompt(tools);

    const response = await this.llmProvider.complete({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: contextPrompt },
      ],
      temperature: 0.7,
      // Note: responseFormat: 'json' is not supported by all models
    });

    // Extract JSON from response (handle markdown code blocks if present)
    let jsonContent = response.message.content.trim();
    const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    } else if (jsonContent.startsWith('```') && jsonContent.endsWith('```')) {
      jsonContent = jsonContent.slice(3, -3).trim();
    }

    const plan = JSON.parse(jsonContent);
    return plan;
  }

  /**
   * Execute a tool (MCP server method)
   */
  private async executeTool(toolName: string, params: any): Promise<any> {
    const [serverName, method] = toolName.split('.');
    const server = this.mcpServers.get(serverName);

    if (!server) {
      throw new Error(`MCP server ${serverName} not found`);
    }

    this.agentLogger.debug('Executing tool', { toolName, params });

    const result = await server.invokeTool(method, params);

    await this.eventBus.publish(
      'tool.invoked',
      createEvent('tool.invoked', this.id, {
        tool: toolName,
        params,
        result,
      })
    );

    return result;
  }

  /**
   * Get available tools from all MCP servers
   */
  private getAvailableTools(): any[] {
    const tools: any[] = [];

    this.mcpServers.forEach((server, serverName) => {
      const serverTools = server.getTools();
      serverTools.forEach((tool) => {
        tools.push({
          name: `${serverName}.${tool.name}`,
          description: tool.description,
          parameters: tool.inputSchema,
        });
      });
    });

    return tools;
  }

  /**
   * Build system prompt that encourages autonomous, task-oriented behavior
   */
  private buildSystemPrompt(): string {
    return `You are an autonomous AI agent designed to help users achieve their tasks.

Your key principles:
1. **User-Friendly**: Explain your actions in simple terms that non-technical users can understand
2. **Autonomous**: Break down complex tasks into steps and execute them independently
3. **Self-Correcting**: When you encounter errors, figure out how to fix them and continue
4. **Transparent**: Always explain what you're doing and why
5. **Task-Oriented**: Stay focused on the user's task until it's complete

You have access to various tools to help you accomplish tasks. When planning your next action, you must respond with JSON in this format:

{
  "thought": "A simple explanation of what you're doing (for the user)",
  "reasoning": "Your detailed reasoning (for debugging)",
  "action": "Brief description of the action",
  "complete": false,
  "tool": "tool.name",
  "params": { "param1": "value1" }
}

When the task is complete, respond with:
{
  "thought": "Simple explanation of what you accomplished",
  "reasoning": "Summary of what was done",
  "action": "Task completed",
  "complete": true,
  "result": { "summary": "What was accomplished" }
}

If you encounter an error, don't give up. Think about how to work around it or try a different approach.`;
  }

  /**
   * Build context prompt with current state and available tools
   */
  private buildContextPrompt(tools: any[]): string {
    return `**Task**: ${this.task}

**Current Step**: ${this.currentStep}/${this.maxSteps}

**Available Tools**:
${tools.map((t) => `- ${t.name}: ${t.description}`).join('\n')}

**Execution Log** (what you've done so far):
${this.executionLog.slice(-5).join('\n') || 'Nothing yet'}

What should you do next to achieve the task? Remember to explain your actions in simple terms.`;
  }
}
