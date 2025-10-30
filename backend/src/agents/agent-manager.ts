/**
 * Agent Manager - User-friendly interface for managing agents
 *
 * Provides simple methods for non-technical users to:
 * - Create agents with natural language goals
 * - Monitor agent progress
 * - View agent results
 */
import { Agent, LLMProviderPlugin, MCPServerPlugin } from '@mosaic/shared';
import { EventBus } from '../core/event-bus';
import { AutonomousAgent } from './autonomous-agent';
import { GoalOrientedAgent } from './goal-oriented-agent';
import { BaseLLMProvider } from '../llm/base-provider';
import { FilesystemMCPServer } from '../mcp/filesystem-server';
import { logger } from '../core/logger';
import { getDatabase } from '../persistence/database';
import { AgentRepository } from '../persistence/repositories/agent.repository';

export interface CreateAgentRequest {
  name: string;
  goal: string; // Simple, high-level goal in natural language
  maxSteps?: number;
}

export class AgentManager {
  private agents: Map<string, Agent> = new Map();
  private agentRepo: AgentRepository;
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
    
    const db = getDatabase();
    this.agentRepo = new AgentRepository(db.getDb());
  }

  /**
   * Create an agent with a simple natural language goal
   *
   * Example:
   *   createAgent({
   *     name: "ResearchAgent",
   *     goal: "Research the latest news about AI and save it to a file"
   *   })
   */
  async createAgent(request: CreateAgentRequest): Promise<Agent> {
    logger.info('Creating agent', { name: request.name, goal: request.goal });

    const agent = new AutonomousAgent({
      name: request.name,
      goal: request.goal,
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
    goal: string;
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
      goal: state.memory?.goal || '',
      status: agent.status,
      currentStep: state.memory?.currentStep || 0,
      recentActions: state.memory?.executionLog?.slice(-5) || [],
    };
  }

  /**
   * Save agent state to database
   */
  async saveAgent(agent: Agent): Promise<void> {
    const agentRecord = {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status: agent.status as 'idle' | 'running' | 'paused' | 'stopped' | 'error',
      config: { ...agent.config } as Record<string, unknown>,
      metadata: agent.getState().memory || {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.agentRepo.save(agentRecord);
    logger.info('Agent saved to database', { id: agent.id, name: agent.name });
  }

  /**
   * Load agent from database
   */
  async loadAgent(id: string): Promise<Agent | null> {
    const record = this.agentRepo.findById(id);
    if (!record) {
      logger.warn('Agent not found in database', { id });
      return null;
    }

    // For now, we can only restore the basic agent properties
    // Full restoration would require recreating the agent with all its dependencies
    logger.info('Agent loaded from database', { id: record.id, name: record.name });
    
    // Return null for now - full restoration requires more implementation
    // This would need to be extended based on agent type
    return null;
  }

  /**
   * List all saved agents
   */
  async listSavedAgents(): Promise<Array<{
    id: string;
    name: string;
    type: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    const records = this.agentRepo.findAll();
    return records.map(record => ({
      id: record.id,
      name: record.name,
      type: record.type,
      status: record.status,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    }));
  }

  /**
   * Delete saved agent from database
   */
  async deleteSavedAgent(id: string): Promise<boolean> {
    const deleted = this.agentRepo.delete(id);
    if (deleted) {
      logger.info('Agent deleted from database', { id });
    }
    return deleted;
  }
}

