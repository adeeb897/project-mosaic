/**
 * Migration system for Project Mosaic
 *
 * This module provides a system for managing database migrations.
 */
import mongoose, { Document, Schema } from 'mongoose';
import { getDatabaseService } from '../database.service';

/**
 * Migration interface
 */
export interface IMigration {
  version: number;
  name: string;
  description: string;
  up(): Promise<void>;
  down(): Promise<void>;
}

/**
 * Migration document interface
 */
export interface IMigrationDocument extends Document {
  version: number;
  name: string;
  description: string;
  appliedAt: Date;
}

/**
 * Migration schema
 */
const MigrationSchema = new Schema<IMigrationDocument>({
  version: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now },
});

// Create the model
export const Migration = mongoose.model<IMigrationDocument>('Migration', MigrationSchema);

/**
 * Migration manager
 */
export class MigrationManager {
  private migrations: IMigration[] = [];

  /**
   * Register a migration
   *
   * @param migration The migration to register
   */
  public register(migration: IMigration): void {
    this.migrations.push(migration);
    // Sort migrations by version
    this.migrations.sort((a, b) => a.version - b.version);
  }

  /**
   * Get all registered migrations
   *
   * @returns The registered migrations
   */
  public getMigrations(): IMigration[] {
    return [...this.migrations];
  }

  /**
   * Get applied migrations
   *
   * @returns The applied migrations
   */
  public async getAppliedMigrations(): Promise<IMigrationDocument[]> {
    return Migration.find().sort({ version: 1 });
  }

  /**
   * Get pending migrations
   *
   * @returns The pending migrations
   */
  public async getPendingMigrations(): Promise<IMigration[]> {
    const appliedMigrations = await this.getAppliedMigrations();
    const appliedVersions = appliedMigrations.map(m => m.version);

    return this.migrations.filter(m => !appliedVersions.includes(m.version));
  }

  /**
   * Apply pending migrations
   *
   * @returns The number of migrations applied
   */
  public async applyPendingMigrations(): Promise<number> {
    const pendingMigrations = await this.getPendingMigrations();

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations to apply');
      return 0;
    }

    console.log(`Applying ${pendingMigrations.length} migrations...`);

    let appliedCount = 0;
    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration ${migration.version}: ${migration.name}`);
        await migration.up();

        // Record the migration
        await Migration.create({
          version: migration.version,
          name: migration.name,
          description: migration.description,
        });

        appliedCount++;
        console.log(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`Error applying migration ${migration.version}:`, error);
        throw error;
      }
    }

    console.log(`Applied ${appliedCount} migrations successfully`);
    return appliedCount;
  }

  /**
   * Rollback the last applied migration
   *
   * @returns True if a migration was rolled back, false otherwise
   */
  public async rollbackLastMigration(): Promise<boolean> {
    const appliedMigrations = await this.getAppliedMigrations();

    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return false;
    }

    const lastMigration = appliedMigrations[appliedMigrations.length - 1];
    const migrationToRollback = this.migrations.find(m => m.version === lastMigration.version);

    if (!migrationToRollback) {
      throw new Error(`Migration ${lastMigration.version} not found in registered migrations`);
    }

    try {
      console.log(`Rolling back migration ${lastMigration.version}: ${lastMigration.name}`);
      await migrationToRollback.down();

      // Remove the migration record
      await Migration.deleteOne({ version: lastMigration.version });

      console.log(`Migration ${lastMigration.version} rolled back successfully`);
      return true;
    } catch (error) {
      console.error(`Error rolling back migration ${lastMigration.version}:`, error);
      throw error;
    }
  }

  /**
   * Rollback all migrations
   *
   * @returns The number of migrations rolled back
   */
  public async rollbackAllMigrations(): Promise<number> {
    const appliedMigrations = await this.getAppliedMigrations();

    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return 0;
    }

    console.log(`Rolling back ${appliedMigrations.length} migrations...`);

    let rolledBackCount = 0;
    // Rollback in reverse order
    for (let i = appliedMigrations.length - 1; i >= 0; i--) {
      const migration = appliedMigrations[i];
      const migrationToRollback = this.migrations.find(m => m.version === migration.version);

      if (!migrationToRollback) {
        throw new Error(`Migration ${migration.version} not found in registered migrations`);
      }

      try {
        console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
        await migrationToRollback.down();

        // Remove the migration record
        await Migration.deleteOne({ version: migration.version });

        rolledBackCount++;
        console.log(`Migration ${migration.version} rolled back successfully`);
      } catch (error) {
        console.error(`Error rolling back migration ${migration.version}:`, error);
        throw error;
      }
    }

    console.log(`Rolled back ${rolledBackCount} migrations successfully`);
    return rolledBackCount;
  }

  /**
   * Rollback migrations to a specific version
   *
   * @param targetVersion The target version to rollback to
   * @returns The number of migrations rolled back
   */
  public async rollbackToVersion(targetVersion: number): Promise<number> {
    const appliedMigrations = await this.getAppliedMigrations();

    if (appliedMigrations.length === 0) {
      console.log('No migrations to rollback');
      return 0;
    }

    // Find migrations to rollback (those with version > targetVersion)
    const migrationsToRollback = appliedMigrations.filter(m => m.version > targetVersion);

    if (migrationsToRollback.length === 0) {
      console.log(`No migrations to rollback to version ${targetVersion}`);
      return 0;
    }

    console.log(
      `Rolling back ${migrationsToRollback.length} migrations to version ${targetVersion}...`
    );

    let rolledBackCount = 0;
    // Rollback in reverse order
    for (let i = migrationsToRollback.length - 1; i >= 0; i--) {
      const migration = migrationsToRollback[i];
      const migrationToRollback = this.migrations.find(m => m.version === migration.version);

      if (!migrationToRollback) {
        throw new Error(`Migration ${migration.version} not found in registered migrations`);
      }

      try {
        console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
        await migrationToRollback.down();

        // Remove the migration record
        await Migration.deleteOne({ version: migration.version });

        rolledBackCount++;
        console.log(`Migration ${migration.version} rolled back successfully`);
      } catch (error) {
        console.error(`Error rolling back migration ${migration.version}:`, error);
        throw error;
      }
    }

    console.log(`Rolled back ${rolledBackCount} migrations successfully`);
    return rolledBackCount;
  }
}

/**
 * Create a migration manager
 *
 * @returns A new migration manager
 */
export const createMigrationManager = (): MigrationManager => {
  return new MigrationManager();
};

/**
 * Run migrations
 *
 * @param migrationManager The migration manager
 * @returns A promise that resolves when migrations are complete
 */
export const runMigrations = async (migrationManager: MigrationManager): Promise<void> => {
  // Ensure database connection
  const dbService = getDatabaseService();
  await dbService.connect();

  try {
    await migrationManager.applyPendingMigrations();
  } finally {
    // Don't disconnect, as the application might need the connection
  }
};
