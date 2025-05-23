/**
 * Monitoring and Metrics Middleware
 * Collects request metrics, health checks, and system monitoring data
 */

import { Request, Response, NextFunction } from 'express';
import { performance } from 'perf_hooks';
import {
  RequestMetrics,
  SystemMetrics,
  HealthCheck,
  HealthStatus,
  GatewayMiddleware,
} from '../types';
import { logger } from '@utils/logger';

// In-memory metrics store (in production, use a proper metrics database)
class MetricsStore {
  private requestMetrics: RequestMetrics[] = [];
  private systemMetrics: SystemMetrics = {
    requestCount: 0,
    errorCount: 0,
    averageResponseTime: 0,
    activeConnections: 0,
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
  };
  private healthChecks: Map<string, HealthCheck> = new Map();
  private startTime: number = Date.now();

  addRequestMetric(metric: RequestMetrics): void {
    this.requestMetrics.push(metric);

    // Keep only last 1000 requests in memory
    if (this.requestMetrics.length > 1000) {
      this.requestMetrics = this.requestMetrics.slice(-1000);
    }

    // Update system metrics
    this.systemMetrics.requestCount++;
    if (metric.statusCode >= 400) {
      this.systemMetrics.errorCount++;
    }

    // Update average response time
    const totalResponseTime = this.requestMetrics.reduce((sum, m) => sum + m.responseTime, 0);
    this.systemMetrics.averageResponseTime = totalResponseTime / this.requestMetrics.length;
  }

  getRequestMetrics(limit: number = 100): RequestMetrics[] {
    return this.requestMetrics.slice(-limit);
  }

  getSystemMetrics(): SystemMetrics {
    return {
      ...this.systemMetrics,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
  }

  addHealthCheck(check: HealthCheck): void {
    this.healthChecks.set(check.name, check);
  }

  getHealthChecks(): HealthCheck[] {
    return Array.from(this.healthChecks.values());
  }

  getHealthStatus(): HealthStatus {
    const checks = this.getHealthChecks();
    const systemMetrics = this.getSystemMetrics();

    // Determine overall status
    let status: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    const degradedChecks = checks.filter(check => check.status === 'degraded');

    if (unhealthyChecks.length > 0) {
      status = 'unhealthy';
    } else if (degradedChecks.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      timestamp: new Date(),
      uptime: Date.now() - this.startTime,
      version: process.env.API_VERSION || '1.0.0',
      checks,
      system: systemMetrics,
    };
  }

  incrementActiveConnections(): void {
    this.systemMetrics.activeConnections++;
  }

  decrementActiveConnections(): void {
    this.systemMetrics.activeConnections = Math.max(0, this.systemMetrics.activeConnections - 1);
  }

  reset(): void {
    this.requestMetrics = [];
    this.systemMetrics = {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      activeConnections: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    };
    this.healthChecks.clear();
  }
}

const metricsStore = new MetricsStore();

/**
 * Metrics collection middleware
 */
export const metricsMiddleware: GatewayMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = performance.now();

  // Increment active connections
  metricsStore.incrementActiveConnections();

