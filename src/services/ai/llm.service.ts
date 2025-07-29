import { logger } from '@utils/logger';
import { ChatAnthropic } from '@langchain/anthropic';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { z } from 'zod';

/**
 * LLM Provider types
 */
export type LLMProvider = 'anthropic' | 'openai' | 'google';

/**
 * LLM Configuration schema
 */
export const LLMConfigSchema = z.object({
  provider: z.enum(['anthropic', 'openai', 'google']),
  apiKey: z.string().min(1, 'API key is required'),
  model: z.string().optional(),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  maxTokens: z.number().min(1).max(100000).optional().default(4000),
});

export type LLMConfig = z.infer<typeof LLMConfigSchema>;

/**
 * Context chunk interface
 */
export interface ContextChunk {
  content: string;
  metadata?: {
    source: string;
    timestamp?: Date;
    relevance?: number;
  };
}

/**
 * LLM Service interface
 */
export interface ILLMService {
  /**
   * Initialize the LLM service with configuration
   */
  initialize(config: LLMConfig): Promise<void>;

  /**
   * Generate a response from the LLM
   */
  generateResponse(prompt: string, context?: ContextChunk[]): Promise<string>;

  /**
   * Stream a response from the LLM
   */
  streamResponse(prompt: string, context?: ContextChunk[]): AsyncGenerator<string>;

  /**
   * Validate an API key for the configured provider
   */
  validateApiKey(provider: LLMProvider, apiKey: string): Promise<boolean>;

  /**
   * Get available models for the current provider
   */
  getAvailableModels(): string[];

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean;
}

/**
 * LLM Service implementation
 */
export class LLMService implements ILLMService {
  private config?: LLMConfig;
  private llmInstance?: ChatAnthropic;
  private initialized = false;

  /**
   * Initialize the LLM service
   */
  async initialize(config: LLMConfig): Promise<void> {
    try {
      // Validate configuration
      const validatedConfig = LLMConfigSchema.parse(config);
      this.config = validatedConfig;

      // Initialize the appropriate LLM instance
      await this.initializeLLM();

      this.initialized = true;
      logger.info(`LLM service initialized with provider: ${config.provider}`);
    } catch (error) {
      logger.error('Failed to initialize LLM service:', error);
      throw new Error(`LLM initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a response from the LLM
   */
  async generateResponse(prompt: string, context?: ContextChunk[]): Promise<string> {
    if (!this.initialized || !this.llmInstance) {
      throw new Error('LLM service not initialized');
    }

    try {
      const messages = this.buildMessages(prompt, context);
      const response = await this.llmInstance.invoke(messages);

      return response.content.toString();
    } catch (error) {
      logger.error('Error generating LLM response:', error);
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Stream a response from the LLM
   */
  async* streamResponse(prompt: string, context?: ContextChunk[]): AsyncGenerator<string> {
    if (!this.initialized || !this.llmInstance) {
      throw new Error('LLM service not initialized');
    }

    try {
      const messages = this.buildMessages(prompt, context);
      const stream = await this.llmInstance.stream(messages);

      for await (const chunk of stream) {
        if (chunk.content) {
          yield chunk.content.toString();
        }
      }
    } catch (error) {
      logger.error('Error streaming LLM response:', error);
      throw new Error(`Failed to stream response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate an API key for a provider
   */
  async validateApiKey(provider: LLMProvider, apiKey: string): Promise<boolean> {
    try {
      // Create a temporary instance to test the API key
      let testInstance: ChatAnthropic;

      switch (provider) {
        case 'anthropic':
          testInstance = new ChatAnthropic({
            apiKey,
            model: 'claude-3-haiku-20240307', // Use the fastest model for validation
            maxTokens: 10,
          });
          break;
        default:
          throw new Error(`Provider ${provider} not yet supported`);
      }

      // Test with a simple message
      const testMessage = new HumanMessage('Hello');
      await testInstance.invoke([testMessage]);

      return true;
    } catch (error) {
      logger.warn(`API key validation failed for ${provider}:`, error);
      return false;
    }
  }

  /**
   * Get available models for the current provider
   */
  getAvailableModels(): string[] {
    if (!this.config) {
      return [];
    }

    switch (this.config.provider) {
      case 'anthropic':
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022',
          'claude-3-opus-20240229',
          'claude-3-sonnet-20240229',
          'claude-3-haiku-20240307',
        ];
      case 'openai':
        return [
          'gpt-4o',
          'gpt-4o-mini',
          'gpt-4-turbo',
          'gpt-4',
          'gpt-3.5-turbo',
        ];
      case 'google':
        return [
          'gemini-1.5-pro',
          'gemini-1.5-flash',
          'gemini-pro',
        ];
      default:
        return [];
    }
  }

  /**
   * Check if the service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Initialize the LLM instance based on provider
   */
  private async initializeLLM(): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not set');
    }

    switch (this.config.provider) {
      case 'anthropic':
        this.llmInstance = new ChatAnthropic({
          apiKey: this.config.apiKey,
          model: this.config.model || 'claude-3-5-sonnet-20241022',
          temperature: this.config.temperature,
          maxTokens: this.config.maxTokens,
        });
        break;
      case 'openai':
        // TODO: Implement OpenAI integration
        throw new Error('OpenAI provider not yet implemented');
      case 'google':
        // TODO: Implement Google integration
        throw new Error('Google provider not yet implemented');
      default:
        throw new Error(`Unsupported provider: ${this.config.provider}`);
    }
  }

  /**
   * Build messages array for LLM input
   */
  private buildMessages(prompt: string, context?: ContextChunk[]): BaseMessage[] {
    const messages: BaseMessage[] = [];

    // Add system message with context if provided
    if (context && context.length > 0) {
      const contextContent = this.formatContext(context);
      const systemPrompt = `You are a helpful AI assistant. Here is some relevant context for this conversation:

${contextContent}

Please use this context to provide more relevant and informed responses.`;

      messages.push(new SystemMessage(systemPrompt));
    } else {
      // Default system message
      messages.push(new SystemMessage('You are a helpful AI assistant.'));
    }

    // Add the user's message
    messages.push(new HumanMessage(prompt));

    return messages;
  }

  /**
   * Format context chunks into a readable string
   */
  private formatContext(context: ContextChunk[]): string {
    return context
      .sort((a, b) => (b.metadata?.relevance || 0) - (a.metadata?.relevance || 0))
      .map((chunk, index) => {
        const source = chunk.metadata?.source ? ` (Source: ${chunk.metadata.source})` : '';
        return `${index + 1}. ${chunk.content}${source}`;
      })
      .join('\n\n');
  }
}

// Singleton instance
let llmServiceInstance: LLMService | null = null;

/**
 * Get the LLM service instance
 */
export const getLLMService = (): LLMService => {
  if (!llmServiceInstance) {
    llmServiceInstance = new LLMService();
  }
  return llmServiceInstance;
};

/**
 * Initialize the LLM service with configuration
 */
export const initializeLLMService = async (config: LLMConfig): Promise<void> => {
  const service = getLLMService();
  await service.initialize(config);
};
