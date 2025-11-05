/**
 * Task-Oriented Agent - Enhanced autonomous agent with task decomposition
 *
 * This agent can:
 * - Accept extremely high-level tasks like "address climate change"
 * - Break them down into manageable sub-tasks
 * - Create and manage its own task hierarchy
 * - Record all actions for transparency
 */

import {
  Agent,
  AgentConfig,
  AgentStatus,
  AgentState,
  A2AMessage,
  MessageHandler,
  Unsubscribe,
  LLMProviderPlugin,
  MCPServerPlugin,
  TaskDecomposition,
  Task,
} from '@mosaic/shared';
import { EventBus } from '../core/event-bus';
import { logger } from '../core/logger';
import { v4 as uuid, v4 as uuidv4 } from 'uuid';
import { SessionManager } from '../services/session/session-manager.service';
import { getMemoryManager } from '../services/memory/memory-manager.service';
import { MemoryManagerService } from '../services/memory/memory-manager.service';
import { TaskManager } from '@/services/task/task-manager.service';

interface TaskOrientedAgentOptions {
  id?: string;
  name: string;
  rootTask?: string; // The highest-level task (optional)
  llmProvider: LLMProviderPlugin;
  mcpServers: MCPServerPlugin[];
  eventBus: EventBus;
  taskManager: TaskManager;
  sessionManager: SessionManager;
  sessionId: string;
  maxDepth?: number; // Maximum task decomposition depth
}

export class TaskOrientedAgent implements Agent {
  id: string;
  name: string;
  type = 'task-oriented';
  status: AgentStatus = 'idle';
  config: AgentConfig;
  metadata: Record<string, any> = {};

  private rootTaskId?: string;
  private currentTaskId?: string;
  private llmProvider: LLMProviderPlugin;
  private mcpServers: Map<string, MCPServerPlugin> = new Map();
  private eventBus: EventBus;
  private taskManager: TaskManager;
  private sessionManager: SessionManager;
  private memoryManager: MemoryManagerService;
  private sessionId: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private agentLogger: ReturnType<typeof logger.child>;
  private maxDepth: number;

  constructor(options: TaskOrientedAgentOptions) {
    this.id = options.id || uuid();
    this.name = options.name;
    this.llmProvider = options.llmProvider;
    this.eventBus = options.eventBus;
    this.taskManager = options.taskManager;
    this.sessionManager = options.sessionManager;
    this.memoryManager = getMemoryManager();
    this.sessionId = options.sessionId;
    this.maxDepth = options.maxDepth || 3;

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
    this.metadata.rootTask = options.rootTask;
  }

  /**
   * Get the appropriate model based on the provider
   */
  private getModel(): string {
    // Check provider type and use appropriate default
    if (this.llmProvider.name === 'anthropic-provider') {
      return process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929';
    } else if (this.llmProvider.name === 'openai-provider') {
      return process.env.OPENAI_MODEL || 'gpt-4';
    }

    // Fallback to OpenAI for unknown providers
    return process.env.OPENAI_MODEL || 'gpt-4';
  }

  async start(): Promise<void> {
    if (this.status === 'running') {
      throw new Error('Agent is already running');
    }

    this.status = 'running';
    this.agentLogger.info('Agent starting', {
      task: this.metadata.rootTask || 'No task assigned - waiting for instructions'
    });

    await this.eventBus.publish('agent.started', {
      id: uuidv4(),
      type: 'agent.started',
      source: this.id,
      timestamp: new Date().toISOString(),
      data: {
        name: this.name,
        task: this.metadata.rootTask || null,
        hasTask: !!this.metadata.rootTask,
      },
    });

    // Check if we have a rootTaskId set (from route or initialization)
    if (this.rootTaskId) {
      this.agentLogger.info('Root task assigned', { taskId: this.rootTaskId });
      await this.workOnTask(this.rootTaskId);
    } else if (this.metadata.rootTask && typeof this.metadata.rootTask === 'object' && this.metadata.rootTask.id) {
      // Legacy support: rootTask is a full Task object
      const taskId = this.metadata.rootTask.id;
      this.rootTaskId = taskId;
      this.agentLogger.info('Root task created', { taskId });
      await this.workOnTask(taskId);
    } else {
      // Agent started without a task - enter idle state
      this.agentLogger.info('Agent started without a task - entering idle state');
      await this.enterIdleState();
    }
  }

