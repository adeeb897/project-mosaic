/**
 * Agent Repository
 * Persistence for agent configurations and state with Agent File (.af) format support
 */

import Database from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import type {
  CoreMemoryBlock,
  Message,
  Tool,
  ToolRule,
  ToolEnvVar,
  Tag,
  LLMConfig,
  EmbeddingConfig,
  MultiAgentGroup,
} from '../../../shared/types/agent-file';

export interface AgentConfig {
  [key: string]: unknown;
}

interface AgentRow {
  id: string;
  name: string;
  type: string;
  status: string;
  config: string;
  metadata: string | null;
  root_task: string | null;
  session_id: string | null;
  created_at: number;
  updated_at: number;

  // Agent File (.af) format fields
  agent_type: string | null;
  description: string | null;
  version: string | null;
  system: string | null;
  llm_config: string;
  embedding_config: string | null;
  core_memory: string;
  messages: string;
  in_context_message_indices: string | null;
  message_buffer_autoclear: number;
  tools: string;
  tool_rules: string | null;
  tool_exec_environment_variables: string | null;
  tags: string | null;
  metadata_: string | null;
  multi_agent_group: string | null;
}

export interface AgentRecord {
  id: string;
  name: string;
  type: string;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
  config: AgentConfig;
  metadata: Record<string, unknown>;
  rootTask?: string;
  sessionId?: string;
  createdAt: Date;
  updatedAt: Date;

  // Agent File (.af) format fields
  agentType?: string;
  description?: string;
  version?: string;
  system?: string;
  llmConfig: LLMConfig;
  embeddingConfig?: EmbeddingConfig;
  coreMemory: CoreMemoryBlock[];
  messages: Message[];
  inContextMessageIndices?: number[];
  messageBufferAutoclear?: boolean;
  tools: Tool[];
  toolRules?: ToolRule[];
  toolExecEnvironmentVariables?: ToolEnvVar[];
  tags?: Tag[];
  metadata_?: Record<string, unknown>;
  multiAgentGroup?: MultiAgentGroup;
}

