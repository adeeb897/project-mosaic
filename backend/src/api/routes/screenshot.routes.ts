/**
 * Screenshot API Routes - Serve stored browser screenshots
 */
import { Router } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../../core/logger';

export function createScreenshotRoutes(screenshotsDir: string): Router {
  const router = Router();

  /**
   * GET /api/screenshots/:screenshotId
   * Retrieve a screenshot by ID
   */
  router.get('/:screenshotId', async (req, res) => {
    try {
      const { screenshotId } = req.params;

      // Find the screenshot file
      const files = await fs.readdir(screenshotsDir);
      const screenshotFile = files.find((file) => file.includes(screenshotId));

      if (!screenshotFile) {
        return res.status(404).json({
          success: false,
          error: 'Screenshot not found',
        });
      }

      const screenshotPath = path.join(screenshotsDir, screenshotFile);

      // Check if file exists
      try {
        await fs.access(screenshotPath);
      } catch {
        return res.status(404).json({
          success: false,
          error: 'Screenshot file not found',
        });
      }

      // Serve the image
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
      res.sendFile(screenshotPath);
    } catch (error) {
      logger.error('Failed to retrieve screenshot', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve screenshot',
      });
    }
  });

  /**
   * GET /api/screenshots
   * List all screenshots with metadata
   */
  router.get('/', async (req, res) => {
    try {
      const { agentId, sessionId, limit = '50' } = req.query;

      const files = await fs.readdir(screenshotsDir);
      const screenshots = await Promise.all(
        files
          .filter((file) => file.endsWith('.png'))
          .map(async (file) => {
            const filePath = path.join(screenshotsDir, file);
            const stats = await fs.stat(filePath);

            // Parse filename: screenshot_{id}_{timestamp}.png
            const match = file.match(/screenshot_([^_]+)_(\d+)\.png/);
            if (!match) return null;

            const [, screenshotId, timestamp] = match;

            return {
              screenshotId,
              filename: file,
              timestamp: parseInt(timestamp),
              size: stats.size,
              url: `/api/screenshots/${screenshotId}`,
            };
          })
      );

      // Filter out null values
      let filteredScreenshots = screenshots.filter((s) => s !== null);

      // Sort by timestamp descending (newest first)
      filteredScreenshots.sort((a, b) => b!.timestamp - a!.timestamp);

      // Apply limit
      const limitNum = parseInt(limit as string);
      if (limitNum > 0) {
        filteredScreenshots = filteredScreenshots.slice(0, limitNum);
      }

      res.json({
        success: true,
        data: filteredScreenshots,
        count: filteredScreenshots.length,
      });
    } catch (error) {
      logger.error('Failed to list screenshots', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to list screenshots',
      });
    }
  });

  /**
   * DELETE /api/screenshots/:screenshotId
   * Delete a screenshot by ID
   */
  router.delete('/:screenshotId', async (req, res) => {
    try {
      const { screenshotId } = req.params;

      // Find the screenshot file
      const files = await fs.readdir(screenshotsDir);
      const screenshotFile = files.find((file) => file.includes(screenshotId));

      if (!screenshotFile) {
        return res.status(404).json({
          success: false,
          error: 'Screenshot not found',
        });
      }

      const screenshotPath = path.join(screenshotsDir, screenshotFile);

      // Delete the file
      await fs.unlink(screenshotPath);

      logger.info('Screenshot deleted', { screenshotId, filename: screenshotFile });

      res.json({
        success: true,
        data: {
          screenshotId,
          filename: screenshotFile,
          message: 'Screenshot deleted successfully',
        },
      });
    } catch (error) {
      logger.error('Failed to delete screenshot', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to delete screenshot',
      });
    }
  });

  return router;
}
