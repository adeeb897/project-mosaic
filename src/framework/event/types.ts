/**
 * Event priority levels
 */
export enum EventPriority {
  CRITICAL = 0,
  HIGH = 1,
  NORMAL = 2,
  LOW = 3,
  BACKGROUND = 4,
}

/**
 * Event processing modes
 */
export enum EventProcessingMode {
  SYNC = 'sync',
  ASYNC = 'async',
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential',
}

/**
 * Event handler execution status
 */
export enum EventHandlerStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying',
  CANCELLED = 'cancelled',
}

/**
 * Enhanced event interface with priority and processing options
 */
export interface EnhancedEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  source?: string;
  priority: EventPriority;
  processingMode: EventProcessingMode;
  metadata?: Record<string, any>;
  correlationId?: string;
  parentEventId?: string;
  retryCount?: number;
  maxRetries?: number;
  timeout?: number;
  tags?: string[];
}

/**
 * Partial event data for batch operations
 */
export interface BatchEventData {
  type: string;
  payload: Record<string, unknown>;
  source?: string;
  correlationId?: string;
  parentEventId?: string;
  timeout?: number;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Event handler configuration
 */
export interface EventHandlerConfig {
  id?: string;
  priority?: EventPriority;
  processingMode?: EventProcessingMode;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  retryBackoff?: number;
  filter?: (event: EnhancedEvent) => boolean;
  errorHandler?: (error: Error, event: EnhancedEvent) => void;
  beforeHandler?: (event: EnhancedEvent) => void | Promise<void>;
  afterHandler?: (event: EnhancedEvent, result?: any) => void | Promise<void>;
}

/**
 * Enhanced event handler function type
 */
export type EnhancedEventHandler = (event: EnhancedEvent) => void | Promise<void>;

/**
 * Event handler execution result
 */
export interface EventHandlerResult {
  handlerId: string;
  eventId: string;
  status: EventHandlerStatus;
  startTime: number;
  endTime?: number;
  duration?: number;
  result?: any;
  error?: Error;
  retryCount: number;
}

/**
 * Event subscription with enhanced options
 */
export interface EnhancedSubscription {
  id: string;
  eventType: string;
  handler: EnhancedEventHandler;
  config: EventHandlerConfig;
  createdAt: number;
  isActive: boolean;
  executionCount: number;
  lastExecuted?: number;
  totalExecutionTime: number;
  errorCount: number;
  lastError?: Error;
}

/**
 * Event processing statistics
 */
export interface EventProcessingStats {
  eventType: string;
  totalEvents: number;
  successfulEvents: number;
  failedEvents: number;
  averageProcessingTime: number;
  lastProcessed?: number;
  subscriberCount: number;
}

/**
 * Event queue configuration
 */
export interface EventQueueConfig {
  maxSize: number;
  processingConcurrency: number;
  retryPolicy: RetryPolicy;
  deadLetterQueue: boolean;
  persistEvents: boolean;
}

/**
 * Retry policy configuration
 */
export interface RetryPolicy {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
  maxDelay: number;
  jitter: boolean;
}

/**
 * Event filter function type
 */
export type EventFilter = (event: EnhancedEvent) => boolean;

/**
 * Event middleware function type
 */
export type EventMiddleware = (event: EnhancedEvent, next: () => Promise<void>) => Promise<void>;

/**
 * Event system configuration
 */
export interface EventSystemConfig {
  maxListeners: number;
  historyLimit: number;
  enableMetrics: boolean;
  enablePersistence: boolean;
  defaultTimeout: number;
  defaultRetryPolicy: RetryPolicy;
  queueConfig: EventQueueConfig;
  middleware: EventMiddleware[];
}

/**
 * Event batch for bulk operations
 */
export interface EventBatch {
  events: BatchEventData[];
  processingMode?: EventProcessingMode;
  priority?: EventPriority;
}

/**
 * Event pattern for pattern-based subscriptions
 */
export interface EventPattern {
  pattern: string | RegExp;
  type: 'glob' | 'regex' | 'exact';
}

/**
 * Event system metrics
 */
export interface EventSystemMetrics {
  totalEventsPublished: number;
  totalEventsProcessed: number;
  totalEventsFailed: number;
  averageEventProcessingTime: number;
  activeSubscriptions: number;
  queueSize: number;
  memoryUsage: number;
  uptime: number;
  eventTypeStats: Map<string, EventProcessingStats>;
}

/**
 * Dead letter event for failed processing
 */
export interface DeadLetterEvent {
  originalEvent: EnhancedEvent;
  failureReason: string;
  failureTime: number;
  attemptCount: number;
  lastError: Error;
}
