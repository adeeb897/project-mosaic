import React from 'react';
import styles from './RichContentRenderer.module.css';

interface RichContentRendererProps {
  content: string;
  metadata?: Record<string, unknown>;
}

export const RichContentRenderer: React.FC<RichContentRendererProps> = ({ content }) => {
  // Parse and render markdown-like content
  const renderContent = (text: string) => {
    // Split content into segments for processing
    const segments = parseContentSegments(text);

    return segments.map((segment, index) => {
      switch (segment.type) {
        case 'code_block':
          return (
            <div key={index} className={styles.codeBlock}>
              <div className={styles.codeHeader}>
                <span className={styles.language}>{segment.language || 'text'}</span>
                <button
                  className={styles.copyButton}
                  onClick={() => copyToClipboard(segment.content)}
                  title="Copy code"
                >
                  📋
                </button>
              </div>
              <pre className={styles.codeContent}>
                <code>{segment.content}</code>
              </pre>
            </div>
          );

        case 'inline_code':
          return (
            <code key={index} className={styles.inlineCode}>
              {segment.content}
            </code>
          );

        case 'bold':
          return (
            <strong key={index} className={styles.bold}>
              {segment.content}
            </strong>
          );

        case 'italic':
          return (
            <em key={index} className={styles.italic}>
              {segment.content}
            </em>
          );

        case 'link':
          return (
            <a
              key={index}
              href={segment.url}
              className={styles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {segment.content}
            </a>
          );

        case 'list':
          return (
            <ul key={index} className={styles.list}>
              {segment.items?.map((item: string, itemIndex: number) => (
                <li key={itemIndex}>{renderInlineContent(item)}</li>
              )) || null}
            </ul>
          );

        case 'numbered_list':
          return (
            <ol key={index} className={styles.numberedList}>
              {segment.items?.map((item: string, itemIndex: number) => (
                <li key={itemIndex}>{renderInlineContent(item)}</li>
              )) || null}
            </ol>
          );

        case 'quote':
          return (
            <blockquote key={index} className={styles.quote}>
              {renderInlineContent(segment.content)}
            </blockquote>
          );

        case 'heading': {
          const HeadingTag = `h${segment.level}` as keyof JSX.IntrinsicElements;
          return (
            <HeadingTag key={index} className={styles.heading}>
              {segment.content}
            </HeadingTag>
          );
        }

        case 'paragraph':
          return (
            <p key={index} className={styles.paragraph}>
              {renderInlineContent(segment.content)}
            </p>
          );

        default:
          return <span key={index}>{renderInlineContent(segment.content)}</span>;
      }
    });
  };

  const renderInlineContent = (text: string) => {
    // Process inline formatting
    const inlineSegments = parseInlineContent(text);
    return inlineSegments.map((segment, index) => {
      switch (segment.type) {
        case 'inline_code':
          return (
            <code key={index} className={styles.inlineCode}>
              {segment.content}
            </code>
          );
        case 'bold':
          return (
            <strong key={index} className={styles.bold}>
              {segment.content}
            </strong>
          );
        case 'italic':
          return (
            <em key={index} className={styles.italic}>
              {segment.content}
            </em>
          );
        case 'link':
          return (
            <a
              key={index}
              href={segment.url}
              className={styles.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {segment.content}
            </a>
          );
        default:
          return segment.content;
      }
    });
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // TODO: Show toast notification
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  };

  return <div className={styles.richContent}>{renderContent(content) as React.ReactNode}</div>;
};

// Content parsing functions
interface ContentSegment {
  type: string;
  content: string;
  language?: string;
  url?: string;
  level?: number;
  items?: string[];
}

const parseContentSegments = (text: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  const lines = text.split('\n');
  let currentSegment = '';
  let inCodeBlock = false;
  let codeLanguage = '';
  let inList = false;
  let listItems: string[] = [];
  let listType = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        segments.push({
          type: 'code_block',
          content: currentSegment.trim(),
          language: codeLanguage,
        });
        currentSegment = '';
        inCodeBlock = false;
        codeLanguage = '';
      } else {
        if (currentSegment.trim()) {
          segments.push({
            type: 'paragraph',
            content: currentSegment.trim(),
          });
          currentSegment = '';
        }
        inCodeBlock = true;
        codeLanguage = line.substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      currentSegment += (currentSegment ? '\n' : '') + line;
      continue;
    }

    // Lists
    const bulletMatch = line.match(/^[\s]*[-*+]\s+(.+)/);
    const numberedMatch = line.match(/^[\s]*\d+\.\s+(.+)/);

    if (bulletMatch || numberedMatch) {
      if (!inList) {
        if (currentSegment.trim()) {
          segments.push({
            type: 'paragraph',
            content: currentSegment.trim(),
          });
          currentSegment = '';
        }
        inList = true;
        listType = bulletMatch ? 'list' : 'numbered_list';
        listItems = [];
      }
      listItems.push((bulletMatch || numberedMatch)![1]);
      continue;
    }

    if (inList && line.trim() === '') {
      continue;
    }

    if (inList) {
      segments.push({
        type: listType,
        content: '',
        items: [...listItems],
      });
      inList = false;
      listItems = [];
      listType = '';
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    if (headingMatch) {
      if (currentSegment.trim()) {
        segments.push({
          type: 'paragraph',
          content: currentSegment.trim(),
        });
        currentSegment = '';
      }
      segments.push({
        type: 'heading',
        content: headingMatch[2],
        level: headingMatch[1].length,
      });
      continue;
    }

    // Quotes
    if (line.startsWith('> ')) {
      if (currentSegment.trim()) {
        segments.push({
          type: 'paragraph',
          content: currentSegment.trim(),
        });
        currentSegment = '';
      }
      segments.push({
        type: 'quote',
        content: line.substring(2),
      });
      continue;
    }

    // Regular text
    currentSegment += (currentSegment ? '\n' : '') + line;
  }

  // Handle remaining content
  if (inList) {
    segments.push({
      type: listType,
      content: '',
      items: listItems,
    });
  } else if (currentSegment.trim()) {
    segments.push({
      type: inCodeBlock ? 'code_block' : 'paragraph',
      content: currentSegment.trim(),
      language: codeLanguage,
    });
  }

  return segments;
};

const parseInlineContent = (text: string): ContentSegment[] => {
  const segments: ContentSegment[] = [];
  const currentText = text;

  // Process inline formatting in order of precedence
  const patterns = [
    { type: 'inline_code', regex: /`([^`]+)`/g },
    { type: 'bold', regex: /\*\*([^*]+)\*\*/g },
    { type: 'italic', regex: /\*([^*]+)\*/g },
    { type: 'link', regex: /\[([^\]]+)\]\(([^)]+)\)/g },
  ];

  let lastIndex = 0;
  const matches: Array<{ index: number; length: number; segment: ContentSegment }> = [];

  patterns.forEach(pattern => {
    let match;
    while ((match = pattern.regex.exec(currentText)) !== null) {
      const segment: ContentSegment = {
        type: pattern.type,
        content: match[1],
      };

      if (pattern.type === 'link') {
        segment.url = match[2];
      }

      matches.push({
        index: match.index,
        length: match[0].length,
        segment,
      });
    }
  });

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index);

  // Build segments
  matches.forEach(match => {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: currentText.substring(lastIndex, match.index),
      });
    }
    segments.push(match.segment);
    lastIndex = match.index + match.length;
  });

  if (lastIndex < currentText.length) {
    segments.push({
      type: 'text',
      content: currentText.substring(lastIndex),
    });
  }

  return segments.length > 0 ? segments : [{ type: 'text', content: text }];
};
