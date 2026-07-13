import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DiaryFragment, fragmentTypeMap } from '../types';
import { useNavigate } from 'react-router-dom';
import { saveDiaryEdit, getDiaryEdit } from '../data/diaryContentStorage';

interface FragmentDetailProps {
  fragment: DiaryFragment;
  diaryId?: string;
  onSave?: (fragmentId: string, updates: Partial<DiaryFragment>) => void;
}

export const FragmentDetail: React.FC<FragmentDetailProps> = ({ fragment, diaryId, onSave }) => {
  const [originalContent] = useState(() => {
    const savedEdit = getDiaryEdit(fragment.fragmentId, 'rawQuote');
    return savedEdit || fragment.rawQuote;
  });
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(originalContent);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'modified'>('saved');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = Math.max(scrollHeight, 60) + 'px';
    }
  }, [editContent, isEditing]);

  const handleSave = useCallback(() => {
    if (editContent === originalContent) return;
    
    setSaveStatus('saving');
    
    if (diaryId) {
      saveDiaryEdit(fragment.fragmentId, diaryId, 'rawQuote', editContent);
    }
    
    if (onSave) {
      onSave(fragment.fragmentId, {
        rawQuote: editContent,
      });
    }
    
    setTimeout(() => {
      setSaveStatus('saved');
    }, 300);
  }, [editContent, originalContent, onSave, fragment.fragmentId, diaryId]);

  const handleMouseLeave = useCallback(() => {
    if (isEditing && editContent !== originalContent) {
      handleSave();
      setIsEditing(false);
    }
  }, [isEditing, editContent, originalContent, handleSave]);

  const handleFocus = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setTimeout(() => {
      if (editContent !== originalContent) {
        handleSave();
      }
      setIsEditing(false);
    }, 100);
  }, [editContent, originalContent, handleSave]);

  const handleBookClick = (bookTitle: string) => {
    navigate(`/book-detail/${encodeURIComponent(bookTitle)}`);
  };

  return (
    <div 
      ref={containerRef}
      onMouseLeave={handleMouseLeave}
      style={{
        position: 'relative',
      }}
    >
      {/* 文本框区域 */}
      <div
        style={{
          position: 'relative',
        }}
      >
        <textarea
          ref={textareaRef}
          value={editContent}
          onChange={(e) => {
            setEditContent(e.target.value);
            setSaveStatus('modified');
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={{
            width: '100%',
            fontSize: '15px',
            lineHeight: '1.8',
            color: 'var(--text-primary)',
            backgroundColor: isEditing ? 'var(--fill-secondary)' : 'transparent',
            border: isEditing ? '1px solid var(--separator)' : '1px solid transparent',
            borderRadius: 'var(--radius-sm)',
            padding: '12px',
            resize: 'none',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
            outline: 'none',
            cursor: 'text',
            minHeight: '60px',
            maxHeight: '400px',
            overflowY: 'auto',
            transition: 'background-color 0.2s, border-color 0.2s, box-shadow 0.2s',
            boxShadow: isEditing ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
          }}
          placeholder="点击输入内容..."
          spellCheck={false}
        />
        
        {isEditing && (
          <div style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            {saveStatus === 'modified' && (
              <span style={{ fontSize: '10px', color: 'var(--orange)', fontWeight: 500 }}>
                已修改
              </span>
            )}
            {saveStatus === 'saving' && (
              <span style={{ fontSize: '10px', color: 'var(--blue)', fontWeight: 500 }}>
                保存中...
              </span>
            )}
            {saveStatus === 'saved' && editContent !== originalContent && (
              <span style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 500 }}>
                已保存
              </span>
            )}
          </div>
        )}
      </div>

      {/* 标签和书籍链接 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '10px',
        paddingLeft: '2px',
      }}>
        {fragment.type.map(t => (
          <span
            key={t}
            style={{
              fontSize: '11px',
              color: 'var(--text-quaternary)',
              backgroundColor: 'var(--fill-tertiary)',
              padding: '3px 8px',
              borderRadius: '4px',
              fontWeight: 500,
            }}
          >
            {fragmentTypeMap[t]}
          </span>
        ))}
        
        {fragment.relatedBooks && fragment.relatedBooks.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            {fragment.relatedBooks.map((bookTitle, idx) => (
              <React.Fragment key={bookTitle}>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    handleBookClick(bookTitle);
                  }}
                  style={{
                    fontSize: '12px',
                    color: 'var(--blue)',
                    backgroundColor: 'transparent',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    border: '1px solid var(--blue)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--fill-tertiary)';
                    e.currentTarget.style.color = 'var(--blue)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  《{bookTitle}》
                </button>
                {fragment.relatedBooks && idx < fragment.relatedBooks.length - 1 && (
                  <span style={{ fontSize: '10px', color: 'var(--text-quinary)' }}>·</span>
                )}
              </React.Fragment>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};