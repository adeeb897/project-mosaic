/**
 * Memory Manager Service
 * Manages agent memory operations with query capabilities
 */

import { MemoryRepository } from '../../persistence/repositories/memory.repository';
import { 
  MemoryEntry, 
  MemoryType, 
  MemoryImportance,
  CreateMemoryRequest,
  UpdateMemoryRequest,
  MemoryQuery,
  AgentMemorySnapshot
} from '@mosaic/shared';
import { getDatabase } from '../../persistence/database';
import { logger } from '../../core/logger';

export class MemoryManagerService {
  private memoryRepo: MemoryRepository;

  constructor(memoryRepo?: MemoryRepository) {
    if (memoryRepo) {
      this.memoryRepo = memoryRepo;
    } else {
      const db = getDatabase();
      this.memoryRepo = new MemoryRepository(db.getDb());
    }
  }

  /**
   * Create a new memory entry
   */
  async createMemory(
    agentId: string,
    sessionId: string,
    request: CreateMemoryRequest
  ): Promise<MemoryEntry> {
    logger.info(`Creating memory for agent ${agentId}: ${request.title}`);

    const memory = this.memoryRepo.create(agentId, sessionId, request);

    // Clean up expired memories periodically
    this.cleanupExpiredMemories();

    return memory;
  }

  /**
   * Get memory by ID
   */
  async getMemory(memoryId: string): Promise<MemoryEntry | null> {
    return this.memoryRepo.findById(memoryId);
  }

  /**
   * Query memories with filters
   */
  async queryMemories(query: MemoryQuery): Promise<MemoryEntry[]> {
    return this.memoryRepo.query(query);
  }

  /**
   * Get memories by type
   */
  async getMemoriesByType(
    agentId: string,
    type: MemoryType,
    limit?: number
  ): Promise<MemoryEntry[]> {
    return this.memoryRepo.findByType(agentId, type, limit);
  }

  /**
   * Get memories by importance
   */
  async getMemoriesByImportance(
    agentId: string,
    importance: MemoryImportance,
    limit?: number
  ): Promise<MemoryEntry[]> {
    return this.memoryRepo.findByImportance(agentId, importance, limit);
  }

  /**
   * Update a memory entry
   */
  async updateMemory(request: UpdateMemoryRequest): Promise<MemoryEntry | null> {
    const { memoryId, ...updates } = request;

    const updated = this.memoryRepo.update(memoryId, updates);

    if (updated) {
      logger.info(`Updated memory ${memoryId}`);
    } else {
      logger.warn(`Memory ${memoryId} not found for update`);
    }

    return updated;
  }

  /**
   * Delete a memory entry
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    const deleted = this.memoryRepo.delete(memoryId);

    if (deleted) {
      logger.info(`Deleted memory ${memoryId}`);
    } else {
      logger.warn(`Memory ${memoryId} not found for deletion`);
    }

    return deleted;
  }

  /**
   * Get agent's working memory snapshot
   */
  async getAgentSnapshot(agentId: string, sessionId: string): Promise<AgentMemorySnapshot> {
    const [plans, thoughts, learnings, context] = await Promise.all([
      this.memoryRepo.findByType(agentId, 'plan', 10),
      this.memoryRepo.findByType(agentId, 'thought', 10),
      this.memoryRepo.findByType(agentId, 'learning', 10),
      this.memoryRepo.findByType(agentId, 'context', 10),
    ]);

    const totalEntries = this.memoryRepo.getCount(agentId);

    return {
      agentId,
      sessionId,
      plans,
      thoughts,
      learnings,
      context,
      totalEntries,
      lastUpdated: new Date(),
    };
  }

  /**
   * Get memory statistics for an agent
   */
  async getMemoryStats(agentId: string): Promise<Record<MemoryType, number>> {
    return this.memoryRepo.getStats(agentId);
  }

