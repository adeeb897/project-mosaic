/**
 * Context provider interface for AI services
 */

/**
 * Context chunk interface
 */
export interface ContextChunk {
  content: string;
  metadata?: {
    source: string;
    timestamp?: Date;
    relevance?: number;
    type?: string;
  };
}

/**
 * Context provider interface
 */
export interface IContextProvider {
  /**
   * Unique identifier for the context provider
   */
  readonly id: string;

  /**
   * Human-readable name for the context provider
   */
  readonly name: string;

  /**
   * Priority for context ordering (higher = more important)
   */
  readonly priority: number;

  /**
   * Whether this context provider is currently enabled
   */
  isEnabled: boolean;

  /**
   * Get context for a conversation
   * @param conversationId The conversation ID to get context for
   * @param userMessage Optional current user message for context-aware providers
   * @returns Promise resolving to context chunks
   */
  getContext(conversationId: string, userMessage?: string): Promise<ContextChunk[]>;

  /**
   * Optional method to determine if this provider should be included
   * @param conversationId The conversation ID
   * @param userMessage The current user message
   * @returns Whether this provider should contribute context
   */
  shouldInclude?(conversationId: string, userMessage?: string): Promise<boolean>;

  /**
   * Optional method to validate the provider configuration
   * @returns Whether the provider is properly configured
   */
  isConfigured?(): boolean;

  /**
   * Optional method to get provider-specific settings
   * @returns Provider configuration object
   */
  getSettings?(): Record<string, any>;

  /**
   * Optional method to update provider settings
   * @param settings New settings to apply
   */
  updateSettings?(settings: Record<string, any>): Promise<void>;
}

/**
 * Base abstract class for context providers
 */
export abstract class BaseContextProvider implements IContextProvider {
  public readonly id: string;
  public readonly name: string;
  public readonly priority: number;
  public isEnabled: boolean = true;

  constructor(id: string, name: string, priority: number) {
    this.id = id;
    this.name = name;
    this.priority = priority;
  }

  /**
   * Abstract method to be implemented by concrete providers
   */
  abstract getContext(conversationId: string, userMessage?: string): Promise<ContextChunk[]>;

  /**
   * Default implementation - always include context
   */
  async shouldInclude(_conversationId: string, _userMessage?: string): Promise<boolean> {
    return this.isEnabled;
  }

  /**
   * Default implementation - assume configured if enabled
   */
  isConfigured(): boolean {
    return this.isEnabled;
  }

  /**
   * Default implementation - no settings
   */
  getSettings(): Record<string, any> {
    return {};
  }

  /**
   * Default implementation - no-op settings update
   */
  async updateSettings(_settings: Record<string, any>): Promise<void> {
    // Override in subclasses if needed
  }
}

/**
 * Context manager for handling multiple context providers
 */
export class ContextManager {
  private providers: Map<string, IContextProvider> = new Map();

  /**
   * Register a context provider
   */
  registerProvider(provider: IContextProvider): void {
    this.providers.set(provider.id, provider);
  }

  /**
   * Unregister a context provider
   */
  unregisterProvider(providerId: string): void {
    this.providers.delete(providerId);
  }

  /**
   * Get a specific context provider
   */
  getProvider(providerId: string): IContextProvider | undefined {
    return this.providers.get(providerId);
  }

  /**
   * Get all registered providers
   */
  getAllProviders(): IContextProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get enabled providers sorted by priority
   */
  getEnabledProviders(): IContextProvider[] {
    return Array.from(this.providers.values())
      .filter(provider => provider.isEnabled && provider.isConfigured?.())
      .sort((a, b) => b.priority - a.priority);
  }

  /**
   * Gather context from all enabled providers
   */
  async gatherContext(conversationId: string, userMessage?: string): Promise<ContextChunk[]> {
    const enabledProviders = this.getEnabledProviders();
    const contextChunks: ContextChunk[] = [];

    for (const provider of enabledProviders) {
      try {
        // Check if provider should be included for this specific request
        const shouldInclude = await provider.shouldInclude?.(conversationId, userMessage) ?? true;

        if (shouldInclude) {
          const chunks = await provider.getContext(conversationId, userMessage);
          contextChunks.push(...chunks);
        }
      } catch (error) {
        console.warn(`Context provider ${provider.id} failed to provide context:`, error);
        // Continue with other providers even if one fails
      }
    }

    // Sort by relevance if available, then by provider priority
    return contextChunks.sort((a, b) => {
      const relevanceA = a.metadata?.relevance ?? 0;
      const relevanceB = b.metadata?.relevance ?? 0;

      if (relevanceA !== relevanceB) {
        return relevanceB - relevanceA;
      }

      // If relevance is the same, maintain provider priority order
      return 0;
    });
  }

  /**
   * Enable a context provider
   */
  enableProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.isEnabled = true;
    }
  }

  /**
   * Disable a context provider
   */
  disableProvider(providerId: string): void {
    const provider = this.providers.get(providerId);
    if (provider) {
      provider.isEnabled = false;
    }
  }

  /**
   * Clear all providers
   */
  clear(): void {
    this.providers.clear();
  }
}

// Singleton context manager instance
let contextManagerInstance: ContextManager | null = null;

/**
 * Get the global context manager instance
 */
export const getContextManager = (): ContextManager => {
  if (!contextManagerInstance) {
    contextManagerInstance = new ContextManager();
  }
  return contextManagerInstance;
};
