/**
 * Interface for personality modules
 */
import { IModule } from './IModule';
import { SystemPromptComponents } from '../models/SystemPromptComponents';
import { PersonalityAttributes } from '../models/PersonalityAttributes';
import { UserMessage } from '../models/UserMessage';
import { ProcessedMessage } from '../models/ProcessedMessage';
import { AIResponse } from '../models/AIResponse';
import { AugmentedResponse } from '../models/AugmentedResponse';
import { ConversationContext } from '../models/ConversationContext';
import { ContextAddition } from '../models/ContextAddition';
import { ModifiedContext } from '../models/ModifiedContext';
import { ResponseGuidelines } from '../models/ResponseGuidelines';
import { EthicalBoundaries } from '../models/EthicalBoundaries';

export interface IPersonalityModule extends IModule {
  // Core Personality Methods
  getSystemPrompt(): string | SystemPromptComponents;
  getPersonaAttributes(): PersonalityAttributes;

  // Message Processing
  processUserMessage(message: UserMessage): Promise<ProcessedMessage>;
  augmentAIResponse(response: AIResponse): Promise<AugmentedResponse>;

  // Context Management
  getContextAdditions(): ContextAddition[];
  processConversationContext(context: ConversationContext): Promise<ModifiedContext>;

  // Behavior Controls
  getResponseGuidelines(): ResponseGuidelines;
  getEthicalBoundaries(): EthicalBoundaries;
}
