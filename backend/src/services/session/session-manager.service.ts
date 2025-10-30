/**
 * Session Manager Service
 *
 * Records every action, decision, and visual state for complete transparency.
 * Essential for non-technical users to understand what agents are doing.
 */

import {
  Session,
  ActionRecord,
  Screenshot,
  TimelineEntry,
  ActionType,
  HistoryQuery,
  SessionExport,
} from '@mosaic/shared';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../core/logger';
import { EventBus } from '../../core/event-bus';
import { GoalManager } from '../goal/goal-manager.service';
import { SessionRepository } from '../../persistence/repositories/session.repository';
import { ActionRepository } from '../../persistence/repositories/action.repository';
import { getDatabase } from '../../persistence/database';

export class SessionManager extends EventEmitter {
  private sessionRepo: SessionRepository;
  private actionRepo: ActionRepository;
  private screenshots: Map<string, Screenshot> = new Map();
  private eventBus: EventBus;
  private goalManager: GoalManager;
  private managerLogger = logger.child({ service: 'session-manager' });

  constructor(eventBus: EventBus, goalManager: GoalManager) {
    super();
    this.eventBus = eventBus;
    this.goalManager = goalManager;
    
    const db = getDatabase();
    this.sessionRepo = new SessionRepository(db.getDb());
    this.actionRepo = new ActionRepository(db.getDb());

    // Subscribe to all events to record them
    this.subscribeToEvents();
  }

  /**
   * Create a new session
   */
  async createSession(
    name: string,
    config?: Partial<Session['config']>
  ): Promise<Session> {
    const session = this.sessionRepo.create(name);
    
    // Update config if provided
    if (config) {
      session.config = {
        recordScreenshots: config.recordScreenshots ?? true,
        screenshotInterval: config.screenshotInterval ?? 5000,
        maxHistorySize: config.maxHistorySize ?? 10000,
      };
      this.sessionRepo.update(session.id, { config: session.config });
    }

    this.managerLogger.info('Session created', {
      id: session.id,
      name: session.name,
    });

    await this.eventBus.publish('session.created', {
      id: uuidv4(),
      type: 'session.created',
      source: 'session-manager',
      timestamp: new Date().toISOString(),
      data: { session },
    });

    return session;
  }

  /**
   * Record an action in the session history
   */
  async recordAction(
    sessionId: string,
    agentId: string,
    type: ActionType,
    action: string,
    details: ActionRecord['details'],
    goalId?: string,
    _cost?: ActionRecord['cost']
  ): Promise<ActionRecord> {
    const session = this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const record = this.actionRepo.create({
      sessionId,
      agentId,
      goalId,
      type,
      status: 'started',
      action,
      details,
    });

    // Update session stats
    session.stats.totalActions++;
    if (type === 'tool_invoked') session.stats.toolInvocations++;
    if (type === 'llm_request') session.stats.llmRequests++;

    // Add agent to session if not present
    if (!session.agentIds.includes(agentId)) {
      this.sessionRepo.addAgent(sessionId, agentId);
    }

    // Publish event for real-time updates
    await this.eventBus.publish('action.recorded', {
      id: uuidv4(),
      type: 'action.recorded',
      source: 'session-manager',
      timestamp: new Date().toISOString(),
      data: { action: record },
    });

    return record;
  }

  /**
   * Complete an action with result or error
   */
  async completeAction(
    actionId: string,
    status: 'completed' | 'failed',
    result?: unknown,
    error?: unknown,
    cost?: ActionRecord['cost']
  ): Promise<ActionRecord> {
    const action = this.actionRepo.findById(actionId);
    if (!action) {
      throw new Error(`Action ${actionId} not found`);
    }

    const duration = Date.now() - action.timestamp.getTime();

    // Update details
    if (result !== undefined) action.details.result = result;
    if (error !== undefined) action.details.error = error;

    // Update action status
    const updated = this.actionRepo.updateStatus(actionId, status, duration);
    if (!updated) {
      throw new Error(`Failed to update action ${actionId}`);
    }

    await this.eventBus.publish('action.completed', {
      id: uuidv4(),
      type: 'action.completed',
      source: 'session-manager',
      timestamp: new Date().toISOString(),
      data: { action: updated },
    });

    return updated;
  }

  /**
   * Capture a screenshot
   */
  async captureScreenshot(
    sessionId: string,
    agentId: string,
    imageData: {
      url: string;
      format: Screenshot['format'];
      viewport: Screenshot['viewport'];
      pageUrl?: string;
      pageTitle?: string;
    },
    actionId?: string
  ): Promise<Screenshot> {
    const session = this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const screenshot: Screenshot = {
      id: uuidv4(),
      sessionId,
      agentId,
      actionId,
      url: imageData.url,
      format: imageData.format,
      viewport: imageData.viewport,
      pageUrl: imageData.pageUrl,
      pageTitle: imageData.pageTitle,
      timestamp: new Date(),
      metadata: {},
    };

    this.screenshots.set(screenshot.id, screenshot);

    // Update session stats
    session.stats.screenshotCount++;

    // Link to action if provided
    if (actionId) {
      const action = this.actionRepo.findById(actionId);
      if (action) {
        // Note: We'd need to add a method to update action screenshot in repository
        action.screenshotId = screenshot.id;
        action.screenshotUrl = screenshot.url;
      }
    }

    await this.eventBus.publish('screenshot.captured', {
      id: uuidv4(),
      type: 'screenshot.captured',
      source: 'session-manager',
      timestamp: new Date().toISOString(),
      data: { screenshot },
    });

    return screenshot;
  }

