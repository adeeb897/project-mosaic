/**
 * Base LLM Provider - Abstract implementation for all LLM providers
 */
import {
  LLMProviderPlugin,
  PluginContext,
  CompletionRequest,
  CompletionResponse,
  CompletionChunk,
  ModelInfo,
  LLMFeature,
} from '@mosaic/shared';

export abstract class BaseLLMProvider implements LLMProviderPlugin {
  abstract name: string;
  abstract version: string;
  type: 'llm-provider' = 'llm-provider';
  abstract metadata: {
    author: string;
    description: string;
    homepage?: string;
    license?: string;
  };

  protected context?: PluginContext;

  async initialize(context: PluginContext): Promise<void> {
    this.context = context;
    context.logger.info(`${this.name} initialized`);
  }

  async shutdown(): Promise<void> {
    this.context?.logger.info(`${this.name} shutting down`);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const models = await this.getModels();
      return models.length > 0;
    } catch {
      return false;
    }
  }

  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;
  abstract getModels(): Promise<ModelInfo[]>;
  abstract supportsFeature(feature: LLMFeature): boolean;

  // Optional streaming support
  streamComplete?(request: CompletionRequest): AsyncIterator<CompletionChunk>;
}
