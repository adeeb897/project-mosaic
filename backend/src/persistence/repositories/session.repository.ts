/**
 * Session Repository
 * Database operations for session management
 */

import Database from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import { Session } from '@mosaic/shared';
import { v4 as uuidv4 } from 'uuid';

interface SessionRow {
  id: string;
  name: string;
  agent_ids: string;
  goal_ids: string;
  metadata: string | null;
  created_at: number;
  ended_at: number | null;
}

export class SessionRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  /**
   * Create a new session
   */
  create(name: string, agentIds: string[] = []): Session {
    const id = uuidv4();
    const now = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO sessions (
        id, name, agent_ids, goal_ids, metadata, created_at, ended_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      name,
      this.serializeArray(agentIds),
      this.serializeArray([]),
      this.serializeJson({}),
      this.toTimestamp(now),
      null
    );

    return this.findById(id)!;
  }

  /**
   * Find session by ID
   */
  findById(id: string): Session | null {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE id = ?');
    const row = stmt.get(id) as SessionRow | undefined;

    if (!row) return null;
    return this.mapRowToSession(row);
  }

  /**
   * Find all active sessions (not ended)
   */
  findActiveSessions(): Session[] {
    const stmt = this.db.prepare('SELECT * FROM sessions WHERE ended_at IS NULL ORDER BY created_at DESC');
    const rows = stmt.all() as SessionRow[];
    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Find all sessions
   */
  findAll(limit?: number): Session[] {
    let sql = 'SELECT * FROM sessions ORDER BY created_at DESC';
    
    if (limit) {
      sql += ' LIMIT ?';
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(limit) as SessionRow[];
      return rows.map(row => this.mapRowToSession(row));
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all() as SessionRow[];
    return rows.map(row => this.mapRowToSession(row));
  }

  /**
   * Update session
   */
  update(id: string, updates: Partial<Session>): Session | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }

    if (updates.agentIds !== undefined) {
      fields.push('agent_ids = ?');
      values.push(this.serializeArray(updates.agentIds));
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(this.serializeJson(updates.metadata));
    }

    if (fields.length === 0) return existing;

    values.push(id);

    const sql = `UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(...values);

    return this.findById(id)!;
  }

  /**
   * Add agent to session
   */
  addAgent(sessionId: string, agentId: string): boolean {
    const session = this.findById(sessionId);
    if (!session) return false;

    if (!session.agentIds.includes(agentId)) {
      const updatedAgents = [...session.agentIds, agentId];
      this.update(sessionId, { agentIds: updatedAgents });
    }

    return true;
  }

  /**
   * End a session
   */
  endSession(id: string): Session | null {
    const stmt = this.db.prepare('UPDATE sessions SET ended_at = ? WHERE id = ?');
    stmt.run(this.toTimestamp(new Date()), id);

    return this.findById(id);
  }

  /**
   * Delete session
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM sessions WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Get session count
   */
  count(activeOnly: boolean = false): number {
    let sql = 'SELECT COUNT(*) as count FROM sessions';
    
    if (activeOnly) {
      sql += ' WHERE ended_at IS NULL';
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.get() as { count: number };
    return result.count;
  }

  /**
   * Map database row to Session
   */
  private mapRowToSession(row: SessionRow): Session {
    return {
      id: row.id,
      name: row.name,
      agentIds: this.deserializeArray(row.agent_ids),
      status: row.ended_at ? 'completed' : 'active',
      startedAt: this.fromTimestamp(row.created_at)!,
      endedAt: this.fromTimestamp(row.ended_at) || undefined,
      stats: {
        totalActions: 0,
        toolInvocations: 0,
        llmRequests: 0,
        goalsCompleted: 0,
        goalsFailed: 0,
        screenshotCount: 0,
      },
      config: {
        recordScreenshots: false,
      },
      metadata: this.deserializeJson(row.metadata) || {},
    };
  }
}
