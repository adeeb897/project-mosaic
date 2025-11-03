/**
 * OpenAI LLM Provider
 */
import { BaseLLMProvider } from './base-provider';
import {
  CompletionRequest,
  CompletionResponse,
  ModelInfo,
  LLMFeature,
  PluginContext,
} from '@mosaic/shared';
import OpenAI from 'openai';

export class OpenAIProvider extends BaseLLMProvider {
  name = 'openai-provider';
  version = '1.0.0';
  metadata = {
    author: 'Project Mosaic',
    description: 'OpenAI LLM provider with GPT-4 and GPT-3.5 support',
    homepage: 'https://openai.com',
    license: 'MIT',
  };

  private client?: OpenAI;

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.client = new OpenAI({ apiKey });
    context.logger.info('OpenAI provider initialized');
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.client) {
      throw new Error('OpenAI client not initialized');
    }

    try {
      // Check if model supports JSON mode
      const supportsJsonMode = this.modelSupportsJsonMode(request.model);

      // Warn if JSON mode was requested but isn't supported
      if (request.responseFormat === 'json' && !supportsJsonMode) {
        this.context?.logger.warn(
          `JSON mode requested but model ${request.model} does not support it. Falling back to text mode with JSON instructions in prompt.`
        );
      }

      const response = await this.client.chat.completions.create({
        model: request.model,
        messages: request.messages as any, // Type compatibility
        temperature: request.temperature,
        max_tokens: request.maxTokens,
        top_p: request.topP,
        frequency_penalty: request.frequencyPenalty,
        presence_penalty: request.presencePenalty,
        stop: request.stop,
        tools: request.tools as any,
        response_format:
          request.responseFormat === 'json' && supportsJsonMode
            ? { type: 'json_object' }
            : undefined,
      });

      const choice = response.choices[0];
      return {
        id: response.id,
        message: {
          role: choice.message.role as any,
          content: choice.message.content || '',
          toolCalls: choice.message.tool_calls?.map((tc: any) => ({
            id: tc.id,
            type: 'function' as const,
            function: {
              name: tc.function?.name,
              arguments: tc.function?.arguments,
            },
          })),
        },
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        finishReason: choice.finish_reason as any,
      };
    } catch (error) {
      this.context?.logger.error('OpenAI completion failed', { error });
      throw error;
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        contextWindow: 8192,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      {
        id: 'gpt-4-turbo-preview',
        name: 'GPT-4 Turbo',
        contextWindow: 128000,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
      {
        id: 'gpt-4-vision-preview',
        name: 'GPT-4 Vision',
        contextWindow: 128000,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        contextWindow: 16385,
        supportsVision: false,
        supportsFunctionCalling: true,
      },
    ];
  }

  supportsFeature(feature: LLMFeature): boolean {
    const supportedFeatures: LLMFeature[] = [
      'streaming',
      'function-calling',
      'vision',
      'json-mode',
    ];
    return supportedFeatures.includes(feature);
  }

  /**
   * Check if a specific model supports vision/image inputs
   */
  modelSupportsVision(model: string): boolean {
    const visionModels = [
      'gpt-4-vision-preview',
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4o',
      'gpt-4o-mini',
    ];
    return visionModels.some(m => model.includes(m));
  }

  /**
   * Check if a specific model supports JSON mode
   * JSON mode is supported by gpt-4-turbo variants (1106+), gpt-3.5-turbo-1106+, and gpt-4o
   * Base gpt-4 and older versions do NOT support JSON mode
   * See: https://platform.openai.com/docs/guides/text-generation/json-mode
   */
  private modelSupportsJsonMode(model: string): boolean {
    // Models that definitely support JSON mode
    const jsonModeModels = [
      'gpt-4-turbo',
      'gpt-4-turbo-preview',
      'gpt-4-1106-preview',
      'gpt-4-0125-preview',
      'gpt-4-1106',
      'gpt-4-0125',
      'gpt-4o',
      'gpt-4o-mini',
      'gpt-4o-2024',
      'gpt-3.5-turbo-1106',
      'gpt-3.5-turbo-0125',
    ];

    // Check exact match or starts with (for dated versions)
    return jsonModeModels.some(
      (supportedModel) =>
        model === supportedModel || model.startsWith(supportedModel)
    );
  }
}
