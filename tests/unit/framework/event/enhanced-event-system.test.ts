import { EnhancedEventSystem } from '@framework/event/enhanced-event-system';
import { EventPriority, EventProcessingMode, EventHandlerStatus } from '@framework/event/types';
import { logger } from '@utils/logger';

// Mock logger
jest.mock('@utils/logger', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('EnhancedEventSystem', () => {
  let eventSystem: EnhancedEventSystem;

  beforeEach(() => {
    eventSystem = new EnhancedEventSystem({
      enableMetrics: true,
      historyLimit: 10,
      defaultTimeout: 5000,
    });
    eventSystem.initialize();
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await eventSystem.shutdown();
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      expect(eventSystem).toBeDefined();
      expect(eventSystem.getMetrics().totalEventsPublished).toBe(0);
    });

    it('should initialize successfully', async () => {
      await eventSystem.initialize();
      expect(logger.info).toHaveBeenCalledWith('Enhanced event system initializing...');
      expect(logger.info).toHaveBeenCalledWith('Enhanced event system initialized');
    });
  });

  describe('Subscribe/Unsubscribe', () => {
    it('should subscribe to events and return subscription ID', () => {
      const handler = jest.fn();
      const subscriptionId = eventSystem.subscribe('test.event', handler);

      expect(subscriptionId).toBeDefined();
      expect(typeof subscriptionId).toBe('string');
      expect(eventSystem.getMetrics().activeSubscriptions).toBe(1);
    });

    it('should unsubscribe from events', () => {
      const handler = jest.fn();
      const subscriptionId = eventSystem.subscribe('test.event', handler);

      const unsubscribed = eventSystem.unsubscribe(subscriptionId);

      expect(unsubscribed).toBe(true);
      expect(eventSystem.getMetrics().activeSubscriptions).toBe(0);
    });

    it('should return false when unsubscribing non-existent subscription', () => {
      const unsubscribed = eventSystem.unsubscribe('non-existent');

      expect(unsubscribed).toBe(false);
      expect(logger.warn).toHaveBeenCalledWith('Subscription non-existent not found');
    });

    it('should subscribe with custom configuration', () => {
      const handler = jest.fn();
      const subscriptionId = eventSystem.subscribe('test.event', handler, {
        priority: EventPriority.HIGH,
        processingMode: EventProcessingMode.SYNC,
        timeout: 10000,
        maxRetries: 5,
      });

      expect(subscriptionId).toBeDefined();
      const subscriptions = eventSystem.getSubscriptions('test.event');
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0].config.priority).toBe(EventPriority.HIGH);
      expect(subscriptions[0].config.processingMode).toBe(EventProcessingMode.SYNC);
    });
  });

  describe('Pattern Subscription', () => {
    it('should subscribe using regex pattern', () => {
      const handler = jest.fn();
      const subscriptionId = eventSystem.subscribePattern(
        { type: 'regex', pattern: /^test\..*/ },
        handler
      );

      expect(subscriptionId).toBeDefined();
    });

    it('should subscribe using glob pattern', () => {
      const handler = jest.fn();
      const subscriptionId = eventSystem.subscribePattern(
        { type: 'glob', pattern: 'test.*' },
        handler
      );

      expect(subscriptionId).toBeDefined();
    });

    it('should subscribe using exact pattern', () => {
      const handler = jest.fn();
      const subscriptionId = eventSystem.subscribePattern(
        { type: 'exact', pattern: 'test.event' },
        handler
      );

      expect(subscriptionId).toBeDefined();
    });

    it('should throw error for unsupported pattern type', () => {
      const handler = jest.fn();

      expect(() => {
        eventSystem.subscribePattern({ type: 'unsupported' as any, pattern: 'test' }, handler);
      }).toThrow('Unsupported pattern type: unsupported');
    });
  });

  describe('Event Publishing', () => {
    it('should publish events and return event ID', () => {
      const eventId = eventSystem.publish('test.event', { data: 'test' });

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
      expect(eventSystem.getMetrics().totalEventsPublished).toBe(1);
    });

    it('should publish events with options', () => {
      const eventId = eventSystem.publish(
        'test.event',
        { data: 'test' },
        {
          source: 'test-source',
          priority: EventPriority.HIGH,
          correlationId: 'correlation-123',
          tags: ['test', 'important'],
        }
      );

      expect(eventId).toBeDefined();
      const history = eventSystem.getHistory('test.event');
      expect(history).toHaveLength(1);
      expect(history[0].source).toBe('test-source');
      expect(history[0].priority).toBe(EventPriority.HIGH);
      expect(history[0].correlationId).toBe('correlation-123');
      expect(history[0].tags).toEqual(['test', 'important']);
    });

    it('should publish batch events', () => {
      const eventIds = eventSystem.publishBatch({
        events: [
          { type: 'test.event1', payload: { data: 'test1' } },
          { type: 'test.event2', payload: { data: 'test2' } },
        ],
        priority: EventPriority.HIGH,
        processingMode: EventProcessingMode.ASYNC,
      });

      expect(eventIds).toHaveLength(2);
      expect(eventSystem.getMetrics().totalEventsPublished).toBe(2);
    });
  });

  describe('Synchronous Event Processing', () => {
    it('should process events synchronously', () => {
      const handler = jest.fn().mockReturnValue('sync-result');
      eventSystem.subscribe('test.event', handler);

      const results = eventSystem.emitSync('test.event', { data: 'test' });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(EventHandlerStatus.COMPLETED);
      expect(results[0].result).toBe('sync-result');
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'test.event',
          payload: { data: 'test' },
        })
      );
    });

    it('should handle synchronous errors', () => {
      const handler = jest.fn().mockImplementation(() => {
        throw new Error('Sync error');
      });
      eventSystem.subscribe('test.event', handler);

      const results = eventSystem.emitSync('test.event', { data: 'test' });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(EventHandlerStatus.FAILED);
      expect(results[0].error?.message).toBe('Sync error');
    });

    it('should reject async handlers in sync mode', () => {
      const handler = jest.fn().mockReturnValue(Promise.resolve('async-result'));
      eventSystem.subscribe('test.event', handler);

      const results = eventSystem.emitSync('test.event', { data: 'test' });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(EventHandlerStatus.FAILED);
      expect(results[0].error?.message).toBe('Synchronous execution cannot handle async handler');
    });
  });

  describe('Asynchronous Event Processing', () => {
    it('should process events asynchronously', async () => {
      const handler = jest.fn().mockResolvedValue('async-result');
      eventSystem.subscribe('test.event', handler);

      const results = await eventSystem.emitAsync('test.event', { data: 'test' });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(EventHandlerStatus.COMPLETED);
      expect(results[0].result).toBe('async-result');
    });

    it('should handle asynchronous errors with retry', async () => {
      const handler = jest
        .fn()
        .mockRejectedValueOnce(new Error('First error'))
        .mockRejectedValueOnce(new Error('Second error'))
        .mockResolvedValue('success');

      eventSystem.subscribe('test.event', handler, { maxRetries: 3 });

      const results = await eventSystem.emitAsync('test.event', { data: 'test' });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(EventHandlerStatus.COMPLETED);
      expect(results[0].result).toBe('success');
      expect(results[0].retryCount).toBe(2);
    });

    it('should fail after max retries', async () => {
      const handler = jest.fn().mockRejectedValue(new Error('Persistent error'));
      eventSystem.subscribe('test.event', handler, { maxRetries: 2 });

      const results = await eventSystem.emitAsync('test.event', { data: 'test' });

      expect(results).toHaveLength(1);
      expect(results[0].status).toBe(EventHandlerStatus.FAILED);
      expect(results[0].error?.message).toBe('Persistent error');
    });
  });

  describe('Event Prioritization', () => {
    it('should process high priority events before normal priority', done => {
      const executionOrder: string[] = [];

      const normalHandler = jest.fn(() => {
        executionOrder.push('normal');
      });

      const highHandler = jest.fn(() => {
        executionOrder.push('high');
        // Check order after both events are processed
        setTimeout(() => {
          expect(executionOrder).toEqual(['high', 'normal']);
          done();
        }, 100);
      });

      eventSystem.subscribe('normal.event', normalHandler, { priority: EventPriority.NORMAL });
      eventSystem.subscribe('high.event', highHandler, { priority: EventPriority.HIGH });

      // Publish normal priority first, then high priority
      eventSystem.publish('normal.event', {}, { priority: EventPriority.NORMAL });
      eventSystem.publish('high.event', {}, { priority: EventPriority.HIGH });
    });
  });

  describe('Middleware', () => {
    it('should apply middleware to events', async () => {
      const middlewareOrder: string[] = [];

      const middleware1 = jest.fn(async (_event, next) => {
        middlewareOrder.push('middleware1-before');
        await next();
        middlewareOrder.push('middleware1-after');
      });

      const middleware2 = jest.fn(async (_event, next) => {
        middlewareOrder.push('middleware2-before');
        await next();
        middlewareOrder.push('middleware2-after');
      });

      eventSystem.use(middleware1);
      eventSystem.use(middleware2);

      const handler = jest.fn(() => {
        middlewareOrder.push('handler');
      });

      eventSystem.subscribe('test.event', handler);
      await eventSystem.emitAsync('test.event', {});

      expect(middlewareOrder).toEqual([
        'middleware1-before',
        'middleware2-before',
        'handler',
        'middleware2-after',
        'middleware1-after',
      ]);
    });

    it('should remove middleware', () => {
      const middleware = jest.fn(async (_event, next) => await next());

      eventSystem.use(middleware);
      expect(eventSystem.removeMiddleware(middleware)).toBe(true);
      expect(eventSystem.removeMiddleware(middleware)).toBe(false);
    });
  });

  describe('Dead Letter Queue', () => {
    it('should retry events from dead letter queue', async () => {
      // First, create a failing event
      const handler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      eventSystem.subscribe('test.event', handler, { maxRetries: 0 });
      eventSystem.publish(
        'test.event',
        { data: 'test' },
        { processingMode: EventProcessingMode.SYNC }
      );

      // Wait for event to fail and be added to dead letter queue
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(eventSystem.getDeadLetterQueue()).toHaveLength(1);

      // Now retry the dead letter events
      await eventSystem.retryDeadLetterEvents();

      // The event should be back in the queue for processing
      expect(eventSystem.getMetrics().queueSize).toBeGreaterThan(0);
    });

    it('should clear dead letter queue', async () => {
      const handler = jest.fn().mockImplementation(() => {
        throw new Error('Handler error');
      });

      eventSystem.subscribe('test.event', handler, { maxRetries: 0 });
      eventSystem.publish(
        'test.event',
        { data: 'test' },
        { processingMode: EventProcessingMode.SYNC }
      );

      // Wait for event to fail
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(eventSystem.getDeadLetterQueue()).toHaveLength(1);

      eventSystem.clearDeadLetterQueue();

      expect(eventSystem.getDeadLetterQueue()).toHaveLength(0);
    });
  });

  describe('Event History', () => {
    it('should maintain event history', () => {
      eventSystem.publish('test.event', { data: 'test1' });
      eventSystem.publish('test.event', { data: 'test2' });
      eventSystem.publish('other.event', { data: 'other' });

      const testHistory = eventSystem.getHistory('test.event');
      const allHistory = eventSystem.getHistory();

      expect(testHistory).toHaveLength(2);
      expect(allHistory).toHaveLength(3);
      expect(testHistory[0].payload).toEqual({ data: 'test1' });
      expect(testHistory[1].payload).toEqual({ data: 'test2' });
    });

    it('should limit history size', () => {
      // Publish more events than the history limit (10)
      for (let i = 0; i < 15; i++) {
        eventSystem.publish('test.event', { data: `test${i}` });
      }

      const history = eventSystem.getHistory('test.event');
      expect(history).toHaveLength(10);
      expect(history[0].payload).toEqual({ data: 'test5' }); // First 5 should be trimmed
    });

    it('should return limited history when limit specified', () => {
      for (let i = 0; i < 5; i++) {
        eventSystem.publish('test.event', { data: `test${i}` });
      }

      const limitedHistory = eventSystem.getHistory('test.event', 3);
      expect(limitedHistory).toHaveLength(3);
      expect(limitedHistory[0].payload).toEqual({ data: 'test2' }); // Last 3 events
    });
  });

  describe('Metrics and Statistics', () => {
    it('should track system metrics', async () => {
      const handler = jest.fn().mockResolvedValue('result');
      eventSystem.subscribe('test.event', handler);

      eventSystem.publish('test.event', { data: 'test' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const metrics = eventSystem.getMetrics();

      expect(metrics.totalEventsPublished).toBe(1);
      expect(metrics.activeSubscriptions).toBe(1);
      expect(metrics.uptime).toBeGreaterThan(0);
    });

    it('should track event type statistics', async () => {
      const handler = jest.fn().mockResolvedValue('result');
      eventSystem.subscribe('test.event', handler);

      eventSystem.publish('test.event', { data: 'test' });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      const stats = eventSystem.getStats('test.event') as any;

      expect(stats.eventType).toBe('test.event');
      expect(stats.totalEvents).toBe(1);
      expect(stats.successfulEvents).toBe(1);
      expect(stats.failedEvents).toBe(0);
    });

    it('should get all statistics', () => {
      const allStats = eventSystem.getStats();
      expect(allStats instanceof Map).toBe(true);
    });
  });

  describe('Control Flow', () => {
    it('should pause and resume event processing', () => {
      expect(() => {
        eventSystem.pause();
        eventSystem.resume();
      }).not.toThrow();
    });

    it('should shutdown gracefully', async () => {
      await expect(eventSystem.shutdown()).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle before/after handlers', async () => {
      const beforeHandler = jest.fn();
      const afterHandler = jest.fn();
      const mainHandler = jest.fn().mockResolvedValue('result');

      eventSystem.subscribe('test.event', mainHandler, {
        beforeHandler,
        afterHandler,
      });

      await eventSystem.emitAsync('test.event', { data: 'test' });

      expect(beforeHandler).toHaveBeenCalled();
      expect(mainHandler).toHaveBeenCalled();
      expect(afterHandler).toHaveBeenCalledWith(expect.any(Object), 'result');
    });

    it('should handle error in error handler', async () => {
      const errorHandler = jest.fn();
      const mainHandler = jest.fn().mockRejectedValue(new Error('Main error'));

      eventSystem.subscribe('test.event', mainHandler, {
        errorHandler,
        maxRetries: 0,
      });

      await eventSystem.emitAsync('test.event', { data: 'test' });

      expect(errorHandler).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
    });

    it('should handle timeout', async () => {
      const slowHandler = jest.fn().mockImplementation(() => {
        return new Promise(resolve => setTimeout(resolve, 1000));
      });

      eventSystem.subscribe('test.event', slowHandler, {
        timeout: 100,
        maxRetries: 0,
      });

      const results = await eventSystem.emitAsync('test.event', { data: 'test' });

      expect(results[0].status).toBe(EventHandlerStatus.FAILED);
      expect(results[0].error?.message).toContain('timed out');
    });
  });

  describe('Event Filtering', () => {
    it('should filter events based on custom filter', async () => {
      const handler = jest.fn();
      const filter = jest.fn().mockReturnValue(false); // Filter out all events

      eventSystem.subscribe('test.event', handler, { filter });

      await eventSystem.emitAsync('test.event', { data: 'test' });

      expect(filter).toHaveBeenCalled();
      expect(handler).not.toHaveBeenCalled();
    });

    it('should process events that pass filter', async () => {
      const handler = jest.fn();
      const filter = jest.fn().mockReturnValue(true); // Allow all events

      eventSystem.subscribe('test.event', handler, { filter });

      await eventSystem.emitAsync('test.event', { data: 'test' });

      expect(filter).toHaveBeenCalled();
      expect(handler).toHaveBeenCalled();
    });
  });
});
