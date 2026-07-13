import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { ReadingNode } from '../types';
import { mockOldTraces } from '../data/mockData';
import { searchBookVersions, BookVersion } from '../api';
import { renderTextWithBookHighlight } from '../utils/BookHighlight';

const FILL_TERTIARY = '#F9F9FB';

export default function NodeConfirmPage() {
  const { currentNode, setCurrentNode, addBooklifelineInput, isDemoDataInjected } = useApp();
  const navigate = useNavigate();
  const [rawText, setRawText] = useState(currentNode?.rawText || '');
  const [showExcerpt, setShowExcerpt] = useState(false);
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [showVersionPicker, setShowVersionPicker] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [bookVersions, setBookVersions] = useState<BookVersion[]>([]);
  const [editingBook, setEditingBook] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (currentNode) {
      setRawText(currentNode.rawText);
    }
  }, [currentNode?.id]);

  // 查找相关摘录（仅在注入演示数据后从 mockData 中按书名匹配）
  const relatedExcerpt = useMemo(() => {
    if (!currentNode?.bookTitle || !isDemoDataInjected) return null;
    return mockOldTraces.find(t => t.bookTitle === currentNode.bookTitle) || null;
  }, [currentNode?.bookTitle, isDemoDataInjected]);

  if (!currentNode) {
    return (
      <div style={{ padding: '60px 24px', textAlign: 'center' }}>
        <p style={{ fontSize: '15px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>请先从输入页开始</p>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 24px',
            borderRadius: '20px',
            backgroundColor: 'var(--blue)',
            color: 'white',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          去输入
        </button>
      </div>
    );
  }

  const handleBack = () => {
    navigate(-1);
  };

  const handleConfirm = () => {
    if (!rawText.trim()) return;
    const updated: ReadingNode = {
      ...currentNode,
      rawText,
    };
    setCurrentNode(updated);
    addBooklifelineInput(updated);
    navigate('/ai-analyzing');
  };

  const toggleExcerpt = () => {
    setShowExcerpt(prev => !prev);
  };

  const handleSearchVersions = async () => {
    if (!currentNode?.bookTitle) return;
    setShowVersionPicker(true);
    if (bookVersions.length > 0) return;
    setIsSearching(true);
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const results = await searchBookVersions(
        currentNode.bookTitle,
        currentNode.bookAuthor,
        controller.signal,
      );
      setBookVersions(results);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        console.error('搜索版本失败', e);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectVersion = (version: BookVersion) => {
    if (!currentNode) return;
    const updated: ReadingNode = {
      ...currentNode,
      bookTitle: version.title,
      bookAuthor: version.author,
      bookCover: version.coverUrl,
      doubanId: version.doubanId,
    };
    setCurrentNode(updated);
    setShowVersionPicker(false);
  };

  const handleStartEditBook = () => {
    if (!currentNode) return;
    setEditTitle(currentNode.bookTitle || '');
    setEditAuthor(currentNode.bookAuthor || '');
    setEditingBook(true);
  };

  const handleSaveEditBook = () => {
    if (!currentNode) return;
    const updated: ReadingNode = {
      ...currentNode,
      bookTitle: editTitle.trim(),
      bookAuthor: editAuthor.trim(),
    };
    setCurrentNode(updated);
    setEditingBook(false);
    setBookVersions([]);
  };

  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  // AI 整理文字：使用原始文字（可视为已整理版本）
  const aiText = currentNode.rawText;

  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '0 20px 72px',
      }}
    >
      {/* 1. Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '16px 0 14px',
          marginBottom: '28px',
          animation: 'fadeInUp 0.5s ease 0s both',
        }}
      >
        <button
          onClick={handleBack}
          style={{
            display: 'flex',
            alignItems: 'center',
            flexShrink: 0,
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 18 18"
            fill="none"
            stroke="var(--text-tertiary)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="11 4 6 9 11 14" />
          </svg>
        </button>
      </div>

      {/* 2. Page intro / Locator */}
      <div
        style={{
          marginBottom: '24px',
          animation: 'fadeInUp 0.5s ease 0.05s both',
        }}
      >
        <p
          style={{
            fontSize: '15px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            marginBottom: '4px',
          }}
        >
          确认你的感受
        </p>
      </div>

      {/* 3. Original input (editable textarea) */}
      <div
        style={{
          background: 'var(--fill-primary)',
          border: '1px solid var(--separator)',
          borderRadius: '12px',
          padding: '20px',
          animation: 'fadeInUp 0.5s ease 0.1s both',
        }}
      >
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          onFocus={() => setIsTextareaFocused(true)}
          onBlur={() => setIsTextareaFocused(false)}
          style={{
            width: '100%',
            minHeight: '100px',
            fontSize: '15px',
            color: 'var(--text-primary)',
            lineHeight: '1.6',
            background: FILL_TERTIARY,
            border: 'none',
            borderRadius: '8px',
            padding: '12px',
            resize: 'vertical',
            fontFamily: 'inherit',
            outline: 'none',
            boxShadow: isTextareaFocused ? '0 0 0 2px rgba(0,122,255,0.2)' : 'none',
          }}
        />
      </div>

      {/* 4. Dot connector */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 0',
          animation: 'fadeInUp 0.5s ease 0.15s both',
        }}
      >
        <div
          style={{
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            background: 'var(--text-quaternary)',
          }}
        />
      </div>

      {/* 5. AI organized version */}
      <div
        style={{
          background: 'var(--fill-primary)',
          border: '1px solid var(--separator)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '16px',
          animation: 'fadeInUp 0.5s ease 0.2s both',
        }}
      >
        <div
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--text-quaternary)',
            marginBottom: '8px',
          }}
        >
          AI 整理
        </div>
        <div
          style={{
            fontSize: '15px',
            color: 'var(--text-secondary)',
            lineHeight: '1.65',
          }}
        >
          {renderTextWithBookHighlight(aiText, (title) => navigate(`/book-detail/${encodeURIComponent(title)}`))}
        </div>
      </div>

      {/* 6. Associated book info */}
      {currentNode.bookTitle && (
        <div
          style={{
            background: 'var(--fill-primary)',
            border: '1px solid var(--separator)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            animation: 'fadeInUp 0.5s ease 0.25s both',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--text-quaternary)',
              marginBottom: '12px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>相关书籍</span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={handleStartEditBook}
                style={{
                  fontSize: '12px',
                  color: 'var(--blue)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: 0,
                }}
              >
                编辑
              </button>
              <button
                onClick={handleSearchVersions}
                style={{
                  fontSize: '12px',
                  color: 'var(--blue)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  padding: 0,
                }}
              >
                切换版本
              </button>
            </div>
          </div>

          {editingBook ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-quaternary)', marginBottom: '4px' }}>书名</div>
                <input
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '14px',
                    border: '1px solid var(--separator)',
                    borderRadius: '8px',
                    background: FILL_TERTIARY,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-quaternary)', marginBottom: '4px' }}>作者</div>
                <input
                  value={editAuthor}
                  onChange={e => setEditAuthor(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    fontSize: '14px',
                    border: '1px solid var(--separator)',
                    borderRadius: '8px',
                    background: FILL_TERTIARY,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  onClick={handleSaveEditBook}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '13px',
                    color: 'white',
                    background: 'var(--blue)',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 500,
                  }}
                >
                  保存
                </button>
                <button
                  onClick={() => setEditingBook(false)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                    background: FILL_TERTIARY,
                    border: '1px solid var(--separator)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              {currentNode.bookCover ? (
                <img
                  src={currentNode.bookCover}
                  alt={currentNode.bookTitle}
                  style={{
                    width: '48px',
                    height: '66px',
                    objectFit: 'cover',
                    borderRadius: '6px',
                    flexShrink: 0,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '48px',
                    height: '66px',
                    background: FILL_TERTIARY,
                    borderRadius: '6px',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--text-quaternary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z" />
                  </svg>
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  《{currentNode.bookTitle}》
                </div>
                {currentNode.bookAuthor && (
                  <div
                    style={{
                      fontSize: '13px',
                      color: 'var(--text-secondary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {currentNode.bookAuthor}
                  </div>
                )}
              </div>
            </div>
          )}

          {showVersionPicker && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ fontSize: '12px', color: 'var(--text-quaternary)', marginBottom: '10px' }}>
                选择正确的版本
              </div>
              {isSearching ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-quaternary)', fontSize: '13px' }}>
                  正在搜索...
                </div>
              ) : bookVersions.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-quaternary)', fontSize: '13px' }}>
                  未找到其他版本
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
                  {bookVersions.map(version => (
                    <button
                      key={version.id}
                      onClick={() => handleSelectVersion(version)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '10px',
                        background: FILL_TERTIARY,
                        border: '1px solid var(--separator)',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <img
                        src={version.coverUrl}
                        alt={version.title}
                        style={{
                          width: '40px',
                          height: '56px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          flexShrink: 0,
                        }}
                        onError={e => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            marginBottom: '4px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {version.title}
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                          }}
                        >
                          <span>{version.author}</span>
                          {version.year && (
                            <>
                              <span style={{ color: 'var(--text-quaternary)' }}>·</span>
                              <span>{version.year}</span>
                            </>
                          )}
                          <span style={{ color: 'var(--text-quaternary)', marginLeft: 'auto' }}>
                            {version.source === 'douban' ? '豆瓣' : 'Google Books'}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={() => setShowVersionPicker(false)}
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '8px',
                  fontSize: '13px',
                  color: 'var(--text-tertiary)',
                  background: 'none',
                  border: '1px dashed var(--separator)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                收起
              </button>
            </div>
          )}

          {/* Collapsible excerpt */}
          {relatedExcerpt && !editingBook && !showVersionPicker && (
            <div style={{ marginTop: '14px' }}>
              <button
                onClick={toggleExcerpt}
                style={{
                  fontSize: '13px',
                  color: 'var(--blue)',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'inherit',
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {showExcerpt ? '收起摘录' : '查看相关摘录'}
              </button>
              {showExcerpt && (
                <div
                  style={{
                    marginTop: '10px',
                    borderLeft: `3px solid ${FILL_TERTIARY}`,
                    background: FILL_TERTIARY,
                    borderRadius: '0 8px 8px 0',
                    padding: '12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '14px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.6',
                    }}
                  >
                    {renderTextWithBookHighlight(relatedExcerpt.content, (title) => navigate(`/book-detail/${encodeURIComponent(title)}`))}
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-quaternary)',
                      marginTop: '4px',
                    }}
                  >
                    —— 《{currentNode.bookTitle}》{relatedExcerpt.chapter ? ` ${relatedExcerpt.chapter}` : ''}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 7. Action buttons */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '12px',
          marginBottom: '16px',
          animation: 'fadeInUp 0.5s ease 0.3s both',
        }}
      >
        <button
          onClick={handleBack}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 24px',
            borderRadius: '980px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'inherit',
            cursor: 'pointer',
            border: 'none',
            backgroundColor: 'var(--fill-secondary)',
            color: 'var(--text-secondary)',
            transition: 'opacity 0.15s ease, transform 0.1s ease, background-color 0.15s ease',
          }}
        >
          返回修改
        </button>
        <button
          onClick={handleConfirm}
          disabled={!rawText.trim()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 24px',
            borderRadius: '980px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: rawText.trim() ? 'pointer' : 'not-allowed',
            border: 'none',
            backgroundColor: rawText.trim() ? 'var(--blue)' : FILL_TERTIARY,
            color: rawText.trim() ? '#FFFFFF' : 'var(--text-quaternary)',
            transition: 'opacity 0.15s ease, transform 0.1s ease, background-color 0.15s ease',
          }}
        >
          确认，开始回捞
        </button>
      </div>
    </div>
  );
}
