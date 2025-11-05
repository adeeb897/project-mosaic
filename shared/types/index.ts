/**
 * Shared types and interfaces for Project Mosaic
 * Used across backend, frontend, and plugins
 */

import { Task, TaskResult } from './task-hierarchy';

// ============================================================================
// Core Plugin System
// ============================================================================

export interface Plugin {
  /** Unique identifier for the plugin */
  name: string;

  /** Semantic version */
  version: string;

  /** Plugin type for categorization */
  type: 'agent' | 'mcp-server' | 'llm-provider' | 'sandbox' | 'observability' | 'protocol';

  /** Plugin metadata */
  metadata: PluginMetadata;

  /** Initialize the plugin with context */
  initialize(context: PluginContext): Promise<void>;

  /** Graceful shutdown */
  shutdown(): Promise<void>;

  /** Health check */
  healthCheck?(): Promise<boolean>;
}

export interface PluginMetadata {
  author: string;
  description: string;
  homepage?: string;
  license?: string;
  tags?: string[];
}

export interface PluginContext {
  /** Configuration for this plugin */
  config: Record<string, any>;

  /** Logger instance */
  logger: Logger;

  /** Event bus for pub/sub */
  eventBus: EventBus;

  /** Access to other registered plugins */
  plugins: PluginRegistry;
}

export interface PluginRegistry {
  register(plugin: Plugin): Promise<void>;
  unregister(name: string): Promise<void>;
  get(name: string): Plugin | undefined;
  getAll(): Plugin[];
  getByType(type: Plugin['type']): Plugin[];
}

// ============================================================================
// Agent System
// ============================================================================

export interface AgentPlugin extends Plugin {
  type: 'agent';

  /** Create a new agent instance */
  createAgent(config: AgentConfig): Promise<Agent>;

  /** Agent capability advertisement (A2A Agent Card) */
  getCapabilities(): AgentCard;
}

export interface Agent {
  id: string;
  name: string;
  type: string;
  status: AgentStatus;
  config: AgentConfig;
  metadata: Record<string, any>;

  /** Start the agent */
  start(): Promise<void>;

  /** Stop the agent */
  stop(): Promise<void>;

  /** Pause the agent */
  pause(): Promise<void>;

  /** Resume the agent */
  resume(): Promise<void>;

  /** Send message to agent (A2A) */
  sendMessage(message: A2AMessage): Promise<void>;

  /** Receive message from agent */
  onMessage(handler: MessageHandler): Unsubscribe;

  /** Execute a task */
  executeTask(task: Task): Promise<TaskResult>;

  /** Get current state */
  getState(): AgentState;
}

export type AgentStatus = 'idle' | 'running' | 'paused' | 'stopped' | 'error';

export interface AgentConfig {
  name: string;
  type: string;
  llmProvider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: string[]; // MCP server names
  permissions?: AgentPermissions;
  metadata?: Record<string, any>;
}

export interface AgentPermissions {
  filesystem?: {
    read?: boolean;
    write?: boolean;
    delete?: boolean;
    allowedPaths?: string[];
  };
  browser?: {
    enabled?: boolean;
    allowedDomains?: string[];
  };
  memory?: {
    read?: boolean;
    write?: boolean;
  };
  agentCommunication?: {
    enabled?: boolean;
    allowedAgents?: string[];
  };
}

export interface AgentState {
  status: AgentStatus;
  currentTask?: Task;
  memory?: Record<string, any>;
  metrics?: AgentMetrics;
}

export interface AgentMetrics {
  tasksCompleted: number;
  tasksFailed: number;
  messagesReceived: number;
  messagesSent: number;
  toolInvocations: number;
  llmCalls: number;
  totalTokens: number;
  uptime: number;
}

// ============================================================================
// A2A Protocol (Agent-to-Agent Communication)
// ============================================================================

export interface A2AMessage {
  id: string;
  from: string; // Agent ID
  to: string; // Agent ID or 'broadcast'
  type: 'task' | 'query' | 'response' | 'notification' | 'error';
  payload: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface AgentCard {
  name: string;
  description: string;
  version: string;
  capabilities: AgentCapability[];
  endpoints?: string[];
  metadata?: Record<string, any>;
}

export interface AgentCapability {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  examples?: CapabilityExample[];
}

export interface CapabilityExample {
  description: string;
  input: any;
  output: any;
}

export type MessageHandler = (message: A2AMessage) => void | Promise<void>;
export type Unsubscribe = () => void;

// ============================================================================
// MCP (Model Context Protocol) - Tool Access
// ============================================================================

export interface MCPServerPlugin extends Plugin {
  type: 'mcp-server';

  /** Get available tools */
  getTools(): MCPToolDefinition[];

  /** Get available resources */
  getResources?(): MCPResourceDefinition[];

  /** Get available prompts */
  getPrompts?(): MCPPromptDefinition[];

  /** Handle tool invocation */
  invokeTool(name: string, params: any): Promise<MCPToolResult>;

  /** Handle resource read */
  readResource?(uri: string): Promise<MCPResourceContent>;
}

export interface MCPToolDefinition {
  name: string;
  description: string;
  inputSchema: JSONSchema;
  outputSchema?: JSONSchema;
  examples?: ToolExample[];
}

export interface ToolExample {
  description: string;
  input: any;
  output: any;
}

export interface MCPResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface MCPPromptDefinition {
  name: string;
  description: string;
  arguments?: PromptArgument[];
}

export interface PromptArgument {
  name: string;
  description: string;
  required: boolean;
}

export interface MCPToolResult {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

export interface MCPResourceContent {
  uri: string;
  mimeType: string;
  content: string | Buffer;
}

// ============================================================================
// LLM Provider
// ============================================================================

export interface LLMProviderPlugin extends Plugin {
  type: 'llm-provider';