  /**
   * Query action history
   */
  queryActions(query: HistoryQuery): ActionRecord[] {
    if (query.sessionId) {
      return this.actionRepo.findBySessionId(query.sessionId, query.limit);
    }
    
    if (query.agentId) {
      return this.actionRepo.findByAgentId(query.agentId, query.limit);
    }

    if (query.goalId) {
      return this.actionRepo.findByGoalId(query.goalId);
    }

    // For complex queries, would need more repository methods
    // For now, return empty array
    return [];
  }

  /**
   * Get timeline for user-friendly display
   */
  getTimeline(sessionId: string, limit: number = 100): TimelineEntry[] {
    const actions = this.queryActions({ sessionId, limit });

    return actions.map((action) => this.actionToTimelineEntry(action));
  }

  /**
   * Convert action to timeline entry
   */
  private actionToTimelineEntry(action: ActionRecord): TimelineEntry {
    const goal = action.goalId ? this.goalManager.getGoal(action.goalId) : undefined;

    // Generate user-friendly summary
    let summary = action.action;
    let icon = '🤖';
    let color = '#4A90E2';

    switch (action.type) {
      case 'goal_created':
        icon = '🎯';
        color = '#50C878';
        summary = `Started working on: ${action.details.metadata?.goalTitle || 'new goal'}`;
        break;
      case 'goal_completed':
        icon = '✅';
        color = '#50C878';
        summary = `Completed: ${goal?.title || action.action}`;
        break;
      case 'tool_invoked':
        icon = '🛠️';
        color = '#FFA500';
        summary = `Used ${action.details.tool}: ${action.action}`;
        break;
      case 'browser_navigation':
        icon = '🌐';
        color = '#4A90E2';
        summary = `Navigated to: ${action.details.metadata?.url || 'webpage'}`;
        break;
      case 'file_operation':
        icon = '📁';
        color = '#9B59B6';
        break;
      case 'agent_error':
        icon = '⚠️';
        color = '#E74C3C';
        summary = `Error: ${action.details.error?.message || 'unknown error'}`;
        break;
    }

    return {
      id: action.id,
      timestamp: action.timestamp,
      agentId: action.agentId,
      agentName: action.details.metadata?.agentName || action.agentId,
      title: action.action,
      description: action.details.reasoning || '',
      type: action.type,
      status: action.status,
      icon,
      color,
      screenshotUrl: action.screenshotUrl,
      goalId: action.goalId,
      goalTitle: goal?.title,
      actionId: action.id,
      summary,
      technicalDetails: action.details,
    };
  }

  /**
   * Export session for debugging/sharing
   */
  async exportSession(sessionId: string): Promise<SessionExport> {
    const session = this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const actions = this.queryActions({ sessionId });
    const screenshots = Array.from(this.screenshots.values()).filter(
      (s) => s.sessionId === sessionId
    );

    // Get all related goals
    const goalIds = new Set(actions.map((a) => a.goalId).filter((id): id is string => !!id));
    const goals = Array.from(goalIds)
      .map((id) => this.goalManager.getGoal(id))
      .filter((g): g is NonNullable<ReturnType<typeof this.goalManager.getGoal>> => g !== undefined);

    const timeline = this.getTimeline(sessionId, 1000);

    return {
      session,
      goals,
      actions,
      screenshots,
      timeline,
      exportedAt: new Date(),
      version: '1.0.0',
    };
  }

  /**
   * Get session by ID
   */
  getSession(id: string): Session | undefined {
    return this.sessionRepo.findById(id) || undefined;
  }

  /**
   * Subscribe to events for automatic recording
   */
  private subscribeToEvents() {
    // Record goal events
    this.eventBus.subscribe('goal.created', async (event) => {
      const { goal } = event.data;
      if (goal.metadata.sessionId) {
        await this.recordAction(
          goal.metadata.sessionId,
          goal.createdBy,
          'goal_created',
          `Created goal: ${goal.title}`,
          { metadata: { goalTitle: goal.title, goalId: goal.id } },
          goal.id
        );
      }
    });

    this.eventBus.subscribe('goal.completed', async (event) => {
      const { goal } = event.data;
      if (goal.metadata.sessionId) {
        const session = this.sessionRepo.findById(goal.metadata.sessionId);
        if (session) {
          session.stats.goalsCompleted++;
        }
      }
    });

    this.eventBus.subscribe('goal.failed', async (event) => {
      const { goal } = event.data;
      if (goal.metadata.sessionId) {
        const session = this.sessionRepo.findById(goal.metadata.sessionId);
        if (session) {
          session.stats.goalsFailed++;
        }
      }
    });
  }
}
