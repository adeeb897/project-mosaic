import React from 'react';
import styles from './AttachmentViewer.module.css';

interface Attachment {
  id: string;
  file: File;
  type: 'image' | 'audio' | 'video' | 'document';
  preview?: string;
}

interface AttachmentViewerProps {
  attachments: Attachment[];
  onRemove: (attachmentId: string) => void;
}

export const AttachmentViewer: React.FC<AttachmentViewerProps> = ({ attachments, onRemove }) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'image':
        return '🖼️';
      case 'audio':
        return '🎵';
      case 'video':
        return '🎬';
      case 'document':
        return '📄';
      default:
        return '📎';
    }
  };

  if (attachments.length === 0) {
    return null;
  }

  return (
    <div className={styles.attachmentViewer}>
      <div className={styles.header}>
        <span className={styles.title}>Attachments ({attachments.length})</span>
      </div>

      <div className={styles.attachmentGrid}>
        {attachments.map(attachment => (
          <div key={attachment.id} className={styles.attachmentItem}>
            <div className={styles.attachmentPreview}>
              {attachment.type === 'image' && attachment.preview ? (
                <img
                  src={attachment.preview}
                  alt={attachment.file.name}
                  className={styles.imagePreview}
                />
              ) : (
                <div className={styles.fileIcon}>{getFileIcon(attachment.type)}</div>
              )}

              <button
                className={styles.removeButton}
                onClick={() => onRemove(attachment.id)}
                title="Remove attachment"
              >
                ×
              </button>
            </div>

            <div className={styles.attachmentInfo}>
              <div className={styles.fileName} title={attachment.file.name}>
                {attachment.file.name}
              </div>
              <div className={styles.fileDetails}>
                <span className={styles.fileSize}>{formatFileSize(attachment.file.size)}</span>
                <span className={styles.fileType}>{attachment.type}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
