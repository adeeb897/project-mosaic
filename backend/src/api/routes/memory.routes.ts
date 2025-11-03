/**
 * Memory API Routes
 * Endpoints for agent memory management
 */

import { Router, Request, Response } from 'express';
import { MemoryManager } from '../../services/memory/memory-manager.service';
import { CreateMemoryRequest, UpdateMemoryRequest, MemoryQuery } from '@mosaic/shared';

export function createMemoryRoutes(memoryManager: MemoryManager): Router {
  const router = Router();

  /**
   * GET /api/agents/:agentId/memory
   * Get agent's memory snapshot
   */
  router.get('/agents/:agentId/memory', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { sessionId } = req.query;

      const snapshot = memoryManager.getAgentSnapshot(
        agentId,
        sessionId as string
      );

      res.json({
        success: true,
        data: snapshot,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/agents/:agentId/memory/search
   * Search agent memories
   */
  router.get('/agents/:agentId/memory/search', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const {
        type,
        importance,
        tags,
        search,
        relatedTaskId,
        sessionId,
        limit,
        offset,
      } = req.query;

      const query: MemoryQuery = {
        agentId,
        sessionId: sessionId as string | undefined,
        type: type as any,
        importance: importance as any,
        tags: tags ? (tags as string).split(',') : undefined,
        search: search as string | undefined,
        relatedTaskId: relatedTaskId as string | undefined,
        limit: limit ? parseInt(limit as string) : undefined,
        offset: offset ? parseInt(offset as string) : undefined,
      };

      const memories = await memoryManager.queryMemories(query);

      res.json({
        success: true,
        data: memories,
        count: memories.length,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/memory/:memoryId
   * Get a specific memory entry
   */
  router.get('/memory/:memoryId', async (req: Request, res: Response) => {
    try {
      const { memoryId } = req.params;
      const memory = memoryManager.getMemory(memoryId);

      if (!memory) {
        return res.status(404).json({
          success: false,
          error: 'Memory not found',
        });
      }

      res.json({
        success: true,
        data: memory,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/agents/:agentId/memory
   * Create a new memory entry
   */
  router.post('/agents/:agentId/memory', async (req: Request, res: Response) => {
    try {
      const { agentId } = req.params;
      const { sessionId } = req.query;

      if (!sessionId) {
        return res.status(400).json({
          success: false,
          error: 'sessionId is required',
        });
      }

      const request: CreateMemoryRequest = req.body;

      const memory = await memoryManager.createMemory(
        agentId,
        sessionId as string,
        request
      );

      res.status(201).json({
        success: true,
        data: memory,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PATCH /api/memory/:memoryId
   * Update a memory entry
   */
  router.patch('/memory/:memoryId', async (req: Request, res: Response) => {
    try {
      const { memoryId } = req.params;
      const updates = req.body;

      const request: UpdateMemoryRequest = {
        memoryId,
        ...updates,
      };

      const memory = await memoryManager.updateMemory(request);

      res.json({
        success: true,
        data: memory,
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/memory/:memoryId
   * Delete a memory entry
   */
  router.delete('/memory/:memoryId', async (req: Request, res: Response) => {
    try {
      const { memoryId } = req.params;

      await memoryManager.deleteMemory(memoryId);

      res.json({
        success: true,
        message: 'Memory deleted successfully',
      });
    } catch (error: any) {
      res.status(404).json({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/memory/cleanup
   * Clean up expired memories
   */
  router.post('/memory/cleanup', async (req: Request, res: Response) => {
    try {
      const deletedCount = memoryManager.cleanupExpiredMemories();

      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} expired memories`,
        deletedCount,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message,
      });
    }
  });

  return router;
}
