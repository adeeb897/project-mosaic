/**
 * Anthropic LLM Provider
 */
import { BaseLLMProvider } from './base-provider';
import {
  CompletionRequest,
  CompletionResponse,
  ModelInfo,
  LLMFeature,
  PluginContext,
} from '@mosaic/shared';
import Anthropic from '@anthropic-ai/sdk';

export class AnthropicProvider extends BaseLLMProvider {
  name = 'anthropic-provider';
  version = '1.0.0';
  metadata = {
    author: 'Project Mosaic',
    description: 'Anthropic LLM provider with Claude 4 models',
    homepage: 'https://anthropic.com',
    license: 'MIT',
  };

  private client?: Anthropic;

  async initialize(context: PluginContext): Promise<void> {
    await super.initialize(context);

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }

    this.client = new Anthropic({ apiKey });
    context.logger.info('Anthropic provider initialized');
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.client) {
      throw new Error('Anthropic client not initialized');
    }

    try {
      // Convert OpenAI-style messages to Anthropic format
      const { system, messages } = this.convertMessages(request.messages);

      // Convert tools to Anthropic format
      const tools = request.tools?.map((tool: any) => ({
        name: tool.function.name,
        description: tool.function.description || '',
        input_schema: tool.function.parameters || { type: 'object', properties: {} },
      }));

      const response = await this.client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens || 4096,
        temperature: request.temperature,
        top_p: request.topP,
        system: system || undefined,
        messages: messages as any,
        tools: tools && tools.length > 0 ? tools : undefined,
        stop_sequences: request.stop,
      });

      // Convert Anthropic response to our format
      const content = response.content[0];
      let messageContent = '';
      let toolCalls: any[] | undefined;

      if (content.type === 'text') {
        messageContent = content.text;
      } else if (content.type === 'tool_use') {
        // Handle tool calls
        toolCalls = response.content
          .filter((c: any) => c.type === 'tool_use')
          .map((c: any) => ({
            id: c.id,
            type: 'function' as const,
            function: {
              name: c.name,
              arguments: JSON.stringify(c.input),
            },
          }));
      }

      return {
        id: response.id,
        message: {
          role: 'assistant',
          content: messageContent,
          toolCalls,
        },
        usage: {
          promptTokens: response.usage.input_tokens || 0,
          completionTokens: response.usage.output_tokens || 0,
          totalTokens: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0),
        },
        finishReason: response.stop_reason === 'end_turn' ? 'stop' : 'tool_calls',
      };
    } catch (error) {
      this.context?.logger.error('Anthropic completion failed', { error });
      throw error;
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    return [
      {
        id: 'claude-sonnet-4-5-20250929',
        name: 'Claude Sonnet 4.5',
        contextWindow: 200000,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      {
        id: 'claude-opus-4-1-20250805',
        name: 'Claude Opus 4.1',
        contextWindow: 200000,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      {
        id: 'claude-sonnet-4-20250514',
        name: 'Claude Sonnet 4',
        contextWindow: 200000,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
      {
        id: 'claude-haiku-4-5-20251001',
        name: 'Claude Haiku 4.5',
        contextWindow: 200000,
        supportsVision: true,
        supportsFunctionCalling: true,
      },
    ];
  }

  supportsFeature(feature: LLMFeature): boolean {
    const supportedFeatures: LLMFeature[] = [
      'streaming',
      'function-calling',
      'vision',
    ];
    return supportedFeatures.includes(feature);
  }

  /**
   * Check if a specific model supports vision/image inputs
   */
  modelSupportsVision(model: string): boolean {
    const visionModels = [
      'claude-sonnet-4-5',
      'claude-opus-4-1',
      'claude-sonnet-4',
      'claude-haiku-4-5',
      'claude-3-5-sonnet',
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku',
    ];
    return visionModels.some(m => model.includes(m));
  }

  /**
   * Convert OpenAI-style messages to Anthropic format
   * Anthropic requires system messages to be separate from the messages array
   */
  private convertMessages(messages: any[]): { system: string | null; messages: any[] } {
    let system: string | null = null;
    const convertedMessages: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        // Extract system message
        system = msg.content;
      } else if (msg.role === 'tool') {
        // Convert tool response to Anthropic format
        convertedMessages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: msg.tool_call_id,
              content: msg.content,
            },
          ],
        });
      } else if (msg.role === 'assistant' && msg.tool_calls) {
        // Convert tool calls to Anthropic format
        const content: any[] = [];

        // Add text content if present
        if (msg.content) {
          content.push({
            type: 'text',
            text: msg.content,
          });
        }

        // Add tool use blocks
        for (const toolCall of msg.tool_calls) {
          content.push({
            type: 'tool_use',
            id: toolCall.id,
            name: toolCall.function.name,
            input: JSON.parse(toolCall.function.arguments),
          });
        }

        convertedMessages.push({
          role: 'assistant',
          content,
        });
      } else if (Array.isArray(msg.content)) {
        // Handle vision messages with image_url
        const content = msg.content.map((item: any) => {
          if (item.type === 'image_url') {
            // Extract base64 data from data URL
            const base64Data = item.image_url.url.replace(/^data:image\/\w+;base64,/, '');
            return {
              type: 'image',
              source: {
                type: 'base64',
                media_type: 'image/png',
                data: base64Data,
              },
            };
          }
          return item;
        });

        convertedMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content,
        });
      } else {
        // Standard text message
        convertedMessages.push({
          role: msg.role === 'assistant' ? 'assistant' : 'user',
          content: msg.content || '',
        });
      }
    }

    return { system, messages: convertedMessages };
  }
}
