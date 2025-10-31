/**
 * Task Repository
 * Persistence for task hierarchy
 */

import { Database as SQLiteDatabase } from 'better-sqlite3';
import type Database from 'better-sqlite3';
import { BaseRepository } from './base.repository';
import { Task } from '@mosaic/shared';

interface TaskRow {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  parent_task_id: string | null;
  child_task_ids: string;
  created_by: string;
  assigned_to: string | null;
  agent_id: string | null;
  session_id: string | null;
  metadata: string;
  tags: string;
  started_at: number | null;
  completed_at: number | null;
  deadline: number | null;
  estimated_duration: number | null;
  created_at: number;
  updated_at: number;
}

export class TaskRepository extends BaseRepository {
  constructor(db: Database.Database) {
    super(db);
  }

  save(task: Task): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO tasks (
        id, title, description, status, priority, parent_task_id, child_task_ids,
        created_by, assigned_to, agent_id, session_id, metadata, tags,
        started_at, completed_at, deadline, estimated_duration, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      task.id,
      task.title,
      task.description || null,
      task.status,
      task.priority,
      task.parentTaskId || null,
      this.serializeArray(task.childTaskIds),
      task.createdBy,
      task.assignedTo || null,
      null, // agent_id - not in Task type
      null, // session_id - not in Task type
      this.serializeJson(task.metadata || {}),
      this.serializeArray(task.tags || []),
      task.startedAt ? this.toTimestamp(task.startedAt) : null,
      task.completedAt ? this.toTimestamp(task.completedAt) : null,
      null, // deadline - not in Task type
      task.estimatedSteps || null,
      this.toTimestamp(task.createdAt),
      this.toTimestamp(task.lastUpdatedAt)
    );
  }

  findById(id: string): Task | null {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as TaskRow | undefined;
    return row ? this.rowToTask(row) : null;
  }

  findByAgentId(agentId: string): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE agent_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(agentId) as TaskRow[];
    return rows.map((row) => this.rowToTask(row));
  }

  findBySessionId(sessionId: string): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE session_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(sessionId) as TaskRow[];
    return rows.map((row) => this.rowToTask(row));
  }

  findByParentId(parentId: string): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE parent_task_id = ? ORDER BY created_at DESC');
    const rows = stmt.all(parentId) as TaskRow[];
    return rows.map((row) => this.rowToTask(row));
  }

  findRootTasks(): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE parent_task_id IS NULL ORDER BY created_at DESC');
    const rows = stmt.all() as TaskRow[];
    return rows.map((row) => this.rowToTask(row));
  }

  findByStatus(status: string): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC');
    const rows = stmt.all(status) as TaskRow[];
    return rows.map((row) => this.rowToTask(row));
  }

  findByAssignedTo(assignedTo: string): Task[] {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE assigned_to = ? ORDER BY created_at DESC');
    const rows = stmt.all(assignedTo) as TaskRow[];
    return rows.map((row) => this.rowToTask(row));
  }

  update(id: string, updates: Partial<Task>): Task | null {
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
      values.push(updates.assignedTo || null);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      values.push(this.serializeJson(updates.metadata));
    }

    if (updates.tags !== undefined) {
      fields.push('tags = ?');
      values.push(this.serializeArray(updates.tags));
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

    const sql = `UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`;
    const stmt = this.db.prepare(sql);
    stmt.run(...values);

    return this.findById(id)!;
  }

  updateStatus(id: string, status: string): void {
    const stmt = this.db.prepare(`
      UPDATE tasks SET status = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run(status, this.toTimestamp(new Date()), id);
  }

  delete(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * List all tasks with optional filters
   */
  list(options?: { assignedTo?: string; limit?: number; offset?: number }): Task[] {
    let sql = 'SELECT * FROM tasks WHERE 1=1';
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
    const rows = stmt.all(...params) as TaskRow[];
    return rows.map(row => this.rowToTask(row));
  }

  private rowToTask(row: TaskRow): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status as Task['status'],
      priority: row.priority as Task['priority'],
      parentTaskId: row.parent_task_id || undefined,
      childTaskIds: this.deserializeArray(row.child_task_ids),
      createdBy: row.created_by,
      assignedTo: row.assigned_to || undefined,
      estimatedSteps: row.estimated_duration || undefined,
      metadata: this.deserializeJson(row.metadata) || {},
      tags: this.deserializeArray(row.tags) || [],
      startedAt: this.fromTimestamp(row.started_at) || undefined,
      completedAt: this.fromTimestamp(row.completed_at) || undefined,
      createdAt: this.fromTimestamp(row.created_at)!,
      lastUpdatedAt: this.fromTimestamp(row.updated_at)!,
    };
  }
}
