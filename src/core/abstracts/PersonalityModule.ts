/**
 * Abstract base class for personality modules
 */
import { Module } from './Module';
import { IPersonalityModule } from '../interfaces/IPersonalityModule';
import { ModuleType } from '../types/ModuleTypes';
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

export abstract class PersonalityModule extends Module implements IPersonalityModule {
  protected systemPrompt: string | SystemPromptComponents;
  protected personalityAttributes: PersonalityAttributes;
  protected responseGuidelines: ResponseGuidelines;
  protected ethicalBoundaries: EthicalBoundaries;
  protected contextAdditions: ContextAddition[] = [];

  constructor(
    id: string,
    version: string,
    systemPrompt: string | SystemPromptComponents,
    personalityAttributes: PersonalityAttributes
  ) {
    super(id, ModuleType.PERSONALITY, version);
    this.systemPrompt = systemPrompt;
    this.personalityAttributes = personalityAttributes;
    this.responseGuidelines = this.createDefaultResponseGuidelines();
    this.ethicalBoundaries = this.createDefaultEthicalBoundaries();
  }

  // Core Personality Methods
  public getSystemPrompt(): string | SystemPromptComponents {
    return this.systemPrompt;
  }

  public getPersonaAttributes(): PersonalityAttributes {
    return this.personalityAttributes;
  }

  // Message Processing
  public abstract processUserMessage(message: UserMessage): Promise<ProcessedMessage>;
  public abstract augmentAIResponse(response: AIResponse): Promise<AugmentedResponse>;

  // Context Management
  public getContextAdditions(): ContextAddition[] {
    return this.contextAdditions;
  }

  public abstract processConversationContext(
    context: ConversationContext
  ): Promise<ModifiedContext>;

  // Behavior Controls
  public getResponseGuidelines(): ResponseGuidelines {
    return this.responseGuidelines;
  }

  public getEthicalBoundaries(): EthicalBoundaries {
    return this.ethicalBoundaries;
  }

  // Helper methods
  protected createDefaultResponseGuidelines(): ResponseGuidelines {
    return {
      defaultFormat: 'paragraph',
      markdown: true,
      citations: true,
      structuredData: true,
      brevityPreference: 50,
    };
  }

  protected createDefaultEthicalBoundaries(): EthicalBoundaries {
    return {
      contentPolicy:
        'Standard content policy applies. Avoid harmful, illegal, or unethical content.',
      safetyLevel: 'moderate',
      refusalBehavior: 'polite',
      transparency: true,
      biasAwareness: true,
    };
  }
}
