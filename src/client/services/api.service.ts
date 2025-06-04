/**
 * Client-side API service for communicating with the backend
 */

export interface ChatMessage {
  id: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

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
 * Client-side chat API service
 */
export class ChatApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3000/api';
  }

  /**
   * Get all chat sessions for a user
   */
  async getSessions(userId: string): Promise<ChatSession[]> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/sessions?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch sessions: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching sessions:', error);
      // Return mock data for development
      return this.getMockSessions(userId);
    }
  }

  /**
   * Get a chat session by ID
   */
  async getSession(sessionId: string): Promise<ChatSession | null> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/sessions/${sessionId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to fetch session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching session:', error);
      return null;
    }
  }

  /**
   * Create a new chat session
   */
  async createSession(userId: string, title?: string): Promise<ChatSession> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ userId, title }),
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating session:', error);
      // Return mock session for development
      return this.createMockSession(userId, title);
    }
  }

  /**
   * Update a chat session
   */
  async updateSession(sessionId: string, data: Partial<ChatSession>): Promise<ChatSession | null> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`Failed to update session: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating session:', error);
      return null;
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  /**
   * Get all messages for a chat session
   */
  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/sessions/${sessionId}/messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching messages:', error);
      // Return mock messages for development
      return this.getMockMessages(sessionId);
    }
  }

  /**
   * Add a new message to a chat session
   */
  async addMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<ChatMessage> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/sessions/${message.sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(message),
      });

      if (!response.ok) {
        throw new Error(`Failed to add message: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error adding message:', error);
      // Return mock message for development
      return this.createMockMessage(message);
    }
  }

  /**
   * Delete a chat message
   */
  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      return response.ok;
    } catch (error) {
      console.error('Error deleting message:', error);
      return false;
    }
  }

  // Mock data methods for development when backend is not available
  private getMockSessions(userId: string): ChatSession[] {
    return [
      {
        id: 'session-1',
        userId,
        title: 'Welcome Chat',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
  }

  private createMockSession(userId: string, title?: string): ChatSession {
    return {
      id: `session-${Date.now()}`,
      userId,
      title: title || `Chat ${new Date().toLocaleDateString()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
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
export const chatApiService = new ChatApiService();