  /**
   * Enter idle state - agent is running but waiting for tasks to be assigned
   */
  private async enterIdleState(): Promise<void> {
    this.agentLogger.info('Agent in idle state - waiting for task assignment');

    // Emit progress event
    await this.eventBus.publish('agent.progress', {
      id: uuidv4(),
      type: 'agent.progress',
      source: this.id,
      timestamp: new Date().toISOString(),
      data: {
        agentId: this.id,
        message: 'Agent ready and waiting for tasks',
        status: 'idle',
      },
    });

    // Agent stays running but doesn't do anything until a task is assigned
    // Tasks can be assigned via the /api/agents/:id/tasks/:taskId/start endpoint
  }

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

  async pause(): Promise<void> {
    this.status = 'paused';
    this.agentLogger.info('Agent paused');
  }

  async resume(): Promise<void> {
    this.status = 'running';
    this.agentLogger.info('Agent resumed');
  }

  onMessage(handler: MessageHandler): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Main work loop for a task
   */
  private async workOnTask(taskId: string, depth: number = 0): Promise<void> {
    // Always fetch task from manager to ensure we have the latest state
    const task = this.taskManager.getTask(taskId);
    if (!task) {
      this.agentLogger.error('Task not found', { taskId });
      throw new Error(`Task ${taskId} not found`);
    }

    this.currentTaskId = taskId;
    this.agentLogger.info('Working on task', {
      taskId: task.id,
      title: task.title,
      depth,
    });

    // Update task status
    await this.taskManager.updateTask({
      taskId: task.id,
      status: 'in_progress',
    });

    this.agentLogger.info('Task status updated to in_progress', { taskId: task.id });

    // Record action
    const action = await this.sessionManager.recordAction(
      this.sessionId,
      this.id,
      'task_started',
      `Started working on: ${task.title}`,
      {
        metadata: { taskTitle: task.title, taskId: task.id, depth },
      },
      task.id
    );
    const actionId = action.id;

    try {
      // Check if task already has sub-tasks (previously decomposed)
      const hasSubTasks = task.childTaskIds && task.childTaskIds.length > 0;

      if (hasSubTasks) {
        // Task was already decomposed - resume from where we left off
        this.agentLogger.info('Resuming previously decomposed task', {
          taskId: task.id,
          title: task.title,
          subTaskCount: task.childTaskIds.length
        });

        await this.sessionManager.recordAction(
          this.sessionId,
          this.id,
          'agent_message',
          `Resuming task: "${task.title}" - Found ${task.childTaskIds.length} sub-tasks`,
          {
            reasoning: `Task was previously decomposed. Checking status of sub-tasks to resume.`,
            metadata: { taskId: task.id, depth, subTaskCount: task.childTaskIds.length }
          },
          task.id
        );

        await this.resumeDecomposedTask(task, depth);
      } else {
        // Task hasn't been decomposed yet - determine if we should
        const shouldDecompose = await this.shouldDecomposeTask(task, depth);

        // Record decision
        await this.sessionManager.recordAction(
          this.sessionId,
          this.id,
          'agent_message',
          shouldDecompose
            ? `Analyzing: "${task.title}" - This task is complex and needs to be broken down into sub-tasks`
            : `Analyzing: "${task.title}" - This task is simple enough to execute directly`,
          {
            reasoning: shouldDecompose
              ? `Task requires decomposition (depth: ${depth}, max: ${this.maxDepth})`
              : `Task can be executed as a single task`,
            metadata: { taskId: task.id, depth, shouldDecompose }
          },
          task.id
        );

        if (shouldDecompose && depth < this.maxDepth) {
          // Decompose into sub-tasks
          this.agentLogger.info('Decomposing task', { taskId: task.id, title: task.title });
          await this.decomposeAndExecuteTask(task, depth);
        } else {
          // Execute directly as a simple task
          this.agentLogger.info('Executing task directly', {
            taskId: task.id,
            title: task.title,
          });
          await this.executeSimpleTask(task);
        }
      }

      // Mark task as completed
      await this.taskManager.updateTask({
        taskId: task.id,
        status: 'completed',
      });

      await this.sessionManager.completeAction(actionId, 'completed');

      this.agentLogger.info('Task completed', { taskId: task.id, title: task.title });
    } catch (error: any) {
      this.agentLogger.error('Task failed', {
        taskId: task.id,
        title: task.title,
        error: error.message,
      });

      await this.taskManager.updateTask({
        taskId: task.id,
        status: 'failed',
        errorMessage: error.message,
      });

      await this.sessionManager.completeAction(actionId, 'failed', undefined, {
        message: error.message,
        stack: error.stack,
      });

      throw error;
    }
  }

