import { logger } from '@utils/logger';
import {
  ConversationRepository,
  MessageRepository,
} from '../../persistence/repositories/conversation.repository';
import { ConversationStatus } from '../../types';
import mongoose from 'mongoose';
import { getLLMService } from '../ai/llm.service';
import { getApiKeyService } from '../ai/api-key.service';
import { getContextManager } from '../ai/context/context-provider.interface';
import { LLMProvider } from '../ai/llm.service';

/**
 * Chat message interface
 */
export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Chat session interface
 */
export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  profileId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Chat service interface
 */
export interface ChatService {
  // Session methods
  getSessions(userId: string): Promise<ChatSession[]>;
  getSession(sessionId: string): Promise<ChatSession | null>;
  createSession(userId: string, title?: string, profileId?: string): Promise<ChatSession>;
  updateSession(sessionId: string, data: Partial<ChatSession>): Promise<ChatSession | null>;
  deleteSession(sessionId: string): Promise<boolean>;

  // Message methods
  getMessages(sessionId: string): Promise<ChatMessage[]>;
  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>, userId?: string): Promise<ChatMessage>;
  deleteMessage(messageId: string): Promise<boolean>;
}

/**
 * Database-backed chat service implementation
 */
class ChatServiceImpl implements ChatService {
  private conversationRepository: ConversationRepository;
  private messageRepository: MessageRepository;

  constructor() {
    this.messageRepository = new MessageRepository();
    this.conversationRepository = new ConversationRepository(this.messageRepository);
  }

  /**
   * Get all chat sessions for a user
   * @param userId User ID
   * @returns Array of chat sessions
   */
  async getSessions(userId: string): Promise<ChatSession[]> {
    logger.debug(`Getting chat sessions for user: ${userId}`);

    try {
      // Convert string userId to ObjectId if it's a valid ObjectId format
      const userObjectId = mongoose.Types.ObjectId.isValid(userId)
        ? userId
        : new mongoose.Types.ObjectId().toString(); // Generate a valid ObjectId for dev users

      const conversations = await this.conversationRepository.findActiveByUser(userObjectId);

      return conversations.map(conv => ({
        id: conv._id.toString(),
        userId: conv.userId.toString(),
        title: conv.title || `Chat ${conv.createdAt.toLocaleDateString()}`,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        profileId: conv.profile?.toString(),
        metadata: conv.metadata || {},
      }));
    } catch (error) {
      logger.error('Error getting chat sessions:', error);
      // Fallback to mock data for development
      return this.getMockSessions(userId);
    }
  }

  /**
   * Get a chat session by ID
   * @param sessionId Session ID
   * @returns Chat session or null if not found
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    logger.debug(`Getting chat session: ${sessionId}`);

    try {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        // Handle mock session IDs for development
        return this.getMockSession(sessionId);
      }

      const conversation = await this.conversationRepository.findById(sessionId);
      if (!conversation) {
        return null;
      }

      return {
        id: conversation._id.toString(),
        userId: conversation.userId.toString(),
        title: conversation.title || `Chat ${conversation.createdAt.toLocaleDateString()}`,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        profileId: conversation.profile?.toString(),
        metadata: conversation.metadata || {},
      };
    } catch (error) {
      logger.error('Error getting chat session:', error);
      return this.getMockSession(sessionId);
    }
  }

  /**
   * Create a new chat session
   * @param userId User ID
   * @param title Optional session title
   * @param profileId Optional profile ID
   * @returns Created chat session
   */
  async createSession(userId: string, title?: string, profileId?: string): Promise<ChatSession> {
    logger.debug(`Creating chat session for user: ${userId}`);

    try {
      const now = new Date();

      // Create default context for the conversation
      const defaultContext = {
        systemPrompt: 'You are a helpful AI assistant.',
        personaAttributes: {},
        memoryElements: [],
        activeTools: [],
        userProfile: {
          preferences: {},
          history: [],
          knownFacts: {},
        },
        environmentContext: {
          timezone: 'UTC',
          locale: 'en-US',
          device: {
            type: 'web',
            capabilities: ['text'],
          },
          currentTime: now,
        },
        customData: {},
      };

      // Convert userId to ObjectId if it's not already one
      const userObjectId = mongoose.Types.ObjectId.isValid(userId)
        ? new mongoose.Types.ObjectId(userId)
        : new mongoose.Types.ObjectId(); // Generate a new ObjectId for dev users

      const conversationData = {
        title: title || `Chat ${now.toLocaleDateString()}`,
        userId: userObjectId as any, // Cast to handle ObjectId compatibility
        context: defaultContext,
        profile: (profileId
          ? new mongoose.Types.ObjectId(profileId)
          : new mongoose.Types.ObjectId()) as any,
        status: ConversationStatus.ACTIVE,
        metadata: {},
        pinned: false,
        sharedWith: [],
        messages: [],
        activeModules: [],
      };

      const conversation = await this.conversationRepository.create(conversationData);

      return {
        id: conversation._id.toString(),
        userId: conversation.userId.toString(),
        title: conversation.title || `Chat ${conversation.createdAt.toLocaleDateString()}`,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        profileId: conversation.profile?.toString(),
        metadata: conversation.metadata || {},
      };
    } catch (error) {
      logger.error('Error creating chat session:', error);
      // Fallback to mock session for development
      return this.createMockSession(userId, title);
    }
  }