  // Override res.end to capture metrics
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any): Response {
    const endTime = performance.now();
    const responseTime = Math.round(endTime - startTime);

    // Create request metric
    const metric: RequestMetrics = {
      method: req.method,
      path: req.route?.path || req.path,
      statusCode: res.statusCode,
      responseTime,
      userAgent: req.get('User-Agent'),
      ip: req.ip || req.connection.remoteAddress || 'unknown',
      userId: req.user?.id,
      timestamp: new Date(),
    };

    // Add metric to store
    metricsStore.addRequestMetric(metric);

    // Decrement active connections
    metricsStore.decrementActiveConnections();

    // Log slow requests
    if (responseTime > 1000) {
      logger.warn('Slow request detected', {
        requestId: req.context?.requestId,
        method: req.method,
        path: req.path,
        responseTime,
        statusCode: res.statusCode,
      });
    }

    // Log errors
    if (res.statusCode >= 400) {
      logger.error('Request error', {
        requestId: req.context?.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        responseTime,
        userAgent: req.get('User-Agent'),
        ip: req.ip,
      });
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Health check functions
 */
export const healthChecks = {
  /**
   * Database health check
   */
  async database(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      // This would be replaced with actual database ping
      // await database.ping();

      const responseTime = Math.round(performance.now() - startTime);

      return {
        name: 'database',
        status: 'healthy',
        message: 'Database connection is healthy',
        lastChecked: new Date(),
        responseTime,
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);

      return {
        name: 'database',
        status: 'unhealthy',
        message: `Database connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
        responseTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  },

  /**
   * Redis health check
   */
  async redis(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      // This would be replaced with actual Redis ping
      // await redis.ping();

      const responseTime = Math.round(performance.now() - startTime);

      return {
        name: 'redis',
        status: 'healthy',
        message: 'Redis connection is healthy',
        lastChecked: new Date(),
        responseTime,
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);

      return {
        name: 'redis',
        status: 'unhealthy',
        message: `Redis connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        lastChecked: new Date(),
        responseTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  },

  /**
   * Memory usage health check
   */
  async memory(): Promise<HealthCheck> {
    const startTime = performance.now();
    const memoryUsage = process.memoryUsage();
    const responseTime = Math.round(performance.now() - startTime);

    // Convert bytes to MB
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memoryUsage.heapTotal / 1024 / 1024);
    const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let message = `Memory usage: ${heapUsedMB}MB / ${heapTotalMB}MB (${memoryUsagePercent.toFixed(1)}%)`;

    if (memoryUsagePercent > 98) {
      status = 'unhealthy';
      message = `High memory usage: ${memoryUsagePercent.toFixed(1)}%`;
    } else if (memoryUsagePercent > 80) {
      status = 'degraded';
      message = `Elevated memory usage: ${memoryUsagePercent.toFixed(1)}%`;
    }

    return {
      name: 'memory',
      status,
      message,
      lastChecked: new Date(),
      responseTime,
      details: {
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        usagePercent: memoryUsagePercent,
      },
    };
  },

  /**
   * Disk space health check
   */
  async diskSpace(): Promise<HealthCheck> {
    const startTime = performance.now();

    try {
      // This would be replaced with actual disk space check
      // const stats = await fs.promises.statvfs('/');

      const responseTime = Math.round(performance.now() - startTime);

      return {
        name: 'disk_space',
        status: 'healthy',
        message: 'Disk space is sufficient',
        lastChecked: new Date(),
        responseTime,
      };
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime);

      return {
        name: 'disk_space',
        status: 'degraded',
        message: 'Unable to check disk space',
        lastChecked: new Date(),
        responseTime,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      };
    }
  },
};

/**
 * Run all health checks
 */
export async function runHealthChecks(): Promise<HealthCheck[]> {
  const checks = await Promise.all([
    healthChecks.database(),
    healthChecks.redis(),
    healthChecks.memory(),
    healthChecks.diskSpace(),
  ]);

  // Update metrics store
  checks.forEach(check => metricsStore.addHealthCheck(check));

  return checks;
}

/**
 * Get metrics data
 */
export const metrics = {
  getRequestMetrics: (limit?: number) => metricsStore.getRequestMetrics(limit),
  getSystemMetrics: () => metricsStore.getSystemMetrics(),
  getHealthStatus: () => metricsStore.getHealthStatus(),
  reset: () => metricsStore.reset(),
};

/**
 * Metrics endpoint middleware
 */
export const metricsEndpoint: GatewayMiddleware = (req: Request, res: Response): void => {
  const requestMetrics = metricsStore.getRequestMetrics(100);
  const systemMetrics = metricsStore.getSystemMetrics();

  res.json({
    success: true,
    data: {
      system: systemMetrics,
      requests: requestMetrics,
    },
    metadata: {
      requestId: req.context?.requestId || 'unknown',
      timestamp: new Date().toISOString(),
      processingTime: 0,
      version: process.env.API_VERSION || '1.0.0',
    },
  });
};

/**
 * Health endpoint middleware
 */
export const healthEndpoint: GatewayMiddleware = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    await runHealthChecks();
    const healthStatus = metricsStore.getHealthStatus();

    const statusCode =
      healthStatus.status === 'healthy' ? 200 : healthStatus.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json({
      success: healthStatus.status !== 'unhealthy',
      data: healthStatus,
      metadata: {
        requestId: req.context?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
        processingTime: 0,
        version: process.env.API_VERSION || '1.0.0',
      },
    });
  } catch (error) {
    logger.error('Health check failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    res.status(503).json({
      success: false,
      error: {
        code: 'HEALTH_CHECK_FAILED',
        message: 'Health check failed',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      },
      metadata: {
        requestId: req.context?.requestId || 'unknown',
        timestamp: new Date().toISOString(),
        processingTime: 0,
        version: process.env.API_VERSION || '1.0.0',
      },
    });
  }
};

/**
 * Prometheus metrics format endpoint
 */
export const prometheusMetrics: GatewayMiddleware = (req: Request, res: Response): void => {
  const systemMetrics = metricsStore.getSystemMetrics();

  // Generate Prometheus format metrics
  const metricsOutput = [
    `# HELP http_requests_total Total number of HTTP requests`,
    `# TYPE http_requests_total counter`,
    `http_requests_total ${systemMetrics.requestCount}`,
    '',
    `# HELP http_request_errors_total Total number of HTTP request errors`,
    `# TYPE http_request_errors_total counter`,
    `http_request_errors_total ${systemMetrics.errorCount}`,
    '',
    `# HELP http_request_duration_ms Average HTTP request duration in milliseconds`,
    `# TYPE http_request_duration_ms gauge`,
    `http_request_duration_ms ${systemMetrics.averageResponseTime}`,
    '',
    `# HELP http_active_connections Current number of active HTTP connections`,
    `# TYPE http_active_connections gauge`,
    `http_active_connections ${systemMetrics.activeConnections}`,
    '',
    `# HELP process_memory_heap_bytes Process heap memory usage in bytes`,
    `# TYPE process_memory_heap_bytes gauge`,
    `process_memory_heap_bytes ${systemMetrics.memoryUsage.heapUsed}`,
    '',
    `# HELP process_memory_heap_total_bytes Process total heap memory in bytes`,
    `# TYPE process_memory_heap_total_bytes gauge`,
    `process_memory_heap_total_bytes ${systemMetrics.memoryUsage.heapTotal}`,
  ];

  res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
  res.send(metricsOutput.join('\n'));
};

/**
 * Cleanup function for graceful shutdown
 */
export function cleanupMonitoring(): void {
  metricsStore.reset();
}
