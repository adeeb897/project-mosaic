/**
 * Migration: Add Agent File (.af) format fields to agents table
 *
 * This migration adds all the necessary fields to support the Agent File format
 * while preserving existing data.
 */

import Database from 'better-sqlite3';
import { logger } from '../../core/logger';

export function migrateAgentFileFields(db: Database.Database): void {
  logger.info('Running migration: Add Agent File (.af) format fields');

  try {
    // Check if migration is needed by checking if agent_type column exists
    const tableInfo = db.prepare("PRAGMA table_info(agents)").all() as Array<{ name: string }>;
    const hasAgentType = tableInfo.some(col => col.name === 'agent_type');

    if (hasAgentType) {
      logger.info('Migration already applied, skipping');
      return;
    }

    // Begin transaction
    db.exec('BEGIN TRANSACTION');

    try {
      // Add new columns
      db.exec(`
        ALTER TABLE agents ADD COLUMN agent_type TEXT;
        ALTER TABLE agents ADD COLUMN description TEXT;
        ALTER TABLE agents ADD COLUMN version TEXT;
        ALTER TABLE agents ADD COLUMN system TEXT;
        ALTER TABLE agents ADD COLUMN llm_config TEXT NOT NULL DEFAULT '{"model":"gpt-4","context_window":128000}';
        ALTER TABLE agents ADD COLUMN embedding_config TEXT;
        ALTER TABLE agents ADD COLUMN core_memory TEXT NOT NULL DEFAULT '[]';
        ALTER TABLE agents ADD COLUMN messages TEXT NOT NULL DEFAULT '[]';
        ALTER TABLE agents ADD COLUMN in_context_message_indices TEXT;
        ALTER TABLE agents ADD COLUMN message_buffer_autoclear INTEGER DEFAULT 0;
        ALTER TABLE agents ADD COLUMN tools TEXT NOT NULL DEFAULT '[]';
        ALTER TABLE agents ADD COLUMN tool_rules TEXT;
        ALTER TABLE agents ADD COLUMN tool_exec_environment_variables TEXT;
        ALTER TABLE agents ADD COLUMN tags TEXT;
        ALTER TABLE agents ADD COLUMN metadata_ TEXT;
        ALTER TABLE agents ADD COLUMN multi_agent_group TEXT;
      `);

      // Migrate existing data - populate agent_type from type field
      db.exec(`
        UPDATE agents SET agent_type = type WHERE agent_type IS NULL;
      `);

      // Migrate existing data - populate llm_config from config field if possible
      const agents = db.prepare('SELECT id, config FROM agents').all() as Array<{
        id: string;
        config: string;
      }>;

      for (const agent of agents) {
        try {
          const config = JSON.parse(agent.config);
          const llmConfig = {
            model: config.model || 'gpt-4',
            context_window: 128000,
          };

          db.prepare('UPDATE agents SET llm_config = ? WHERE id = ?').run(
            JSON.stringify(llmConfig),
            agent.id
          );
        } catch (error) {
          // If parsing fails, leave default value
          logger.warn(`Failed to migrate llm_config for agent ${agent.id}`, error);
        }
      }

      // Commit transaction
      db.exec('COMMIT');

      logger.info('Migration completed successfully');
    } catch (error) {
      // Rollback on error
      db.exec('ROLLBACK');
      throw error;
    }
  } catch (error) {
    logger.error('Migration failed:', error);
    throw error;
  }
}

/**
 * Run all migrations
 */
export function runMigrations(db: Database.Database): void {
  logger.info('Running database migrations');

  try {
    // Create migrations table if it doesn't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        applied_at INTEGER NOT NULL
      )
    `);

    // Check if this migration was already applied
    const result = db
      .prepare('SELECT COUNT(*) as count FROM migrations WHERE name = ?')
      .get('001_add_agent_file_fields') as { count: number };

    if (result.count === 0) {
      // Run the migration
      migrateAgentFileFields(db);

      // Record the migration
      db.prepare('INSERT INTO migrations (name, applied_at) VALUES (?, ?)').run(
        '001_add_agent_file_fields',
        Date.now()
      );

      logger.info('Migration 001_add_agent_file_fields applied');
    } else {
      logger.info('Migration 001_add_agent_file_fields already applied');
    }
  } catch (error) {
    logger.error('Failed to run migrations:', error);
    throw error;
  }
}