  /**
   * Update a chat session
   * @param sessionId Session ID
   * @param data Session data to update
   * @returns Updated chat session or null if not found
   */
  async updateSession(sessionId: string, data: Partial<ChatSession>): Promise<ChatSession | null> {
    logger.debug(`Updating chat session: ${sessionId}`);

    try {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return this.getMockSession(sessionId);
      }

      const updateData: any = {};
      if (data.title) updateData.title = data.title;
      if (data.metadata) updateData.metadata = data.metadata;

      const conversation = await this.conversationRepository.updateById(sessionId, updateData);
      if (!conversation) {
        return null;
      }

      return {
        id: conversation._id.toString(),
        userId: conversation.userId.toString(),
        title: conversation.title || `Chat ${conversation.createdAt.toLocaleDateString()}`,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        profileId: conversation.profile?.toString(),
        metadata: conversation.metadata || {},
      };
    } catch (error) {
      logger.error('Error updating chat session:', error);
      return this.getMockSession(sessionId);
    }
  }

  /**
   * Delete a chat session
   * @param sessionId Session ID
   * @returns True if deleted
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    logger.debug(`Deleting chat session: ${sessionId}`);

    try {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return true; // Mock sessions are always "deleted"
      }

      const result = await this.conversationRepository.deleteConversation(sessionId);
      return result !== null;
    } catch (error) {
      logger.error('Error deleting chat session:', error);
      return false;
    }
  }

  /**
   * Get all messages for a chat session
   * @param sessionId Session ID
   * @returns Array of chat messages
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    logger.debug(`Getting messages for session: ${sessionId}`);

    try {
      if (!mongoose.Types.ObjectId.isValid(sessionId)) {
        return this.getMockMessages(sessionId);
      }

      const messages = await this.messageRepository.findByConversation(sessionId);

      return messages.map(msg => ({
        id: msg._id.toString(),
        sessionId: msg.conversationId.toString(),
        content: msg.content.map(c => c.value).join(' '), // Flatten content for simple display
        role: msg.role,
        timestamp: msg.createdAt,
        metadata: (msg.metadata as Record<string, unknown>) || {},
      }));
    } catch (error) {
      logger.error('Error getting messages:', error);
      return this.getMockMessages(sessionId);
    }
  }

  /**
   * Add a new message to a chat session
   * @param message Message data
   * @param userId User ID for AI response generation
   * @returns Created chat message
   */
  async addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>, userId?: string): Promise<ChatMessage> {
    logger.debug(`Adding message to session: ${message.sessionId}`);

    try {
      if (!mongoose.Types.ObjectId.isValid(message.sessionId)) {
        return this.createMockMessage(message);
      }

      const messageData = {
        conversationId: message.sessionId as any, // Cast to handle ObjectId compatibility
        role: message.role,
        content: [{ type: 'text', value: message.content }],
        createdAt: new Date(),
        metadata: message.metadata || {},
      };

      const createdMessage = await this.conversationRepository.addMessage(
        message.sessionId,
        messageData
      );

      // Generate AI response for user messages
      if (message.role === 'user') {
        const aiResponse = await this.generateAIResponse(message.content, message.sessionId, userId);
        await this.addMessage({
          sessionId: message.sessionId,
          content: aiResponse,
          role: 'assistant',
          metadata: { generated: true },
        }, userId);
      }

      return {
        id: createdMessage._id.toString(),
        sessionId: createdMessage.conversationId.toString(),
        content: createdMessage.content.map(c => c.value).join(' '),
        role: createdMessage.role,
        timestamp: createdMessage.createdAt,
        metadata: (createdMessage.metadata as Record<string, unknown>) || {},
      };
    } catch (error) {
      logger.error('Error adding message:', error);
      return this.createMockMessage(message);
    }
  }

  /**
   * Delete a chat message
   * @param messageId Message ID
   * @returns True if deleted
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    logger.debug(`Deleting message: ${messageId}`);

    try {
      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return true; // Mock messages are always "deleted"
      }

      const result = await this.messageRepository.deleteById(messageId);
      return result !== null;
    } catch (error) {
      logger.error('Error deleting message:', error);
      return false;
    }
  }

  /**
   * Generate AI response using LLM services
   * @param userMessage User message content
   * @param sessionId Session ID for context
   * @param userId User ID for API key lookup
   * @returns AI response
   */
  private async generateAIResponse(userMessage: string, sessionId: string, userId?: string): Promise<string> {
    try {
      // Use provided userId or fallback to dev-user-id for development
      const actualUserId = userId || 'dev-user-id';
      const llmService = getLLMService();
      const apiKeyService = getApiKeyService();
      const contextManager = getContextManager();

      // Check if user has any configured API keys
      const userProviders = await apiKeyService.getUserProviders(actualUserId);
      if (userProviders.length === 0) {
        return this.getFallbackResponse(userMessage);
      }

      // Use the first available provider (in the future, this could be user-configurable)
      const provider = userProviders[0] as LLMProvider;
      const apiKey = await apiKeyService.getApiKey(actualUserId, provider);

      if (!apiKey) {
        return this.getFallbackResponse(userMessage);
      }

      // Initialize LLM service with user's API key
      await llmService.initialize({
        provider,
        apiKey,
        temperature: 0.7,
        maxTokens: 4000,
      });

      // Gather context from all enabled providers
      const contextChunks = await contextManager.gatherContext(sessionId, userMessage);

      // Generate response using LLM
      const response = await llmService.generateResponse(userMessage, contextChunks);

      // Track API usage
      await apiKeyService.trackUsage(actualUserId, provider);

      return response;
    } catch (error) {
      logger.error('Error generating AI response:', error);
      return this.getFallbackResponse(userMessage);
    }
  }

  /**
   * Get fallback response when AI services are unavailable
   * @param userMessage User message content
   * @returns Fallback response
   */
  private getFallbackResponse(userMessage: string): string {
    const responses = [
      `I received your message: "${userMessage}". To enable AI responses, please configure your API keys in settings.`,
      `Thanks for your message: "${userMessage}". I'd love to help, but I need an AI provider configured first.`,
      `I see you said: "${userMessage}". Please add an API key for Claude, GPT, or another AI provider to get intelligent responses.`,
      `Your message: "${userMessage}" was received. Configure an AI provider in settings to unlock advanced conversations.`,
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Mock data methods for development fallback
  private getMockSessions(userId: string): ChatSession[] {
    return [
      {
        id: 'session-1',
        userId,
        title: 'Welcome Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      },
    ];
  }

  private getMockSession(sessionId: string): ChatSession | null {
    if (sessionId === 'session-1') {
      return {
        id: sessionId,
        userId: 'dev-user-id',
        title: 'Welcome Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {},
      };
    }
    return null;
  }

  private createMockSession(userId: string, title?: string): ChatSession {
    return {
      id: `session-${Date.now()}`,
      userId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
    };
  }

  private getMockMessages(sessionId: string): ChatMessage[] {
    return [
      {
        id: 'message-1',
        sessionId,
        content: 'Welcome to Project Mosaic! How can I help you today?',
        role: 'assistant',
        timestamp: new Date(),
        metadata: {},
      },
    ];
  }

  private createMockMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    return {
      ...message,
      id: `message-${Date.now()}`,
      timestamp: new Date(),
    };
  }
}

// Create singleton instance
const chatServiceInstance = new ChatServiceImpl();

/**
 * Initialize chat service
 */
export const initChatService = async (): Promise<void> => {
  logger.info('Initializing chat service');
  // Add initialization logic here
};

/**
 * Get chat service instance
 * @returns Chat service instance
 */
export const getChatService = (): ChatService => {
  return chatServiceInstance;
};