  /**
   * Decide if a task should be decomposed
   */
  private async shouldDecomposeTask(task: Task, currentDepth: number): Promise<boolean> {
    // Max depth reached - don't decompose
    if (currentDepth >= this.maxDepth) {
      return false;
    }

    // Get task hierarchy context
    const parentTask = task.parentTaskId ? this.taskManager.getTask(task.parentTaskId) : null;
    const siblingTasks = parentTask
      ? parentTask.childTaskIds.map(id => this.taskManager.getTask(id)).filter((t): t is Task => t !== undefined)
      : [];

    this.agentLogger.info('Calling LLM to decide task decomposition', {
      taskId: task.id,
      title: task.title,
      depth: currentDepth,
      hasParent: !!parentTask,
      siblingCount: siblingTasks.length
    });

    // Build context about task hierarchy
    let hierarchyContext = '';
    if (parentTask) {
      hierarchyContext = `\n\nTASK HIERARCHY CONTEXT:
Parent Task: "${parentTask.title}"
This is sub-task ${siblingTasks.findIndex(t => t.id === task.id) + 1} of ${siblingTasks.length}
Other sub-tasks: ${siblingTasks.filter(t => t.id !== task.id).map(t => `"${t.title}" (${t.status})`).join(', ')}

IMPORTANT: This task has already been decomposed from a parent task. You should EXECUTE it, not decompose it further unless absolutely necessary.`;
    }

    // Use LLM to decide
    const response = await this.llmProvider.complete({
      model: this.getModel(),
      messages: [
        {
          role: 'system',
          content: `You are deciding whether a task should be executed directly or decomposed further.

BIAS TOWARD EXECUTION:
- Most tasks should be EXECUTED directly with tools
- Research tasks → EXECUTE (use browser, search, analyze)
- Data gathering → EXECUTE (navigate, extract, compile)
- Analysis tasks → EXECUTE (process information, generate insights)

ONLY decompose if:
- Task requires fundamentally different skill sets or domains
- Task spans multiple days/weeks of work
- Task has clear, independent phases (like "build a product" → design, develop, test, deploy)

NEVER decompose:
- Tasks that are already sub-tasks (check hierarchy context)
- Research or information gathering tasks
- Tasks that can be done with <20 tool calls

Respond with ONLY "decompose" or "execute".`,
        },
        {
          role: 'user',
          content: `Task: "${task.title}"
Description: "${task.description}"
Current depth: ${currentDepth} of max ${this.maxDepth}${hierarchyContext}

Should this task be decomposed into sub-tasks, or executed directly?`,
        },
      ],
      temperature: 0.2, // Lower temperature for more consistent decisions
      maxTokens: 10,
    });

    const decision = response.message.content.trim().toLowerCase();
    const willDecompose = decision.includes('decompose');

    this.agentLogger.info('LLM decomposition decision', {
      taskId: task.id,
      decision,
      willDecompose,
      depth: currentDepth,
      isSubTask: !!parentTask
    });

    return willDecompose;
  }

