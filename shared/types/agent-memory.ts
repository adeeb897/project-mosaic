/**
 * Agent Memory Types
 *
 * Memory is separate from activity timeline:
 * - Timeline: Immutable, chronological log for user tracking
 * - Memory: Mutable, structured data for agent reasoning
 */

/**
 * Memory entry types
 */
export type MemoryType =
  | 'plan'           // Strategic plans and decomposed goals
  | 'thought'        // Reasoning and decision-making notes
  | 'learning'       // Lessons learned, patterns discovered
  | 'context'        // Important context about the task
  | 'checkpoint'     // State snapshots for recovery
  | 'observation';   // Key observations from actions

/**
 * Memory entry importance
 */
export type MemoryImportance = 'critical' | 'high' | 'medium' | 'low';

/**
 * A single memory entry
 */
export interface MemoryEntry {
  id: string;
  agentId: string;
  sessionId: string;
  type: MemoryType;
  importance: MemoryImportance;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  tags?: string[];
  relatedGoalId?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date; // For temporary memories
}

/**
 * Request to create a memory entry
 */
export interface CreateMemoryRequest {
  type: MemoryType;
  importance: MemoryImportance;
  title: string;
  content: string;
  metadata?: Record<string, any>;
  tags?: string[];
  relatedGoalId?: string;
  expiresAt?: Date;
}

/**
 * Request to update a memory entry
 */
export interface UpdateMemoryRequest {
  memoryId: string;
  title?: string;
  content?: string;
  importance?: MemoryImportance;
  metadata?: Record<string, any>;
  tags?: string[];
  expiresAt?: Date;
}

/**
 * Query parameters for searching memories
 */
export interface MemoryQuery {
  agentId?: string;
  sessionId?: string;
  type?: MemoryType;
  importance?: MemoryImportance;
  tags?: string[];
  relatedGoalId?: string;
  search?: string; // Text search in title/content
  limit?: number;
  offset?: number;
}

/**
 * Agent's working memory snapshot
 */
export interface AgentMemorySnapshot {
  agentId: string;
  sessionId: string;
  currentGoalId?: string;
  plans: MemoryEntry[];
  thoughts: MemoryEntry[];
  learnings: MemoryEntry[];
  context: MemoryEntry[];
  totalEntries: number;
  lastUpdated: Date;
}
