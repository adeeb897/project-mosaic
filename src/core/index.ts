/**
 * Core module exports
 */

// Interfaces
export * from './interfaces/IModule';
export * from './interfaces/IPersonalityModule';
export * from './interfaces/IToolModule';
export * from './interfaces/IAgentModule';
export * from './interfaces/IModalityModule';

// Abstract classes
export * from './abstracts/Module';
export * from './abstracts/PersonalityModule';
export * from './abstracts/EventBus';

// Types
export * from './types/ModuleTypes';

// Models - Core
export * from './models/ModuleContext';
export * from './models/ModuleConfig';
export * from './models/ModuleEvent';
export * from './models/ModuleCapability';
export * from './models/ValidationResult';

// Models - User
export * from './models/User';
export * from './models/Role';
export * from './models/Permission';
export * from './models/UserPreferences';
export * from './models/ModalityPreference';
export * from './models/NotificationSettings';
export * from './models/PrivacySettings';
export * from './models/AccessibilitySettings';

// Models - Personality
export * from './models/SystemPromptComponents';
export {
  PersonalityAttributes,
  ConversationStyle,
  KnowledgeArea,
  EmotionalIntelligence,
  ResponseFormatting,
  ProactivitySettings,
} from './models/PersonalityAttributes';
export * from './models/ResponseGuidelines';
export * from './models/EthicalBoundaries';
export { ContextAddition } from './models/ContextAddition';

// Models - Messaging
export { UserMessage } from './models/UserMessage';
export * from './models/ProcessedMessage';
export * from './models/AIResponse';
export * from './models/AugmentedResponse';
export * from './models/ConversationContext';
export * from './models/UserContextProfile';
export * from './models/EnvironmentContext';
export * from './models/ModifiedContext';

// Models - Tool
export * from './models/ToolDefinition';
export * from './models/ParameterDefinition';
export * from './models/ReturnDefinition';
export * from './models/ToolExample';
export * from './models/ExecutionContext';
export * from './models/ToolResult';
export * from './models/ToolUIComponents';
export * from './models/ToolRenderOptions';

// Models - MCP
export * from './models/MCPToolDefinition';
export * from './models/MCPRequest';
export * from './models/MCPResponse';

// Models - Agent
export * from './models/AgentDefinition';
export * from './models/ConnectionDetails';
export * from './models/AuthenticationConfig';
export * from './models/ConversationStrategy';
export * from './models/ErrorHandlingStrategy';
export * from './models/AgentUIComponent';
export * from './models/AgentCapability';
export * from './models/ConnectionResult';
export * from './models/AgentTask';
export * from './models/Task';
export * from './models/A2AAgentCard';
export { A2AMessage, A2AResponse, A2AMessageChunk } from './models/A2AMessage';
export * from './models/CapabilityResult';

// Models - Modality
export * from './models/ModalityDefinition';
export * from './models/ModalityInput';
export * from './models/OutputContent';
export * from './models/ModalityOutput';
export * from './models/DeviceCapabilities';
