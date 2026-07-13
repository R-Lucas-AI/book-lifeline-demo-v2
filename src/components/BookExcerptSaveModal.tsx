import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { BookExcerpt, ExcerptSource, excerptSourceMap } from '../types';

interface BookExcerptSaveModalProps {
  open: boolean;
  onClose: () => void;
  rawContent: string;
}

/** 从内容中检测书名 */
function detectBookTitle(content: string): string {
  const match = content.match(/《([^》]+)》/);
  return match ? match[1] : '';
}

export default function BookExcerptSaveModal({ open, onClose, rawContent }: BookExcerptSaveModalProps) {
  const { addBookExcerpt, bookExcerpts } = useApp();
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [content, setContent] = useState('');
  const [note, setNote] = useState('');
  const [chapter, setChapter] = useState('');
  const [source, setSource] = useState<ExcerptSource>('booklifeline_input');

  useEffect(() => {
    if (open && rawContent) {
      const detected = detectBookTitle(rawContent);
      if (detected) setBookTitle(detected);
      setContent(rawContent);
    }
  }, [open, rawContent]);

  const handleSave = () => {
    if (!bookTitle.trim() || !content.trim()) return;
    const excerpt: BookExcerpt = {
      id: `excerpt-${Date.now()}`,
      bookTitle: bookTitle.trim(),
      bookAuthor: bookAuthor.trim() || undefined,
      content: content.trim(),
      source,
      note: note.trim() || undefined,
      chapter: chapter.trim() || undefined,
      createdAt: new Date().toISOString(),
    };
    addBookExcerpt(excerpt);
    // 重置
    setBookTitle('');
    setBookAuthor('');
    setContent('');
    setNote('');
    setChapter('');
    onClose();
  };

  const handleClose = () => {
    setBookTitle('');
    setBookAuthor('');
    setContent('');
    setNote('');
    setChapter('');
    onClose();
  };

  if (!open) return null;

  const bookExcerptCount = bookExcerpts.filter(e => e.bookTitle === bookTitle).length;

  return (
    <div
      onClick={handleClose}
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.4)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        animation: 'fadeIn 0.2s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'var(--background-primary)',
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          borderRadius: '20px 20px 0 0',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease',
        }}
      >
        {/* 头部 */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--separator)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <div>
            <h3 style={{ fontSize: '17px', fontWeight: 600, color: 'var(--text-primary)' }}>
              存为书摘
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-quaternary)', marginTop: '2px' }}>
              {excerptSourceMap[source]}
              {bookExcerptCount > 0 && ` · 《${bookTitle}》已有 ${bookExcerptCount} 条`}
            </p>
          </div>
          <button
            onClick={handleClose}
            style={{
              width: '32px', height: '32px',
              borderRadius: '50%',
              border: 'none',
              backgroundColor: 'var(--fill-tertiary)',
              color: 'var(--text-secondary)',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* 可滚动内容 */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {/* 书摘来源选择 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              书摘来源
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['booklifeline_input', 'wechat_reading'] as ExcerptSource[]).map(src => (
                <button
                  key={src}
                  onClick={() => setSource(src)}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    borderRadius: '10px',
                    border: source === src ? '2px solid var(--blue)' : '1px solid var(--separator)',
                    backgroundColor: source === src ? 'var(--blue-bg, rgba(0,122,255,0.08))' : 'var(--fill-primary)',
                    color: source === src ? 'var(--blue)' : 'var(--text-secondary)',
                    fontSize: '14px',
                    fontWeight: source === src ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {excerptSourceMap[src]}
                </button>
              ))}
            </div>
          </div>

          {/* 书名 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              书名 *
            </label>
            <input
              type="text"
              value={bookTitle}
              onChange={e => setBookTitle(e.target.value)}
              placeholder="输入或确认书名"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--separator)',
                backgroundColor: 'var(--fill-primary)',
                fontSize: '15px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* 作者 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              作者（可选）
            </label>
            <input
              type="text"
              value={bookAuthor}
              onChange={e => setBookAuthor(e.target.value)}
              placeholder="作者名"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--separator)',
                backgroundColor: 'var(--fill-primary)',
                fontSize: '15px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* 章节 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              章节（可选）
            </label>
            <input
              type="text"
              value={chapter}
              onChange={e => setChapter(e.target.value)}
              placeholder="如：第三章 / 第45页"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--separator)',
                backgroundColor: 'var(--fill-primary)',
                fontSize: '15px',
                color: 'var(--text-primary)',
                outline: 'none',
              }}
            />
          </div>

          {/* 书摘内容 */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              书摘内容 *
            </label>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="书摘原文……"
              style={{
                width: '100%',
                minHeight: '100px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--separator)',
                backgroundColor: 'var(--fill-primary)',
                fontSize: '15px',
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.5',
              }}
            />
          </div>

          {/* 批注 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              批注（可选）
            </label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="对这段书摘的想法……"
              style={{
                width: '100%',
                minHeight: '60px',
                padding: '10px 12px',
                borderRadius: '10px',
                border: '1px solid var(--separator)',
                backgroundColor: 'var(--fill-primary)',
                fontSize: '15px',
                color: 'var(--text-primary)',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
                lineHeight: '1.5',
              }}
            />
          </div>
        </div>

        {/* 底部保存按钮 */}
        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid var(--separator)',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handleSave}
            disabled={!bookTitle.trim() || !content.trim()}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: bookTitle.trim() && content.trim() ? 'var(--blue)' : 'var(--fill-tertiary)',
              color: bookTitle.trim() && content.trim() ? 'white' : 'var(--text-quaternary)',
              border: 'none',
              borderRadius: '24px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: bookTitle.trim() && content.trim() ? 'pointer' : 'not-allowed',
            }}
          >
            保存书摘
          </button>
        </div>
      </div>
    </div>
  );
}
