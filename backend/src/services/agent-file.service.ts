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
} from '@mosaic/shared';

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

    // Build the agent file following official .af format
    const agentFile: AgentFile = {
      name: agent.name,
      agent_type: agent.agent_type,
      description: agent.description,
      version: agent.version,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      system: agent.system,
      llm_config: agent.llm_config,
      // Only include embedding_config if it has the required embedding_model field
      embedding_config: (agent.embedding_config as any)?.embedding_model ? (agent.embedding_config as EmbeddingConfig) : undefined,
      core_memory: includeMemory ? agent.core_memory : [],
      messages: includeMessages ? messages : [],
      in_context_message_indices: agent.in_context_message_indices,
      message_buffer_autoclear: agent.message_buffer_autoclear,
      tools: includeTools ? agent.tools : [],
      tool_rules: agent.tool_rules,
      tool_exec_environment_variables: agent.tool_exec_environment_variables,
      tags: agent.tags,
      metadata_: {
        ...agent.metadata_,
        // Mosaic-specific metadata is already stored in agent.metadata_.mosaic
      },
      multi_agent_group: agent.multi_agent_group,
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

    // Build the agent record following official .af format
    // Ensure all required fields have valid values
    const now = new Date().toISOString();

    const agentRecord: Partial<AgentRecord> = {
      // ID handling - use from mosaic metadata if preserving, otherwise generate new
      id: preserveId && mosaicMetadata.id ? mosaicMetadata.id : uuidv4(),

      // Required fields with defaults
      name: agentFile.name,
      agent_type: agentFile.agent_type || 'langgraph-agent',
      version: agentFile.version || '1.0.0',
      system: agentFile.system || '',
      llm_config: agentFile.llm_config,
      embedding_config: agentFile.embedding_config || {},
      core_memory: agentFile.core_memory || [],
      messages: agentFile.messages || [],
      in_context_message_indices: agentFile.in_context_message_indices || [],
      message_buffer_autoclear: agentFile.message_buffer_autoclear ?? false,
      tools: agentFile.tools || [],
      tool_rules: agentFile.tool_rules || [],
      tool_exec_environment_variables: agentFile.tool_exec_environment_variables || [],
      tags: agentFile.tags || [],
      created_at: agentFile.created_at || now,
      updated_at: agentFile.updated_at || now,

      // Optional fields
      description: agentFile.description,
      metadata_: agentFile.metadata_,
      multi_agent_group: agentFile.multi_agent_group,
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
