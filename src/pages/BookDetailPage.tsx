import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getTraceById } from '../data/mockData';
import { allDiaryCandidateRelations } from '../data/notionDiaries';
import { EchoRelation } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';
import { renderTextWithBookHighlight } from '../utils/BookHighlight';

const typeLabels: Record<string, string> = {
  source: '溯源',
  contrast: '对照',
  echo: '回响',
  example: '例证',
  question: '追问',
  correction: '校正',
  encounter: '邂逅',
};

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
  source: { bg: 'var(--purple-bg)', text: 'var(--purple)', border: 'var(--purple)' },
  contrast: { bg: 'var(--orange-bg)', text: 'var(--orange)', border: 'var(--orange)' },
  echo: { bg: 'var(--green-bg)', text: 'var(--green)', border: 'var(--green)' },
  example: { bg: 'var(--blue-bg)', text: 'var(--blue)', border: 'var(--blue)' },
  question: { bg: 'var(--orange-bg)', text: 'var(--orange)', border: 'var(--orange)' },
  correction: { bg: '#FF3B3020', text: '#FF3B30', border: '#FF3B30' },
  encounter: { bg: 'var(--blue-bg)', text: 'var(--blue)', border: 'var(--blue)' },
};

export default function BookDetailPage() {
  const { bookTitle } = useParams<{ bookTitle: string }>();
  const { confirmedRelations, booklifelineInputs, firstEncounterBooks, removeConfirmedRelation, getBookMeta, fetchBookMeta, saveBookMeta, isDemoDataInjected, diaryCandidateRelations, confirmDiaryCandidateRelation, rejectDiaryCandidateRelation } = useApp();
  const navigate = useNavigate();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deleteRelationTarget, setDeleteRelationTarget] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-menu-container]')) {
        setOpenMenuId(null);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const decodedTitle = decodeURIComponent(bookTitle || '');
  const safeGetTraceById = (id: string) => isDemoDataInjected ? getTraceById(id) : undefined;

  const staticCandidates = isDemoDataInjected ? allDiaryCandidateRelations : [];
  const allCandidates = [...staticCandidates, ...diaryCandidateRelations];

  const pendingCandidates = allCandidates.filter(
    c => c.bookTitle === decodedTitle && c.status === 'pending'
  );

  const bookRelations = confirmedRelations.filter(r => {
    const trace = safeGetTraceById(r.oldTraceId);
    return trace?.bookTitle === decodedTitle;
  });

  const firstEncounter = firstEncounterBooks.find(b => b.bookTitle === decodedTitle);

  const firstTrace = bookRelations.length > 0
    ? safeGetTraceById(bookRelations[0].oldTraceId)
    : null;

  const bookAuthor = firstTrace?.bookAuthor || firstEncounter?.bookAuthor;
  const bookTranslator = firstTrace?.bookTranslator || firstEncounter?.bookTranslator;

  // 书脉输入：排除已作为邂逅记录展示的输入，避免重复
  const firstEncounterNodeIds = firstEncounterBooks
    .filter(b => b.bookTitle === decodedTitle)
    .map(b => b.readingNodeId);
  const bookInputs = booklifelineInputs.filter(
    i => i.bookTitle === decodedTitle && !firstEncounterNodeIds.includes(i.id)
  );

  const groupedByType = bookRelations.reduce((acc, relation) => {
    if (!acc[relation.relationType]) {
      acc[relation.relationType] = [];
    }
    acc[relation.relationType].push(relation);
    return acc;
  }, {} as Record<string, EchoRelation[]>);

  const typeOrder = ['echo', 'source', 'contrast', 'encounter', 'question', 'example', 'correction'];

  const getRelatedNodes = (relation: EchoRelation) => {
    return booklifelineInputs.find(n => n.id === relation.readingNodeId);
  };

  const nodeCount = bookInputs.length + (firstEncounter ? 1 : 0);
  const traceCount = bookRelations.length;
  const isConnected = nodeCount > 0 || traceCount > 0;

  // Book meta — from library or AI generated
  const cachedBookMeta = getBookMeta(decodedTitle);
  const [bookMeta, setBookMeta] = useState(cachedBookMeta);
  const [metaLoading, setMetaLoading] = useState(!cachedBookMeta?.coreQuestion);
  const [showCoverPicker, setShowCoverPicker] = useState(false);

  const handleCoverSelect = (coverUrl: string) => {
    if (!bookMeta) return;
    const updated = { ...bookMeta, coverUrl, updatedAt: new Date().toISOString() };
    saveBookMeta(updated);
    setBookMeta(updated);
    setShowCoverPicker(false);
  };

  useEffect(() => {
    let cancelled = false;
    const cached = getBookMeta(decodedTitle);
    if (cached) {
      setBookMeta(cached);
      if (cached.coreQuestion) {
        setMetaLoading(false);
        return;
      }
    }
    setMetaLoading(true);
    fetchBookMeta(decodedTitle, bookAuthor || undefined).then(meta => {
      if (!cancelled && meta) {
        setBookMeta(meta);
        setMetaLoading(false);
      }
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decodedTitle]);

  // Extract book tags from user notes
  const bookTags = booklifelineInputs
    .filter(n => n.bookTitle === decodedTitle)
    .flatMap(n => n.tags)
    .filter((tag, index, arr) => arr.indexOf(tag) === index)
    .slice(0, 8);

  const relationTypeCounts = typeOrder
    .filter(type => groupedByType[type])
    .map(type => ({ type, count: groupedByType[type].length }));

  return (
    <div style={{ paddingBottom: '80px', maxWidth: '640px', margin: '0 auto' }}>
      {/* Toolbar */}
      <div style={{
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        position: 'sticky',
        top: 0,
        background: 'var(--fill-secondary)',
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '8px',
            borderRadius: '8px',
            backgroundColor: 'var(--fill-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '0 24px' }}>
        {/* Book info card — 参考设计样式，信息层级：核心问题 → 关键理念 → 作者 → 数据 → 标签 */}
        <div style={{
          background: 'var(--fill-primary)',
          border: '1px solid color-mix(in srgb, var(--separator) 92%, transparent)',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '28px',
          position: 'relative',
        }}>
          {/* Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '20px',
          }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: '180px',
                minHeight: '24px',
                padding: '0 8px',
                borderRadius: '999px',
                fontSize: '12px',
                fontWeight: 500,
                lineHeight: '18px',
                color: isConnected ? 'var(--green)' : 'var(--blue)',
                backgroundColor: isConnected ? 'rgba(52, 199, 89, 0.08)' : 'rgba(0, 122, 255, 0.08)',
                border: '1px solid color-mix(in srgb, var(--separator) 84%, transparent)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {isConnected ? '已入脉' : '待连接'}
            </span>
            {bookMeta?.category && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '24px',
                  padding: '0 8px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: 500,
                  lineHeight: '18px',
                  color: 'var(--text-quaternary)',
                  backgroundColor: 'var(--fill-tertiary)',
                  border: '1px solid color-mix(in srgb, var(--separator) 84%, transparent)',
                }}
              >
                {bookMeta.category}
              </span>
            )}
          </div>

          {/* Title + Cover layout — 封面在左，书名作者在右 */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginBottom: '20px',
            }}
          >
            {/* Book cover with switcher */}
            {bookMeta?.coverUrl && (
              <div style={{ position: 'relative', width: '90px', minWidth: '90px' }}>
                <div
                  style={{
                    width: '90px',
                    height: '124px',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    background: 'var(--fill-tertiary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  }}
                >
                  <img
                    src={bookMeta.coverUrl}
                    alt={`《${decodedTitle}》封面`}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                      display: 'block',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).parentElement!.style.display = 'none';
                    }}
                  />
                </div>

                {/* 切换封面按钮 — 只有多个封面候选时显示，防误触 */}
                {bookMeta.coverOptions && bookMeta.coverOptions.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCoverPicker(v => !v);
                    }}
                    title="切换封面"
                    style={{
                      position: 'absolute',
                      right: '4px',
                      bottom: '4px',
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'rgba(0,0,0,0.6)',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      transition: 'background 0.2s ease',
                      WebkitTapHighlightColor: 'transparent',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.8)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.6)'; }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                  </button>
                )}
              </div>
            )}

            {/* Title + author */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1
                style={{
                  fontSize: '16px',
                  fontWeight: 500,
                  color: 'var(--text-primary)',
                  lineHeight: '24px',
                  margin: 0,
                  marginBottom: '4px',
                }}
              >
                《{decodedTitle}》
              </h1>
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 400,
                  color: 'var(--text-quaternary)',
                  lineHeight: '18px',
                  margin: 0,
                  marginBottom: '8px',
                }}
              >
                {bookMeta?.author || bookAuthor || '作者未知'}
                {(bookMeta?.translator || bookTranslator) && ` · 译 ${bookMeta?.translator || bookTranslator}`}
              </p>
              {/* 豆瓣元数据：出版社/出版日期 */}
              {(bookMeta?.publisher || bookMeta?.publishDate) && (
                <p
                  style={{
                    fontSize: '11px',
                    fontWeight: 400,
                    color: 'var(--text-quinary)',
                    lineHeight: '16px',
                    margin: 0,
                  }}
                >
                  {[bookMeta.publisher, bookMeta.publishDate].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>

          {/* Cover picker — 展开的封面候选缩略图 */}
          {showCoverPicker && bookMeta?.coverOptions && bookMeta.coverOptions.length > 1 && (
            <div
              style={{
                padding: '12px 0 16px',
                borderBottom: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
                marginBottom: '0',
                animation: 'fadeUp 0.3s ease both',
              }}
            >
              <p
                style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--text-quaternary)',
                  margin: '0 0 10px',
                }}
              >
                选择封面
              </p>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  flexWrap: 'wrap',
                }}
              >
                {bookMeta.coverOptions.map((coverUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleCoverSelect(coverUrl)}
                    style={{
                      width: '56px',
                      height: '78px',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      border: bookMeta.coverUrl === coverUrl
                        ? '2px solid var(--blue)'
                        : '1px solid var(--separator)',
                      background: 'var(--fill-tertiary)',
                      padding: 0,
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'border-color 0.2s ease',
                    }}
                  >
                    <img
                      src={coverUrl}
                      alt={`封面选项 ${idx + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).parentElement!.style.opacity = '0.3';
                      }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {metaLoading && (
            <div style={{
              padding: '14px 0',
              borderTop: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
              borderBottom: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
            }}>
              <div style={{
                height: '12px',
                backgroundColor: 'var(--fill-tertiary)',
                borderRadius: '6px',
                marginBottom: '10px',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
              }} />
              <div style={{
                height: '20px',
                backgroundColor: 'var(--fill-tertiary)',
                borderRadius: '6px',
                width: '70%',
                animation: 'pulse-dot 1.5s ease-in-out infinite',
                animationDelay: '0.2s',
              }} />
            </div>
          )}

          {/* Core question — highest priority */}
          {bookMeta?.coreQuestion && (
            <div style={{
              display: 'grid',
              gap: '6px',
              padding: '14px 0',
              borderTop: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
              borderBottom: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-quaternary)',
                lineHeight: '18px',
              }}>
                核心问题
              </span>
              <p style={{
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                lineHeight: '20px',
                margin: 0,
              }}>
                {bookMeta.coreQuestion}
              </p>
            </div>
          )}

          {/* Key ideas — second priority */}
          {bookMeta?.keyIdeas && bookMeta.keyIdeas.length > 0 && (
            <div style={{
              display: 'grid',
              gap: '6px',
              padding: '14px 0',
              borderBottom: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-quaternary)',
                lineHeight: '18px',
              }}>
                关键理念
              </span>
              <ul style={{
                display: 'grid',
                gap: '6px',
                margin: 0,
                padding: 0,
                listStyle: 'none',
              }}>
                {bookMeta.keyIdeas.map((idea, idx) => (
                  <li
                    key={idx}
                    style={{
                      fontSize: '14px',
                      fontWeight: 400,
                      color: 'var(--text-secondary)',
                      lineHeight: '20px',
                      display: 'grid',
                      gridTemplateColumns: '16px 1fr',
                      gap: '4px',
                    }}
                  >
                    <span style={{
                      color: 'var(--text-quinary)',
                      fontWeight: 500,
                    }}>·</span>
                    <span>{idea}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reading data — lower priority, grid layout */}
          <div style={{
            display: 'grid',
            alignItems: 'start',
            marginTop: '16px',
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr',
              alignItems: 'start',
              gap: '12px',
              padding: '8px 0',
              borderBottom: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-quaternary)',
                lineHeight: '18px',
                paddingTop: '1px',
              }}>
                阅读痕迹
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: 400,
                color: 'var(--text-secondary)',
                lineHeight: '20px',
              }}>
                {traceCount} 条
              </span>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '64px 1fr',
              alignItems: 'start',
              gap: '12px',
              padding: '8px 0',
              borderBottom: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
            }}>
              <span style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-quaternary)',
                lineHeight: '18px',
                paddingTop: '1px',
              }}>
                书脉节点
              </span>
              <span style={{
                fontSize: '14px',
                fontWeight: 400,
                color: 'var(--text-secondary)',
                lineHeight: '20px',
              }}>
                {nodeCount} 个
              </span>
            </div>

            {relationTypeCounts.length > 0 && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '64px 1fr',
                alignItems: 'start',
                gap: '12px',
                padding: '8px 0',
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--text-quaternary)',
                  lineHeight: '18px',
                  paddingTop: '1px',
                }}>
                  关联类型
                </span>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px',
                }}>
                  {relationTypeCounts.map(({ type, count }) => {
                    const colors = typeColors[type];
                    return (
                      <span
                        key={type}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: 'auto',
                          minHeight: '24px',
                          padding: '0 8px',
                          borderRadius: '999px',
                          fontSize: '12px',
                          fontWeight: 500,
                          lineHeight: '18px',
                          color: colors.text,
                          backgroundColor: colors.bg,
                          border: '1px solid color-mix(in srgb, var(--separator) 84%, transparent)',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {typeLabels[type]} · {count}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Tags — merge bookMeta tags and user note tags */}
          {((bookMeta?.tags && bookMeta.tags.length > 0) || bookTags.length > 0) && (
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              alignSelf: 'stretch',
              gap: '8px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
            }}>
              {bookMeta?.tags?.map(tag => (
                <span
                  key={`meta-${tag}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 'auto',
                    minHeight: '24px',
                    padding: '0 8px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    lineHeight: '18px',
                    color: 'var(--text-tertiary)',
                    backgroundColor: 'var(--fill-tertiary)',
                    border: '1px solid color-mix(in srgb, var(--separator) 84%, transparent)',
                  }}
                >
                  {tag}
                </span>
              ))}
              {bookTags.map(tag => (
                <span
                  key={`user-${tag}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 'auto',
                    minHeight: '24px',
                    padding: '0 8px',
                    borderRadius: '999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    lineHeight: '18px',
                    color: 'var(--blue)',
                    backgroundColor: 'var(--blue-bg)',
                    border: '1px solid color-mix(in srgb, var(--separator) 84%, transparent)',
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {pendingCandidates.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
              <span
                style={{
                  width: '4px',
                  height: '16px',
                  borderRadius: '2px',
                  backgroundColor: 'var(--blue)',
                }}
              />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                待确认的日记书脉 ({pendingCandidates.length})
              </h2>
            </div>

            <p style={{
              fontSize: '13px',
              color: 'var(--text-tertiary)',
              marginBottom: '12px',
              lineHeight: '1.5',
            }}>
              从你的日记中识别出 {pendingCandidates.length} 条可能的书脉关系，确认后将加入书脉。
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {pendingCandidates.map(candidate => (
                <div
                  key={candidate.id}
                  style={{
                    backgroundColor: 'var(--fill-primary)',
                    borderRadius: 'var(--radius)',
                    border: '1px dashed var(--separator)',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>
                      {candidate.diaryDate} · 日记来源
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        backgroundColor: 'var(--blue-bg)',
                        color: 'var(--blue)',
                      }}
                    >
                      {candidate.relationType === 'reading_reflection' ? '读书感悟' :
                     candidate.relationType === 'source' ? '溯源' :
                     candidate.relationType === 'encounter' ? '邂逅' :
                     candidate.relationType === 'contrast' ? '对照' :
                     candidate.relationType === 'question' ? '追问' :
                     candidate.relationType === 'example' ? '例证' :
                     candidate.relationType === 'correction' ? '校正' : '回响'}
                    </span>
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6', marginBottom: '10px' }}>
                    {renderTextWithBookHighlight(candidate.fragmentContent, (title) => navigate(`/book-detail/${encodeURIComponent(title)}`))}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.5', marginBottom: '12px' }}>
                    {renderTextWithBookHighlight(candidate.reason, (title) => navigate(`/book-detail/${encodeURIComponent(title)}`))}
                  </p>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => confirmDiaryCandidateRelation(candidate.id)}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: '#fff',
                        backgroundColor: 'var(--blue)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      确认加入书脉
                    </button>
                    <button
                      onClick={() => rejectDiaryCandidateRelation(candidate.id)}
                      style={{
                        flex: 1,
                        padding: '8px 16px',
                        borderRadius: 'var(--radius-xs)',
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-tertiary)',
                        backgroundColor: 'var(--fill-tertiary)',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      暂不连接
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bookInputs.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
              书脉输入 ({bookInputs.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {bookInputs.slice().reverse().map(input => (
                <div
                  key={input.id}
                  style={{
                    backgroundColor: 'var(--fill-primary)',
                    borderRadius: 'var(--radius)',
                    border: '1px solid var(--separator)',
                    padding: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>
                      {input.createdAt}
                    </span>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 500,
                        backgroundColor: 'var(--blue-bg)',
                        color: 'var(--blue)',
                      }}
                    >
                      {input.type === 'reflection' ? '读书感悟' : input.type}
                    </span>
                  </div>
                  <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    {input.rawText}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {typeOrder.filter(type => groupedByType[type]).map(type => {
          const colors = typeColors[type];
          const relations = groupedByType[type];

          return (
            <div key={type} style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span
                  style={{
                    width: '4px',
                    height: '16px',
                    borderRadius: '2px',
                    backgroundColor: colors.border,
                  }}
                />
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {typeLabels[type]} ({relations.length})
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {relations.map(relation => {
                  const trace = safeGetTraceById(relation.oldTraceId);
                  const relatedNode = getRelatedNodes(relation);
                  if (!trace) return null;

                  const typeLabel = trace.sourceType === 'bookmark' ? '划线' : trace.sourceType === 'thought' ? '想法' : '日记';

                  return (
                    <div
                      key={relation.id}
                      style={{
                        backgroundColor: 'var(--fill-primary)',
                        borderRadius: 'var(--radius)',
                        border: `1px solid var(--separator)`,
                        overflow: 'hidden',
                      }}
                    >
                      <div style={{ padding: '20px' }}>
                        {/* 三点菜单按钮 - 右上角 */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                          <div style={{ position: 'relative' }} data-menu-container>
                            <button
                              onClick={() => setOpenMenuId(openMenuId === relation.id ? null : relation.id)}
                              aria-label="更多操作"
                              aria-haspopup="menu"
                              aria-expanded={openMenuId === relation.id}
                              style={{
                                padding: '4px',
                                color: 'var(--text-quaternary)',
                                backgroundColor: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                              }}
                            >
                              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                <circle cx="12" cy="12" r="1" />
                                <circle cx="19" cy="12" r="1" />
                                <circle cx="5" cy="12" r="1" />
                              </svg>
                            </button>
                            {openMenuId === relation.id && (
                              <div
                                style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: 0,
                                  marginTop: '4px',
                                  backgroundColor: 'var(--fill-primary)',
                                  borderRadius: '8px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                  border: '1px solid var(--separator)',
                                  zIndex: 100,
                                  minWidth: '120px',
                                  overflow: 'hidden',
                                }}
                              >
                                <button
                                  onClick={() => {
                                    setDeleteRelationTarget(relation.id);
                                    setOpenMenuId(null);
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '10px 16px',
                                    textAlign: 'left',
                                    fontSize: '14px',
                                    color: '#FF3B30',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                  }}
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                    <path d="M3 6h18" />
                                    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                                    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                                  </svg>
                                  删除关系
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 1. 你的感受 — 最顶部，最突出 */}
                        {relatedNode && (
                          <div style={{ marginBottom: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--blue)' }}>
                                你的感受
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-quaternary)' }}>
                                {relatedNode.createdAt}
                              </span>
                            </div>
                            <p style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)', lineHeight: '1.5' }}>
                              {relatedNode.rawText}
                            </p>
                          </div>
                        )}

                        {/* 2. 原文 — 仅有想法时显示 */}
                        {trace.sourceType === 'thought' && trace.originalText && (
                          <div style={{
                            borderLeft: '2px solid var(--separator)',
                            paddingLeft: '12px',
                            marginBottom: '16px',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '6px' }}>
                              <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-quaternary)' }}>
                                原文
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-quaternary)' }}>
                                {trace.chapter}
                                {trace.location && ` · ${trace.location}`}
                              </span>
                            </div>
                            <p style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text-tertiary)', lineHeight: '1.5', fontStyle: 'italic' }}>
                              {trace.originalText}
                            </p>
                          </div>
                        )}

                        {/* 3. 划线/想法内容 */}
                        <div style={{ marginBottom: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  backgroundColor: 'var(--fill-secondary)',
                                  color: 'var(--text-tertiary)',
                                }}
                              >
                                {typeLabel}
                              </span>
                              <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-quaternary)' }}>
                                {trace.source === 'wechat_reading' ? '微信读书' : 'Notion'}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {trace.chapter && (
                                <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-quaternary)' }}>
                                  {trace.chapter}
                                  {trace.location && ` · ${trace.location}`}
                                </span>
                              )}
                              <span style={{ fontSize: '12px', fontWeight: 400, color: 'var(--text-quaternary)' }}>
                                {trace.createdAt}
                              </span>
                            </div>
                          </div>
                          <p style={{ fontSize: '17px', fontWeight: 400, color: 'var(--text-primary)', lineHeight: '1.6' }}>
                            {trace.content}
                          </p>
                        </div>

                        {/* 4. 为什么相关 — 最底部 */}
                        <div style={{
                          borderLeft: `3px solid ${colors.border}`,
                          backgroundColor: colors.bg,
                          padding: '12px 14px',
                          borderRadius: '0 8px 8px 0',
                        }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: colors.text, marginBottom: '6px' }}>
                            为什么相关
                          </p>
                          <p style={{ fontSize: '15px', fontWeight: 400, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                            {renderTextWithBookHighlight(relation.reason, (title) => navigate(`/book-detail/${encodeURIComponent(title)}`))}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {bookRelations.length === 0 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '40px 24px',
              textAlign: 'center',
            }}
          >
            {firstEncounter ? (
              <>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--blue-bg)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                  }}
                >
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <p
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: 'var(--blue)',
                    marginBottom: '8px',
                  }}
                >
                  邂逅
                </p>
                <p
                  style={{
                    fontSize: '14px',
                    color: 'var(--text-secondary)',
                    lineHeight: '1.6',
                    marginBottom: '12px',
                  }}
                >
                  这是你第一次记录与这本书相遇的感受。
                </p>
                <div
                  style={{
                    backgroundColor: 'var(--fill-primary)',
                    borderRadius: 'var(--radius)',
                    border: '1px dashed var(--blue)',
                    padding: '16px',
                    width: '100%',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      backgroundColor: 'var(--blue-bg)',
                      color: 'var(--blue)',
                    }}>
                      邂逅
                    </span>
                    <span style={{ fontSize: '13px', color: 'var(--text-quaternary)' }}>
                      {firstEncounter.createdAt}
                    </span>
                  </div>
                  <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    {bookInputs.find(i => i.id === firstEncounter?.readingNodeId)?.rawText}
                  </p>
                </div>
              </>
            ) : (
              <>
                <svg
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="var(--text-quaternary)"
                  strokeWidth="1.5"
                >
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <p
                  style={{
                    fontSize: '15px',
                    fontWeight: 500,
                    color: 'var(--text-secondary)',
                    marginTop: '12px',
                  }}
                >
                  暂无关联关系
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-tertiary)',
                    marginTop: '4px',
                  }}
                >
                  记录新的想法，开始为这本书建立书脉。
                </p>
              </>
            )}
          </div>
        )}
      </div>
      <ConfirmDialog
        open={deleteRelationTarget !== null}
        title="删除这条关系？"
        message="删除后这条书脉连接将被移除，但原始内容不会丢失。"
        confirmLabel="删除"
        cancelLabel="取消"
        destructive
        onConfirm={() => {
          if (deleteRelationTarget) removeConfirmedRelation(deleteRelationTarget);
          setDeleteRelationTarget(null);
        }}
        onCancel={() => setDeleteRelationTarget(null)}
      />
    </div>
  );
}