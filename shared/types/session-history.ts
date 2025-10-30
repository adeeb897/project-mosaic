/**
 * Session and History Management
 *
 * Records every action, decision, and visual state for full transparency
 * and debugging. Essential for non-technical users to understand what agents are doing.
 */

import { Goal } from './goal-hierarchy';

export type ActionType =
  | 'goal_created'
  | 'goal_started'
  | 'goal_completed'
  | 'goal_failed'
  | 'tool_invoked'
  | 'tool_result'
  | 'llm_request'
  | 'llm_response'
  | 'agent_message'
  | 'agent_error'
  | 'browser_navigation'
  | 'browser_interaction'
  | 'file_operation'
  | 'custom';

export type ActionStatus = 'started' | 'completed' | 'failed';

/**
 * Single action record in the history
 */
export interface ActionRecord {
  id: string;
  sessionId: string;
  agentId: string;
  goalId?: string;

  // Action details
  type: ActionType;
  status: ActionStatus;
  action: string; // Human-readable description

  // Technical details
  details: {
    tool?: string;
    params?: any;
    result?: any;
    error?: any;
    reasoning?: string;
    metadata?: Record<string, any>;
  };

  // Visual evidence
  screenshotId?: string;
  screenshotUrl?: string;

  // Timing
  timestamp: Date;
  duration?: number; // milliseconds

  // Cost tracking (for LLM calls)
  cost?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
    estimatedCost?: number; // USD
  };
}

/**
 * Session represents a continuous work period for one or more agents
 */
export interface Session {
  id: string;
  name: string;
  description?: string;

  // Participants
  agentIds: string[];
  rootGoalId?: string;

  // Status
  status: 'active' | 'paused' | 'completed' | 'failed';

  // Timing
  startedAt: Date;
  endedAt?: Date;

  // Summary statistics
  stats: {
    totalActions: number;
    toolInvocations: number;
    llmRequests: number;
    goalsCompleted: number;
    goalsFailed: number;
    totalCost?: number;
    screenshotCount: number;
  };

  // Configuration
  config: {
    recordScreenshots: boolean;
    screenshotInterval?: number; // milliseconds
    maxHistorySize?: number; // limit action records
  };

  metadata: Record<string, any>;
}

/**
 * Screenshot capture for browser activity
 */
export interface Screenshot {
  id: string;
  sessionId: string;
  agentId: string;
  actionId?: string;

  // Image data
  url: string; // Storage URL or data URL
  thumbnailUrl?: string;
  format: 'png' | 'jpg' | 'webp';

  // Context
  pageUrl?: string;
  pageTitle?: string;
  viewport: {
    width: number;
    height: number;
  };

  // Metadata
  timestamp: Date;
  annotations?: Array<{
    type: 'click' | 'input' | 'scroll' | 'highlight';
    x: number;
    y: number;
    label?: string;
  }>;

  metadata: Record<string, any>;
}

/**
 * Timeline entry for user-friendly display
 */
export interface TimelineEntry {
  id: string;
  timestamp: Date;
  agentId: string;
  agentName: string;

  // Content
  title: string;
  description: string;
  type: ActionType;
  status: ActionStatus;

  // Visual
  icon?: string;
  color?: string;
  screenshotUrl?: string;

  // Related data
  goalId?: string;
  goalTitle?: string;
  actionId: string;

  // User-friendly details
  summary: string; // Plain English explanation
  technicalDetails?: Record<string, any>;
}

/**
 * Query sessions and history
 */
export interface HistoryQuery {
  sessionId?: string;
  agentId?: string;
  goalId?: string;
  type?: ActionType | ActionType[];
  status?: ActionStatus | ActionStatus[];
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  includeScreenshots?: boolean;
}

/**
 * Export session data for sharing/debugging
 */
export interface SessionExport {
  session: Session;
  goals: Goal[];
  actions: ActionRecord[];
  screenshots: Screenshot[];
  timeline: TimelineEntry[];
  exportedAt: Date;
  version: string;
}
