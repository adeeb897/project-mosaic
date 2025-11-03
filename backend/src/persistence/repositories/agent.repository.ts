/**
 * Agent Repository
 * Persistence for agent configurations and state
 */

import Database from 'better-sqlite3';
import { BaseRepository } from './base.repository';

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
}

export class AgentRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  save(agent: AgentRecord): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO agents (
        id, name, type, status, config, metadata, root_task, session_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      this.toTimestamp(agent.createdAt),
      this.toTimestamp(agent.updatedAt)
    );
  }

  findById(id: string): AgentRecord | null {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE id = ?');
    const row = stmt.get(id) as AgentRow | undefined;

    if (!row) return null;

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
    };
  }

  findAll(): AgentRecord[] {
    const stmt = this.db.prepare('SELECT * FROM agents ORDER BY created_at DESC');
    const rows = stmt.all() as AgentRow[];

    return rows.map((row) => ({
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
    }));
  }

  findByStatus(status: string): AgentRecord[] {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE status = ? ORDER BY created_at DESC');
    const rows = stmt.all(status) as AgentRow[];

    return rows.map((row) => ({
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
    }));
  }

  findBySessionId(sessionId: string): AgentRecord[] {
    const stmt = this.db.prepare('SELECT * FROM agents WHERE session_id = ? ORDER BY created_at ASC');
    const rows = stmt.all(sessionId) as AgentRow[];

    return rows.map((row) => ({
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
    }));
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
