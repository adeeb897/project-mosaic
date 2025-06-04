import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useUser } from '../../../contexts/UserContext';
import { chatApiService, ChatMessage, ChatSession } from '../../../services/api.service';
import { ConversationList } from '../ConversationList/ConversationList';
import { MessageDisplay } from '../MessageDisplay/MessageDisplay';
import { InputPanel } from '../InputPanel/InputPanel';
import { ContextPanel } from '../ContextPanel/ContextPanel';
import { LoadingSpinner } from '../../common/LoadingSpinner/LoadingSpinner';
import styles from './ChatInterface.module.css';

export const ChatInterface: React.FC = () => {
  const { state: userState } = useUser();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load user sessions on mount
  useEffect(() => {
    const loadSessions = async () => {
      if (!userState.user) return;

      try {
        setIsLoading(true);
        const userSessions = await chatApiService.getSessions(userState.user.id);
        setSessions(userSessions);

        // Auto-select most recent session or create new one
        if (userSessions.length > 0) {
          const mostRecent = userSessions.sort(
            (a: ChatSession, b: ChatSession) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];
          setCurrentSession(mostRecent);
        } else {
          // Create default session
          const newSession = await chatApiService.createSession(userState.user.id, 'New Chat');
          setSessions([newSession]);
          setCurrentSession(newSession);
        }
      } catch (error) {
        console.error('Failed to load sessions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSessions();
  }, [userState.user]);

  // Load messages when session changes
  useEffect(() => {
    const loadMessages = async () => {
      if (!currentSession) return;

      try {
        const sessionMessages = await chatApiService.getMessages(currentSession.id);
        setMessages(sessionMessages);
        // Scroll to bottom after messages load
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };

    loadMessages();
  }, [currentSession, scrollToBottom]);

  // Handle session selection
  const handleSessionSelect = useCallback((session: ChatSession) => {
    setCurrentSession(session);
  }, []);

  // Handle new session creation
  const handleNewSession = useCallback(async () => {
    if (!userState.user) return;

    try {
      const newSession = await chatApiService.createSession(userState.user.id, 'New Chat');
      setSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
    } catch (error) {
      console.error('Failed to create session:', error);
    }
  }, [userState.user]);

  // Handle session deletion
  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      try {
        await chatApiService.deleteSession(sessionId);
        setSessions(prev => prev.filter(s => s.id !== sessionId));

        // If deleted session was current, switch to another or create new
        if (currentSession?.id === sessionId) {
          const remainingSessions = sessions.filter(s => s.id !== sessionId);
          if (remainingSessions.length > 0) {
            setCurrentSession(remainingSessions[0]);
          } else {
            // Create new session if no sessions remain
            handleNewSession();
          }
        }
      } catch (error) {
        console.error('Failed to delete session:', error);
      }
    },
    [currentSession, sessions, handleNewSession]
  );

  // Handle sending messages
  const handleSendMessage = useCallback(
    async (content: string, attachments?: any[]) => {
      if (!currentSession || !content.trim()) return;

      try {
        setIsSending(true);

        // Add user message
        const userMessage = await chatApiService.addMessage({
          sessionId: currentSession.id,
          content: content.trim(),
          role: 'user',
          metadata: attachments ? { attachments } : undefined,
        });

        setMessages(prev => [...prev, userMessage]);

        // TODO: Integrate with AI service for response
        // For now, add a placeholder assistant response
        setTimeout(async () => {
          const assistantMessage = await chatApiService.addMessage({
            sessionId: currentSession.id,
            content: `I received your message: "${content.trim()}". This is a placeholder response.`,
            role: 'assistant',
          });

          setMessages(prev => [...prev, assistantMessage]);
          setTimeout(scrollToBottom, 100);
        }, 1000);

        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Failed to send message:', error);
      } finally {
        setIsSending(false);
      }
    },
    [currentSession, scrollToBottom]
  );

  // Handle message deletion
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await chatApiService.deleteMessage(messageId);
      setMessages(prev => prev.filter(m => m.id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  }, []);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <LoadingSpinner size="large" />
        <p>Loading chat interface...</p>
      </div>
    );
  }

  return (
    <div className={styles.chatInterface}>
      <div className={styles.sidebar}>
        <ConversationList
          sessions={sessions}
          currentSession={currentSession}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />
      </div>

      <div className={styles.mainChat}>
        <div className={styles.chatHeader}>
          <h2>{currentSession?.title || 'Chat'}</h2>
          <div className={styles.headerActions}>
            <button
              className={styles.contextToggle}
              onClick={() => setShowContext(!showContext)}
              aria-pressed={showContext}
            >
              Context
            </button>
          </div>
        </div>

        <div className={styles.messageArea}>
          <MessageDisplay
            messages={messages}
            onDeleteMessage={handleDeleteMessage}
            isLoading={isSending}
          />
          <div ref={messagesEndRef} />
        </div>

        <div className={styles.inputArea}>
          <InputPanel onSendMessage={handleSendMessage} disabled={isSending} />
        </div>
      </div>

      {showContext && (
        <div className={styles.contextSidebar}>
          <ContextPanel session={currentSession} onClose={() => setShowContext(false)} />
        </div>
      )}
    </div>
  );
};
