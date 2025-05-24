import React, { useState } from 'react';
import { ChatMessage } from '../../../../services/chat/chat.service';
import { MessageItem } from '../MessageItem/MessageItem';
import { LoadingSpinner } from '../../common/LoadingSpinner/LoadingSpinner';
import styles from './MessageDisplay.module.css';

interface MessageDisplayProps {
  messages: ChatMessage[];
  onDeleteMessage: (messageId: string) => void;
  isLoading?: boolean;
}

export const MessageDisplay: React.FC<MessageDisplayProps> = ({
  messages,
  onDeleteMessage,
  isLoading = false,
}) => {
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);

  const handleMessageSelect = (messageId: string) => {
    setSelectedMessageId(selectedMessageId === messageId ? null : messageId);
  };

  const groupMessagesByDate = (messages: ChatMessage[]) => {
    const groups: { [key: string]: ChatMessage[] } = {};

    messages.forEach(message => {
      const date = new Date(message.timestamp);
      const dateKey = date.toDateString();

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
    });

    return groups;
  };

  const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString([], {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
  };

  const messageGroups = groupMessagesByDate(messages);
  const sortedDateKeys = Object.keys(messageGroups).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  if (messages.length === 0 && !isLoading) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyStateIcon}>💬</div>
        <h3>Start a conversation</h3>
        <p>Send a message to begin your chat session.</p>
      </div>
    );
  }

  return (
    <div className={styles.messageDisplay}>
      <div className={styles.messageContainer}>
        {sortedDateKeys.map(dateKey => (
          <div key={dateKey} className={styles.dateGroup}>
            <div className={styles.dateSeparator}>
              <span className={styles.dateLabel}>{formatDateGroup(dateKey)}</span>
            </div>

            {messageGroups[dateKey].map((message, index) => {
              const prevMessage = index > 0 ? messageGroups[dateKey][index - 1] : null;
              const isGrouped = Boolean(
                prevMessage &&
                  prevMessage.role === message.role &&
                  new Date(message.timestamp).getTime() -
                    new Date(prevMessage.timestamp).getTime() <
                    300000 // 5 minutes
              );

              return (
                <MessageItem
                  key={message.id}
                  message={message}
                  isSelected={selectedMessageId === message.id}
                  isGrouped={isGrouped}
                  onSelect={() => handleMessageSelect(message.id)}
                  onDelete={() => onDeleteMessage(message.id)}
                />
              );
            })}
          </div>
        ))}

        {isLoading && (
          <div className={styles.loadingMessage}>
            <div className={styles.assistantAvatar}>
              <LoadingSpinner size="small" />
            </div>
            <div className={styles.loadingBubble}>
              <div className={styles.typingIndicator}>
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
