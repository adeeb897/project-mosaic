import { EventEmitter } from 'events';
import { logger } from '@utils/logger';
import {
  EnhancedEvent,
  EnhancedEventHandler,
  EnhancedSubscription,
  EventHandlerConfig,
  EventHandlerResult,
  EventHandlerStatus,
  EventPriority,
  EventProcessingMode,
  EventProcessingStats,
  EventSystemConfig,
  EventSystemMetrics,
  EventBatch,
  EventPattern,
  DeadLetterEvent,
  EventMiddleware,
} from './types';
import { PriorityQueue } from './priority-queue';
import { EventProcessor } from './event-processor';
import { MetricsManager } from './metrics-manager';

/**
 * Enhanced Event System with comprehensive publish/subscribe capabilities
 */
export class EnhancedEventSystem {
  private emitter: EventEmitter;
  private subscriptions: Map<string, EnhancedSubscription>;
  private eventQueue: PriorityQueue<EnhancedEvent>;
  private deadLetterQueue: DeadLetterEvent[];
  private eventHistory: Map<string, EnhancedEvent[]>;
  private middleware: EventMiddleware[];
  private config: EventSystemConfig;
  private isProcessing: boolean;
  private processingPromises: Map<string, Promise<void>>;
  private processor: EventProcessor;
  private metricsManager: MetricsManager;

  constructor(config?: Partial<EventSystemConfig>) {
    this.emitter = new EventEmitter();
    this.subscriptions = new Map();
    this.eventQueue = new PriorityQueue();
    this.deadLetterQueue = [];
    this.eventHistory = new Map();
    this.middleware = [];
    this.isProcessing = false;
    this.processingPromises = new Map();
    this.processor = new EventProcessor();
    this.metricsManager = new MetricsManager();

    // Default configuration
    this.config = {
      maxListeners: 1000,
      historyLimit: 1000,
      enableMetrics: true,
      enablePersistence: false,
      defaultTimeout: 30000,
      defaultRetryPolicy: {
        maxRetries: 3,
        initialDelay: 1000,
        backoffMultiplier: 2,
        maxDelay: 10000,
        jitter: true,
      },
      queueConfig: {
        maxSize: 10000,
        processingConcurrency: 10,
        retryPolicy: {
          maxRetries: 3,
          initialDelay: 1000,
          backoffMultiplier: 2,
          maxDelay: 10000,
          jitter: true,
        },
        deadLetterQueue: true,
        persistEvents: false,
      },
      middleware: [],
      ...config,
    };

    this.emitter.setMaxListeners(this.config.maxListeners);
    this.middleware = [...this.config.middleware];

    // Start processing queue
    this.startQueueProcessing();
  }

  /**
   * Initialize the enhanced event system
   */
  public async initialize(): Promise<void> {
    logger.info('Enhanced event system initializing...');

    // Set up error handling
    this.emitter.on('error', error => {
      logger.error('Enhanced event system error:', error);
    });

    // Start metrics collection if enabled
    if (this.config.enableMetrics) {
      this.startMetricsCollection();
    }

    logger.info('Enhanced event system initialized');
  }

  /**
   * Subscribe to events with enhanced configuration
   */
  public subscribe(
    eventType: string,
    handler: EnhancedEventHandler,
    config: EventHandlerConfig = {}
  ): string {
    const subscriptionId = this.generateId();

    const subscription: EnhancedSubscription = {
      id: subscriptionId,
      eventType,
      handler,
      config: {
        priority: EventPriority.NORMAL,
        processingMode: EventProcessingMode.ASYNC,
        timeout: this.config.defaultTimeout,
        maxRetries: this.config.defaultRetryPolicy.maxRetries,
        retryDelay: this.config.defaultRetryPolicy.initialDelay,
        retryBackoff: this.config.defaultRetryPolicy.backoffMultiplier,
        ...config,
      },
      createdAt: Date.now(),
      isActive: true,
      executionCount: 0,
      totalExecutionTime: 0,
      errorCount: 0,
    };

    this.subscriptions.set(subscriptionId, subscription);
    this.updateMetrics();

    logger.debug(`Subscribed to event ${eventType} with ID ${subscriptionId}`);

    return subscriptionId;
  }

