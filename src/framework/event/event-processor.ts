import { logger } from '@utils/logger';
import {
  EnhancedEvent,
  EnhancedSubscription,
  EventHandlerConfig,
  EventHandlerResult,
  EventHandlerStatus,
  EventPriority,
  EventProcessingMode,
} from './types';

/**
 * Event processor that handles the execution of event handlers
 */
export class EventProcessor {
  /**
   * Execute handler synchronously
   */
  public executeHandlerSync(
    subscription: EnhancedSubscription,
    event: EnhancedEvent
  ): EventHandlerResult {
    const startTime = Date.now();
    const result: EventHandlerResult = {
      handlerId: subscription.id,
      eventId: event.id,
      status: EventHandlerStatus.RUNNING,
      startTime,
      retryCount: 0,
    };

    try {
      // Execute before handler if present
      if (subscription.config.beforeHandler) {
        const beforeResult = subscription.config.beforeHandler(event);
        if (beforeResult instanceof Promise) {
          throw new Error('Synchronous handler cannot have async beforeHandler');
        }
      }

      // Execute main handler
      const handlerResult = subscription.handler(event);
      if (handlerResult instanceof Promise) {
        throw new Error('Synchronous execution cannot handle async handler');
      }

      // Execute after handler if present
      if (subscription.config.afterHandler) {
        const afterResult = subscription.config.afterHandler(event, handlerResult);
        if (afterResult instanceof Promise) {
          throw new Error('Synchronous handler cannot have async afterHandler');
        }
      }

      result.status = EventHandlerStatus.COMPLETED;
      result.result = handlerResult;
      result.endTime = Date.now();
      result.duration = result.endTime - startTime;
    } catch (error) {
      result.status = EventHandlerStatus.FAILED;
      result.error = error as Error;
      result.endTime = Date.now();
      result.duration = result.endTime - startTime;

      // Handle error
      if (subscription.config.errorHandler) {
        subscription.config.errorHandler(error as Error, event);
      }

      logger.error(`Handler ${subscription.id} failed for event ${event.id}:`, error);
    }

    return result;
  }

