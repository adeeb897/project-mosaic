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
} from '@mosaic/shared';

// Database row interface matching the SQLite schema
interface AgentRow {
  id: string;
  name: string;
  agent_type: string;
  description: string | null;
  version: string;
  system: string;
  llm_config: string;
  embedding_config: string;
  core_memory: string;
  messages: string;
  in_context_message_indices: string;
  message_buffer_autoclear: number;
  tools: string;
  tool_rules: string;
  tool_exec_environment_variables: string;
  tags: string;
  metadata_: string | null;
  multi_agent_group: string | null;
  created_at: string;
  updated_at: string;
}

// Mosaic-specific metadata stored in metadata_.mosaic
export interface MosaicMetadata {
  status?: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
  sessionId?: string;
  rootTask?: string;
  [key: string]: unknown;
}

// Agent record following official .af format
// See: https://github.com/letta-ai/letta/blob/main/letta/serialize_schemas/pydantic_agent_schema.py
export interface AgentRecord {
  // Internal ID (stored as PK but also in metadata_.mosaic.id)
  id: string;

  // Required fields (per official .af schema)
  name: string;
  agent_type: string;
  version: string;
  system: string;
  llm_config: LLMConfig;
  embedding_config: EmbeddingConfig | Record<string, never>; // Can be empty object
  core_memory: CoreMemoryBlock[];
  messages: Message[];
  in_context_message_indices: number[];
  message_buffer_autoclear: boolean;
  tools: Tool[];
  tool_rules: ToolRule[];
  tool_exec_environment_variables: ToolEnvVar[];
  tags: Tag[];
  created_at: string;  // ISO 8601 timestamp
  updated_at: string;  // ISO 8601 timestamp

  // Optional fields
  description?: string;
  metadata_?: {
    mosaic?: MosaicMetadata;
    [key: string]: unknown;
  };
  multi_agent_group?: MultiAgentGroup;
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
      agent_type: row.agent_type,
      description: row.description || undefined,
      version: row.version,
      system: row.system,
      llm_config: this.deserializeJson(row.llm_config)!,
      embedding_config: this.deserializeJson(row.embedding_config)!,
      core_memory: this.deserializeJson(row.core_memory) || [],
      messages: this.deserializeJson(row.messages) || [],
      in_context_message_indices: this.deserializeJson(row.in_context_message_indices) || [],
      message_buffer_autoclear: row.message_buffer_autoclear === 1,
      tools: this.deserializeJson(row.tools) || [],
      tool_rules: this.deserializeJson(row.tool_rules) || [],
      tool_exec_environment_variables: this.deserializeJson(row.tool_exec_environment_variables) || [],
      tags: this.deserializeJson(row.tags) || [],
      metadata_: this.deserializeJson(row.metadata_) || undefined,
      multi_agent_group: this.deserializeJson(row.multi_agent_group) || undefined,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  save(agent: AgentRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents (
        id, name, agent_type, description, version, system,
        llm_config, embedding_config, core_memory, messages,
        in_context_message_indices, message_buffer_autoclear,
        tools, tool_rules, tool_exec_environment_variables,
        tags, metadata_, multi_agent_group,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      agent.id,
      agent.name,
      agent.agent_type,
      agent.description || null,
      agent.version,
      agent.system,
      this.serializeJson(agent.llm_config),
      this.serializeJson(agent.embedding_config),
      this.serializeJson(agent.core_memory),
      this.serializeJson(agent.messages),
      this.serializeJson(agent.in_context_message_indices),
      agent.message_buffer_autoclear ? 1 : 0,
      this.serializeJson(agent.tools),
      this.serializeJson(agent.tool_rules),
      this.serializeJson(agent.tool_exec_environment_variables),
      this.serializeJson(agent.tags),
      this.serializeJson(agent.metadata_),
      this.serializeJson(agent.multi_agent_group),
      agent.created_at,
      agent.updated_at
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

  update(id: string, updates: Partial<Omit<AgentRecord, 'id' | 'created_at'>>): AgentRecord | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.agent_type !== undefined) {
      fields.push('agent_type = ?');
      values.push(updates.agent_type);
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

    if (updates.llm_config !== undefined) {
      fields.push('llm_config = ?');
      values.push(this.serializeJson(updates.llm_config));
    }

    if (updates.embedding_config !== undefined) {
      fields.push('embedding_config = ?');
      values.push(this.serializeJson(updates.embedding_config));
    }

    if (updates.core_memory !== undefined) {
      fields.push('core_memory = ?');
      values.push(this.serializeJson(updates.core_memory));
    }

    if (updates.messages !== undefined) {
      fields.push('messages = ?');
      values.push(this.serializeJson(updates.messages));
    }

    if (updates.in_context_message_indices !== undefined) {
      fields.push('in_context_message_indices = ?');
      values.push(this.serializeJson(updates.in_context_message_indices));
    }

    if (updates.message_buffer_autoclear !== undefined) {
      fields.push('message_buffer_autoclear = ?');
      values.push(updates.message_buffer_autoclear ? 1 : 0);
    }

    if (updates.tools !== undefined) {
      fields.push('tools = ?');
      values.push(this.serializeJson(updates.tools));
    }

    if (updates.tool_rules !== undefined) {
      fields.push('tool_rules = ?');
      values.push(this.serializeJson(updates.tool_rules));
    }

    if (updates.tool_exec_environment_variables !== undefined) {
      fields.push('tool_exec_environment_variables = ?');
      values.push(this.serializeJson(updates.tool_exec_environment_variables));
    }

    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(this.serializeJson(updates.tags));
    }

    if (updates.metadata_ !== undefined) {
      fields.push('metadata_ = ?');
      values.push(this.serializeJson(updates.metadata_));
    }

    if (updates.multi_agent_group !== undefined) {
      fields.push('multi_agent_group = ?');
      values.push(this.serializeJson(updates.multi_agent_group));
    }

    if (fields.length === 0) return existing;

    // Always update the updated_at timestamp
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const sql = `UPDATE agents SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(...values);

    return this.findById(id)!;
  }

  /**
   * Helper method to update Mosaic-specific metadata
   */
  updateMosaicMetadata(id: string, mosaicUpdates: Partial<MosaicMetadata>): AgentRecord | null {
    const agent = this.findById(id);
    if (!agent) return null;

    const metadata = agent.metadata_ || {};
    const mosaic = { ...(metadata.mosaic || {}), ...mosaicUpdates };

    return this.update(id, {
      metadata_: { ...metadata, mosaic },
    });
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM agents WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }
}
