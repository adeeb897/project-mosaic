import { logger } from '@utils/logger';

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
  createSession(userId: string, title?: string): Promise<ChatSession>;
  updateSession(sessionId: string, data: Partial<ChatSession>): Promise<ChatSession | null>;
  deleteSession(sessionId: string): Promise<boolean>;

  // Message methods
  getMessages(sessionId: string): Promise<ChatMessage[]>;
  addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage>;
  deleteMessage(messageId: string): Promise<boolean>;
}

/**
 * Chat service implementation
 */
class ChatServiceImpl implements ChatService {
  private sessions: ChatSession[] = [];
  private messages: ChatMessage[] = [];

  /**
   * Get all chat sessions for a user
   * @param userId User ID
   * @returns Array of chat sessions
   */
  async getSessions(userId: string): Promise<ChatSession[]> {
    logger.debug(`Getting chat sessions for user: ${userId}`);
    return this.sessions.filter(session => session.userId === userId);
  }

  /**
   * Get a chat session by ID
   * @param sessionId Session ID
   * @returns Chat session or null if not found
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    logger.debug(`Getting chat session: ${sessionId}`);
    const session = this.sessions.find(s => s.id === sessionId);
    return session || null;
  }

  /**
   * Create a new chat session
   * @param userId User ID
   * @param title Optional session title
   * @returns Created chat session
   */
  async createSession(userId: string, title?: string): Promise<ChatSession> {
    logger.debug(`Creating chat session for user: ${userId}`);

    const now = new Date();
    const session: ChatSession = {
      id: `session-${Date.now()}`,
      userId,
      title: title || `Chat ${now.toLocaleDateString()}`,
      createdAt: now,
      updatedAt: now,
    };

    this.sessions.push(session);
    return session;
  }

  /**
   * Update a chat session
   * @param sessionId Session ID
   * @param data Session data to update
   * @returns Updated chat session or null if not found
   */
  async updateSession(sessionId: string, data: Partial<ChatSession>): Promise<ChatSession | null> {
    logger.debug(`Updating chat session: ${sessionId}`);

    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index === -1) {
      return null;
    }

    const updatedSession = {
      ...this.sessions[index],
      ...data,
      updatedAt: new Date(),
    };

    this.sessions[index] = updatedSession;
    return updatedSession;
  }

  /**
   * Delete a chat session
   * @param sessionId Session ID
   * @returns True if deleted
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    logger.debug(`Deleting chat session: ${sessionId}`);

    const index = this.sessions.findIndex(s => s.id === sessionId);
    if (index === -1) {
      return false;
    }

    this.sessions.splice(index, 1);

    // Also delete all messages for this session
    this.messages = this.messages.filter(m => m.sessionId !== sessionId);

    return true;
  }

  /**
   * Get all messages for a chat session
   * @param sessionId Session ID
   * @returns Array of chat messages
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    logger.debug(`Getting messages for session: ${sessionId}`);
    return this.messages.filter(message => message.sessionId === sessionId);
  }

  /**
   * Add a new message to a chat session
   * @param message Message data
   * @returns Created chat message
   */
  async addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    logger.debug(`Adding message to session: ${message.sessionId}`);

    const newMessage: ChatMessage = {
      ...message,
      id: `message-${Date.now()}`,
      timestamp: new Date(),
    };

    this.messages.push(newMessage);

    // Update the session's updatedAt timestamp
    await this.updateSession(message.sessionId, {});

    return newMessage;
  }

  /**
   * Delete a chat message
   * @param messageId Message ID
   * @returns True if deleted
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    logger.debug(`Deleting message: ${messageId}`);

    const index = this.messages.findIndex(m => m.id === messageId);
    if (index === -1) {
      return false;
    }

    const sessionId = this.messages[index].sessionId;
    this.messages.splice(index, 1);

    // Update the session's updatedAt timestamp
    await this.updateSession(sessionId, {});

    return true;
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