  /**
   * Execute handler asynchronously with retry logic
   */
  public async executeHandlerAsync(
    subscription: EnhancedSubscription,
    event: EnhancedEvent,
    defaultTimeout: number,
    retryPolicy: {
      maxRetries: number;
      initialDelay: number;
      backoffMultiplier: number;
      maxDelay: number;
      jitter: boolean;
    }
  ): Promise<EventHandlerResult> {
    const startTime = Date.now();
    const result: EventHandlerResult = {
      handlerId: subscription.id,
      eventId: event.id,
      status: EventHandlerStatus.RUNNING,
      startTime,
      retryCount: 0,
    };

    const maxRetries = subscription.config.maxRetries || 0;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        result.retryCount = attempt;

        if (attempt > 0) {
          result.status = EventHandlerStatus.RETRYING;
          const delay = this.calculateRetryDelay(attempt, subscription.config, retryPolicy);
          await this.sleep(delay);
        }

        // Execute before handler if present
        if (subscription.config.beforeHandler) {
          const beforeResult = subscription.config.beforeHandler(event);
          if (beforeResult instanceof Promise) {
            await beforeResult;
          }
        }

        // Execute main handler with timeout
        const timeout = subscription.config.timeout || event.timeout || defaultTimeout;
        const handlerPromise = subscription.handler(event);
        const handlerResult =
          handlerPromise instanceof Promise
            ? await this.executeWithTimeout(handlerPromise, timeout)
            : handlerPromise;

        // Execute after handler if present
        if (subscription.config.afterHandler) {
          const afterResult = subscription.config.afterHandler(event, handlerResult);
          if (afterResult instanceof Promise) {
            await afterResult;
          }
        }

        result.status = EventHandlerStatus.COMPLETED;
        result.result = handlerResult;
        result.endTime = Date.now();
        result.duration = result.endTime - startTime;

        return result;
      } catch (error) {
        lastError = error as Error;

        // Handle error
        if (subscription.config.errorHandler) {
          subscription.config.errorHandler(error as Error, event);
        }

        if (attempt === maxRetries) {
          result.status = EventHandlerStatus.FAILED;
          result.error = lastError;
          result.endTime = Date.now();
          result.duration = result.endTime - startTime;

          logger.error(
            `Handler ${subscription.id} failed for event ${event.id} after ${attempt + 1} attempts:`,
            error
          );
        }
      }
    }

    return result;
  }

  /**
   * Process subscriptions based on processing mode
   */
  public async processSubscriptions(
    event: EnhancedEvent,
    subscriptions: EnhancedSubscription[],
    defaultTimeout: number,
    retryPolicy: {
      maxRetries: number;
      initialDelay: number;
      backoffMultiplier: number;
      maxDelay: number;
      jitter: boolean;
    }
  ): Promise<EventHandlerResult[]> {
    switch (event.processingMode) {
      case EventProcessingMode.SYNC:
        return this.processSubscriptionsSync(event, subscriptions, defaultTimeout, retryPolicy);
      case EventProcessingMode.ASYNC:
        this.processSubscriptionsAsync(event, subscriptions, defaultTimeout, retryPolicy);
        return [];
      case EventProcessingMode.PARALLEL:
        return this.processSubscriptionsParallel(event, subscriptions, defaultTimeout, retryPolicy);
      case EventProcessingMode.SEQUENTIAL:
        return this.processSubscriptionsSequential(
          event,
          subscriptions,
          defaultTimeout,
          retryPolicy
        );
      default:
        return [];
    }
  }

  /**
   * Process subscriptions synchronously
   */
  private async processSubscriptionsSync(
    event: EnhancedEvent,
    subscriptions: EnhancedSubscription[],
    defaultTimeout: number,
    retryPolicy: any
  ): Promise<EventHandlerResult[]> {
    const results: EventHandlerResult[] = [];
    for (const subscription of subscriptions) {
      const result = await this.executeHandlerAsync(
        subscription,
        event,
        defaultTimeout,
        retryPolicy
      );
      results.push(result);
    }
    return results;
  }

  /**
   * Process subscriptions asynchronously (fire and forget)
   */
  private processSubscriptionsAsync(
    event: EnhancedEvent,
    subscriptions: EnhancedSubscription[],
    defaultTimeout: number,
    retryPolicy: any
  ): void {
    for (const subscription of subscriptions) {
      this.executeHandlerAsync(subscription, event, defaultTimeout, retryPolicy).catch(error => {
        logger.error(`Error in async handler for event ${event.id}:`, error);
      });
    }
  }

  /**
   * Process subscriptions in parallel
   */
  private async processSubscriptionsParallel(
    event: EnhancedEvent,
    subscriptions: EnhancedSubscription[],
    defaultTimeout: number,
    retryPolicy: any
  ): Promise<EventHandlerResult[]> {
    const promises = subscriptions.map(subscription =>
      this.executeHandlerAsync(subscription, event, defaultTimeout, retryPolicy)
    );
    const results = await Promise.allSettled(promises);
    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          handlerId: subscriptions[index].id,
          eventId: event.id,
          status: EventHandlerStatus.FAILED,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
          retryCount: 0,
          error: result.reason,
        };
      }
    });
  }

  /**
   * Process subscriptions sequentially
   */
  private async processSubscriptionsSequential(
    event: EnhancedEvent,
    subscriptions: EnhancedSubscription[],
    defaultTimeout: number,
    retryPolicy: any
  ): Promise<EventHandlerResult[]> {
    const results: EventHandlerResult[] = [];
    for (const subscription of subscriptions) {
      const result = await this.executeHandlerAsync(
        subscription,
        event,
        defaultTimeout,
        retryPolicy
      );
      results.push(result);
    }
    return results;
  }

  /**
   * Execute function with timeout
   */
  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Handler execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * Calculate retry delay with backoff and jitter
   */
  private calculateRetryDelay(
    attempt: number,
    config: EventHandlerConfig,
    retryPolicy: {
      initialDelay: number;
      backoffMultiplier: number;
      maxDelay: number;
      jitter: boolean;
    }
  ): number {
    const baseDelay = config.retryDelay || retryPolicy.initialDelay;
    const backoff = config.retryBackoff || retryPolicy.backoffMultiplier;
    const maxDelay = retryPolicy.maxDelay;

    let delay = baseDelay * Math.pow(backoff, attempt - 1);
    delay = Math.min(delay, maxDelay);

    // Add jitter if enabled
    if (retryPolicy.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }

    return Math.floor(delay);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get matching subscriptions for an event
   */
  public getMatchingSubscriptions(
    event: EnhancedEvent,
    subscriptions: Map<string, EnhancedSubscription>
  ): EnhancedSubscription[] {
    const matchingSubscriptions: EnhancedSubscription[] = [];

    for (const subscription of subscriptions.values()) {
      if (!subscription.isActive) {
        continue;
      }

      // Check if event type matches
      if (subscription.eventType !== '*' && subscription.eventType !== event.type) {
        continue;
      }

      // Apply filter if present
      if (subscription.config.filter && !subscription.config.filter(event)) {
        continue;
      }

      matchingSubscriptions.push(subscription);
    }

    // Sort by priority
    matchingSubscriptions.sort(
      (a, b) =>
        (a.config.priority || EventPriority.NORMAL) - (b.config.priority || EventPriority.NORMAL)
    );

    return matchingSubscriptions;
  }

  /**
   * Match glob pattern
   */
  public matchGlob(text: string, pattern: string): boolean {
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(text);
  }
}
