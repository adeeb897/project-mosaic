/**
 * Goal Repository
 * Persistence for goal hierarchy
 */

import { Database as SQLiteDatabase } from 'better-sqlite3';
import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import { Goal } from '@mosaic/shared';

interface GoalRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  parent_goal_id: string | null;
  child_goal_ids: string;
  created_by: string;
  assigned_to: string | null;
  agent_id: string | null;
  session_id: string | null;
  metadata: string;
  started_at: number | null;
  completed_at: number | null;
  deadline: number | null;
  estimated_duration: number | null;
  created_at: number;
  updated_at: number;
}

export class GoalRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  save(goal: Goal): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO goals (
        id, title, description, status, priority, parent_goal_id, child_goal_ids,
        created_by, assigned_to, agent_id, session_id, metadata,
        started_at, completed_at, deadline, estimated_duration, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      goal.id,
      goal.title,
      goal.description || null,
      goal.status,
      goal.priority,
      goal.parentGoalId || null,
      this.serializeArray(goal.childGoalIds),
      goal.createdBy,
      goal.assignedTo || null,
      null, // agent_id - not in Goal type
      null, // session_id - not in Goal type
      this.serializeJson(goal.metadata || {}),
      goal.startedAt ? this.toTimestamp(goal.startedAt) : null,
      goal.completedAt ? this.toTimestamp(goal.completedAt) : null,
      null, // deadline - not in Goal type
      goal.estimatedSteps || null,
      this.toTimestamp(goal.createdAt),
      this.toTimestamp(goal.lastUpdatedAt)
    );
  }

  findById(id: string): Goal | null {
    const stmt = this.db.prepare('SELECT * FROM goals WHERE id = ?');
    const row = stmt.get(id) as GoalRow | undefined;
    return row ? this.rowToGoal(row) : null;
  }

  findByAgentId(agentId: string): Goal[] {
    const stmt = this.db.prepare('SELECT * FROM goals WHERE agent_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(agentId) as GoalRow[];
    return rows.map((row) => this.rowToGoal(row));
  }

  findBySessionId(sessionId: string): Goal[] {
    const stmt = this.db.prepare('SELECT * FROM goals WHERE session_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(sessionId) as GoalRow[];
    return rows.map((row) => this.rowToGoal(row));
  }

  findByParentId(parentId: string): Goal[] {
    const stmt = this.db.prepare('SELECT * FROM goals WHERE parent_goal_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(parentId) as GoalRow[];
    return rows.map((row) => this.rowToGoal(row));
  }

  findRootGoals(): Goal[] {
    const stmt = this.db.prepare('SELECT * FROM goals WHERE parent_goal_id IS NULL ORDER BY created_at DESC');
    const rows = stmt.all() as GoalRow[];
    return rows.map((row) => this.rowToGoal(row));
  }

  findByStatus(status: string): Goal[] {
    const stmt = this.db.prepare('SELECT * FROM goals WHERE status = ? ORDER BY created_at DESC');
    const rows = stmt.all(status) as GoalRow[];
    return rows.map((row) => this.rowToGoal(row));
  }

  update(id: string, updates: Partial<Goal>): Goal | null {
    const existing = this.findById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: (string | number | null)[] = [];

    if (updates.title !== undefined) {
      fields.push('title = ?');
      values.push(updates.title);
    }

    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }

    if (updates.status !== undefined) {
      fields.push('status = ?');
      values.push(updates.status);
    }

    if (updates.priority !== undefined) {
      fields.push('priority = ?');
      values.push(updates.priority);
    }

    if (updates.assignedTo !== undefined) {
      fields.push('assigned_to = ?');
      values.push(updates.assignedTo);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(this.serializeJson(updates.metadata));
    }

    if (updates.startedAt !== undefined) {
      fields.push('started_at = ?');
      values.push(updates.startedAt ? this.toTimestamp(updates.startedAt) : null);
    }

    if (updates.completedAt !== undefined) {
      fields.push('completed_at = ?');
      values.push(updates.completedAt ? this.toTimestamp(updates.completedAt) : null);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = ?');
    values.push(this.toTimestamp(new Date()));
    values.push(id);

    const sql = `UPDATE goals SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(...values);

    return this.findById(id)!;
  }

  updateStatus(id: string, status: string): void {
    const stmt = this.db.prepare(`
      UPDATE goals SET status = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(status, this.toTimestamp(new Date()), id);
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM goals WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * List all goals with optional filters
   */
  list(options?: { assignedTo?: string; limit?: number; offset?: number }): Goal[] {
    let sql = 'SELECT * FROM goals WHERE 1=1';
    const params: (string | number)[] = [];

    if (options?.assignedTo) {
      sql += ' AND assigned_to = ?';
      params.push(options.assignedTo);
    }

    sql += ' ORDER BY created_at DESC';

    if (options?.limit) {
      sql += ' LIMIT ?';
      params.push(options.limit);

      if (options?.offset) {
        sql += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const stmt = this.db.prepare(sql);
    const rows = stmt.all(...params) as GoalRow[];
    return rows.map(row => this.rowToGoal(row));
  }

  private rowToGoal(row: GoalRow): Goal {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as Goal['status'],
      priority: row.priority as Goal['priority'],
      parentGoalId: row.parent_goal_id || undefined,
      childGoalIds: this.deserializeArray(row.child_goal_ids),
      createdBy: row.created_by,
      assignedTo: row.assigned_to || undefined,
      estimatedSteps: row.estimated_duration || undefined,
      metadata: this.deserializeJson(row.metadata) || {},
      tags: [], // Not stored in DB schema yet
      startedAt: this.fromTimestamp(row.started_at) || undefined,
      completedAt: this.fromTimestamp(row.completed_at) || undefined,
      createdAt: this.fromTimestamp(row.created_at)!,
      lastUpdatedAt: this.fromTimestamp(row.updated_at)!,
    };
  }
}