  /**
   * Save a plan
   */
  async savePlan(
    agentId: string,
    sessionId: string,
    title: string,
    content: string,
    options?: {
      importance?: MemoryImportance;
      relatedTaskId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MemoryEntry> {
    return this.createMemory(agentId, sessionId, {
      type: 'plan',
      importance: options?.importance || 'high',
      title,
      content,
      relatedTaskId: options?.relatedTaskId,
      metadata: options?.metadata,
    });
  }

  /**
   * Save a thought/reasoning
   */
  async saveThought(
    agentId: string,
    sessionId: string,
    title: string,
    content: string,
    options?: {
      importance?: MemoryImportance;
      relatedTaskId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MemoryEntry> {
    return this.createMemory(agentId, sessionId, {
      type: 'thought',
      importance: options?.importance || 'medium',
      title,
      content,
      relatedTaskId: options?.relatedTaskId,
      metadata: options?.metadata,
    });
  }

  /**
   * Save a learning
   */
  async saveLearning(
    agentId: string,
    sessionId: string,
    title: string,
    content: string,
    options?: {
      importance?: MemoryImportance;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<MemoryEntry> {
    return this.createMemory(agentId, sessionId, {
      type: 'learning',
      importance: options?.importance || 'high',
      title,
      content,
      tags: options?.tags,
      metadata: options?.metadata,
    });
  }

  /**
   * Save context information
   */
  async saveContext(
    agentId: string,
    sessionId: string,
    title: string,
    content: string,
    options?: {
      importance?: MemoryImportance;
      relatedTaskId?: string;
      expiresAt?: Date;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MemoryEntry> {
    return this.createMemory(agentId, sessionId, {
      type: 'context',
      importance: options?.importance || 'medium',
      title,
      content,
      relatedTaskId: options?.relatedTaskId,
      expiresAt: options?.expiresAt,
      metadata: options?.metadata,
    });
  }

  /**
   * Save a checkpoint (state snapshot)
   */
  async saveCheckpoint(
    agentId: string,
    sessionId: string,
    title: string,
    content: string,
    options?: {
      relatedTaskId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<MemoryEntry> {
    return this.createMemory(agentId, sessionId, {
      type: 'checkpoint',
      importance: 'critical',
      title,
      content,
      relatedTaskId: options?.relatedTaskId,
      metadata: options?.metadata,
    });
  }

  /**
   * Save an observation
   */
  async saveObservation(
    agentId: string,
    sessionId: string,
    title: string,
    content: string,
    options?: {
      importance?: MemoryImportance;
      relatedTaskId?: string;
      tags?: string[];
      metadata?: Record<string, unknown>;
    }
  ): Promise<MemoryEntry> {
    return this.createMemory(agentId, sessionId, {
      type: 'observation',
      importance: options?.importance || 'low',
      title,
      content,
      relatedTaskId: options?.relatedTaskId,
      tags: options?.tags,
      metadata: options?.metadata,
    });
  }

  /**
   * Clean up expired memories
   */
  cleanupExpiredMemories(): void {
    try {
      const deleted = this.memoryRepo.deleteExpired();
      if (deleted > 0) {
        logger.info(`Cleaned up ${deleted} expired memories`);
      }
    } catch (error) {
      logger.error('Error cleaning up expired memories:', error);
    }
  }

  /**
   * Get recent memories for agent
   */
  async getRecentMemories(
    agentId: string,
    limit: number = 20
  ): Promise<MemoryEntry[]> {
    return this.memoryRepo.query({ agentId, limit });
  }

  /**
   * Search memories by text
   */
  async searchMemories(
    agentId: string,
    searchTerm: string,
    limit?: number
  ): Promise<MemoryEntry[]> {
    return this.memoryRepo.query({ agentId, search: searchTerm, limit });
  }

  /**
   * Get memories related to a task
   */
  async getTaskMemories(taskId: string, limit?: number): Promise<MemoryEntry[]> {
    return this.memoryRepo.query({ relatedTaskId: taskId, limit });
  }

  /**
   * Clear all memories for an agent (use with caution)
   */
  async clearAgentMemories(agentId: string): Promise<number> {
    const memories = await this.memoryRepo.findByAgentId(agentId);
    let deleted = 0;

    for (const memory of memories) {
      if (this.memoryRepo.delete(memory.id)) {
        deleted++;
      }
    }

    logger.warn(`Cleared ${deleted} memories for agent ${agentId}`);
    return deleted;
  }
}

// Export alias for consistency
export { MemoryManagerService as MemoryManager };

// Singleton instance
let memoryManagerInstance: MemoryManagerService | null = null;

export function getMemoryManager(): MemoryManagerService {
  if (!memoryManagerInstance) {
    memoryManagerInstance = new MemoryManagerService();
  }
  return memoryManagerInstance;
}
