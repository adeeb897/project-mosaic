/**
 * Memory Repository
 * Persistence for agent memory entries
 */

import Database from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import { MemoryEntry, MemoryQuery, MemoryType, MemoryImportance, CreateMemoryRequest } from '@mosaic/shared';
import { v4 as uuidv4 } from 'uuid';

interface MemoryRow {
  id: string;
  agent_id: string;
  session_id: string;
  type: string;
  importance: string;
  title: string;
  content: string;
  metadata: string | null;
  tags: string | null;
  related_task_id: string | null;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
}

export class MemoryRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  /**
   * Create a new memory entry
   */
  create(agentId: string, sessionId: string, request: CreateMemoryRequest): MemoryEntry {
    const id = uuidv4();
    const now = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO memory_entries (
        id, agent_id, session_id, type, importance, title, content,
        metadata, tags, related_task_id, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      agentId,
      sessionId,
      request.type,
      request.importance,
      request.title,
      request.content,
      request.metadata ? this.serializeJson(request.metadata) : null,
      request.tags ? this.serializeArray(request.tags) : null,
      request.relatedTaskId || null,
      this.toTimestamp(now),
      this.toTimestamp(now),
      request.expiresAt ? this.toTimestamp(request.expiresAt) : null
    );

    return this.findById(id)!;
  }

  save(memory: MemoryEntry): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO memory_entries (
        id, agent_id, session_id, type, importance, title, content,
        metadata, tags, related_task_id, created_at, updated_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      memory.id,
      memory.agentId,
      memory.sessionId,
      memory.type,
      memory.importance,
      memory.title,
      memory.content,
      this.serializeJson(memory.metadata || {}),
      this.serializeArray(memory.tags || []),
      memory.relatedTaskId || null,
      this.toTimestamp(memory.createdAt),
      this.toTimestamp(memory.updatedAt),
      memory.expiresAt ? this.toTimestamp(memory.expiresAt) : null
    );
  }

  findById(id: string): MemoryEntry | null {
    const stmt = this.db.prepare('SELECT * FROM memory_entries WHERE id = ?');
    const row = stmt.get(id) as MemoryRow | undefined;
    return row ? this.rowToMemory(row) : null;
  }

  /**
   * Find memories by agent ID
   */
  findByAgentId(agentId: string, limit?: number): MemoryEntry[] {
    return this.query({ agentId, limit });
  }

  /**
   * Find memories by type
   */
  findByType(agentId: string, type: MemoryType, limit?: number): MemoryEntry[] {
    return this.query({ agentId, type, limit });
  }

  /**
   * Find memories by importance
   */
  findByImportance(agentId: string, importance: MemoryImportance, limit?: number): MemoryEntry[] {
    return this.query({ agentId, importance, limit });
  }

  /**
   * Get memory count for agent
   */
  getCount(agentId: string, type?: MemoryType): number {
    let sql = 'SELECT COUNT(*) as count FROM memory_entries WHERE agent_id = ?';
    const params: string[] = [agentId];

    if (type) {
      sql += ' AND type = ?';
      params.push(type);
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  /**
   * Get memory statistics for agent
   */
  getStats(agentId: string): Record<MemoryType, number> {
    const stmt = this.db.prepare(`
      SELECT type, COUNT(*) as count 
      FROM memory_entries 
      WHERE agent_id = ? 
      GROUP BY type
    `);

    const rows = stmt.all(agentId) as Array<{ type: MemoryType; count: number }>;
    
    const stats: Record<MemoryType, number> = {
      plan: 0,
      thought: 0,
      learning: 0,
      context: 0,
      checkpoint: 0,
      observation: 0,
    };

    rows.forEach(row => {
      stats[row.type] = row.count;
    });

    return stats;
  }

  query(query: MemoryQuery): MemoryEntry[] {
    let sql = 'SELECT * FROM memory_entries WHERE 1=1';
    const params: (string | number)[] = [];

    if (query.agentId) {
      sql += ' AND agent_id = ?';
      params.push(query.agentId);
    }

    if (query.sessionId) {
      sql += ' AND session_id = ?';
      params.push(query.sessionId);
    }

    if (query.type) {
      sql += ' AND type = ?';
      params.push(query.type);
    }

    if (query.importance) {
      sql += ' AND importance = ?';
      params.push(query.importance);
    }

    if (query.relatedTaskId) {
      sql += ' AND related_task_id = ?';
      params.push(query.relatedTaskId);
    }

    if (query.tags && query.tags.length > 0) {
      // Simple tag search - contains any of the tags
      const tagConditions = query.tags.map(() => 'tags LIKE ?').join(' OR ');
      sql += ` AND (${tagConditions})`;
      query.tags.forEach((tag) => params.push(`%"${tag}"%`));
    }

    if (query.search) {
      sql += ' AND (title LIKE ? OR content LIKE ?)';
      const searchTerm = `%${query.search}%`;
      params.push(searchTerm, searchTerm);
    }

    // Remove expired entries
    sql += ' AND (expires_at IS NULL OR expires_at > ?)';
    params.push(Date.now());

    sql += ' ORDER BY importance DESC, updated_at DESC';

    if (query.limit) {
      sql += ' LIMIT ?';
      params.push(query.limit);
    }

    if (query.offset) {
      sql += ' OFFSET ?';
      params.push(query.offset);
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as MemoryRow[];
    return rows.map((row) => this.rowToMemory(row));
  }

  update(id: string, updates: Partial<MemoryEntry>): MemoryEntry | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      params.push(updates.title);
    }

    if (updates.content !== undefined) {
      fields.push('content = ?');
      params.push(updates.content);
    }

    if (updates.importance !== undefined) {
      fields.push('importance = ?');
      params.push(updates.importance);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(this.serializeJson(updates.metadata));
    }

    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      params.push(this.serializeArray(updates.tags));
    }

    if (updates.expiresAt !== undefined) {
      fields.push('expires_at = ?');
      params.push(updates.expiresAt ? this.toTimestamp(updates.expiresAt) : null);
    }

    fields.push('updated_at = ?');
    params.push(this.toTimestamp(new Date()));

    params.push(id);

    const stmt = this.db.prepare(`
      UPDATE memory_entries SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...params);

    return this.findById(id);
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM memory_entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  deleteExpired(): number {
    const stmt = this.db.prepare('DELETE FROM memory_entries WHERE expires_at IS NOT NULL AND expires_at <= ?');
    const result = stmt.run(Date.now());
    return result.changes;
  }

  private rowToMemory(row: MemoryRow): MemoryEntry {
    return {
      id: row.id,
      agentId: row.agent_id,
      sessionId: row.session_id,
      type: row.type as MemoryType,
      importance: row.importance as MemoryImportance,
      title: row.title,
      content: row.content,
      metadata: this.deserializeJson(row.metadata) || {},
      tags: this.deserializeArray(row.tags),
      relatedTaskId: row.related_task_id || undefined,
      createdAt: this.fromTimestamp(row.created_at)!,
      updatedAt: this.fromTimestamp(row.updated_at)!,
      expiresAt: this.fromTimestamp(row.expires_at) || undefined,
    };
  }
}
