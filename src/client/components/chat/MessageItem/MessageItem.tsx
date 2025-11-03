import React, { useState } from 'react';
import { ChatMessage } from '../../../../services/chat/chat.service';
import { RichContentRenderer } from '../RichContentRenderer/RichContentRenderer';
import styles from './MessageItem.module.css';

interface MessageItemProps {
  message: ChatMessage;
  isSelected: boolean;
  isGrouped: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export const MessageItem: React.FC<MessageItemProps> = ({
  message,
  isSelected,
  isGrouped,
  onSelect,
  onDelete,
}) => {
  const [showActions, setShowActions] = useState(false);

  const formatTime = (timestamp: Date | string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getAvatar = (role: string) => {
    switch (role) {
      case 'user':
        return '👤';
      case 'assistant':
        return '🤖';
      case 'system':
        return '⚙️';
      default:
        return '?';
    }
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleDeleteClick = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      onDelete();
    }
  };

  return (
    <div
      className={`${styles.messageItem} ${styles[message.role]} ${
        isSelected ? styles.selected : ''
      } ${isGrouped ? styles.grouped : ''}`}
      onClick={onSelect}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className={styles.messageLayout}>
        {!isGrouped && (
          <div className={styles.avatar}>
            <span className={styles.avatarIcon}>{getAvatar(message.role)}</span>
          </div>
        )}

        <div className={styles.messageContent}>
          {!isGrouped && (
            <div className={styles.messageHeader}>
              <span className={styles.role}>
                {message.role === 'user'
                  ? 'You'
                  : message.role === 'assistant'
                    ? 'Assistant'
                    : 'System'}
              </span>
              <span className={styles.timestamp}>{formatTime(message.timestamp)}</span>
            </div>
          )}

          <div className={styles.messageBubble}>
            <RichContentRenderer content={message.content} />

            {message.metadata?.attachments && Array.isArray(message.metadata.attachments) ? (
              <div className={styles.attachments}>
                {/* TODO: Render attachments */}
                <div className={styles.attachmentPlaceholder}>
                  📎 {(message.metadata.attachments as unknown[]).length} attachment(s)
                </div>
              </div>
            ) : null}
          </div>

          {(showActions || isSelected) && (
            <div className={styles.messageActions}>
              <button
                className={styles.actionButton}
                onClick={e => {
                  e.stopPropagation();
                  handleCopyMessage();
                }}
                title="Copy message"
              >
                📋
              </button>
              <button
                className={styles.actionButton}
                onClick={e => {
                  e.stopPropagation();
                  handleDeleteClick();
                }}
                title="Delete message"
              >
                🗑️
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
