/**
 * Abstract EventBus class for the publish-subscribe pattern
 */
import { ModuleEvent } from '../models/ModuleEvent';

export abstract class EventBus {
  /**
   * Subscribe to an event
   * @param eventType The type of event to subscribe to
   * @param handler The handler function to call when the event is emitted
   * @returns A subscription ID that can be used to unsubscribe
   */
  abstract on(eventType: string, handler: (event: ModuleEvent) => void): string;

  /**
   * Unsubscribe from an event
   * @param subscriptionId The subscription ID returned from the on method
   * @returns True if the subscription was found and removed, false otherwise
   */
  abstract off(subscriptionId: string): boolean;

  /**
   * Emit an event
   * @param eventType The type of event to emit
   * @param payload The event payload
   */
  abstract emit(eventType: string, payload?: any): void;

  /**
   * Emit an event and wait for all handlers to complete
   * @param eventType The type of event to emit
   * @param payload The event payload
   * @returns A promise that resolves when all handlers have completed
   */
  abstract emitAsync(eventType: string, payload?: any): Promise<void>;

  /**
   * Get the number of subscribers for an event type
   * @param eventType The type of event
   * @returns The number of subscribers
   */
  abstract getSubscriberCount(eventType: string): number;
}
