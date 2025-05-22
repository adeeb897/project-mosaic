import { EventEmitter } from 'events';
import { logger } from '@utils/logger';

/**
 * Event interface
 */
export interface Event {
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  source?: string;
  id?: string;
}

/**
 * Event handler function type
 */
export type EventHandler = (event: Event) => void | Promise<void>;

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  once?: boolean;
  priority?: number;
  filter?: (event: Event) => boolean;
}

/**
 * Subscription interface
 */
export interface Subscription {
  id: string;
  eventType: string;
  handler: EventHandler;
  options: SubscriptionOptions;
}

/**
 * Event Bus class
 * Central event management system
 */
class EventBus {
  private emitter: EventEmitter;
  private subscriptions: Map<string, Subscription>;
  private eventHistory: Map<string, Event[]>;
  private historyLimit: number;

  constructor() {
    this.emitter = new EventEmitter();
    this.emitter.setMaxListeners(100); // Set high limit for listeners
    this.subscriptions = new Map();
    this.eventHistory = new Map();
    this.historyLimit = 100; // Default history limit per event type
  }

  /**
   * Initialize the event system
   */
  public async initialize(): Promise<void> {
    logger.info('Event system initializing...');

    // Set up error handling
    this.emitter.on('error', error => {
      logger.error('Event system error:', error);
    });

    logger.info('Event system initialized');
  }

  /**
   * Subscribe to an event
   * @param eventType Event type to subscribe to
   * @param handler Event handler function
   * @param options Subscription options
   * @returns Subscription ID
   */
  public subscribe(
    eventType: string,
    handler: EventHandler,
    options: SubscriptionOptions = {}
  ): string {
    const subscriptionId = this.generateId();

    const subscription: Subscription = {
      id: subscriptionId,
      eventType,
      handler,
      options,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Set up the actual event listener
    if (options.once) {
      this.emitter.once(eventType, async (event: Event) => {
        if (options.filter && !options.filter(event)) {
          return;
        }

        try {
          await handler(event);
        } catch (error) {
          logger.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    } else {
      this.emitter.on(eventType, async (event: Event) => {
        if (options.filter && !options.filter(event)) {
          return;
        }

        try {
          await handler(event);
        } catch (error) {
          logger.error(`Error in event handler for ${eventType}:`, error);
        }
      });
    }

    logger.debug(`Subscribed to event ${eventType} with ID ${subscriptionId}`);

    return subscriptionId;
  }

  /**
   * Unsubscribe from an event
   * @param subscriptionId Subscription ID to unsubscribe
   * @returns True if unsubscribed successfully
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);

    if (!subscription) {
      logger.warn(`Subscription ${subscriptionId} not found`);
      return false;
    }

    this.emitter.removeListener(subscription.eventType, subscription.handler);
    this.subscriptions.delete(subscriptionId);

    logger.debug(`Unsubscribed from event ${subscription.eventType} with ID ${subscriptionId}`);

    return true;
  }

  /**
   * Publish an event
   * @param eventType Event type to publish
   * @param payload Event payload
   * @param source Source of the event
   * @returns Event ID
   */
  public publish(eventType: string, payload: Record<string, unknown>, source?: string): string {
    const eventId = this.generateId();

    const event: Event = {
      id: eventId,
      type: eventType,
      payload,
      timestamp: Date.now(),
      source,
    };

    // Store in history
    if (!this.eventHistory.has(eventType)) {
      this.eventHistory.set(eventType, []);
    }

    const history = this.eventHistory.get(eventType)!;
    history.push(event);

    // Trim history if needed
    if (history.length > this.historyLimit) {
      history.shift();
    }

    // Emit the event
    this.emitter.emit(eventType, event);

    logger.debug(`Published event ${eventType} with ID ${eventId}`);

    return eventId;
  }

  /**
   * Get event history for a specific type
   * @param eventType Event type to get history for
   * @param limit Maximum number of events to return
   * @returns Array of events
   */
  public getHistory(eventType: string, limit?: number): Event[] {
    const history = this.eventHistory.get(eventType) || [];

    if (limit && limit > 0) {
      return history.slice(-limit);
    }

    return [...history];
  }

  /**
   * Clear event history for a specific type
   * @param eventType Event type to clear history for
   */
  public clearHistory(eventType: string): void {
    this.eventHistory.delete(eventType);
    logger.debug(`Cleared history for event ${eventType}`);
  }

  /**
   * Set history limit per event type
   * @param limit Maximum number of events to store
   */
  public setHistoryLimit(limit: number): void {
    this.historyLimit = limit;

    // Trim existing histories
    for (const [eventType, history] of this.eventHistory.entries()) {
      if (history.length > limit) {
        this.eventHistory.set(eventType, history.slice(-limit));
      }
    }
  }

  /**
   * Generate a unique ID
   * @returns Unique ID string
   */
  private generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
  }
}

// Create singleton instance
export const eventBus = new EventBus();

/**
 * Initialize the event system
 */
export const initEventSystem = async (): Promise<void> => {
  await eventBus.initialize();
};

// Export convenience methods
export const subscribe = eventBus.subscribe.bind(eventBus);
export const unsubscribe = eventBus.unsubscribe.bind(eventBus);
export const publish = eventBus.publish.bind(eventBus);
export const getHistory = eventBus.getHistory.bind(eventBus);