  /** Generate completion */
  complete(request: CompletionRequest): Promise<CompletionResponse>;

  /** Generate completion with streaming */
  streamComplete?(request: CompletionRequest): AsyncIterator<CompletionChunk>;

  /** Get available models */
  getModels(): Promise<ModelInfo[]>;

  /** Check if provider supports a feature */
  supportsFeature(feature: LLMFeature): boolean;
}

export type LLMFeature = 'streaming' | 'function-calling' | 'vision' | 'json-mode';

export interface CompletionRequest {
  model: string;
  messages: LLMMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
  tools?: ToolDefinition[];
  responseFormat?: 'text' | 'json';
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface ToolDefinition {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
}

export interface CompletionResponse {
  id?: string;
  message: LLMMessage;
  usage?: TokenUsage;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface CompletionChunk {
  delta: Partial<LLMMessage>;
  finishReason?: 'stop' | 'length' | 'tool_calls' | 'content_filter';
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  supportsVision?: boolean;
  supportsFunctionCalling?: boolean;
}

// ============================================================================
// Sandbox Provider
// ============================================================================

export interface SandboxProviderPlugin extends Plugin {
  type: 'sandbox';

  /** Create a new sandbox instance */
  createSandbox(config: SandboxConfig): Promise<Sandbox>;

  /** List active sandboxes */
  listSandboxes(): Promise<SandboxInfo[]>;

  /** Get sandbox by ID */
  getSandbox(id: string): Promise<Sandbox | undefined>;

  /** Destroy sandbox */
  destroySandbox(id: string): Promise<void>;
}

export interface SandboxConfig {
  image?: string;
  timeout?: number;
  memory?: number;
  cpu?: number;
  env?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface Sandbox {
  id: string;
  status: SandboxStatus;
  config: SandboxConfig;

  /** Execute code in sandbox */
  execute(code: string, options?: ExecutionOptions): Promise<ExecutionResult>;

  /** Upload file to sandbox */
  uploadFile(path: string, content: Buffer): Promise<void>;

  /** Download file from sandbox */
  downloadFile(path: string): Promise<Buffer>;

  /** List files in sandbox */
  listFiles(path?: string): Promise<FileInfo[]>;

  /** Stop sandbox */
  stop(): Promise<void>;

  /** Restart sandbox */
  restart(): Promise<void>;
}

export type SandboxStatus = 'initializing' | 'ready' | 'running' | 'stopped' | 'error';

export interface SandboxInfo {
  id: string;
  status: SandboxStatus;
  uptime: number;
  agentId?: string;
}

export interface ExecutionOptions {
  timeout?: number;
  env?: Record<string, string>;
  workingDir?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  error?: string;
}

export interface FileInfo {
  path: string;
  name: string;
  size: number;
  type: 'file' | 'directory';
  modifiedAt: string;
}

// ============================================================================
// Observability
// ============================================================================

export interface ObservabilityPlugin extends Plugin {
  type: 'observability';

  /** Track event */
  trackEvent(event: ObservabilityEvent): Promise<void>;

  /** Start trace span */
  startSpan(name: string, attributes?: Record<string, any>): Span;

  /** Track metric */
  trackMetric(name: string, value: number, tags?: Record<string, string>): Promise<void>;

  /** Log message */
  log(level: LogLevel, message: string, context?: any): Promise<void>;
}

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface ObservabilityEvent {
  name: string;
  type: 'agent' | 'tool' | 'system' | 'user';
  agentId?: string;
  data?: any;
  timestamp: string;
}

export interface Span {
  end(result?: 'success' | 'error', metadata?: any): void;
  setAttribute(key: string, value: any): void;
  addEvent(name: string, attributes?: any): void;
}

// ============================================================================
// Event System
// ============================================================================

export interface EventBus {
  publish(channel: string, event: SystemEvent): Promise<void>;
  subscribe(channel: string, handler: EventHandler): Unsubscribe;
  subscribePattern(pattern: string, handler: EventHandler): Unsubscribe;
}

export interface SystemEvent {
  id: string;
  type: string;
  source: string;
  data: any;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type EventHandler = (event: SystemEvent) => void | Promise<void>;

// ============================================================================
// Logger
// ============================================================================

export interface Logger {
  debug(message: string, context?: any): void;
  info(message: string, context?: any): void;
  warn(message: string, context?: any): void;
  error(message: string, context?: any): void;
  child(metadata: Record<string, any>): Logger;
}

// ============================================================================
// Utilities
// ============================================================================

export interface JSONSchema {
  type: string;
  properties?: Record<string, any>;
  required?: string[];
  items?: any;
  [key: string]: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ============================================================================
// API Types
// ============================================================================

export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: Record<string, any>;
}

export interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: Record<string, ServiceHealth>;
  agents?: {
    active: number;
    total: number;
  };
  timestamp: string;
}

export interface ServiceHealth {
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
  latency?: number;
}

// ============================================================================
// Task Hierarchy System
// ============================================================================

export * from './task-hierarchy';

// ============================================================================
// Session and History Management
// ============================================================================

export * from './session-history';

// ============================================================================
// Agent Memory System
// ============================================================================

export * from './agent-memory';

// ============================================================================
// Agent Messages (Letta/Agent File Compatible)
// ============================================================================

export * from './agent-messages';

// ============================================================================
// Agent File Format (.af) - Official Letta Format
// ============================================================================

export * from './agent-file';
