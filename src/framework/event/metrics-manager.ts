import { EventProcessingStats, EventSystemMetrics, EnhancedSubscription } from './types';

/**
 * Manages metrics and statistics for the event system
 */
export class MetricsManager {
  private processingStats: Map<string, EventProcessingStats> = new Map();
  private metrics: EventSystemMetrics;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
    this.metrics = {
      totalEventsPublished: 0,
      totalEventsProcessed: 0,
      totalEventsFailed: 0,
      averageEventProcessingTime: 0,
      activeSubscriptions: 0,
      queueSize: 0,
      memoryUsage: 0,
      uptime: 0,
      eventTypeStats: new Map(),
    };
  }

  /**
   * Update metrics based on current system state
   */
  public updateMetrics(subscriptions: Map<string, EnhancedSubscription>, queueSize: number): void {
    // Update basic metrics
    this.metrics.activeSubscriptions = subscriptions.size;
    this.metrics.queueSize = queueSize;
    this.metrics.uptime = Date.now() - this.startTime;

    // Calculate memory usage (rough estimate)
    this.metrics.memoryUsage = this.estimateMemoryUsage(subscriptions, queueSize);

    // Update event type stats map
    this.metrics.eventTypeStats.clear();
    for (const [eventType, stats] of this.processingStats.entries()) {
      this.metrics.eventTypeStats.set(eventType, { ...stats });
    }

    // Calculate average processing time across all events
    let totalTime = 0;
    let totalEvents = 0;
    for (const stats of this.processingStats.values()) {
      totalTime += stats.averageProcessingTime * stats.totalEvents;
      totalEvents += stats.totalEvents;
    }
    this.metrics.averageEventProcessingTime = totalEvents > 0 ? totalTime / totalEvents : 0;
  }

  /**
   * Increment total events published
   */
  public incrementEventsPublished(): void {
    this.metrics.totalEventsPublished++;
  }

  /**
   * Increment total events processed
   */
  public incrementEventsProcessed(): void {
    this.metrics.totalEventsProcessed++;
  }

  /**
   * Increment total events failed
   */
  public incrementEventsFailed(): void {
    this.metrics.totalEventsFailed++;
  }

  /**
   * Update event type statistics
   */
  public updateEventTypeStats(eventType: string, success: boolean): void {
    if (!this.processingStats.has(eventType)) {
      this.processingStats.set(eventType, this.createEmptyStats(eventType));
    }

    const stats = this.processingStats.get(eventType)!;
    stats.totalEvents++;
    stats.lastProcessed = Date.now();

    if (success) {
      stats.successfulEvents++;
    } else {
      stats.failedEvents++;
    }

    // Update average processing time (simplified calculation)
    stats.averageProcessingTime = (stats.averageProcessingTime + Date.now()) / 2;
  }

  /**
   * Update subscription statistics
   */
  public updateSubscriptionStats(
    subscription: EnhancedSubscription,
    duration: number,
    isError: boolean
  ): void {
    subscription.executionCount++;
    subscription.totalExecutionTime += duration;
    subscription.lastExecuted = Date.now();

    if (isError) {
      subscription.errorCount++;
      subscription.lastError = new Error('Handler execution failed');
    }
  }

  /**
   * Get processing statistics for a specific event type
   */
  public getStats(eventType?: string): EventProcessingStats | Map<string, EventProcessingStats> {
    if (eventType) {
      return this.processingStats.get(eventType) || this.createEmptyStats(eventType);
    }
    return new Map(this.processingStats);
  }

  /**
   * Get current system metrics
   */
  public getMetrics(): EventSystemMetrics {
    return { ...this.metrics };
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.processingStats.clear();
    this.startTime = Date.now();
    this.metrics = {
      totalEventsPublished: 0,
      totalEventsProcessed: 0,
      totalEventsFailed: 0,
      averageEventProcessingTime: 0,
      activeSubscriptions: 0,
      queueSize: 0,
      memoryUsage: 0,
      uptime: 0,
      eventTypeStats: new Map(),
    };
  }

  /**
   * Create empty statistics object for an event type
   */
  private createEmptyStats(eventType: string): EventProcessingStats {
    return {
      eventType,
      totalEvents: 0,
      successfulEvents: 0,
      failedEvents: 0,
      averageProcessingTime: 0,
      subscriberCount: 0, // This will be updated by the caller
    };
  }

  /**
   * Estimate memory usage (rough calculation)
   */
  private estimateMemoryUsage(
    subscriptions: Map<string, EnhancedSubscription>,
    queueSize: number
  ): number {
    let memoryEstimate = 0;

    // Estimate subscription memory
    memoryEstimate += subscriptions.size * 200; // rough bytes per subscription

    // Estimate event queue memory
    memoryEstimate += queueSize * 500; // rough bytes per event

    // Estimate processing stats memory
    memoryEstimate += this.processingStats.size * 100; // rough bytes per stat

    return memoryEstimate;
  }
}
