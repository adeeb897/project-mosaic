/**
 * Definition of an agent
 */
import { AgentCapability } from './AgentCapability';
import { ConnectionDetails } from './ConnectionDetails';
import { AuthenticationConfig } from './AuthenticationConfig';
import { ConversationStrategy } from './ConversationStrategy';
import { ErrorHandlingStrategy } from './ErrorHandlingStrategy';
import { AgentUIComponent } from './AgentUIComponent';

export interface AgentDefinition {
  /**
   * Name of the agent
   */
  name: string;

  /**
   * Description of the agent
   */
  description: string;

  /**
   * Type of agent
   */
  agentType: AgentType;

  /**
   * Connection details for the agent
   */
  connectionDetails: ConnectionDetails;

  /**
   * Capabilities of the agent
   */
  capabilities: AgentCapability[];

  /**
   * Authentication configuration
   */
  authentication: AuthenticationConfig;

  /**
   * Conversation strategy
   */
  conversationStrategy: ConversationStrategy;

  /**
   * Error handling strategy
   */
  errorHandling: ErrorHandlingStrategy;

  /**
   * UI components
   */
  uiComponents: AgentUIComponent[];

  /**
   * Additional metadata
   */
  metadata?: Record<string, any>;
}

/**
 * Types of agents
 */
export enum AgentType {
  TASK_AGENT = 'task_agent',
  ASSISTANT_AGENT = 'assistant_agent',
  EXPERT_AGENT = 'expert_agent',
  UTILITY_AGENT = 'utility_agent',
  CUSTOM_AGENT = 'custom_agent',
}
