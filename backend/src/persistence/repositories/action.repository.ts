/**
 * Action Repository  
 * Database operations for action records (timeline/history)
 */

import Database from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import { ActionRecord, ActionType, ActionStatus } from '@mosaic/shared';
import { v4 as uuidv4 } from 'uuid';

interface ActionRow {
  id: string;
  session_id: string;
  agent_id: string;
  task_id: string | null;
  type: string;
  status: string;
  action: string;
  details: string;
  screenshot_id: string | null;
  screenshot_url: string | null;
  timestamp: number;
  duration: number | null;
  cost_prompt_tokens: number | null;
  cost_completion_tokens: number | null;
}

export interface CreateActionRequest {
  sessionId: string;
  agentId: string;
  taskId?: string;
  type: ActionType;
  status: ActionStatus;
  action: string;
  details: ActionRecord['details'];
  screenshotId?: string;
  screenshotUrl?: string;
  duration?: number;
  cost?: ActionRecord['cost'];
}

export class ActionRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  /**
   * Create a new action record
   */
  create(request: CreateActionRequest): ActionRecord {
    const id = uuidv4();
    const now = new Date();

    const stmt = this.db.prepare(`
      INSERT INTO action_records (
        id, session_id, agent_id, task_id, type, status, action, details,
        screenshot_id, screenshot_url, timestamp, duration,
        cost_prompt_tokens, cost_completion_tokens
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      request.sessionId,
      request.agentId,
      request.taskId || null,
      request.type,
      request.status,
      request.action,
      this.serializeJson(request.details),
      request.screenshotId || null,
      request.screenshotUrl || null,
      this.toTimestamp(now),
      request.duration || null,
      request.cost?.promptTokens || null,
      request.cost?.completionTokens || null
    );

    return this.findById(id)!;
  }

  /**
   * Find action by ID
   */
  findById(id: string): ActionRecord | null {
    const stmt = this.db.prepare('SELECT * FROM action_records WHERE id = ?');
    const row = stmt.get(id) as ActionRow | undefined;

    if (!row) return null;
    return this.mapRowToAction(row);
  }

  /**
   * Find actions by session ID
   */
  findBySessionId(sessionId: string, limit?: number): ActionRecord[] {
    let sql = 'SELECT * FROM action_records WHERE session_id = ? ORDER BY timestamp DESC';
    
    if (limit) {
      sql += ' LIMIT ?';
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(sessionId, limit) as ActionRow[];
      return rows.map(row => this.mapRowToAction(row));
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(sessionId) as ActionRow[];
    return rows.map(row => this.mapRowToAction(row));
  }

  /**
   * Find actions by agent ID
   */
  findByAgentId(agentId: string, limit?: number): ActionRecord[] {
    let sql = 'SELECT * FROM action_records WHERE agent_id = ? ORDER BY timestamp DESC';
    
    if (limit) {
      sql += ' LIMIT ?';
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(agentId, limit) as ActionRow[];
      return rows.map(row => this.mapRowToAction(row));
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(agentId) as ActionRow[];
    return rows.map(row => this.mapRowToAction(row));
  }

  /**
   * Find actions by task ID
   */
  findByTaskId(taskId: string): ActionRecord[] {
    const stmt = this.db.prepare('SELECT * FROM action_records WHERE task_id = ? ORDER BY timestamp DESC');
    const rows = stmt.all(taskId) as ActionRow[];
    return rows.map(row => this.mapRowToAction(row));
  }

  /**
   * Find actions by type
   */
  findByType(sessionId: string, type: ActionType, limit?: number): ActionRecord[] {
    let sql = 'SELECT * FROM action_records WHERE session_id = ? AND type = ? ORDER BY timestamp DESC';
    
    if (limit) {
      sql += ' LIMIT ?';
      const stmt = this.db.prepare(sql);
      const rows = stmt.all(sessionId, type, limit) as ActionRow[];
      return rows.map(row => this.mapRowToAction(row));
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(sessionId, type) as ActionRow[];
    return rows.map(row => this.mapRowToAction(row));
  }

  /**
   * Update action status and details
   */
  updateStatus(id: string, status: ActionStatus, duration?: number, details?: any): ActionRecord | null {
    const action = this.findById(id);
    if (!action) return null;

    // Use provided details or keep existing
    const updatedDetails = details || action.details;

    const fields = ['status = ?', 'details = ?'];
    const values: (string | number)[] = [status, JSON.stringify(updatedDetails)];

    if (duration !== undefined) {
      fields.push('duration = ?');
      values.push(duration);
    }

    values.push(id);

    const sql = `UPDATE action_records SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(...values);

    return this.findById(id);
  }

  /**
   * Delete action
   */
  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM action_records WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Delete all actions for a session
   */
  deleteBySessionId(sessionId: string): number {
    const stmt = this.db.prepare('DELETE FROM action_records WHERE session_id = ?');
    const result = stmt.run(sessionId);
    return result.changes;
  }

  /**
   * Get action count
   */
  count(sessionId?: string, agentId?: string): number {
    let sql = 'SELECT COUNT(*) as count FROM action_records WHERE 1=1';
    const params: string[] = [];

    if (sessionId) {
      sql += ' AND session_id = ?';
      params.push(sessionId);
    }

    if (agentId) {
      sql += ' AND agent_id = ?';
      params.push(agentId);
    }

    const stmt = this.db.prepare(sql);
    const result = stmt.get(...params) as { count: number };
    return result.count;
  }

  /**
   * Get statistics for session
   */
  getSessionStats(sessionId: string): {
    totalActions: number;
    byType: Record<ActionType, number>;
    byStatus: Record<ActionStatus, number>;
    totalCost: { promptTokens: number; completionTokens: number };
  } {
    const stmt = this.db.prepare(`
      SELECT 
        type,
        status,
        SUM(cost_prompt_tokens) as prompt_tokens,
        SUM(cost_completion_tokens) as completion_tokens,
        COUNT(*) as count
      FROM action_records 
      WHERE session_id = ? 
      GROUP BY type, status
    `);

    const rows = stmt.all(sessionId) as Array<{
      type: ActionType;
      status: ActionStatus;
      prompt_tokens: number | null;
      completion_tokens: number | null;
      count: number;
    }>;

    const stats = {
      totalActions: 0,
      byType: {} as Record<ActionType, number>,
      byStatus: {} as Record<ActionStatus, number>,
      totalCost: { promptTokens: 0, completionTokens: 0 },
    };

    rows.forEach(row => {
      stats.totalActions += row.count;
      stats.byType[row.type] = (stats.byType[row.type] || 0) + row.count;
      stats.byStatus[row.status] = (stats.byStatus[row.status] || 0) + row.count;
      stats.totalCost.promptTokens += row.prompt_tokens || 0;
      stats.totalCost.completionTokens += row.completion_tokens || 0;
    });

    return stats;
  }

  /**
   * Map database row to ActionRecord
   */
  private mapRowToAction(row: ActionRow): ActionRecord {
    const details = this.deserializeJson(row.details) || {};
    
    return {
      id: row.id,
      sessionId: row.session_id,
      agentId: row.agent_id,
      taskId: row.task_id || undefined,
      type: row.type as ActionType,
      status: row.status as ActionStatus,
      action: row.action,
      details,
      screenshotId: row.screenshot_id || undefined,
      screenshotUrl: row.screenshot_url || undefined,
      timestamp: this.fromTimestamp(row.timestamp)!,
      duration: row.duration || undefined,
      cost: (row.cost_prompt_tokens || row.cost_completion_tokens) ? {
        promptTokens: row.cost_prompt_tokens || undefined,
        completionTokens: row.cost_completion_tokens || undefined,
      } : undefined,
    };
  }
}
