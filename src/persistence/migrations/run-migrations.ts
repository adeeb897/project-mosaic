/**
 * Migration runner for Project Mosaic
 *
 * This script runs database migrations.
 */
import { createMigrationManager, runMigrations } from './migration';
import { InitialSchemaMigration } from './001-initial-schema';
import { disconnectDatabase } from '../database.service';

/**
 * Run migrations
 */
async function main() {
  try {
    console.log('Starting database migrations...');

    // Create migration manager
    const migrationManager = createMigrationManager();

    // Register migrations
    migrationManager.register(InitialSchemaMigration);
    // Register additional migrations here as they are created

    // Run migrations
    await runMigrations(migrationManager);

    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Error running migrations:', error);
    process.exit(1);
  } finally {
    // Disconnect from database
    await disconnectDatabase();
  }
}

// Run migrations if this script is executed directly
if (require.main === module) {
  main();
}
