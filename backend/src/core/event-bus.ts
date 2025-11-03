/**
 * Event Bus - Redis-based pub/sub for system-wide events
 */
import { EventBus as IEventBus, SystemEvent, EventHandler, Unsubscribe } from '@mosaic/shared';
import { createClient, RedisClientType } from 'redis';
import { logger } from './logger';
import { v4 as uuid } from 'uuid';

export class EventBus implements IEventBus {
  private publishClient: RedisClientType;
  private subscribeClient: RedisClientType;
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private patternHandlers: Map<string, Set<EventHandler>> = new Map();
  private connected: boolean = false;

  constructor(redisUrl: string) {
    this.publishClient = createClient({ url: redisUrl });
    this.subscribeClient = createClient({ url: redisUrl });
  }

  async connect(): Promise<void> {
    if (this.connected) return;

    try {
      await this.publishClient.connect();
      await this.subscribeClient.connect();
      this.connected = true;
      logger.info('Event bus connected');
    } catch (error) {
      logger.error('Failed to connect to event bus', { error });
      throw error;
    }
  }

  async publish(channel: string, event: SystemEvent): Promise<void> {
    if (!this.connected) {
      throw new Error('Event bus not connected');
    }

    try {
      const message = JSON.stringify(event);
      await this.publishClient.publish(channel, message);
      logger.debug('Event published', { channel, eventType: event.type });
    } catch (error) {
      logger.error('Failed to publish event', { channel, error });
      throw error;
    }
  }

  subscribe(channel: string, handler: EventHandler): Unsubscribe {
    if (!this.handlers.has(channel)) {
      this.handlers.set(channel, new Set());

      // Subscribe to Redis channel
      this.subscribeClient.subscribe(channel, (message) => {
        this.handleMessage(channel, message);
      });
    }

    this.handlers.get(channel)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(channel);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribeClient.unsubscribe(channel);
          this.handlers.delete(channel);
        }
      }
    };
  }

  subscribePattern(pattern: string, handler: EventHandler): Unsubscribe {
    if (!this.patternHandlers.has(pattern)) {
      this.patternHandlers.set(pattern, new Set());

      // Subscribe to Redis pattern
      this.subscribeClient.pSubscribe(pattern, (message, channel) => {
        this.handleMessage(channel, message);
      });
    }

    this.patternHandlers.get(pattern)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.patternHandlers.get(pattern);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.subscribeClient.pUnsubscribe(pattern);
          this.patternHandlers.delete(pattern);
        }
      }
    };
  }

  private handleMessage(channel: string, message: string): void {
    try {
      const event: SystemEvent = JSON.parse(message);

      // Call direct subscribers
      const handlers = this.handlers.get(channel);
      if (handlers) {
        handlers.forEach((handler) => {
          this.safeExecuteHandler(handler, event);
        });
      }

      // Call pattern subscribers
      this.patternHandlers.forEach((handlers) => {
        handlers.forEach((handler) => {
          this.safeExecuteHandler(handler, event);
        });
      });
    } catch (error) {
      logger.error('Failed to handle event', { channel, error });
    }
  }

  private safeExecuteHandler(handler: EventHandler, event: SystemEvent): void {
    try {
      const result = handler(event);
      if (result instanceof Promise) {
        result.catch((error) => {
          logger.error('Event handler error', { eventType: event.type, error });
        });
      }
    } catch (error) {
      logger.error('Event handler error', { eventType: event.type, error });
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected) return;

    try {
      await this.publishClient.quit();
      await this.subscribeClient.quit();
      this.connected = false;
      logger.info('Event bus disconnected');
    } catch (error) {
      logger.error('Failed to disconnect from event bus', { error });
    }
  }
}

// Helper to create system events
export function createEvent(type: string, source: string, data: any): SystemEvent {
  return {
    id: uuid(),
    type,
    source,
    data,
    timestamp: new Date().toISOString(),
  };
}