  /**
   * Resume a previously decomposed task by checking sub-task status
   */
  private async resumeDecomposedTask(task: Task, depth: number): Promise<void> {
    this.agentLogger.info('Analyzing sub-task status', {
      taskId: task.id,
      title: task.title,
      subTaskCount: task.childTaskIds.length
    });

    // Get all sub-tasks
    const subTasks = task.childTaskIds
      .map(id => this.taskManager.getTask(id))
      .filter((t): t is Task => t !== undefined);

    // Count sub-tasks by status
    const statusCounts = {
      open: subTasks.filter(t => t.status === 'open').length,
      in_progress: subTasks.filter(t => t.status === 'in_progress').length,
      completed: subTasks.filter(t => t.status === 'completed').length,
      failed: subTasks.filter(t => t.status === 'failed').length,
      blocked: subTasks.filter(t => t.status === 'blocked').length,
    };

    this.agentLogger.info('Sub-task status summary', {
      taskId: task.id,
      total: subTasks.length,
      ...statusCounts
    });

    // Record resumption plan
    await this.sessionManager.recordAction(
      this.sessionId,
      this.id,
      'agent_message',
      `Resuming "${task.title}": ${statusCounts.completed}/${subTasks.length} sub-tasks completed`,
      {
        reasoning: `Checking status of existing sub-tasks. Will resume from incomplete tasks.`,
        metadata: {
          taskId: task.id,
          depth,
          subTaskSummary: statusCounts,
          subTasks: subTasks.map(st => ({
            id: st.id,
            title: st.title,
            status: st.status,
            priority: st.priority
          }))
        }
      },
      task.id
    );

    // If all sub-tasks are completed, parent task is done
    if (statusCounts.completed === subTasks.length) {
      this.agentLogger.info('All sub-tasks already completed', { taskId: task.id });
      return;
    }

    // Execute incomplete sub-tasks (open, failed, blocked, or in_progress)
    const incompleteSubTasks = subTasks.filter(
      t => t.status !== 'completed'
    );

    this.agentLogger.info('Resuming incomplete sub-tasks', {
      taskId: task.id,
      incompleteCount: incompleteSubTasks.length
    });

    for (const subTask of incompleteSubTasks) {
      this.agentLogger.info('Resuming sub-task', {
        subTaskId: subTask.id,
        title: subTask.title,
        status: subTask.status
      });

      await this.sessionManager.recordAction(
        this.sessionId,
        this.id,
        'agent_message',
        `Resuming sub-task: "${subTask.title}" (status: ${subTask.status})`,
        {
          reasoning: `This sub-task was not completed. Resuming work.`,
          metadata: { taskId: task.id, subTaskId: subTask.id, previousStatus: subTask.status }
        },
        task.id
      );

      await this.workOnTask(subTask.id, depth + 1);
    }
  }

  /**
   * Decompose a task and execute sub-tasks
   */
  private async decomposeAndExecuteTask(task: Task, depth: number): Promise<void> {
    this.agentLogger.info('Asking LLM to decompose task', { task: task.title });

    // Use LLM to create decomposition plan
    const response = await this.llmProvider.complete({
      model: this.getModel(),
      messages: [
        {
          role: 'system',
          content: `You are an expert strategic planner. Break down complex tasks into 3-7 concrete, actionable sub-tasks.
Each sub-task should be specific and measurable.

IMPORTANT: Do NOT include "id" fields in sub-tasks. IDs will be generated automatically.

Respond ONLY with valid JSON in this exact format:
{
  "reasoning": "Why and how this breakdown helps achieve the task",
  "subTasks": [
    {
      "title": "Sub-task title",
      "description": "What needs to be accomplished",
      "priority": "high|medium|low",
      "estimatedSteps": 5
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Task: "${task.title}"
Description: "${task.description}"

Break this down into actionable sub-tasks.`,
        },
      ],
      temperature: 0.7,
    });

    // Parse decomposition
    let jsonContent = response.message.content.trim();
    const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }

    const parsed = JSON.parse(jsonContent);

    // Sanitize subTasks to remove any IDs the LLM might have added
    const sanitizedSubTasks = parsed.subTasks.map((st: any) => ({
      title: st.title,
      description: st.description,
      priority: st.priority,
      estimatedSteps: st.estimatedSteps,
      dependencies: st.dependencies,
    }));

    const decomposition: TaskDecomposition = {
      taskId: task.id,
      reasoning: parsed.reasoning,
      subTasks: sanitizedSubTasks,
    };

    this.agentLogger.info('Task decomposed', {
      taskId: task.id,
      subTaskCount: decomposition.subTasks.length,
      reasoning: decomposition.reasoning,
    });

