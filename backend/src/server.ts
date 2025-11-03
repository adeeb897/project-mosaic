/**
 * Production Server Entry Point
 *
 * Starts the Project Mosaic API server with all services:
 * - REST API for agent, task, session, and memory management
 * - WebSocket for real-time updates
 * - Task management system
 * - Session/history tracking
 * - Agent memory system
 * - SQLite persistence
 */

import dotenv from 'dotenv';
import { logger } from './core/logger';
import { EventBus } from './core/event-bus';
import { PluginRegistry } from './core/plugin-registry';
import { OpenAIProvider } from './llm/openai-provider';
import { FilesystemMCPServer } from './mcp/filesystem-server';
import { BrowserMCPServer } from './mcp/browser-server';
import { TaskManager } from './services/task/task-manager.service';
import { SessionManager } from './services/session/session-manager.service';
import { MemoryManager } from './services/memory/memory-manager.service';
import { MemoryRepository } from './persistence/repositories';
import { APIServer } from './api/server';
import { getDatabase } from './persistence/database';

// Load environment variables
dotenv.config({ override: true });

async function main() {
  try {
    logger.info('🚀 Starting Project Mosaic Server...');

    // Initialize database
    logger.info('Initializing database...');
    const database = getDatabase();
    await database.initialize();
    logger.info('✅ Database ready');

    // Initialize core services
    logger.info('Initializing event bus...');
    const eventBus = new EventBus(process.env.REDIS_URL || 'redis://localhost:6379');
    await eventBus.connect();

    logger.info('Initializing plugin registry...');
    const pluginRegistry = new PluginRegistry(eventBus);

    // Initialize LLM provider
    logger.info('Registering LLM provider...');
    const llmProvider = new OpenAIProvider();
    await pluginRegistry.register(llmProvider);

    // Initialize MCP servers
    logger.info('Registering MCP servers...');
    const path = require('path');
    const workspacePath = path.resolve(process.cwd(), 'workspace');

    const filesystemServer = new FilesystemMCPServer(workspacePath);
    await pluginRegistry.register(filesystemServer);

    const browserServer = new BrowserMCPServer();
    await pluginRegistry.register(browserServer);

    // Initialize managers
    logger.info('Initializing managers...');
    const taskManager = new TaskManager(eventBus);
    const sessionManager = new SessionManager(eventBus, taskManager);
    const memoryRepo = new MemoryRepository(database.getDb());
    const memoryManager = new MemoryManager(memoryRepo);

    // Initialize and start API server
    logger.info('Starting API server...');
    const apiServer = new APIServer(
      eventBus,
      taskManager,
      sessionManager,
      memoryManager,
      llmProvider,
      [filesystemServer, browserServer],
      {
        port: parseInt(process.env.PORT || '3001'),
        cors: {
          origin: process.env.CORS_ORIGINS?.split(',') || '*',
        },
      }
    );

    await apiServer.start();

    logger.info('');
    logger.info('✅ Project Mosaic Server is ready!');
    logger.info('');
    logger.info('📊 Services:');
    logger.info(`   - REST API: http://localhost:${process.env.PORT || 3001}/api`);
    logger.info(`   - WebSocket: ws://localhost:${process.env.PORT || 3001}`);
    logger.info(`   - Health Check: http://localhost:${process.env.PORT || 3001}/health`);
    logger.info(`   - Database: SQLite (./data/mosaic.db)`);
    logger.info('');
    logger.info('📝 Available Endpoints:');
    logger.info('   - POST /api/agents - Create agent');
    logger.info('   - GET  /api/agents - List agents');
    logger.info('   - POST /api/tasks - Create task');
    logger.info('   - GET  /api/tasks - Query tasks');
    logger.info('   - GET  /api/sessions/:id/timeline - View activity');
    logger.info('   - GET  /api/agents/:id/memory - View agent memory');
    logger.info('   - POST /api/agents/:id/memory - Add memory entry');
    logger.info('');
    logger.info('🎯 Ready to create autonomous agents with persistence!');
    logger.info('');

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`\n${signal} received, shutting down gracefully...`);

      try {
        await apiServer.stop();
        await eventBus.disconnect();
        await database.close();

        logger.info('Server stopped successfully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error: unknown) {
    logger.error('Failed to start server', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    process.exit(1);
  }
}

// Start the server
main();
