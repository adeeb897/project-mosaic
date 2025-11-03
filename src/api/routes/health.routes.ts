import { Router, Request, Response } from 'express';
import { getDatabaseStatus } from '../../persistence/database';
import { logger } from '../../utils/logger';

const router = Router();

/**
 * @route   GET /health
 * @desc    Get API health status
 * @access  Public
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const dbStatus = getDatabaseStatus();

    // Get memory usage
    const memoryUsage = process.memoryUsage();

    // Get uptime
    const uptime = process.uptime();

    // Prepare response
    const healthStatus = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: uptime,
      database: {
        connected: dbStatus.connected,
        status: dbStatus.status,
      },
      memory: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
      },
      environment: process.env.NODE_ENV || 'development',
    };

    logger.debug('Health check performed', healthStatus);

    return res.status(200).json(healthStatus);
  } catch (error) {
    logger.error('Health check failed:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * @route   GET /health/readiness
 * @desc    Check if the application is ready to accept traffic
 * @access  Public
 */
router.get('/readiness', (req: Request, res: Response) => {
  try {
    const dbStatus = getDatabaseStatus();

    if (dbStatus.connected) {
      return res.status(200).json({
        status: 'ok',
        message: 'Application is ready',
      });
    } else {
      return res.status(503).json({
        status: 'error',
        message: 'Application is not ready',
        details: 'Database connection is not established',
      });
    }
  } catch (error) {
    logger.error('Readiness check failed:', error);

    return res.status(500).json({
      status: 'error',
      message: 'Readiness check failed',
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * @route   GET /health/liveness
 * @desc    Check if the application is alive
 * @access  Public
 */
router.get('/liveness', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'ok',
    message: 'Application is alive',
  });
});

export const healthRoutes = router;
