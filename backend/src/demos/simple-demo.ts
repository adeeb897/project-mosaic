/**
 * Project Mosaic - Main Entry Point
 * User-friendly, autonomous AI agent platform
 */
import * as dotenv from 'dotenv';
import { logger } from './core/logger';
import { EventBus } from './core/event-bus';
import { PluginRegistry } from './core/plugin-registry';
import { OpenAIProvider } from './llm/openai-provider';
import { FilesystemMCPServer } from './mcp/filesystem-server';
import { AutonomousAgent } from './agents/autonomous-agent';

// Load environment variables (override existing values to ensure fresh config)
dotenv.config({ override: true });

async function main() {
  logger.info('🚀 Starting Project Mosaic...');

  try {
    // 1. Initialize Event Bus
    logger.info('Initializing event bus...');
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    const eventBus = new EventBus(redisUrl);
    await eventBus.connect();

    // 2. Initialize Plugin Registry
    logger.info('Initializing plugin registry...');
    const pluginRegistry = new PluginRegistry(eventBus);

    // 3. Register LLM Provider
    logger.info('Registering LLM provider...');
    const llmProvider = new OpenAIProvider();
    await pluginRegistry.register(llmProvider);

    // 4. Register MCP Servers
    logger.info('Registering MCP servers...');
    const filesystemServer = new FilesystemMCPServer();
    await pluginRegistry.register(filesystemServer);

    // 5. Subscribe to system events for logging
    eventBus.subscribePattern('agent.*', (event) => {
      logger.info(`[EVENT] ${event.type}`, event.data);
    });

    eventBus.subscribe('agent.progress', (event) => {
      // User-friendly progress updates
      console.log(`\n💭 ${event.data.thought}`);
      console.log(`   Step ${event.data.step}: ${event.data.action}\n`);
    });

    logger.info('✅ Project Mosaic initialized successfully');
    logger.info('');
    logger.info('📝 Ready to create autonomous agents!');
    logger.info('');

    // Example: Create an autonomous agent with a high-level goal
    await runDemo(llmProvider, [filesystemServer], eventBus);

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await pluginRegistry.shutdown();
      await eventBus.disconnect();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Failed to start Project Mosaic', { error });
    process.exit(1);
  }
}

/**
 * Demo: Create an agent with a simple, high-level goal
 */
async function runDemo(llmProvider: any, mcpServers: any[], eventBus: EventBus) {
  logger.info('🎬 Running demo...');
  logger.info('');

  // Create an agent with a simple goal
  const agent = new AutonomousAgent({
    name: 'WriterAgent',
    goal: 'Create a file called "hello.txt" with a friendly greeting message',
    llmProvider,
    mcpServers,
    eventBus,
    maxSteps: 10,
  });

  logger.info(`🤖 Created agent: ${agent.name}`);
  logger.info(`🎯 Goal: "${agent.goal}"`);
  logger.info('');
  logger.info('Starting autonomous execution...');
  logger.info('─'.repeat(60));

  // Start the agent
  await agent.start();

  // Wait for completion (in a real app, this would be event-driven)
  await new Promise((resolve) => {
    const checkStatus = setInterval(() => {
      if (agent.status === 'idle' || agent.status === 'error') {
        clearInterval(checkStatus);
        resolve(null);
      }
    }, 1000);
  });

  logger.info('─'.repeat(60));
  logger.info('');

  if (agent.status === 'idle') {
    logger.info('✅ Demo completed successfully!');
  } else {
    logger.error('❌ Demo failed');
  }

  logger.info('');
  logger.info('Check the workspace/ directory for the created file');
}

// Start the application
main();
