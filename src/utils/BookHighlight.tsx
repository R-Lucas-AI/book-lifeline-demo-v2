import React from 'react';

const BOOK_PATTERN = /《([^》]+)》/g;

export interface BookHighlightProps {
  text: string;
  onBookClick?: (bookTitle: string) => void;
  highlightColor?: string;
  className?: string;
}

export const BookHighlight: React.FC<BookHighlightProps> = ({
  text,
  onBookClick,
  highlightColor = 'var(--blue)',
}) => {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  BOOK_PATTERN.lastIndex = 0;
  while ((match = BOOK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const bookTitle = match[1];
    parts.push(
      <button
        key={`book-${match.index}`}
        onClick={(e) => {
          e.stopPropagation();
          onBookClick?.(bookTitle);
        }}
        style={{
          color: highlightColor,
          backgroundColor: 'transparent',
          padding: 0,
          fontSize: 'inherit',
          fontWeight: 500,
          cursor: onBookClick ? 'pointer' : 'default',
          textDecoration: 'none',
          borderBottom: `1px solid ${highlightColor}`,
          borderRadius: 0,
          border: 'none',
          fontFamily: 'inherit',
          lineHeight: 'inherit',
        }}
      >
        《{bookTitle}》
      </button>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return <>{parts}</>;
};

export function renderTextWithBookHighlight(
  text: string,
  onBookClick?: (bookTitle: string) => void,
  highlightColor: string = 'var(--blue)'
): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  BOOK_PATTERN.lastIndex = 0;
  while ((match = BOOK_PATTERN.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const bookTitle = match[1];
    parts.push(
      <button
        key={`book-${match.index}`}
        onClick={(e) => {
          e.stopPropagation();
          onBookClick?.(bookTitle);
        }}
        style={{
          color: highlightColor,
          backgroundColor: 'transparent',
          padding: 0,
          fontSize: 'inherit',
          fontWeight: 500,
          cursor: onBookClick ? 'pointer' : 'default',
          textDecoration: 'none',
          borderBottom: `1px solid ${highlightColor}`,
          borderRadius: 0,
          border: 'none',
          fontFamily: 'inherit',
          lineHeight: 'inherit',
        }}
      >
        《{bookTitle}》
      </button>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }
  return parts;
}
