/**
 * TypeScript definitions for the Agent File (.af) format
 * Based on Letta's pydantic_agent_schema.py
 * See: https://github.com/letta-ai/agent-file
 */

// ============================================================================
// Core Memory Schemas
// ============================================================================

export interface CoreMemoryBlock {
  created_at: string;
  description?: string;
  is_template: boolean;
  label: string;
  limit: number;
  metadata_?: Record<string, unknown>;
  template_name?: string;
  updated_at: string;
  value: string;
}

// ============================================================================
// Message Schemas
// ============================================================================

export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface MessageContent {
  type: 'text' | 'tool_call' | 'tool_result';
  text?: string;
  tool_call_id?: string;
  name?: string;
  content?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

export interface Message {
  created_at: string;
  group_id?: string;
  model?: string;
  name?: string;
  role: MessageRole;
  content: MessageContent[] | string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  tool_returns?: unknown[];
  updated_at: string;
  in_context?: boolean; // Indicates if message is in current context window
}

// ============================================================================
// Tag Schemas
// ============================================================================

export interface Tag {
  tag: string;
}

// ============================================================================
// Tool Environment Variable Schemas
// ============================================================================

export interface ToolEnvVar {
  created_at: string;
  description?: string;
  key: string;
  updated_at: string;
  value: string;
}

// ============================================================================
// Tool Rule Schemas
// ============================================================================

export interface BaseToolRule {
  tool_name: string;
  type: string;
}

export interface ChildToolRule extends BaseToolRule {
  type: 'ChildToolRule';
  children: string[];
}

export interface MaxCountPerStepToolRule extends BaseToolRule {
  type: 'MaxCountPerStepToolRule';
  max_count_limit: number;
}

export interface ConditionalToolRule extends BaseToolRule {
  type: 'ConditionalToolRule';
  default_child?: string;
  child_output_mapping?: Record<string, string>;
  require_output_mapping?: boolean;
}

export type ToolRule = ChildToolRule | MaxCountPerStepToolRule | ConditionalToolRule;

// ============================================================================
// Tool Schemas
// ============================================================================

export interface ParameterProperties {
  type: string;
  description?: string;
  enum?: string[];
  items?: {
    type: string;
  };
}

export interface ParametersSchema {
  type: string; // Usually "object"
  properties: Record<string, ParameterProperties>;
  required?: string[];
}

export interface ToolJSONSchema {
  name: string;
  description: string;
  parameters: ParametersSchema;
  type?: string;
  required?: string[];
}

export interface Tool {
  args_json_schema?: Record<string, unknown>;
  created_at: string;
  description?: string;
  json_schema: ToolJSONSchema;
  name: string;
  return_char_limit?: number;
  source_code?: string;
  source_type?: string;
  tags?: Tag[];
  tool_type?: string;
  updated_at: string;
  metadata_?: Record<string, unknown>;
}

// ============================================================================
// LLM and Embedding Config Schemas
// ============================================================================

export interface LLMConfig {
  model: string;
  model_endpoint?: string;
  model_endpoint_type?: string;
  context_window?: number;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
}

export interface EmbeddingConfig {
  embedding_model: string;
  embedding_endpoint?: string;
  embedding_endpoint_type?: string;
  embedding_dim?: number;
  embedding_chunk_size?: number;
}

// ============================================================================
// Multi-Agent Schemas
// ============================================================================

export interface MultiAgentGroup {
  group_id?: string;
  agent_ids?: string[];
  coordination_strategy?: string;
}

// ============================================================================
// Main Agent Schema
// ============================================================================

export interface AgentFile {
  // Basic metadata
  agent_type?: string;
  name: string;
  description?: string;
  version?: string;
  created_at: string;
  updated_at: string;

  // System configuration
  system?: string; // System prompt
  llm_config: LLMConfig;
  embedding_config?: EmbeddingConfig;

  // Memory and context
  core_memory: CoreMemoryBlock[];
  messages: Message[];
  in_context_message_indices?: number[];
  message_buffer_autoclear?: boolean;

  // Tools and rules
  tools: Tool[];
  tool_rules?: ToolRule[];
  tool_exec_environment_variables?: ToolEnvVar[];

  // Organization
  tags?: Tag[];
  metadata_?: Record<string, unknown>;

  // Multi-agent support
  multi_agent_group?: MultiAgentGroup;
}

// ============================================================================
// Helper Types for Import/Export
// ============================================================================

export interface AgentFileMetadata {
  schema_version: string;
  exported_at: string;
  exported_by?: string;
  source_system: string;
}

export interface AgentFileWrapper {
  metadata: AgentFileMetadata;
  agent: AgentFile;
}

// ============================================================================
// Import/Export Options
// ============================================================================

export interface ExportOptions {
  includeMessages?: boolean;
  includeTools?: boolean;
  includeMemory?: boolean;
  messageLimit?: number;
  prettyPrint?: boolean;
}

export interface ImportOptions {
  overwriteExisting?: boolean;
  preserveId?: boolean;
  mergeMessages?: boolean;
  mergeTools?: boolean;
  conflictResolution?: 'replace' | 'skip' | 'create_new';
}