    // Record decomposition plan
    await this.sessionManager.recordAction(
      this.sessionId,
      this.id,
      'agent_message',
      `Planning: Breaking down "${task.title}" into ${decomposition.subTasks.length} sub-tasks`,
      {
        reasoning: decomposition.reasoning,
        metadata: {
          taskId: task.id,
          subTasks: decomposition.subTasks.map(st => ({ title: st.title, priority: st.priority }))
        }
      },
      task.id
    );

    // Create sub-tasks
    const subTasks = await this.taskManager.decomposeTask(decomposition);

    this.agentLogger.info('Executing sub-tasks', {
      parentTaskId: task.id,
      subTaskIds: subTasks.map(st => st.id),
      depth: depth + 1,
    });

    // Execute sub-tasks sequentially
    for (const subTask of subTasks) {
      this.agentLogger.debug('Starting work on sub-task', {
        subTaskId: subTask.id,
        title: subTask.title,
      });
      await this.workOnTask(subTask.id, depth + 1);
    }
  }

  /**
   * Execute a simple task directly (no decomposition)
   */
  private async executeSimpleTask(task: Task): Promise<void> {
    // Get available tools
    const tools: any[] = [];
    this.mcpServers.forEach((server) => {
      const serverTools = server.getTools();
      serverTools.forEach((tool) => {
        tools.push({
          name: `${server.name}.${tool.name}`,
          description: tool.description,
          parameters: tool.inputSchema,
        });
      });
    });

    const maxSteps = 100;
    let currentStep = 0;

    // Track conversation using standard message format (compatible with Agent File)
    const conversation: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool';
      content: string;
      name?: string;
      tool_call_id?: string;
    }> = [];

    // Add initial system message with task context
    conversation.push({
      role: 'system',
      content: `You are working on: "${task.title}"\nDescription: ${task.description}\n\nCOMPLETE this task by using tools and producing concrete results.`
    });

    while (currentStep < maxSteps) {
      currentStep++;

      // Plan next action with conversation history
      const action = await this.planNextAction(task, tools, currentStep, conversation);

      // Record the planning decision
      await this.sessionManager.recordAction(
        this.sessionId,
        this.id,
        'agent_message',
        `Step ${currentStep}: ${action.action}`,
        {
          reasoning: action.reasoning,
          metadata: {
            taskId: task.id,
            step: currentStep,
            tool: action.tool,
            complete: action.complete
          }
        },
        task.id
      );

      if (action.complete) {
        // Add final assistant message
        conversation.push({
          role: 'assistant',
          content: `[Step ${currentStep}] COMPLETE\nReasoning: ${action.reasoning}\nAction: ${action.action}`
        });
        this.agentLogger.info('Task execution complete', { taskId: task.id });
        return;
      }

      if (action.tool && action.params) {
        const toolCallId = `call_${currentStep}`;

        // OpenAI requires function names to match ^[a-zA-Z0-9_-]+$
        // Replace dots with underscores for OpenAI compatibility
        const sanitizedToolName = action.tool.replace(/\./g, '_');

        // Add assistant message with tool_calls (OpenAI format requirement)
        // Note: content should be null when tool_calls is present to avoid confusing the LLM
        conversation.push({
          role: 'assistant',
          content: null,
          tool_calls: [{
            id: toolCallId,
            type: 'function',
            function: {
              name: sanitizedToolName,
              arguments: JSON.stringify(action.params)
            }
          }]
        } as any);

        // Execute tool and capture result
        const result = await this.executeTool(action.tool, action.params, task.id);

        // Format tool result for conversation
        let resultContent = '';
        if (result?.success) {
          if (result.data) {
            // Include important fields but truncate large content
            if (result.data.url) resultContent += `URL: ${result.data.url}\n`;
            if (result.data.title) resultContent += `Title: ${result.data.title}\n`;
            if (result.data.content) {
              resultContent += `Content Preview:\n${result.data.content.substring(0, 1000)}...\n`;
            }
            if (result.data.screenshot) {
              resultContent += `[Screenshot captured and available]\n`;
            }
            // Add any other data
            const otherData = { ...result.data };
            delete otherData.url;
            delete otherData.title;
            delete otherData.content;
            delete otherData.screenshot;
            if (Object.keys(otherData).length > 0) {
              resultContent += `Additional data: ${JSON.stringify(otherData, null, 2).substring(0, 500)}`;
            }
          } else {
            resultContent = `Success: ${JSON.stringify(result, null, 2).substring(0, 500)}`;
          }
        } else {
          resultContent = `ERROR: ${result?.error || 'Tool execution failed'}`;
        }

        // Add tool result to conversation (must follow assistant message with tool_calls)
        conversation.push({
          role: 'tool',
          content: resultContent,
          name: sanitizedToolName,
          tool_call_id: toolCallId
        });

        this.agentLogger.info('Tool result added to conversation', {
          tool: action.tool,
          success: result?.success,
          resultLength: resultContent.length
        });
      } else {
        // No tool call, just add assistant message with reasoning
        conversation.push({
          role: 'assistant',
          content: `[Step ${currentStep}]\nReasoning: ${action.reasoning}\nAction: ${action.action}`
        });
      }
    }

    throw new Error(`Task execution exceeded maximum steps (${maxSteps})`);
  }

  /**
   * Plan next action using LLM with conversation history
   */
  private async planNextAction(
    task: Task,
    tools: any[],
    step: number,
    conversation: Array<{
      role: 'system' | 'user' | 'assistant' | 'tool';
      content: string;
      name?: string;
      tool_call_id?: string;
    }> = []
  ): Promise<{
    action: string;
    reasoning: string;
    complete: boolean;
    tool?: string;
    params?: any;
  }> {
    // Get parent task context if exists
    const parentTask = task.parentTaskId ? this.taskManager.getTask(task.parentTaskId) : null;
    const contextInfo = parentTask
      ? `\n\nCONTEXT: This is a sub-task of "${parentTask.title}". Focus on completing YOUR specific part.`
      : '';

    const systemPrompt = `You are executing a task. Your goal is to COMPLETE it, not just take random actions.

Available tools:
${tools.map((t) => {
  const params = t.parameters?.properties
    ? Object.entries(t.parameters.properties).map(([key, val]: [string, any]) =>
        `${key} (${val.type || 'string'}): ${val.description || ''}`
      ).join(', ')
    : 'no parameters';
  const required = t.parameters?.required ? ` [Required: ${t.parameters.required.join(', ')}]` : '';
  return `- ${t.name}: ${t.description}\n  Parameters: ${params}${required}`;
}).join('\n\n')}

CRITICAL EXECUTION RULES:

1. PURPOSEFUL TOOL USE
   - When you use browser.navigate_to, the result contains page content and screenshots
   - ANALYZE the results immediately - extract specific information, quotes, data
   - Don't navigate to multiple pages without processing each one first
   - Example: "Navigate to scholar.google.com" → "Found 3 relevant papers: [list them with details]"

2. PROGRESS TOWARD COMPLETION
   - Each action must move you closer to task completion
   - Keep track of what you've learned/gathered
   - When you have enough information or have completed the work, mark complete: true

3. TASK COMPLETION
   - Research task → Gather specific findings, then complete
   - Creation task → Create the artifact, then complete
   - Analysis task → Perform analysis, state conclusions, then complete
   - Don't take 50 steps if 5 will do

4. OUTPUT QUALITY
   - When marking complete, your final action should summarize what you accomplished
   - Be specific: "Found X papers on Y topic with key findings..." not just "Research complete"

RESPONSE FORMAT (JSON only):
{
  "action": "Clear description of what you're doing",
  "reasoning": "How this helps complete the task",
  "complete": false,
  "tool": "server.tool_name",
  "params": { "all": "required parameters" }
}

Mark complete: true when you've achieved the task objective.`;

    // Build messages array with full conversation history
    const messages = [
      { role: 'system' as const, content: systemPrompt },
      ...conversation,
      {
        role: 'user' as const,
        content: `TASK: "${task.title}"
Description: "${task.description}"
Current step: ${step}/100${contextInfo}

What's your next action to COMPLETE this task? Respond with JSON only.`,
      },
    ];

    const response = await this.llmProvider.complete({
      model: this.getModel(),
      messages,
      temperature: 0.7,
      responseFormat: 'json',
    });

    // Parse JSON with better error handling
    let jsonContent = response.message.content.trim();

    // Try to extract JSON from markdown code blocks
    const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1].trim();
    }

    // Try to extract JSON object from text
    const objectMatch = jsonContent.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      jsonContent = objectMatch[0];
    }

    try {
      return JSON.parse(jsonContent);
    } catch (error) {
      this.agentLogger.error('Failed to parse LLM response as JSON', {
        error: error instanceof Error ? error.message : String(error),
        response: jsonContent.substring(0, 200),
      });

      // Return a default action to continue
      return {
        action: 'Unable to plan next action',
        reasoning: 'LLM response was not valid JSON',
        complete: false,
      };
    }
  }

  /**
   * Execute a tool
   */
  private async executeTool(
    toolName: string,
    params: any,
    taskId: string
  ): Promise<any> {
    const [serverName, method] = toolName.split('.');
    const server = this.mcpServers.get(serverName);

    if (!server) {
      throw new Error(`MCP server ${serverName} not found`);
    }

    this.agentLogger.debug('Executing tool', { toolName, params });

    // Record action
    const action2 = await this.sessionManager.recordAction(
      this.sessionId,
      this.id,
      'tool_invoked',
      `Using ${toolName}`,
      { tool: toolName, params },
      taskId
    );
    const actionId = action2.id;

    try {
      const result = await server.invokeTool(method, params);

      // Log screenshot data if present (for debugging)
      if (result.data?.screenshot) {
        this.agentLogger.info('Tool result includes screenshot', {
          toolName,
          hasBase64: !!result.data.screenshot.base64,
          base64Length: result.data.screenshot.base64?.length,
          screenshotUrl: result.data.screenshot.url
        });
      }

      await this.sessionManager.completeAction(actionId, 'completed', result);

      this.agentLogger.debug('Tool executed successfully', { toolName, result: { success: result.success } });
      return result;
    } catch (error: any) {
      await this.sessionManager.completeAction(actionId, 'failed', undefined, {
        message: error.message,
      });
      throw error;
    }
  }

  private buildSystemPrompt(): string {
    return `You are an autonomous AI agent. Your PRIMARY JOB is to EXECUTE and COMPLETE tasks, not just plan them.

CRITICAL GUIDELINES:

1. EXECUTION FIRST
   - Your role is to DO the work, not just decompose it
   - Use tools actively to accomplish tasks
   - When you use a tool (like browser.navigate_to), USE the results to complete your task
   - Don't just visit a page and move on - extract information, analyze it, and use it

2. TASK DECOMPOSITION (Use Sparingly)
   - ONLY decompose when a task is genuinely complex and multi-faceted
   - Simple tasks like "research X" or "find information about Y" should be EXECUTED directly
   - DO NOT decompose tasks that can be done in 5-10 tool calls
   - If you've already decomposed a task, DO NOT decompose it again

3. TOOL USAGE
   - When you call a tool, you MUST use its results
   - browser.navigate_to returns page content and screenshots - READ THEM and extract information
   - Don't navigate to multiple pages without processing each one
   - Be deliberate: navigate → extract → analyze → use the information

4. COMPLETION FOCUS
   - Your goal is to complete the task assigned to you
   - Produce concrete outputs (summaries, reports, findings)
   - Don't just say "I visited the page" - say "I found that X, Y, and Z..."
   - Mark tasks complete when you've delivered value

5. CONTEXT AWARENESS
   - You may be working on a sub-task of a larger task hierarchy
   - Focus on completing YOUR specific task
   - Don't worry about the parent task - just do your part well

Remember: You are an EXECUTOR with agency. Take action, use tools meaningfully, and deliver results.`;
  }

  // Agent interface methods
  async sendMessage(message: A2AMessage): Promise<void> {
    this.agentLogger.debug('Received message', { message });
  }

  async executeTask(_: any): Promise<any> {
    // Could be used for direct task execution if needed
    return { status: 'completed' };
  }

  getState(): AgentState {
    return {
      status: this.status,
      currentTask: undefined, // Could map currentTaskId to a Task if needed
      memory: this.metadata,
    };
  }

  subscribe(handler: MessageHandler): Unsubscribe {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  // ===== Memory Operations =====

  /**
   * Save a plan to memory
   */
  async savePlan(title: string, content: string, taskId?: string): Promise<void> {
    await this.memoryManager.savePlan(this.id, this.sessionId, title, content, {
      importance: 'high',
      relatedTaskId: taskId || this.currentTaskId,
    });
    this.agentLogger.debug('Saved plan to memory', { title });
  }

  /**
   * Save a thought/reasoning to memory
   */
  async saveThought(title: string, content: string, taskId?: string): Promise<void> {
    await this.memoryManager.saveThought(this.id, this.sessionId, title, content, {
      importance: 'medium',
      relatedTaskId: taskId || this.currentTaskId,
    });
    this.agentLogger.debug('Saved thought to memory', { title });
  }

  /**
   * Save a learning to memory
   */
  async saveLearning(title: string, content: string, tags?: string[]): Promise<void> {
    await this.memoryManager.saveLearning(this.id, this.sessionId, title, content, {
      importance: 'high',
      tags,
    });
    this.agentLogger.info('Saved learning to memory', { title });
  }

  /**
   * Save context information to memory
   */
  async saveContext(title: string, content: string, taskId?: string, expiresAt?: Date): Promise<void> {
    await this.memoryManager.saveContext(this.id, this.sessionId, title, content, {
      importance: 'medium',
      relatedTaskId: taskId || this.currentTaskId,
      expiresAt,
    });
    this.agentLogger.debug('Saved context to memory', { title });
  }

  /**
   * Save a checkpoint (state snapshot) to memory
   */
  async saveCheckpoint(title: string, stateData: Record<string, unknown>): Promise<void> {
    await this.memoryManager.saveCheckpoint(this.id, this.sessionId, title, JSON.stringify(stateData, null, 2), {
      relatedTaskId: this.currentTaskId,
      metadata: { timestamp: new Date().toISOString() },
    });
    this.agentLogger.info('Saved checkpoint to memory', { title });
  }

  /**
   * Save an observation to memory
   */
  async saveObservation(title: string, content: string, tags?: string[]): Promise<void> {
    await this.memoryManager.saveObservation(this.id, this.sessionId, title, content, {
      importance: 'low',
      relatedTaskId: this.currentTaskId,
      tags,
    });
    this.agentLogger.debug('Saved observation to memory', { title });
  }

  /**
   * Get memory snapshot
   */
  async getMemorySnapshot() {
    return this.memoryManager.getAgentSnapshot(this.id, this.sessionId);
  }

  /**
   * Search memories
   */
  async searchMemories(searchTerm: string, limit?: number) {
    return this.memoryManager.searchMemories(this.id, searchTerm, limit);
  }

  /**
   * Get recent memories
   */
  async getRecentMemories(limit: number = 10) {
    return this.memoryManager.getRecentMemories(this.id, limit);
  }

  /**
   * Get memories by type
   */
  async getMemoriesByType(type: 'plan' | 'thought' | 'learning' | 'context' | 'checkpoint' | 'observation', limit?: number) {
    return this.memoryManager.getMemoriesByType(this.id, type, limit);
  }

  /**
   * Get full agent configuration for UI display
   */
  getConfiguration() {
    const tools: any[] = [];
    this.mcpServers.forEach((server) => {
      const serverTools = server.getTools();
      serverTools.forEach((tool) => {
        tools.push({
          server: server.name,
          name: tool.name,
          description: tool.description,
          parameters: tool.inputSchema,
        });
      });
    });

    return {
      id: this.id,
      name: this.name,
      type: this.type,
      status: this.status,
      sessionId: this.sessionId,
      rootTaskId: this.rootTaskId,
      currentTaskId: this.currentTaskId,
      maxDepth: this.maxDepth,
      llm: {
        provider: this.llmProvider.name,
        model: this.getModel(),
      },
      mcpServers: Array.from(this.mcpServers.keys()),
      tools: tools,
      metadata: this.metadata,
      config: this.config,
    };
  }
}