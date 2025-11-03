/**
 * Agent Manager - User-friendly interface for managing agents
 *
 * Provides simple methods for non-technical users to:
 * - Create agents with natural language tasks
 * - Monitor agent progress
 * - View agent results
 */
import { Agent, LLMProviderPlugin, MCPServerPlugin } from '@mosaic/shared';
import { EventBus } from '../core/event-bus';
import { AutonomousAgent } from './autonomous-agent';
import { logger } from '../core/logger';

export interface CreateAgentRequest {
  name: string;
  task?: string; // Simple, high-level task in natural language
  maxSteps?: number;
}

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private llmProvider: LLMProviderPlugin;
  private mcpServers: MCPServerPlugin[];
  private eventBus: EventBus;

  constructor(
    llmProvider: LLMProviderPlugin,
    mcpServers: MCPServerPlugin[],
    eventBus: EventBus
  ) {
    this.llmProvider = llmProvider;
    this.mcpServers = mcpServers;
    this.eventBus = eventBus;
  }

  /**
   * Create an agent with a simple natural language task
   *
   * Example:
   *   createAgent({
   *     name: "ResearchAgent",
   *     task: "Research the latest news about AI and save it to a file"
   *   })
   *   })
   */
  async createAgent(request: CreateAgentRequest): Promise<Agent> {
    logger.info('Creating agent', { name: request.name, task: request.task });

    const agent = new AutonomousAgent({
      name: request.name,
      task: request.task,
      llmProvider: this.llmProvider,
      mcpServers: this.mcpServers,
      eventBus: this.eventBus,
      maxSteps: request.maxSteps,
    });

    this.agents.set(agent.id, agent);

    logger.info('Agent created', { id: agent.id, name: agent.name });

    return agent;
  }

  /**
   * Get an agent by ID
   */
  getAgent(id: string): Agent | undefined {
    return this.agents.get(id);
  }

  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Array.from(this.agents.values());
  }

  /**
   * Start an agent's autonomous execution
   */
  async startAgent(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    await agent.start();
  }

  /**
   * Stop an agent
   */
  async stopAgent(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    await agent.stop();
  }

  /**
   * Delete an agent
   */
  async deleteAgent(id: string): Promise<void> {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent ${id} not found`);
    }

    await agent.stop();
    this.agents.delete(id);

    logger.info('Agent deleted', { id });
  }

  /**
   * Get agent progress in simple terms
   */
  getAgentProgress(id: string): {
    name: string;
    task: string;
    status: string;
    currentStep: number;
    recentActions: string[];
  } | undefined {
    const agent = this.agents.get(id);
    if (!agent) {
      return undefined;
    }

    const state = agent.getState();

    return {
      name: agent.name,
      task: state.memory?.task || '',
      status: agent.status,
      currentStep: state.memory?.currentStep || 0,
      recentActions: state.memory?.executionLog?.slice(-5) || [],
    };
  }
}
