/**
 * Demo: Goal Hierarchy and Session Management
 *
 * Demonstrates how agents can break down high-level goals into manageable tasks
 * and how all actions are recorded for transparency.
 */

import dotenv from 'dotenv';
import { logger } from '../core/logger';
import { EventBus } from '../core/event-bus';
import { PluginRegistry } from '../core/plugin-registry';
import { OpenAIProvider } from '../llm/openai-provider';
import { FilesystemMCPServer } from '../mcp/filesystem-server';
import { GoalOrientedAgent } from '../agents/goal-oriented-agent';
import { GoalManager } from '../services/goal/goal-manager.service';
import { SessionManager } from '../services/session/session-manager.service';

// Load environment variables (override existing values to ensure fresh config)
dotenv.config({ override: true });

async function main() {
  logger.info('🚀 Starting Project Mosaic - Goal Hierarchy Demo...');

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
  const filesystemServer = new FilesystemMCPServer('./workspace');
  await pluginRegistry.register(filesystemServer);

  // Initialize goal and session managers
  logger.info('Initializing goal and session managers...');
  const goalManager = new GoalManager(eventBus);
  const sessionManager = new SessionManager(eventBus, goalManager);

  logger.info('✅ Project Mosaic initialized successfully');
  logger.info('');

  // Run demo
  await runGoalHierarchyDemo(
    llmProvider,
    [filesystemServer],
    eventBus,
    goalManager,
    sessionManager
  );
}

async function runGoalHierarchyDemo(
  llmProvider: any,
  mcpServers: any[],
  eventBus: EventBus,
  goalManager: GoalManager,
  sessionManager: SessionManager
) {
  logger.info('🎬 Running Goal Hierarchy Demo...');
  logger.info('');

  // Create a session
  const session = await sessionManager.createSession('Goal Hierarchy Demo', {
    recordScreenshots: true,
  });

  logger.info(`📊 Session created: ${session.id}`);
  logger.info('');

  // Example 1: Medium complexity goal
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('📝 EXAMPLE 1: Medium Complexity Goal');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('');

  const agent1 = new GoalOrientedAgent({
    name: 'ResearchAgent',
    rootGoal: 'Create a comprehensive research report on renewable energy',
    llmProvider,
    mcpServers,
    eventBus,
    goalManager,
    sessionManager,
    sessionId: session.id,
    maxDepth: 3,
  });

  logger.info('🤖 Created agent: ResearchAgent');
  logger.info('🎯 Goal: "Create a comprehensive research report on renewable energy"');
  logger.info('');
  logger.info('Starting execution...');
  logger.info('──────────────────────────────────────────────────────────');

  try {
    await agent1.start();

    logger.info('──────────────────────────────────────────────────────────');
    logger.info('');
    logger.info('✅ Example 1 completed!');
    logger.info('');

    // Show goal tree
    const rootGoals = goalManager.getRootGoals();
    const researchGoal = rootGoals.find((g) =>
      g.title.includes('research report')
    );

    if (researchGoal) {
      logger.info('📊 Goal Hierarchy:');
      printGoalTree(goalManager.getGoalTree(researchGoal.id)!, 0);
      logger.info('');
    }

    // Show session timeline
    const timeline = sessionManager.getTimeline(session.id, 20);
    logger.info('📜 Session Timeline (last 20 actions):');
    logger.info('');
    timeline.forEach((entry, index) => {
      logger.info(
        `${entry.icon} [${entry.timestamp.toLocaleTimeString()}] ${entry.summary}`
      );
      if (entry.goalTitle) {
        logger.info(`   └─ Goal: ${entry.goalTitle}`);
      }
    });
    logger.info('');
  } catch (error: any) {
    logger.error('Demo failed', { error: error.message });
  }

  // Show session statistics
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('📊 Session Statistics');
  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('');

  const stats = goalManager.getStats();
  logger.info(`Total Goals: ${stats.total}`);
  logger.info(`  ├─ Pending: ${stats.byStatus.pending}`);
  logger.info(`  ├─ In Progress: ${stats.byStatus.in_progress}`);
  logger.info(`  ├─ Completed: ${stats.byStatus.completed}`);
  logger.info(`  ├─ Failed: ${stats.byStatus.failed}`);
  logger.info(`  └─ Blocked: ${stats.byStatus.blocked}`);
  logger.info('');

  const sessionData = sessionManager.getSession(session.id);
  if (sessionData) {
    logger.info(`Total Actions: ${sessionData.stats.totalActions}`);
    logger.info(`  ├─ Tool Invocations: ${sessionData.stats.toolInvocations}`);
    logger.info(`  ├─ LLM Requests: ${sessionData.stats.llmRequests}`);
    logger.info(`  ├─ Goals Completed: ${sessionData.stats.goalsCompleted}`);
    logger.info(`  ├─ Goals Failed: ${sessionData.stats.goalsFailed}`);
    logger.info(`  └─ Screenshots: ${sessionData.stats.screenshotCount}`);
  }
  logger.info('');

  logger.info('═══════════════════════════════════════════════════════════');
  logger.info('');
  logger.info('✨ Demo completed successfully!');
  logger.info('');
  logger.info('Key features demonstrated:');
  logger.info('  ✓ Autonomous goal decomposition');
  logger.info('  ✓ Hierarchical goal management');
  logger.info('  ✓ Complete action recording');
  logger.info('  ✓ User-friendly timeline view');
  logger.info('');
  logger.info('📁 Check the workspace/ directory for created files');
  logger.info('');

  process.exit(0);
}

function printGoalTree(tree: any, indent: number) {
  const prefix = '  '.repeat(indent);
  const statusIcon =
    tree.goal.status === 'completed'
      ? '✅'
      : tree.goal.status === 'in_progress'
        ? '⏳'
        : tree.goal.status === 'failed'
          ? '❌'
          : '⏸️';

  logger.info(`${prefix}${statusIcon} ${tree.goal.title} [${tree.goal.status}]`);

  if (tree.goal.strategy) {
    logger.info(`${prefix}   Strategy: ${tree.goal.strategy}`);
  }

  tree.children.forEach((child: any) => {
    printGoalTree(child, indent + 1);
  });
}

// Run the demo
main().catch((error) => {
  logger.error('Fatal error', { error });
  process.exit(1);
});
