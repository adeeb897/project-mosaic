/**
 * Goal-Oriented Agent - Enhanced autonomous agent with goal decomposition
 *
 * This agent can:
 * - Accept extremely high-level goals like "address climate change"
 * - Break them down into manageable sub-goals
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
  Goal,
  GoalDecomposition,
} from '@mosaic/shared';
import { EventBus } from '../core/event-bus';
import { logger } from '../core/logger';
import { v4 as uuid, v4 as uuidv4 } from 'uuid';
import { GoalManager } from '../services/goal/goal-manager.service';
import { SessionManager } from '../services/session/session-manager.service';
import { getMemoryManager } from '../services/memory/memory-manager.service';
import { MemoryManagerService } from '../services/memory/memory-manager.service';

interface GoalOrientedAgentOptions {
  id?: string;
  name: string;
  rootGoal?: string; // The highest-level goal (optional)
  llmProvider: LLMProviderPlugin;
  mcpServers: MCPServerPlugin[];
  eventBus: EventBus;
  goalManager: GoalManager;
  sessionManager: SessionManager;
  sessionId: string;
  maxDepth?: number; // Maximum goal decomposition depth
}

export class GoalOrientedAgent implements Agent {
  id: string;
  name: string;
  type = 'goal-oriented';
  status: AgentStatus = 'idle';
  config: AgentConfig;
  metadata: Record<string, any> = {};

  private rootGoalId?: string;
  private currentGoalId?: string;
  private llmProvider: LLMProviderPlugin;
  private mcpServers: Map<string, MCPServerPlugin> = new Map();
  private eventBus: EventBus;
  private goalManager: GoalManager;
  private sessionManager: SessionManager;
  private memoryManager: MemoryManagerService;
  private sessionId: string;
  private messageHandlers: Set<MessageHandler> = new Set();
  private agentLogger: ReturnType<typeof logger.child>;
  private maxDepth: number;

  constructor(options: GoalOrientedAgentOptions) {
    this.id = options.id || uuid();
    this.name = options.name;
    this.llmProvider = options.llmProvider;
    this.eventBus = options.eventBus;
    this.goalManager = options.goalManager;
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
    this.metadata.rootGoal = options.rootGoal;
  }

  async start(): Promise<void> {
    if (this.status === 'running') {
      throw new Error('Agent is already running');
    }

    if (!this.metadata.rootGoal) {
      throw new Error('Cannot start agent without a root goal. Please set a goal first.');
    }

    this.status = 'running';
    this.agentLogger.info('Agent starting', { goal: this.metadata.rootGoal });

    await this.eventBus.publish('agent.started', {
      id: uuidv4(),
      type: 'agent.started',
      source: this.id,
      timestamp: new Date().toISOString(),
      data: {
        name: this.name,
        goal: this.metadata.rootGoal,
      },
    });

    // Create root goal
    const rootGoal = await this.goalManager.createGoal({
      title: this.metadata.rootGoal,
      description: `High-level goal assigned to ${this.name}`,
      priority: 'high',
      createdBy: this.id,
      assignedTo: this.id,
      metadata: { sessionId: this.sessionId },
    });

    this.rootGoalId = rootGoal.id;
    this.agentLogger.info('Root goal created', { goalId: rootGoal.id });

    // Start working on the goal
    await this.workOnGoal(rootGoal.id);
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
   * Main work loop for a goal
   */
  private async workOnGoal(goalId: string, depth: number = 0): Promise<void> {
    // Always fetch goal from manager to ensure we have the latest state
    const goal = this.goalManager.getGoal(goalId);
    if (!goal) {
      this.agentLogger.error('Goal not found', { goalId });
      throw new Error(`Goal ${goalId} not found`);
    }

    this.currentGoalId = goalId;
    this.agentLogger.info('Working on goal', {
      goalId: goal.id,
      title: goal.title,
      depth,
    });

    // Update goal status
    await this.goalManager.updateGoal({
      goalId: goal.id,
      status: 'in_progress',
    });

    // Record action
    const action = await this.sessionManager.recordAction(
      this.sessionId,
      this.id,
      'goal_started',
      `Started working on: ${goal.title}`,
      {
        metadata: { goalTitle: goal.title, goalId: goal.id, depth },
      },
      goal.id
    );
    const actionId = action.id;

    try {
      // Determine if goal should be decomposed or executed directly
      const shouldDecompose = await this.shouldDecomposeGoal(goal, depth);

      // Record decision
      await this.sessionManager.recordAction(
        this.sessionId,
        this.id,
        'agent_message',
        shouldDecompose
          ? `Analyzing: "${goal.title}" - This goal is complex and needs to be broken down into sub-goals`
          : `Analyzing: "${goal.title}" - This goal is simple enough to execute directly`,
        {
          reasoning: shouldDecompose
            ? `Goal requires decomposition (depth: ${depth}, max: ${this.maxDepth})`
            : `Goal can be executed as a single task`,
          metadata: { goalId: goal.id, depth, shouldDecompose }
        },
        goal.id
      );

      if (shouldDecompose && depth < this.maxDepth) {
        // Decompose into sub-goals
        this.agentLogger.info('Decomposing goal', { goalId: goal.id, title: goal.title });
        await this.decomposeAndExecuteGoal(goal, depth);
      } else {
        // Execute directly as a simple task
        this.agentLogger.info('Executing goal directly', {
          goalId: goal.id,
          title: goal.title,
        });
        await this.executeSimpleGoal(goal);
      }

      // Mark goal as completed
      await this.goalManager.updateGoal({
        goalId: goal.id,
        status: 'completed',
      });

      await this.sessionManager.completeAction(actionId, 'completed');

      this.agentLogger.info('Goal completed', { goalId: goal.id, title: goal.title });
    } catch (error: any) {
      this.agentLogger.error('Goal failed', {
        goalId: goal.id,
        title: goal.title,
        error: error.message,
      });

      await this.goalManager.updateGoal({
        goalId: goal.id,
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
   * Decide if a goal should be decomposed
   */
  private async shouldDecomposeGoal(goal: Goal, currentDepth: number): Promise<boolean> {
    // Simple goals or max depth reached - don't decompose
    if (currentDepth >= this.maxDepth) {
      return false;
    }

    // Use LLM to decide
    const response = await this.llmProvider.complete({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert at breaking down complex goals into manageable tasks.
Your job is to determine if a goal is simple enough to execute directly, or if it should be broken down into smaller sub-goals.

Simple goals can be accomplished with a few direct actions (e.g., "write a file", "search for information").
Complex goals require multiple steps, coordination, or long-term planning (e.g., "address climate change", "build a business").

Respond with ONLY "decompose" or "execute".`,
        },
        {
          role: 'user',
          content: `Goal: "${goal.title}"
Description: "${goal.description}"
Current depth: ${currentDepth}

Should this goal be decomposed into sub-goals, or executed directly?`,
        },
      ],
      temperature: 0.3,
      maxTokens: 10,
    });

    const decision = response.message.content.trim().toLowerCase();
    return decision.includes('decompose');
  }

  /**
   * Decompose a goal and execute sub-goals
   */
  private async decomposeAndExecuteGoal(goal: Goal, depth: number): Promise<void> {
    this.agentLogger.info('Asking LLM to decompose goal', { goal: goal.title });

    // Use LLM to create decomposition plan
    const response = await this.llmProvider.complete({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an expert strategic planner. Break down complex goals into 3-7 concrete, actionable sub-goals.
Each sub-goal should be specific and measurable.

IMPORTANT: Do NOT include "id" fields in sub-goals. IDs will be generated automatically.

Respond ONLY with valid JSON in this exact format:
{
  "reasoning": "Why and how this breakdown helps achieve the goal",
  "subGoals": [
    {
      "title": "Sub-goal title",
      "description": "What needs to be accomplished",
      "priority": "high|medium|low",
      "estimatedSteps": 5
    }
  ]
}`,
        },
        {
          role: 'user',
          content: `Goal: "${goal.title}"
Description: "${goal.description}"

Break this down into actionable sub-goals.`,
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

    // Sanitize subGoals to remove any IDs the LLM might have added
    const sanitizedSubGoals = parsed.subGoals.map((sg: any) => ({
      title: sg.title,
      description: sg.description,
      priority: sg.priority,
      estimatedSteps: sg.estimatedSteps,
      dependencies: sg.dependencies,
    }));

    const decomposition: GoalDecomposition = {
      goalId: goal.id,
      reasoning: parsed.reasoning,
      subGoals: sanitizedSubGoals,
    };

    this.agentLogger.info('Goal decomposed', {
      goalId: goal.id,
      subGoalCount: decomposition.subGoals.length,
      reasoning: decomposition.reasoning,
    });

    // Record decomposition plan
    await this.sessionManager.recordAction(
      this.sessionId,
      this.id,
      'agent_message',
      `Planning: Breaking down "${goal.title}" into ${decomposition.subGoals.length} sub-goals`,
      {
        reasoning: decomposition.reasoning,
        metadata: {
          goalId: goal.id,
          subGoals: decomposition.subGoals.map(sg => ({ title: sg.title, priority: sg.priority }))
        }
      },
      goal.id
    );

    // Create sub-goals
    const subGoals = await this.goalManager.decomposeGoal(decomposition);

    this.agentLogger.info('Executing sub-goals', {
      parentGoalId: goal.id,
      subGoalIds: subGoals.map(sg => sg.id),
      depth: depth + 1,
    });

    // Execute sub-goals sequentially
    for (const subGoal of subGoals) {
      this.agentLogger.debug('Starting work on sub-goal', {
        subGoalId: subGoal.id,
        title: subGoal.title,
      });
      await this.workOnGoal(subGoal.id, depth + 1);
    }
  }

  /**
   * Execute a simple goal directly (no decomposition)
   */
  private async executeSimpleGoal(goal: Goal): Promise<void> {
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

    const maxSteps = 10;
    let currentStep = 0;

    while (currentStep < maxSteps) {
      currentStep++;

      // Plan next action
      const action = await this.planNextAction(goal, tools, currentStep);

      // Record the planning decision
      await this.sessionManager.recordAction(
        this.sessionId,
        this.id,
        'agent_message',
        `Step ${currentStep}: ${action.action}`,
        {
          reasoning: action.reasoning,
          metadata: {
            goalId: goal.id,
            step: currentStep,
            tool: action.tool,
            complete: action.complete
          }
        },
        goal.id
      );

      if (action.complete) {
        this.agentLogger.info('Goal execution complete', { goalId: goal.id });
        return;
      }

      if (action.tool && action.params) {
        // Execute tool
        await this.executeTool(action.tool, action.params, goal.id);
      }
    }

    throw new Error(`Goal execution exceeded maximum steps (${maxSteps})`);
  }

  /**
   * Plan next action using LLM
   */
  private async planNextAction(
    goal: Goal,
    tools: any[],
    step: number
  ): Promise<{
    action: string;
    reasoning: string;
    complete: boolean;
    tool?: string;
    params?: any;
  }> {
    const systemPrompt = `You are a goal-oriented AI assistant. Plan the next action to accomplish the goal.

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

IMPORTANT: You MUST respond with ONLY valid JSON. No explanations, no markdown, no additional text.
CRITICAL: When using tools, you MUST provide ALL required parameters with valid values.

Response format:
{
  "action": "What you're doing",
  "reasoning": "Why this helps achieve the goal",
  "complete": false,
  "tool": "server.tool_name",
  "params": { "param_name": "param_value" }
}

Example for write_file:
{
  "action": "Writing story to file",
  "reasoning": "Need to save the story content",
  "complete": false,
  "tool": "filesystem.write_file",
  "params": { "path": "story.txt", "content": "Once upon a time..." }
}

If the goal is complete, set "complete": true and omit tool/params.`;

    const response = await this.llmProvider.complete({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Goal: "${goal.title}"
Description: "${goal.description}"
Current step: ${step}

What should I do next? Respond with JSON only.`,
        },
      ],
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
    goalId: string
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
      goalId
    );
    const actionId = action2.id;

    try {
      const result = await server.invokeTool(method, params);

      await this.sessionManager.completeAction(actionId, 'completed', result);

      this.agentLogger.debug('Tool executed successfully', { toolName, result });
      return result;
    } catch (error: any) {
      await this.sessionManager.completeAction(actionId, 'failed', undefined, {
        message: error.message,
      });
      throw error;
    }
  }

  private buildSystemPrompt(): string {
    return `You are an autonomous AI agent specialized in breaking down and accomplishing complex goals.
You can decompose high-level objectives into manageable sub-goals and execute them systematically.`;
  }

  // Agent interface methods
  async sendMessage(message: A2AMessage): Promise<void> {
    this.agentLogger.debug('Received message', { message });
  }

  async executeTask(task: any): Promise<any> {
    // Could be used for direct task execution if needed
    return { status: 'completed' };
  }

  getState(): AgentState {
    return {
      status: this.status,
      currentTask: undefined, // Could map currentGoalId to a Task if needed
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
  async savePlan(title: string, content: string, goalId?: string): Promise<void> {
    await this.memoryManager.savePlan(this.id, this.sessionId, title, content, {
      importance: 'high',
      relatedGoalId: goalId || this.currentGoalId,
    });
    this.agentLogger.debug('Saved plan to memory', { title });
  }

  /**
   * Save a thought/reasoning to memory
   */
  async saveThought(title: string, content: string, goalId?: string): Promise<void> {
    await this.memoryManager.saveThought(this.id, this.sessionId, title, content, {
      importance: 'medium',
      relatedGoalId: goalId || this.currentGoalId,
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
  async saveContext(title: string, content: string, goalId?: string, expiresAt?: Date): Promise<void> {
    await this.memoryManager.saveContext(this.id, this.sessionId, title, content, {
      importance: 'medium',
      relatedGoalId: goalId || this.currentGoalId,
      expiresAt,
    });
    this.agentLogger.debug('Saved context to memory', { title });
  }

  /**
   * Save a checkpoint (state snapshot) to memory
   */
  async saveCheckpoint(title: string, stateData: Record<string, unknown>): Promise<void> {
    await this.memoryManager.saveCheckpoint(this.id, this.sessionId, title, JSON.stringify(stateData, null, 2), {
      relatedGoalId: this.currentGoalId,
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
      relatedGoalId: this.currentGoalId,
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
      rootGoalId: this.rootGoalId,
      currentGoalId: this.currentGoalId,
      maxDepth: this.maxDepth,
      llm: {
        provider: this.llmProvider.name,
        model: process.env.OPENAI_MODEL || 'gpt-4',
      },
      mcpServers: Array.from(this.mcpServers.keys()),
      tools: tools,
      metadata: this.metadata,
      config: this.config,
    };
  }
}