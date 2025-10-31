/**
 * Agent Message Types - Aligned with Letta Agent File format
 * https://docs.letta.com/guides/agents/message-types
 * https://github.com/letta-ai/agent-file
 */

/**
 * Base message interface - all messages extend this
 */
export interface BaseMessage {
  id: string;
  date: Date;
  message_type: string;
}

/**
 * Reasoning message - agent's internal thought process (chain-of-thought)
 */
export interface ReasoningMessage extends BaseMessage {
  message_type: 'reasoning_message';
  reasoning: string;
  source: 'reasoner_model' | 'non_reasoner_model';
  signature?: string;
}

/**
 * Tool call message - agent requesting tool execution
 */
export interface ToolCallMessage extends BaseMessage {
  message_type: 'tool_call_message';
  tool_call: {
    name: string;
    arguments: string; // JSON string
    tool_call_id: string;
  };
}

/**
 * Tool return message - result of tool execution
 */
export interface ToolReturnMessage extends BaseMessage {
  message_type: 'tool_return_message';
  tool_return: string; // JSON string of result
  status: 'success' | 'error';
  tool_call_id: string;
  stdout?: string[];
  stderr?: string[];
}

/**
 * Assistant message - agent communicating with user
 */
export interface AssistantMessage extends BaseMessage {
  message_type: 'assistant_message';
  content: string | Array<{
    type: 'text';
    text: string;
  }>;
  name?: string;
}

/**
 * System message - system-level communication
 */
export interface SystemMessage extends BaseMessage {
  message_type: 'system_message';
  content: string;
}

/**
 * User message - user input to agent
 */
export interface UserMessage extends BaseMessage {
  message_type: 'user_message';
  content: string;
  name?: string;
}

/**
 * Discriminated union of all message types
 */
export type AgentMessage =
  | ReasoningMessage
  | ToolCallMessage
  | ToolReturnMessage
  | AssistantMessage
  | SystemMessage
  | UserMessage;

/**
 * Message with context window flag (for Agent File format)
 */
export interface ContextualMessage {
  message: AgentMessage;
  in_context: boolean; // Whether this message is in current context window
}

/**
 * Conversation state - collection of messages
 */
export interface Conversation {
  messages: ContextualMessage[];
  context_window_size: number;
  total_messages: number;
}
