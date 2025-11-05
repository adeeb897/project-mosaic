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
import { SessionRepository } from '../../persistence/repositories/session.repository';
import { ActionRepository } from '../../persistence/repositories/action.repository';
import { getDatabase } from '../../persistence/database';
import { TaskManager } from '../task/task-manager.service';

export class SessionManager extends EventEmitter {
  private sessionRepo: SessionRepository;
  private actionRepo: ActionRepository;
  private screenshots: Map<string, Screenshot> = new Map();
  private eventBus: EventBus;
  private taskManager: TaskManager;
  private managerLogger = logger.child({ service: 'session-manager' });

  constructor(eventBus: EventBus, taskManager: TaskManager) {
    super();
    this.eventBus = eventBus;
    this.taskManager = taskManager;

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
    taskId?: string,
    _cost?: ActionRecord['cost']
  ): Promise<ActionRecord> {
    const session = this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const record = this.actionRepo.create({
      sessionId,
      agentId,
      taskId,
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
    if (result !== undefined) {
      action.details.result = result;

      // Debug: Log if result contains screenshot data
      if ((result as any)?.data?.screenshot?.base64) {
        logger.info('Action completed with screenshot', {
          actionId,
          tool: action.details.tool,
          hasScreenshot: true,
          base64Length: (result as any).data.screenshot.base64.length,
          screenshotUrl: (result as any).data.screenshot.url
        });
      }
    }
    if (error !== undefined) action.details.error = error;

    // Update action status AND details (including result)
    const updated = this.actionRepo.updateStatus(actionId, status, duration, action.details);
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

    if (query.taskId) {
      return this.actionRepo.findByTaskId(query.taskId);
    }

    // For complex queries, would need more repository methods
    // For now, return empty array
    return [];
  }

  /**
   * Get timeline for user-friendly display
   */
  getTimeline(sessionId: string, limit: number = 100): TimelineEntry[] {
    const actions = this.queryActions({ sessionId, limit, includeScreenshots: true });

    const timeline = actions.map((action) => this.actionToTimelineEntry(action));

    // Debug: Log if any timeline entries have screenshot data
    const entriesWithScreenshots = timeline.filter(
      (entry) => !!(entry.technicalDetails as any)?.result?.data?.screenshot?.base64
    );

    if (entriesWithScreenshots.length > 0) {
      logger.info('Timeline includes screenshot entries', {
        sessionId,
        total: timeline.length,
        withScreenshots: entriesWithScreenshots.length,
        firstScreenshotTool: (entriesWithScreenshots[0].technicalDetails as any)?.tool
      });
    }

    return timeline;
  }

  /**
   * Convert action to timeline entry
   */
  private actionToTimelineEntry(action: ActionRecord): TimelineEntry {
    const task = action.taskId ? this.taskManager.getTask(action.taskId) : undefined;

    // Generate user-friendly summary
    let summary = action.action;
    let icon = '🤖';
    let color = '#4A90E2';

    switch (action.type) {
      case 'task_created':
        icon = '🎯';
        color = '#50C878';
        summary = `Started working on: ${action.details.metadata?.taskTitle || 'new task'}`;
        break;
      case 'task_completed':
        icon = '✅';
        color = '#50C878';
        summary = `Completed: ${task?.title || action.action}`;
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

    // Extract screenshot from tool result if present
    let screenshotUrl = action.screenshotUrl;
    if (!screenshotUrl && action.details.result) {
      const result = action.details.result as any;
      if (result?.data?.screenshot?.base64) {
        // Convert base64 screenshot to data URL for direct display
        screenshotUrl = `data:image/png;base64,${result.data.screenshot.base64}`;
      }
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
      screenshotUrl,
      taskId: action.taskId,
      taskTitle: task?.title,
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

    // Get all related tasks
    const taskIds = new Set(actions.map((a) => a.taskId).filter((id): id is string => !!id));
    const tasks = Array.from(taskIds)
      .map((id) => this.taskManager.getTask(id))
      .filter((g): g is NonNullable<ReturnType<typeof this.taskManager.getTask>> => g !== undefined);

    const timeline = this.getTimeline(sessionId, 1000);

    return {
      session,
      tasks,
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
   * Get the latest screenshot for an agent (from most recent tool invocation)
   */
  getLatestAgentScreenshot(agentId: string): string | undefined {
    // Get recent actions for this agent
    const actions = this.actionRepo.findByAgentId(agentId, 50);

    // Find the most recent action with a screenshot
    for (const action of actions) {
      if (action.details.result) {
        const result = action.details.result as any;
        if (result?.data?.screenshot?.base64) {
          // Return as data URL
          return `data:image/png;base64,${result.data.screenshot.base64}`;
        }
      }
    }

    return undefined;
  }

  /**
   * Subscribe to events for automatic recording
   */
  private subscribeToEvents() {
    // Record task events
    this.eventBus.subscribe('task.created', async (event) => {
      const { task } = event.data;
      if (task.metadata.sessionId) {
        await this.recordAction(
          task.metadata.sessionId,
          task.createdBy,
          'task_created',
          `Created task: ${task.title}`,
          { metadata: { taskTitle: task.title, taskId: task.id } },
          task.id
        );
      }
    });

    this.eventBus.subscribe('task.completed', async (event) => {
      const { task } = event.data;
      if (task.metadata.sessionId) {
        const session = this.sessionRepo.findById(task.metadata.sessionId);
        if (session) {
          session.stats.tasksCompleted++;
        }
      }
    });

    this.eventBus.subscribe('task.failed', async (event) => {
      const { task } = event.data;
      if (task.metadata.sessionId) {
        const session = this.sessionRepo.findById(task.metadata.sessionId);
        if (session) {
          session.stats.tasksFailed++;
        }
      }
    });
  }
}
