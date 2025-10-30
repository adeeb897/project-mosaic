/**
 * SQLite Database Service
 * Handles all persistence for agents, goals, sessions, and memory
 */

import Database from 'better-sqlite3';
import { logger } from '../core/logger';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseService {
  private db: Database.Database;
  private initialized = false;

  constructor(private dbPath: string = './data/mosaic.db') {
    // Ensure data directory exists
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(this.dbPath);
    this.db.pragma('journal_mode = WAL'); // Better performance
    this.db.pragma('foreign_keys = ON'); // Enforce foreign key constraints
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    logger.info('Initializing database schema...');

    // Create agents table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS agents (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        config TEXT NOT NULL,
        metadata TEXT,
        root_goal TEXT,
        session_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);

    // Create goals table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        priority TEXT NOT NULL,
        parent_goal_id TEXT,
        child_goal_ids TEXT,
        created_by TEXT NOT NULL,
        assigned_to TEXT,
        agent_id TEXT,
        session_id TEXT,
        metadata TEXT,
        started_at INTEGER,
        completed_at INTEGER,
        deadline INTEGER,
        estimated_duration INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (parent_goal_id) REFERENCES goals(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
      )
    `);

    // Create sessions table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        agent_ids TEXT NOT NULL,
        goal_ids TEXT NOT NULL,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        ended_at INTEGER
      )
    `);

    // Create action_records table (timeline)
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS action_records (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        goal_id TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL,
        action TEXT NOT NULL,
        details TEXT NOT NULL,
        screenshot_id TEXT,
        screenshot_url TEXT,
        timestamp INTEGER NOT NULL,
        duration INTEGER,
        cost_prompt_tokens INTEGER,
        cost_completion_tokens INTEGER,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
      )
    `);

    // Create screenshots table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS screenshots (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        action_id TEXT,
        url TEXT NOT NULL,
        path TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        format TEXT,
        size INTEGER,
        captured_at INTEGER NOT NULL,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (action_id) REFERENCES action_records(id) ON DELETE SET NULL
      )
    `);

    // Create memory_entries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS memory_entries (
        id TEXT PRIMARY KEY,
        agent_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        type TEXT NOT NULL,
        importance TEXT NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        metadata TEXT,
        tags TEXT,
        related_goal_id TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        expires_at INTEGER,
        FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (related_goal_id) REFERENCES goals(id) ON DELETE SET NULL
      )
    `);

    // Create indices for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_goals_agent_id ON goals(agent_id);
      CREATE INDEX IF NOT EXISTS idx_goals_session_id ON goals(session_id);
      CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
      CREATE INDEX IF NOT EXISTS idx_goals_parent ON goals(parent_goal_id);

      CREATE INDEX IF NOT EXISTS idx_actions_session ON action_records(session_id);
      CREATE INDEX IF NOT EXISTS idx_actions_agent ON action_records(agent_id);
      CREATE INDEX IF NOT EXISTS idx_actions_timestamp ON action_records(timestamp);

      CREATE INDEX IF NOT EXISTS idx_memory_agent ON memory_entries(agent_id);
      CREATE INDEX IF NOT EXISTS idx_memory_session ON memory_entries(session_id);
      CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_entries(type);
      CREATE INDEX IF NOT EXISTS idx_memory_importance ON memory_entries(importance);
      CREATE INDEX IF NOT EXISTS idx_memory_goal ON memory_entries(related_goal_id);
    `);

    this.initialized = true;
    logger.info('Database schema initialized successfully');
  }

  getDb(): Database.Database {
    if (!this.initialized) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }

  async backup(backupPath: string): Promise<void> {
    logger.info(`Creating database backup at ${backupPath}`);
    await this.db.backup(backupPath);
    logger.info('Database backup completed');
  }
}

// Singleton instance
let dbInstance: DatabaseService | null = null;

export function getDatabase(dbPath?: string): DatabaseService {
  if (!dbInstance) {
    dbInstance = new DatabaseService(dbPath);
  }
  return dbInstance;
}