export class AgentRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  /**
   * Convert a database row to an AgentRecord
   */
  private rowToRecord(row: AgentRow): AgentRecord {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      status: row.status as AgentRecord['status'],
      config: this.deserializeJson(row.config)!,
      metadata: this.deserializeJson(row.metadata) || {},
      rootTask: row.root_task || undefined,
      sessionId: row.session_id || undefined,
      createdAt: this.fromTimestamp(row.created_at)!,
      updatedAt: this.fromTimestamp(row.updated_at)!,

      // Agent File (.af) format fields
      agentType: row.agent_type || undefined,
      description: row.description || undefined,
      version: row.version || undefined,
      system: row.system || undefined,
      llmConfig: this.deserializeJson(row.llm_config) || { model: 'gpt-4' },
      embeddingConfig: this.deserializeJson(row.embedding_config) || undefined,
      coreMemory: this.deserializeJson(row.core_memory) || [],
      messages: this.deserializeJson(row.messages) || [],
      inContextMessageIndices: this.deserializeJson(row.in_context_message_indices) || undefined,
      messageBufferAutoclear: row.message_buffer_autoclear === 1,
      tools: this.deserializeJson(row.tools) || [],
      toolRules: this.deserializeJson(row.tool_rules) || undefined,
      toolExecEnvironmentVariables: this.deserializeJson(row.tool_exec_environment_variables) || undefined,
      tags: this.deserializeJson(row.tags) || undefined,
      metadata_: this.deserializeJson(row.metadata_) || undefined,
      multiAgentGroup: this.deserializeJson(row.multi_agent_group) || undefined,
    };
  }

  save(agent: AgentRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents (
        id, name, type, status, config, metadata, root_task, session_id,
        agent_type, description, version, system, llm_config, embedding_config,
        core_memory, messages, in_context_message_indices, message_buffer_autoclear,
        tools, tool_rules, tool_exec_environment_variables, tags, metadata_, multi_agent_group,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      agent.id,
      agent.name,
      agent.type,
      agent.status,
      this.serializeJson(agent.config),
      this.serializeJson(agent.metadata),
      agent.rootTask || null,
      agent.sessionId || null,
      // Agent File (.af) format fields
      agent.agentType || null,
      agent.description || null,
      agent.version || null,
      agent.system || null,
      this.serializeJson(agent.llmConfig),
      this.serializeJson(agent.embeddingConfig),
      this.serializeJson(agent.coreMemory),
      this.serializeJson(agent.messages),
      this.serializeJson(agent.inContextMessageIndices),
      agent.messageBufferAutoclear ? 1 : 0,
      this.serializeJson(agent.tools),
      this.serializeJson(agent.toolRules),
      this.serializeJson(agent.toolExecEnvironmentVariables),
      this.serializeJson(agent.tags),
      this.serializeJson(agent.metadata_),
      this.serializeJson(agent.multiAgentGroup),
      this.toTimestamp(agent.createdAt),
      this.toTimestamp(agent.updatedAt)
    );
  }

  findById(id: string): AgentRecord | null {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE id = ?');
    const row = stmt.get(id) as AgentRow | undefined;

    if (!row) return null;

    return this.rowToRecord(row);
  }

  findAll(): AgentRecord[] {
    const stmt = this.db.prepare('SELECT * FROM agents ORDER BY created_at DESC');
    const rows = stmt.all() as AgentRow[];

    return rows.map((row) => this.rowToRecord(row));
  }

  findByStatus(status: string): AgentRecord[] {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE status = ? ORDER BY created_at DESC');
    const rows = stmt.all(status) as AgentRow[];

    return rows.map((row) => this.rowToRecord(row));
  }

  findBySessionId(sessionId: string): AgentRecord[] {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE session_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(sessionId) as AgentRow[];

    return rows.map((row) => this.rowToRecord(row));
  }

  updateStatus(id: string, status: string): void {
    const stmt = this.db.prepare(`
      UPDATE agents SET status = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(status, this.toTimestamp(new Date()), id);
  }

  update(id: string, updates: Partial<Omit<AgentRecord, 'id' | 'createdAt'>>): AgentRecord | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.config !== undefined) {
      fields.push('config = ?');
      values.push(this.serializeJson(updates.config));
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(this.serializeJson(updates.metadata));
    }

    if (updates.rootTask !== undefined) {
      fields.push('root_task = ?');
      values.push(updates.rootTask);
    }

    if (updates.sessionId !== undefined) {
      fields.push('session_id = ?');
      values.push(updates.sessionId);
    }

    // Agent File (.af) format fields
    if (updates.agentType !== undefined) {
      fields.push('agent_type = ?');
      values.push(updates.agentType);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (updates.version !== undefined) {
      fields.push('version = ?');
      values.push(updates.version);
    }

    if (updates.system !== undefined) {
      fields.push('system = ?');
      values.push(updates.system);
    }

    if (updates.llmConfig !== undefined) {
      fields.push('llm_config = ?');
      values.push(this.serializeJson(updates.llmConfig));
    }

    if (updates.embeddingConfig !== undefined) {
      fields.push('embedding_config = ?');
      values.push(this.serializeJson(updates.embeddingConfig));
    }

    if (updates.coreMemory !== undefined) {
      fields.push('core_memory = ?');
      values.push(this.serializeJson(updates.coreMemory));
    }

    if (updates.messages !== undefined) {
      fields.push('messages = ?');
      values.push(this.serializeJson(updates.messages));
    }

    if (updates.inContextMessageIndices !== undefined) {
      fields.push('in_context_message_indices = ?');
      values.push(this.serializeJson(updates.inContextMessageIndices));
    }

    if (updates.messageBufferAutoclear !== undefined) {
      fields.push('message_buffer_autoclear = ?');
      values.push(updates.messageBufferAutoclear ? 1 : 0);
    }

    if (updates.tools !== undefined) {
      fields.push('tools = ?');
      values.push(this.serializeJson(updates.tools));
    }

    if (updates.toolRules !== undefined) {
      fields.push('tool_rules = ?');
      values.push(this.serializeJson(updates.toolRules));
    }

    if (updates.toolExecEnvironmentVariables !== undefined) {
      fields.push('tool_exec_environment_variables = ?');
      values.push(this.serializeJson(updates.toolExecEnvironmentVariables));
    }

    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(this.serializeJson(updates.tags));
    }

    if (updates.metadata_ !== undefined) {
      fields.push('metadata_ = ?');
      values.push(this.serializeJson(updates.metadata_));
    }

    if (updates.multiAgentGroup !== undefined) {
      fields.push('multi_agent_group = ?');
      values.push(this.serializeJson(updates.multiAgentGroup));
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = ?');
    values.push(this.toTimestamp(new Date()));
    values.push(id);

    const sql = `UPDATE agents SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(...values);

    return this.findById(id)!;
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM agents WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
