import React, { useState } from 'react';
import { ChatSession } from '../../../../services/chat/chat.service';
import styles from './ConversationList.module.css';

interface ConversationListProps {
  sessions: ChatSession[];
  currentSession: ChatSession | null;
  onSessionSelect: (session: ChatSession) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  sessions,
  currentSession,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    } else {
      return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this conversation?')) {
      onDeleteSession(sessionId);
    }
  };

  return (
    <div className={styles.conversationList}>
      <div className={styles.header}>
        <button
          className={styles.newChatButton}
          onClick={onNewSession}
          title="Start new conversation"
        >
          <span className={styles.icon}>+</span>
          New Chat
        </button>
      </div>

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className={styles.searchInput}
        />
      </div>

      <div className={styles.sessionList}>
        {filteredSessions.length === 0 ? (
          <div className={styles.emptyState}>
            {searchTerm ? 'No conversations found' : 'No conversations yet'}
          </div>
        ) : (
          filteredSessions.map(session => (
            <div
              key={session.id}
              className={`${styles.sessionItem} ${
                currentSession?.id === session.id ? styles.active : ''
              }`}
              onClick={() => onSessionSelect(session)}
            >
              <div className={styles.sessionContent}>
                <div className={styles.sessionTitle}>{session.title}</div>
                <div className={styles.sessionDate}>{formatDate(session.updatedAt)}</div>
              </div>
              <button
                className={styles.deleteButton}
                onClick={e => handleDeleteClick(e, session.id)}
                title="Delete conversation"
                aria-label={`Delete conversation: ${session.title}`}
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
