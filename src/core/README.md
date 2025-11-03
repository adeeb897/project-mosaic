# Project Mosaic Core Architecture

This directory contains the core architecture components for Project Mosaic, implementing a layered architecture with clear separation of concerns.

## Directory Structure

- **abstracts/**: Abstract base classes that provide common functionality
- **interfaces/**: Interfaces that define contracts between components
- **models/**: Data models used throughout the application
- **types/**: TypeScript type definitions and enums

## Architectural Layers

The architecture follows a layered approach:

1. **UI Layer**: React components (in `src/client/`)
2. **Application Core**: Services and business logic (in `src/services/`)
3. **Module Layer**: Pluggable modules (in `src/core/`)
4. **Integration Layer**: External integrations (in `src/integrations/`)
5. **Persistence Layer**: Data storage (in `src/persistence/`)

## Module System

The module system is the heart of Project Mosaic, allowing for extensibility and customization. There are several types of modules:

- **Personality Modules**: Define AI personality traits and behaviors
- **Tool Modules**: Provide specific capabilities to the AI
- **Agent Modules**: Connect to external AI agents
- **Modality Modules**: Handle different input/output modalities

Each module type implements a specific interface and extends a base abstract class.

### Module Lifecycle

Modules follow a standard lifecycle:

1. **Initialize**: Set up the module with its context
2. **Activate**: Activate the module for use
3. **Deactivate**: Deactivate the module
4. **Update**: Update the module to a new version
5. **Uninstall**: Remove the module

## Event System

The event system allows for loose coupling between components through a publish-subscribe pattern. Components can:

1. Subscribe to events using `eventBus.on()`
2. Publish events using `eventBus.emit()`
3. Unsubscribe from events using `eventBus.off()`

## Interfaces

### Core Interfaces

- **IModule**: Base interface for all modules
- **IPersonalityModule**: Interface for personality modules
- **IToolModule**: Interface for tool modules
- **IAgentModule**: Interface for agent modules
- **IModalityModule**: Interface for modality modules

### Service Interfaces

Service interfaces are defined in the services directory and include:

- **IUserService**: User management
- **IModuleService**: Module management
- **IChatService**: Conversation management
- **IModuleMarketplaceService**: Module discovery and distribution

## Abstract Classes

- **Module**: Base implementation for all modules
- **PersonalityModule**: Base implementation for personality modules
- **ToolModule**: Base implementation for tool modules
- **AgentModule**: Base implementation for agent modules
- **ModalityModule**: Base implementation for modality modules
- **EventBus**: Implementation of the event system

## Data Models

The data models represent the domain entities and value objects used throughout the application. Key models include:

- **User**: User information
- **Module**: Module metadata
- **Conversation**: Conversation state
- **Message**: Message content
- **ConversationContext**: Context for a conversation
- **PersonalityAttributes**: Attributes for a personality

## Usage Examples

### Creating a Personality Module

```typescript
import { PersonalityModule } from '../core/abstracts/PersonalityModule';
import { UserMessage } from '../core/models/UserMessage';
import { ProcessedMessage } from '../core/models/ProcessedMessage';
import { AIResponse } from '../core/models/AIResponse';
import { AugmentedResponse } from '../core/models/AugmentedResponse';
import { ConversationContext } from '../core/models/ConversationContext';
import { ModifiedContext } from '../core/models/ModifiedContext';

export class ExpertPersonality extends PersonalityModule {
  constructor() {
    super(
      'expert-personality',
      '1.0.0',
      'I am an expert in my field, providing detailed and accurate information.',
      {
        conversationStyle: {
          formality: 80,
          verbosity: 70,
          humor: 20,
          creativity: 40,
          empathy: 60,
          tone: ['professional', 'informative', 'authoritative'],
          vocabulary: 'advanced',
          perspectiveExpression: true,
        },
        knowledgeAreas: [
          {
            name: 'Computer Science',
            expertise: 90,
          },
          {
            name: 'Software Engineering',
            expertise: 95,
          },
        ],
        emotionalIntelligence: {
          empathyLevel: 60,
          emotionRecognition: true,
          sentimentAnalysis: true,
          emotionalMemory: true,
          supportiveResponses: true,
        },
        responseFormatting: {
          defaultFormat: 'paragraph',
          markdown: true,
          citations: true,
          structuredData: true,
          brevityPreference: 40,
        },
        proactivity: {
          suggestionFrequency: 50,
          initiativeLevel: 60,
          followUpQuestions: true,
          topicExpansion: true,
          resourceSuggestions: true,
        },
        ethicalBoundaries: {
          contentPolicy:
            'Standard content policy applies. Avoid harmful, illegal, or unethical content.',
          safetyLevel: 'moderate',
          refusalBehavior: 'polite',
          transparency: true,
          biasAwareness: true,
        },
      }
    );
  }

  // Implementation of abstract methods
  protected async onInitialize(): Promise<void> {
    // Initialization logic
  }

  protected async onActivate(): Promise<void> {
    // Activation logic
  }

  protected async onDeactivate(): Promise<void> {
    // Deactivation logic
  }

  protected async onUpdate(oldVersion: string, newVersion: string): Promise<void> {
    // Update logic
  }

  protected async onUninstall(): Promise<void> {
    // Uninstall logic
  }

  protected async onConfigUpdate(config: any): Promise<void> {
    // Config update logic
  }

  protected async onValidateConfig(config: any): Promise<any> {
    // Config validation logic
    return { valid: true };
  }

  protected async onHandleEvent(event: any): Promise<void> {
    // Event handling logic
  }

  public getConfigSchema(): any {
    // Return JSON schema for configuration
    return {};
  }

  // Personality-specific methods
  public async processUserMessage(message: UserMessage): Promise<ProcessedMessage> {
    // Process user message
    return {
      original: message,
      processed: message.content,
      metadata: {
        processedAt: new Date(),
        processorId: this.id,
        processingTimeMs: 0,
      },
    };
  }

  public async augmentAIResponse(response: AIResponse): Promise<AugmentedResponse> {
    // Augment AI response
    return {
      original: response,
      augmented: response.content,
      metadata: {
        augmentedAt: new Date(),
        augmenterId: this.id,
        augmentationTimeMs: 0,
      },
    };
  }

  public async processConversationContext(context: ConversationContext): Promise<ModifiedContext> {
    // Process conversation context
    return {
      original: context,
      modified: context,
      changes: [],
      metadata: {
        modifiedAt: new Date(),
        modifierId: this.id,
        processingTimeMs: 0,
      },
    };
  }
}
```