  /**
   * Subscribe to events using pattern matching
   */
  public subscribePattern(
    pattern: EventPattern,
    handler: EnhancedEventHandler,
    config: EventHandlerConfig = {}
  ): string {
    // Create a filter function based on the pattern
    let filter: (event: EnhancedEvent) => boolean;

    const regex = pattern.pattern instanceof RegExp ? pattern.pattern : new RegExp(pattern.pattern);
    const globPattern = pattern.pattern as string;
    switch (pattern.type) {
      case 'regex':
        filter = event => regex.test(event.type);
        break;
      case 'glob':
        filter = event => this.processor.matchGlob(event.type, globPattern);
        break;
      case 'exact':
        filter = event => event.type === pattern.pattern;
        break;
      default:
        throw new Error(`Unsupported pattern type: ${pattern.type}`);
    }

    const enhancedConfig = {
      ...config,
      filter: config.filter
        ? (event: EnhancedEvent) => config.filter!(event) && filter(event)
        : filter,
    };

    return this.subscribe('*', handler, enhancedConfig);
  }

  /**
   * Unsubscribe from events
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) {
      logger.warn(`Subscription ${subscriptionId} not found`);
      return false;
    }

    subscription.isActive = false;
    this.subscriptions.delete(subscriptionId);
    this.updateMetrics();

    logger.debug(`Unsubscribed from event ${subscription.eventType} with ID ${subscriptionId}`);

    return true;
  }

  /**
   * Publish an event with enhanced options
   */
  public publish(
    eventType: string,
    payload: Record<string, unknown> = {},
    options: {
      source?: string;
      priority?: EventPriority;
      processingMode?: EventProcessingMode;
      correlationId?: string;
      parentEventId?: string;
      timeout?: number;
      tags?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): string {
    const eventId = this.generateId();

    const event: EnhancedEvent = {
      id: eventId,
      type: eventType,
      payload,
      timestamp: Date.now(),
      source: options.source,
      priority: options.priority ?? EventPriority.NORMAL,
      processingMode: options.processingMode ?? EventProcessingMode.ASYNC,
      correlationId: options.correlationId,
      parentEventId: options.parentEventId,
      timeout: options.timeout,
      tags: options.tags,
      metadata: options.metadata,
      retryCount: 0,
      maxRetries: this.config.defaultRetryPolicy.maxRetries,
    };

    // Add to history
    this.addToHistory(event);

    // Add to queue for processing
    this.eventQueue.enqueue(event, event.priority);

    // Update metrics
    this.metricsManager.incrementEventsPublished();
    this.updateMetrics();

    logger.debug(`Published event ${eventType} with ID ${eventId}`);

    return eventId;
  }

  /**
   * Publish multiple events as a batch
   */
  public publishBatch(batch: EventBatch): string[] {
    const eventIds: string[] = [];

    for (const event of batch.events) {
      const eventId = this.publish(event.type, event.payload, {
        source: event.source,
        priority: batch.priority,
        processingMode: batch.processingMode,
        correlationId: event.correlationId,
        parentEventId: event.parentEventId,
        timeout: event.timeout,
        tags: event.tags,
        metadata: event.metadata,
      });
      eventIds.push(eventId);
    }

    return eventIds;
  }

  /**
   * Emit event synchronously (immediate processing)
   */
  public emitSync(
    eventType: string,
    payload: Record<string, unknown> = {},
    options: {
      source?: string;
      correlationId?: string;
      metadata?: Record<string, unknown>;
    } = {}
  ): EventHandlerResult[] {
    const event: EnhancedEvent = {
      id: this.generateId(),
      type: eventType,
      payload,
      timestamp: Date.now(),
      source: options.source,
      priority: EventPriority.CRITICAL,
      processingMode: EventProcessingMode.SYNC,
      correlationId: options.correlationId,
      metadata: options.metadata,
      retryCount: 0,
      maxRetries: 0,
    };

    return this.processEventSync(event);
  }

  /**
   * Emit event asynchronously and wait for completion
   */
  public async emitAsync(
    eventType: string,
    payload: Record<string, unknown> = {},
    options: {
      source?: string;
      correlationId?: string;
      metadata?: Record<string, unknown>;
      timeout?: number;
    } = {}
  ): Promise<EventHandlerResult[]> {
    const event: EnhancedEvent = {
      id: this.generateId(),
      type: eventType,
      payload,
      timestamp: Date.now(),
      source: options.source,
      priority: EventPriority.HIGH,
      processingMode: EventProcessingMode.ASYNC,
      correlationId: options.correlationId,
      metadata: options.metadata,
      timeout: options.timeout,
      retryCount: 0,
      maxRetries: this.config.defaultRetryPolicy.maxRetries,
    };

    // Apply middleware and process the event directly
    return this.processEventWithMiddleware(event);
  }

  /**
   * Add middleware to the event processing pipeline
   */
  public use(middleware: EventMiddleware): void {
    this.middleware.push(middleware);
  }

  /**
   * Remove middleware from the event processing pipeline
   */
  public removeMiddleware(middleware: EventMiddleware): boolean {
    const index = this.middleware.indexOf(middleware);
    if (index !== -1) {
      this.middleware.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Get event processing statistics
   */
  public getStats(eventType?: string): EventProcessingStats | Map<string, EventProcessingStats> {
    return this.metricsManager.getStats(eventType);
  }

  /**
   * Get system metrics
   */
  public getMetrics(): EventSystemMetrics {
    this.updateMetrics();
    return this.metricsManager.getMetrics();
  }

  /**
   * Get event history
   */
  public getHistory(eventType?: string, limit?: number): EnhancedEvent[] {
    if (eventType) {
      const history = this.eventHistory.get(eventType) || [];
      return limit ? history.slice(-limit) : [...history];
    }

    const allHistory: EnhancedEvent[] = [];
    for (const history of this.eventHistory.values()) {
      allHistory.push(...history);
    }

    allHistory.sort((a, b) => a.timestamp - b.timestamp);
    return limit ? allHistory.slice(-limit) : allHistory;
  }

  /**
   * Get dead letter queue
   */
  public getDeadLetterQueue(): DeadLetterEvent[] {
    return [...this.deadLetterQueue];
  }

  /**
   * Clear dead letter queue
   */
  public clearDeadLetterQueue(): void {
    this.deadLetterQueue = [];
  }

  /**
   * Retry events from dead letter queue
   */
  public async retryDeadLetterEvents(filter?: (event: DeadLetterEvent) => boolean): Promise<void> {
    const eventsToRetry = filter ? this.deadLetterQueue.filter(filter) : [...this.deadLetterQueue];

    for (const deadLetterEvent of eventsToRetry) {
      const event = { ...deadLetterEvent.originalEvent };
      event.retryCount = 0; // Reset retry count
      this.eventQueue.enqueue(event, event.priority);

      // Remove from dead letter queue
      const index = this.deadLetterQueue.indexOf(deadLetterEvent);
      if (index !== -1) {
        this.deadLetterQueue.splice(index, 1);
      }
    }
  }

  /**
   * Get active subscriptions
   */
  public getSubscriptions(eventType?: string): EnhancedSubscription[] {
    const subscriptions = Array.from(this.subscriptions.values()).filter(sub => sub.isActive);

    if (eventType) {
      return subscriptions.filter(sub => sub.eventType === eventType || sub.eventType === '*');
    }

    return subscriptions;
  }

  /**
   * Pause event processing
   */
  public pause(): void {
    this.isProcessing = false;
    logger.info('Event processing paused');
  }

  /**
   * Resume event processing
   */
  public resume(): void {
    if (!this.isProcessing) {
      this.isProcessing = true;
      this.startQueueProcessing();
      logger.info('Event processing resumed');
    }
  }

  /**
   * Shutdown the event system
   */
  public async shutdown(): Promise<void> {
    logger.info('Shutting down enhanced event system...');

    this.isProcessing = false;

    // Wait for all processing promises to complete
    await Promise.allSettled(Array.from(this.processingPromises.values()));

    // Clear all data structures
    this.subscriptions.clear();
    this.eventQueue.clear();
    this.eventHistory.clear();
    this.deadLetterQueue = [];
    this.processingPromises.clear();

    logger.info('Enhanced event system shutdown complete');
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 5000); // Update metrics every 5 seconds
  }

  /**
   * Start queue processing
   */
  private startQueueProcessing(): void {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    const processQueue = async () => {
      while (this.isProcessing) {
        try {
          if (this.eventQueue.isEmpty()) {
            await this.sleep(10); // Small delay when queue is empty
            continue;
          }

          const event = this.eventQueue.dequeue();
          if (event) {
            // Process immediately to allow priority queue to work properly
            this.processEvent(event).catch(error => {
              logger.error('Error processing event:', error);
            });
          }
        } catch (error) {
          logger.error('Error in queue processing:', error);
          await this.sleep(1000); // Longer delay on error
        }
      }
    };

    processQueue();
  }

  /**
   * Process a single event
   */
  private async processEvent(event: EnhancedEvent): Promise<void> {
    try {
      // Get matching subscriptions
      const subscriptions = this.processor.getMatchingSubscriptions(event, this.subscriptions);

      if (subscriptions.length === 0) {
        return;
      }

      // Process based on processing mode but handle errors to add to dead letter queue
      const handlerPromise = async (): Promise<void> => {
        try {
          const results = await this.processor.processSubscriptions(
            event,
            subscriptions,
            this.config.defaultTimeout,
            this.config.defaultRetryPolicy
          );
          // Update subscription stats for each result
          results.forEach(result => {
            const subscription = this.subscriptions.get(result.handlerId);
            if (subscription && result.duration !== undefined) {
              this.metricsManager.updateSubscriptionStats(
                subscription,
                result.duration,
                result.status === EventHandlerStatus.FAILED
              );
            }
          });

          // Check for failures and add to dead letter queue
          const hasFailures = results.some(result => result.status === EventHandlerStatus.FAILED);
          if (hasFailures) {
            this.handleEventProcessingError(event, new Error('One or more handlers failed'));
          } else {
            this.metricsManager.incrementEventsProcessed();
            this.metricsManager.updateEventTypeStats(event.type, true);
          }
        } catch (processingError) {
          // All handlers failed
          this.handleEventProcessingError(event, processingError as Error);
        }
      };

      // Process the event with middleware
      this.applyMiddleware(event, handlerPromise);
    } catch (error) {
      logger.error(`Error processing event ${event.id}:`, error);
      this.handleEventProcessingError(event, error as Error);
    }
  }

  /**
   * Process event with middleware for direct processing (emitAsync)
   */
  private async processEventWithMiddleware(event: EnhancedEvent): Promise<EventHandlerResult[]> {
    try {
      // Process the event
      const subscriptions = this.processor.getMatchingSubscriptions(event, this.subscriptions);
      const results: EventHandlerResult[] = [];

      const handlerPromise = async () => {
        for (const subscription of subscriptions) {
          try {
            const result = await this.processor.executeHandlerAsync(
              subscription,
              event,
              this.config.defaultTimeout,
              this.config.defaultRetryPolicy
            );
            results.push(result);

            // Update subscription stats
            if (result.duration !== undefined) {
              this.metricsManager.updateSubscriptionStats(
                subscription,
                result.duration,
                result.status === EventHandlerStatus.FAILED
              );
            }
          } catch (error) {
            // Handle individual handler errors
            this.handleEventProcessingError(event, error as Error);
            const errorResult = {
              handlerId: subscription.id,
              eventId: event.id,
              status: EventHandlerStatus.FAILED,
              startTime: Date.now(),
              endTime: Date.now(),
              duration: 0,
              retryCount: 0,
              error: error as Error,
            };
            results.push(errorResult);
          }
        }
      };

      // Apply handlers with middleware
      await this.applyMiddleware(event, handlerPromise);

      return results;
    } catch (error) {
      logger.error(`Error processing event ${event.id}:`, error);
      this.handleEventProcessingError(event, error as Error);
      return [];
    }
  }

  /**
   * Process event synchronously
   */
  private processEventSync(event: EnhancedEvent): EventHandlerResult[] {
    const subscriptions = this.processor.getMatchingSubscriptions(event, this.subscriptions);
    const results: EventHandlerResult[] = [];

    for (const subscription of subscriptions) {
      const result = this.processor.executeHandlerSync(subscription, event);
      results.push(result);

      // Update subscription stats
      if (result.duration !== undefined) {
        this.metricsManager.updateSubscriptionStats(
          subscription,
          result.duration,
          result.status === EventHandlerStatus.FAILED
        );
      }
    }

    return results;
  }

  /**
   * Apply middleware to event
   */
  private async applyMiddleware(event: EnhancedEvent, handler: () => Promise<void>): Promise<void> {
    let index = 0;

    const next = async (): Promise<void> => {
      if (index < this.middleware.length) {
        const middleware = this.middleware[index++];
        await middleware(event, next);
      } else if (index === this.middleware.length) {
        // All middleware has been applied, now process the event
        await handler();
        // console.log(handler);
      }
    };

    await next();
  }

  /**
   * Handle event processing error
   */
  private handleEventProcessingError(event: EnhancedEvent, error: Error): void {
    this.metricsManager.incrementEventsFailed();
    this.metricsManager.updateEventTypeStats(event.type, false);

    // Add to dead letter queue if enabled
    if (this.config.queueConfig.deadLetterQueue) {
      const deadLetterEvent: DeadLetterEvent = {
        originalEvent: event,
        failureReason: error.message,
        failureTime: Date.now(),
        attemptCount: (event.retryCount || 0) + 1,
        lastError: error,
      };

      this.deadLetterQueue.push(deadLetterEvent);

      // Limit dead letter queue size
      if (this.deadLetterQueue.length > 1000) {
        this.deadLetterQueue.shift();
      }
    }
  }

  /**
   * Add event to history
   */
  private addToHistory(event: EnhancedEvent): void {
    if (!this.eventHistory.has(event.type)) {
      this.eventHistory.set(event.type, []);
    }

    const history = this.eventHistory.get(event.type)!;
    history.push(event);

    // Trim history if needed
    if (history.length > this.config.historyLimit) {
      history.shift();
    }
  }

  /**
   * Update system metrics
   */
  private updateMetrics(): void {
    this.metricsManager.updateMetrics(this.subscriptions, this.eventQueue.size());
  }
}
