import React, { useState, useRef, useEffect } from 'react';
import { ModalityInput } from '../../../../core/models/ModalityInput';
import { AttachmentViewer } from '../AttachmentViewer/AttachmentViewer';
import styles from './InputPanel.module.css';

interface InputPanelProps {
  onSendMessage: (content: string, attachments?: any[]) => void;
  disabled?: boolean;
}

interface Attachment {
  id: string;
  file: File;
  type: 'image' | 'audio' | 'video' | 'document';
  preview?: string;
  modalityInput?: ModalityInput;
}

export const InputPanel: React.FC<InputPanelProps> = ({ onSendMessage, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  // Cleanup recording on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleSend = () => {
    if (!message.trim() && attachments.length === 0) return;
    if (disabled) return;

    onSendMessage(message.trim(), attachments.length > 0 ? attachments : undefined);
    setMessage('');
    setAttachments([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const attachment: Attachment = {
        id: `${Date.now()}-${Math.random()}`,
        file,
        type: getFileType(file),
      };

      // Generate preview for images
      if (attachment.type === 'image') {
        const reader = new FileReader();
        reader.onload = e => {
          setAttachments(prev =>
            prev.map(att =>
              att.id === attachment.id ? { ...att, preview: e.target?.result as string } : att
            )
          );
        };
        reader.readAsDataURL(file);
      }

      // Create modality input
      attachment.modalityInput = createModalityInput(file);

      setAttachments(prev => [...prev, attachment]);
    });

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setShowAttachmentMenu(false);
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(prev => prev.filter(att => att.id !== attachmentId));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const file = new File([blob], `recording-${Date.now()}.webm`, { type: 'audio/webm' });

        const attachment: Attachment = {
          id: `${Date.now()}-${Math.random()}`,
          file,
          type: 'audio',
          modalityInput: createModalityInput(file),
        };

        setAttachments(prev => [...prev, attachment]);

        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Failed to access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    if (recordingIntervalRef.current) {
      clearInterval(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    setIsRecording(false);
    setRecordingTime(0);
  };

  const getFileType = (file: File): 'image' | 'audio' | 'video' | 'document' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return 'document';
  };

  const createModalityInput = (file: File): ModalityInput => {
    return {
      modalityType: getFileType(file),
      data: file,
      mimeType: file.type,
      size: file.size,
      timestamp: new Date(),
      source: 'user_upload',
      metadata: {
        fileName: file.name,
        lastModified: new Date(file.lastModified),
      },
    };
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.inputPanel}>
      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className={styles.attachmentsContainer}>
          <AttachmentViewer attachments={attachments} onRemove={handleRemoveAttachment} />
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className={styles.recordingIndicator}>
          <div className={styles.recordingDot}></div>
          <span>Recording {formatRecordingTime(recordingTime)}</span>
          <button onClick={stopRecording} className={styles.stopRecordingButton}>
            Stop
          </button>
        </div>
      )}

      {/* Main input area */}
      <div className={styles.inputContainer}>
        {/* Attachment menu */}
        {showAttachmentMenu && (
          <div className={styles.attachmentMenu}>
            <button
              onClick={() => fileInputRef.current?.click()}
              className={styles.attachmentOption}
            >
              📎 Upload File
            </button>
            <button
              onClick={() => {
                fileInputRef.current?.click();
                fileInputRef.current?.setAttribute('accept', 'image/*');
              }}
              className={styles.attachmentOption}
            >
              🖼️ Upload Image
            </button>
            <button
              onClick={() => {
                if (isRecording) {
                  stopRecording();
                } else {
                  startRecording();
                }
                setShowAttachmentMenu(false);
              }}
              className={styles.attachmentOption}
            >
              {isRecording ? '⏹️ Stop Recording' : '🎤 Voice Recording'}
            </button>
          </div>
        )}

        {/* Attachment button */}
        <button
          className={styles.attachmentButton}
          onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
          disabled={disabled}
          title="Add attachment"
        >
          📎
        </button>

        {/* Text input */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type your message... (Shift+Enter for new line)"
          className={styles.messageInput}
          disabled={disabled}
          rows={1}
        />

        {/* Send button */}
        <button
          onClick={handleSend}
          disabled={disabled || (!message.trim() && attachments.length === 0)}
          className={styles.sendButton}
          title="Send message"
        >
          📤
        </button>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="*/*"
          onChange={handleFileSelect}
          className={styles.hiddenFileInput}
        />
      </div>

      {/* Input hints */}
      <div className={styles.inputHints}>
        <span>Press Enter to send, Shift+Enter for new line</span>
        <span>Supports text, images, audio, and documents</span>
      </div>
    </div>
  );
};
