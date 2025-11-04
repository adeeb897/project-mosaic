/**
 * Agent File Service
 * Handles import/export of agents in the Agent File (.af) format
 */

import { v4 as uuidv4 } from 'uuid';
import { logger } from '../core/logger';
import type { AgentRecord } from '../persistence/repositories/agent.repository';
import type {
  AgentFile,
  ExportOptions,
  ImportOptions,
  CoreMemoryBlock,
  Message,
  Tool,
  ToolRule,
  ToolEnvVar,
  Tag,
  LLMConfig,
  EmbeddingConfig,
  MultiAgentGroup,
} from '../../shared/types/agent-file';

export class AgentFileService {
  /**
   * Export an agent to Agent File (.af) format (official format - no wrapper)
   */
  exportToAgentFile(agent: AgentRecord, options: ExportOptions = {}): AgentFile {
    const {
      includeMessages = true,
      includeTools = true,
      includeMemory = true,
      messageLimit,
      prettyPrint = true,
    } = options;

    // Prepare messages with limit if specified
    let messages = agent.messages || [];
    if (includeMessages && messageLimit && messages.length > messageLimit) {
      messages = messages.slice(-messageLimit);
    }

    // Build the agent file
    const agentFile: AgentFile = {
      // Basic metadata
      name: agent.name,
      agent_type: agent.agentType || agent.type,
      description: agent.description,
      version: agent.version || '1.0.0',
      created_at: agent.createdAt.toISOString(),
      updated_at: agent.updatedAt.toISOString(),

      // System configuration
      system: agent.system,
      llm_config: agent.llmConfig,
      embedding_config: agent.embeddingConfig,

      // Memory and context
      core_memory: includeMemory ? agent.coreMemory : [],
      messages: includeMessages ? messages : [],
      in_context_message_indices: agent.inContextMessageIndices,
      message_buffer_autoclear: agent.messageBufferAutoclear,

      // Tools and rules
      tools: includeTools ? agent.tools : [],
      tool_rules: agent.toolRules,
      tool_exec_environment_variables: agent.toolExecEnvironmentVariables,

      // Organization
      tags: agent.tags,
      metadata_: {
        ...agent.metadata_,
        // Add mosaic-specific metadata
        mosaic: {
          id: agent.id,
          type: agent.type,
          status: agent.status,
          sessionId: agent.sessionId,
          rootTask: agent.rootTask,
          config: agent.config,
          metadata: agent.metadata,
        },
      },

      // Multi-agent support
      multi_agent_group: agent.multiAgentGroup,
    };

    return agentFile;
  }

  /**
   * Export agent to JSON string
   */
  exportToJson(agent: AgentRecord, options: ExportOptions = {}): string {
    const agentFile = this.exportToAgentFile(agent, options);
    return JSON.stringify(agentFile, null, options.prettyPrint ? 2 : 0);
  }

  /**
   * Import an agent from Agent File (.af) format (official format - no wrapper)
   */
  importFromAgentFile(
    agentFile: AgentFile,
    options: ImportOptions = {}
  ): Partial<AgentRecord> {
    const {
      preserveId = false,
      mergeMessages = false,
      mergeTools = false,
      conflictResolution = 'create_new',
    } = options;

    // Extract Mosaic-specific metadata if present
    const mosaicMetadata = (agentFile.metadata_?.mosaic as any) || {};

    // Build the agent record
    const agentRecord: Partial<AgentRecord> = {
      // ID handling based on options
      id: preserveId && mosaicMetadata.id ? mosaicMetadata.id : uuidv4(),

      // Basic metadata
      name: agentFile.name,
      type: mosaicMetadata.type || agentFile.agent_type || 'langgraph-agent',
      status: mosaicMetadata.status || 'idle',
      config: mosaicMetadata.config || {},
      metadata: mosaicMetadata.metadata || {},
      rootTask: mosaicMetadata.rootTask,
      sessionId: mosaicMetadata.sessionId,

      // Timestamps - preserve original or use current
      createdAt: agentFile.created_at ? new Date(agentFile.created_at) : new Date(),
      updatedAt: new Date(),

      // Agent File (.af) format fields
      agentType: agentFile.agent_type,
      description: agentFile.description,
      version: agentFile.version,
      system: agentFile.system,
      llmConfig: agentFile.llm_config,
      embeddingConfig: agentFile.embedding_config,
      coreMemory: agentFile.core_memory || [],
      messages: agentFile.messages || [],
      inContextMessageIndices: agentFile.in_context_message_indices,
      messageBufferAutoclear: agentFile.message_buffer_autoclear,
      tools: agentFile.tools || [],
      toolRules: agentFile.tool_rules,
      toolExecEnvironmentVariables: agentFile.tool_exec_environment_variables,
      tags: agentFile.tags,
      metadata_: agentFile.metadata_,
      multiAgentGroup: agentFile.multi_agent_group,
    };

    return agentRecord;
  }

