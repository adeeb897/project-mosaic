/**
 * Unit tests for Chat Service
 */

import { getChatService, ChatSession } from '../../../src/services/chat/chat.service';

// Mock the logger
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('ChatService', () => {
  const chatService = getChatService();
  const userId = 'test-user-id';
  let testSession: ChatSession;

  beforeEach(async () => {
    // Create a test session for each test
    testSession = await chatService.createSession(userId, 'Test Session');
  });

  describe('getSessions', () => {
    it('should return sessions for a user', async () => {
      // Arrange - create another session
      await chatService.createSession(userId, 'Another Session');

      // Act
      const sessions = await chatService.getSessions(userId);

      // Assert
      expect(sessions.length).toBeGreaterThanOrEqual(2);
      expect(sessions.some(s => s.id === testSession.id)).toBe(true);
      expect(sessions.every(s => s.userId === userId)).toBe(true);
    });

    it('should return empty array for user with no sessions', async () => {
      // Act
      const sessions = await chatService.getSessions('non-existent-user');

      // Assert
      expect(sessions).toEqual([]);
    });
  });

  describe('getSession', () => {
    it('should return a session by ID', async () => {
      // Act
      const session = await chatService.getSession(testSession.id);

      // Assert
      expect(session).toEqual(testSession);
    });

    it('should return null for non-existent session', async () => {
      // Act
      const session = await chatService.getSession('non-existent-session');

      // Assert
      expect(session).toBeNull();
    });
  });

  describe('createSession', () => {
    it('should create a session with provided title', async () => {
      // Arrange
      const title = 'Custom Title Session';

      // Act
      const session = await chatService.createSession(userId, title);

      // Assert
      expect(session.userId).toBe(userId);
      expect(session.title).toBe(title);
      expect(session.id).toBeDefined();
      expect(session.createdAt).toBeInstanceOf(Date);
      expect(session.updatedAt).toBeInstanceOf(Date);
    });

    it('should create a session with default title if not provided', async () => {
      // Act
      const session = await chatService.createSession(userId);

      // Assert
      expect(session.userId).toBe(userId);
      expect(session.title).toContain('Chat ');
      expect(session.id).toBeDefined();
    });
  });

  describe('updateSession', () => {
    it('should update a session', async () => {
      // Arrange
      const updateData = {
        title: 'Updated Title',
        metadata: { key: 'value' },
      };

      // Act
      const updatedSession = await chatService.updateSession(testSession.id, updateData);

      // Assert
      expect(updatedSession).not.toBeNull();
      expect(updatedSession?.title).toBe(updateData.title);
      expect(updatedSession?.metadata).toEqual(updateData.metadata);
      expect(updatedSession?.updatedAt.getTime()).toBeGreaterThanOrEqual(
        testSession.updatedAt.getTime()
      );
    });

    it('should return null when updating non-existent session', async () => {
      // Act
      const result = await chatService.updateSession('non-existent-session', {
        title: 'New Title',
      });

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete a session and verify it returns true', async () => {
      // Create a new session specifically for this test to avoid interference
      const sessionToDelete = await chatService.createSession(userId, 'Session To Delete');
      const sessionId = sessionToDelete.id;

      // Act
      const result = await chatService.deleteSession(sessionId);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when deleting non-existent session', async () => {
      // Act
      const result = await chatService.deleteSession('non-existent-session');

      // Assert
      expect(result).toBe(false);
    });

    it('should delete all messages associated with the session', async () => {
      // Arrange
      await chatService.addMessage({
        sessionId: testSession.id,
        content: 'Test message',
        role: 'user',
      });

      // Act
      await chatService.deleteSession(testSession.id);
      const messages = await chatService.getMessages(testSession.id);

      // Assert
      expect(messages.length).toBe(0);
    });
  });

  describe('getMessages', () => {
    it('should return messages for a session', async () => {
      // Arrange
      const message1 = await chatService.addMessage({
        sessionId: testSession.id,
        content: 'Message 1',
        role: 'user',
      });
      const message2 = await chatService.addMessage({
        sessionId: testSession.id,
        content: 'Message 2',
        role: 'assistant',
      });

      // Act
      const messages = await chatService.getMessages(testSession.id);

      // Assert
      expect(messages.length).toBe(2);
      expect(messages).toContainEqual(message1);
      expect(messages).toContainEqual(message2);
    });

    it('should filter messages by session ID', async () => {
      // Create a new session specifically for this test
      const newSession = await chatService.createSession('unique-user-id', 'New Session');

      // Add a message to the new session with unique content
      const newMessage = await chatService.addMessage({
        sessionId: newSession.id,
        content: 'Message for new session',
        role: 'user',
      });

      // Act - get messages for this specific session
      const sessionMessages = await chatService.getMessages(newSession.id);

      // Assert that we can find our message
      expect(sessionMessages.length).toBeGreaterThanOrEqual(1);

      // Find our specific message by ID
      const ourMessage = sessionMessages.find(m => m.id === newMessage.id);
      expect(ourMessage).toBeDefined();
      expect(ourMessage?.content).toBe('Message for new session');
      expect(ourMessage?.sessionId).toBe(newSession.id);
    });
  });

  describe('addMessage', () => {
    it('should add a message to a session', async () => {
      // Arrange
      const messageData = {
        sessionId: testSession.id,
        content: 'Test message content',
        role: 'user' as const,
        metadata: { source: 'test' },
      };

      // Act
      const message = await chatService.addMessage(messageData);

      // Assert
      expect(message.id).toBeDefined();
      expect(message.sessionId).toBe(messageData.sessionId);
      expect(message.content).toBe(messageData.content);
      expect(message.role).toBe(messageData.role);
      expect(message.metadata).toEqual(messageData.metadata);
      expect(message.timestamp).toBeInstanceOf(Date);
    });

    it('should update the session updatedAt timestamp when adding a message', async () => {
      // Arrange
      const originalUpdatedAt = testSession.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 10);
        // Ensure the timer doesn't keep the process alive
        timer.unref();
      });

      // Act
      await chatService.addMessage({
        sessionId: testSession.id,
        content: 'Test message',
        role: 'user',
      });

      const updatedSession = await chatService.getSession(testSession.id);

      // Assert
      expect(updatedSession?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message and verify it returns true', async () => {
      // Arrange
      const message = await chatService.addMessage({
        sessionId: testSession.id,
        content: 'Test message to delete',
        role: 'user',
      });

      // Act
      const result = await chatService.deleteMessage(message.id);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false when deleting non-existent message', async () => {
      // Act
      const result = await chatService.deleteMessage('non-existent-message');

      // Assert
      expect(result).toBe(false);
    });

    it('should update the session updatedAt timestamp when deleting a message', async () => {
      // Arrange
      const message = await chatService.addMessage({
        sessionId: testSession.id,
        content: 'Test message to delete',
        role: 'user',
      });

      const sessionBeforeDelete = await chatService.getSession(testSession.id);
      const originalUpdatedAt = sessionBeforeDelete!.updatedAt;

      // Wait a bit to ensure timestamp difference
      await new Promise(resolve => {
        const timer = setTimeout(resolve, 10);
        // Ensure the timer doesn't keep the process alive
        timer.unref();
      });

      // Act
      await chatService.deleteMessage(message.id);
      const updatedSession = await chatService.getSession(testSession.id);

      // Assert
      expect(updatedSession?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });
});