  /**
   * Import agent from JSON string
   */
  importFromJson(json: string, options: ImportOptions = {}): Partial<AgentRecord> {
    try {
      const agentFile = JSON.parse(json) as AgentFile;
      return this.importFromAgentFile(agentFile, options);
    } catch (error) {
      logger.error('Failed to parse agent file JSON:', error);
      throw new Error(`Invalid agent file JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate agent file structure (official .af format)
   */
  validateAgentFile(agentFile: AgentFile): boolean {
    try {
      // Check required fields per official .af format
      if (!agentFile.name) {
        throw new Error('Missing agent name');
      }

      if (!agentFile.llm_config) {
        throw new Error('Missing llm_config');
      }

      if (!agentFile.llm_config.model) {
        throw new Error('Missing llm_config.model');
      }

      // Validate arrays
      if (agentFile.core_memory && !Array.isArray(agentFile.core_memory)) {
        throw new Error('core_memory must be an array');
      }

      if (agentFile.messages && !Array.isArray(agentFile.messages)) {
        throw new Error('messages must be an array');
      }

      if (agentFile.tools && !Array.isArray(agentFile.tools)) {
        throw new Error('tools must be an array');
      }

      // Validate timestamps if present
      if (agentFile.created_at) {
        const date = new Date(agentFile.created_at);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid created_at timestamp');
        }
      }

      if (agentFile.updated_at) {
        const date = new Date(agentFile.updated_at);
        if (isNaN(date.getTime())) {
          throw new Error('Invalid updated_at timestamp');
        }
      }

      return true;
    } catch (error) {
      logger.error('Agent file validation failed:', error);
      throw error;
    }
  }

  /**
   * Merge messages from imported agent with existing agent
   */
  mergeMessages(existing: Message[], imported: Message[]): Message[] {
    const merged = [...existing];
    const existingIds = new Set(
      existing.map((m) => `${m.created_at}-${m.role}-${JSON.stringify(m.content)}`)
    );

    for (const msg of imported) {
      const msgId = `${msg.created_at}-${msg.role}-${JSON.stringify(msg.content)}`;
      if (!existingIds.has(msgId)) {
        merged.push(msg);
      }
    }

    // Sort by created_at
    merged.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    return merged;
  }

  /**
   * Merge tools from imported agent with existing agent
   */
  mergeTools(existing: Tool[], imported: Tool[]): Tool[] {
    const merged = [...existing];
    const existingNames = new Set(existing.map((t) => t.name));

    for (const tool of imported) {
      if (!existingNames.has(tool.name)) {
        merged.push(tool);
      }
    }

    return merged;
  }

  /**
   * Create a minimal agent file for testing
   */
  createMinimalAgentFile(name: string, model: string): AgentFile {
    const now = new Date().toISOString();

    return {
      name,
      agent_type: 'langgraph-agent',
      version: '1.0.0',
      created_at: now,
      updated_at: now,
      llm_config: {
        model,
        context_window: 128000,
      },
      core_memory: [],
      messages: [],
      tools: [],
    };
  }
}
