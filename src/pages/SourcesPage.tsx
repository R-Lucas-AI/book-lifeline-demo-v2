import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { mockOldTraces, notionDiaryEntries, getTraceById } from '../data/mockData';
import { OldTrace, DiaryEntry, diarySourceMap, excerptSourceMap, RelationType, DiaryFragment } from '../types';

import ConfirmDialog from '../components/ConfirmDialog';
import { FragmentDetail } from '../components/FragmentDetail';
import { formatDate, formatDiaryDate } from '../utils/time';
import { renderTextWithBookHighlight } from '../utils/BookHighlight';

const sourceMap: Record<OldTrace['source'], string> = {
  wechat_reading: '微信读书',
  notion: 'Notion',
  booklifeline: 'Book Lifeline',
};

const typeMap: Record<OldTrace['sourceType'], string> = {
  bookmark: '划线',
  thought: '想法',
  diary: '日记',
  booklifeline_input: '书脉输入',
};

// 统一的关系标签与色彩映射 —— 消除重复，确保视觉一致性（《设计力就是沟通力》）
const RELATION_LABELS: Record<RelationType, string> = {
  echo: '回响',
  source: '溯源',
  contrast: '对照',
  question: '追问',
  example: '例证',
  correction: '修正',
  encounter: '邂逅',
};

const RELATION_COLORS: Record<RelationType, { bg: string; text: string }> = {
  echo: { bg: 'var(--green-bg)', text: 'var(--green)' },
  source: { bg: 'var(--purple-bg)', text: 'var(--purple)' },
  contrast: { bg: 'var(--orange-bg)', text: 'var(--orange)' },
  question: { bg: 'var(--orange-bg)', text: 'var(--orange)' },
  example: { bg: 'var(--blue-bg)', text: 'var(--blue)' },
  correction: { bg: 'rgba(255,59,48,0.08)', text: '#FF3B30' },
  encounter: { bg: 'var(--blue-bg)', text: 'var(--blue)' },
};

// 来源质感隐喻（《视觉隐喻研究》）：不同来源有不同的"质地"
// 微信读书/Notion = 沉淀的支流（冷调、低饱和）
// 书脉原生 = 涌出的泉眼（暖调、蓝）
const SOURCE_ACCENT = {
  imported: 'var(--text-quinary)',    // 外部导入：低存在感
  native: 'var(--blue)',              // 书脉原生：鲜明蓝
} as const;

export default function SourcesPage() {
  const { booklifelineInputs, removeBooklifelineInput, confirmedRelations, diaryEntries, bookExcerpts, removeDiaryEntry, removeBookExcerpt, injectDemoData, resetAllData, isDemoDataInjected } = useApp();
  const navigate = useNavigate();
  const [selectedBook, setSelectedBook] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [expandedInputId, setExpandedInputId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [visibleDiaryCount, setVisibleDiaryCount] = useState(10);
  const [visibleBookCount, setVisibleBookCount] = useState(20);
  const [bookSearchQuery, setBookSearchQuery] = useState('');
  const [expandedDiaryId, setExpandedDiaryId] = useState<string | null>(null);
  const [deleteDiaryTarget, setDeleteDiaryTarget] = useState<string | null>(null);
  const [deleteExcerptTarget, setDeleteExcerptTarget] = useState<string | null>(null);
  

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

  const readingSummaries = isDemoDataInjected ? mockOldTraces.filter(t => t.source === 'wechat_reading') : [];

  // 合并 Notion 同步日记 + 书脉原生日记，统一使用 DiaryEntry 格式
  const allDiaryEntries: DiaryEntry[] = useMemo(() => {
    const staticDiaries = isDemoDataInjected ? notionDiaryEntries : [];
    return [...staticDiaries, ...diaryEntries].sort((a, b) => b.date.localeCompare(a.date));
  }, [diaryEntries, isDemoDataInjected]);

  // 获取某篇日记的识别片段
  const getDiaryFragments = (entry: DiaryEntry): DiaryFragment[] => {
    return entry.fragments || [];
  };

  // 按书籍分组，统计每本书的划线/想法数量
  const bookGroups = useMemo(() => {
    const groups: Record<string, {
      bookTitle: string;
      bookAuthor?: string;
      bookTranslator?: string;
      bookmarkCount: number;
      thoughtCount: number;
      items: OldTrace[];
    }> = {};
    readingSummaries.forEach(t => {
      const key = t.bookTitle || '未知书籍';
      if (!groups[key]) {
        groups[key] = {
          bookTitle: t.bookTitle || '未知书籍',
          bookAuthor: t.bookAuthor,
          bookTranslator: t.bookTranslator,
          bookmarkCount: 0,
          thoughtCount: 0,
          items: [],
        };
      }
      if (t.bookAuthor && !groups[key].bookAuthor) {
        groups[key].bookAuthor = t.bookAuthor;
      }
      if (t.bookTranslator && !groups[key].bookTranslator) {
        groups[key].bookTranslator = t.bookTranslator;
      }
      if (t.sourceType === 'bookmark') groups[key].bookmarkCount++;
      if (t.sourceType === 'thought') groups[key].thoughtCount++;
      groups[key].items.push(t);
    });
    return Object.values(groups);
  }, [readingSummaries]);

  // 统一书籍分组（微信读书 + 书脉书摘）
  type UnifiedBookGroup = {
    bookTitle: string;
    bookAuthor?: string;
    bookTranslator?: string;
    bookmarkCount: number;
    thoughtCount: number;
    excerptCount: number;
    wechatItems: OldTrace[];
    booklifelineItems: typeof bookExcerpts;
    allItems: Array<{ id: string; type: 'wechat' | 'booklifeline'; data: OldTrace | (typeof bookExcerpts)[number] }>;
  };

  const unifiedBookGroups: UnifiedBookGroup[] = useMemo(() => {
    const groups: Record<string, UnifiedBookGroup> = {};

    // 添加微信读书条目
    bookGroups.forEach(g => {
      groups[g.bookTitle] = {
        bookTitle: g.bookTitle,
        bookAuthor: g.bookAuthor,
        bookTranslator: g.bookTranslator,
        bookmarkCount: g.bookmarkCount,
        thoughtCount: g.thoughtCount,
        excerptCount: 0,
        wechatItems: g.items,
        booklifelineItems: [],
        allItems: g.items.map(item => ({ id: item.id, type: 'wechat' as const, data: item })),
      };
    });

    // 添加书脉书摘条目
    bookExcerpts.forEach(excerpt => {
      const key = excerpt.bookTitle;
      if (!groups[key]) {
        groups[key] = {
          bookTitle: key,
          bookAuthor: excerpt.bookAuthor,
          bookTranslator: undefined,
          bookmarkCount: 0,
          thoughtCount: 0,
          excerptCount: 0,
          wechatItems: [],
          booklifelineItems: [],
          allItems: [],
        };
      }
      groups[key].excerptCount++;
      groups[key].booklifelineItems.push(excerpt);
      groups[key].allItems.push({ id: excerpt.id, type: 'booklifeline' as const, data: excerpt });
      if (excerpt.bookAuthor && !groups[key].bookAuthor) {
        groups[key].bookAuthor = excerpt.bookAuthor;
      }
    });

    return Object.values(groups);
  }, [bookGroups, bookExcerpts]);

  // 所有涉及的书籍（微信读书 + 书脉书摘，去重）
  const allBookCount = unifiedBookGroups.length;

  // 判断某条 trace 是否已关联
  const hasRelation = (traceId: string) => {
    return confirmedRelations.some(r => r.oldTraceId === traceId);
  };

  // 判断某本书是否有已关联的摘要
  const hasBookRelation = (bookTitle: string) => {
    return confirmedRelations.some(r => {
      const trace = getTraceById(r.oldTraceId);
      return trace?.bookTitle === bookTitle;
    });
  };

  // 获取某条 trace 的关联
  const getTraceRelations = (traceId: string) => {
    return confirmedRelations.filter(r => r.oldTraceId === traceId);
  };

  // 统计某本书已关联的条目数（行为驱动：《为行为改变而设计》）
  const getBookAssociatedCount = (bookTitle: string) => {
    const group = unifiedBookGroups.find(g => g.bookTitle === bookTitle);
    if (!group) return 0;
    return group.allItems.filter(item => hasRelation(item.id)).length;
  };

  // 统计日记已关联条目数
  const getDiaryAssociatedCount = () => {
    return allDiaryEntries.filter(e => hasRelation(e.id)).length;
  };

  // 统计书脉输入已关联条目数
  const getInputAssociatedCount = () => {
    return booklifelineInputs.filter(input =>
      confirmedRelations.some(r => r.readingNodeId === input.id)
    ).length;
  };

  // 书籍排序：已关联的排在前面
  const sortedBookGroups = useMemo(() => {
    return [...unifiedBookGroups].sort((a, b) => {
      const aRel = hasBookRelation(a.bookTitle) ? 1 : 0;
      const bRel = hasBookRelation(b.bookTitle) ? 1 : 0;
      if (aRel !== bRel) return bRel - aRel;
      return (b.bookmarkCount + b.thoughtCount + b.excerptCount) - (a.bookmarkCount + a.thoughtCount + a.excerptCount);
    });
  }, [unifiedBookGroups, confirmedRelations]);

  // 按搜索词过滤书籍
  const filteredBookGroups = useMemo(() => {
    if (!bookSearchQuery.trim()) return sortedBookGroups;
    const query = bookSearchQuery.toLowerCase();
    return sortedBookGroups.filter(g =>
      g.bookTitle.toLowerCase().includes(query) ||
      (g.bookAuthor || '').toLowerCase().includes(query)
    );
  }, [sortedBookGroups, bookSearchQuery]);

  // 书脉输入排序：已关联的排在前面
  const sortedBooklifelineInputs = useMemo(() => {
    return [...booklifelineInputs].sort((a, b) => {
      const aRel = confirmedRelations.some(r => r.readingNodeId === a.id) ? 1 : 0;
      const bRel = confirmedRelations.some(r => r.readingNodeId === b.id) ? 1 : 0;
      if (aRel !== bRel) return bRel - aRel;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [booklifelineInputs, confirmedRelations]);

  // 渲染关联标签组（统一组件，消除重复）
  const renderRelationTags = (relations: typeof confirmedRelations, variant: 'solid' | 'text' = 'solid') => {
    if (relations.length === 0) return null;
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
        {relations.map(rel => {
          const label = RELATION_LABELS[rel.relationType] || rel.relationType;
          const colors = RELATION_COLORS[rel.relationType] || RELATION_COLORS.echo;
          if (variant === 'text') {
            return (
              <span
                key={rel.id}
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: colors.text,
                }}
              >
                {label}
              </span>
            );
          }
          return (
            <span
              key={rel.id}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 600,
                backgroundColor: colors.bg,
                color: colors.text,
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
    );
  };

  // ===== 书籍详情视图 =====
  if (selectedBook) {
    const bookInfo = unifiedBookGroups.find(g => g.bookTitle === selectedBook);

    return (
      <div style={{ paddingBottom: '80px' }}>
        {/* 顶部导航 —— 极简，仅返回与标题 */}
        <div style={{
          padding: '20px 24px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          <button
            onClick={() => setSelectedBook(null)}
            aria-label="返回"
            style={{
              padding: '6px',
              color: 'var(--blue)',
              backgroundColor: 'transparent',
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
              《{selectedBook}》
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>
              {bookInfo?.bookAuthor}
              {bookInfo?.bookTranslator && ` · 译 ${bookInfo.bookTranslator}`}
            </p>
          </div>
        </div>

        {/* 摘要统计 —— 一行轻量信息，不再是卡片 */}
        <div style={{
          padding: '0 24px 20px',
          fontSize: '13px',
          color: 'var(--text-quaternary)',
        }}>
          {bookInfo?.thoughtCount || 0} 想法 · {bookInfo?.bookmarkCount || 0} 划线
          {(bookInfo?.excerptCount || 0) > 0 && ` · ${bookInfo?.excerptCount} 书脉书摘`}
        </div>

        {/* 摘要列表 —— 无边框，靠留白与质感区分 */}
        <div style={{ padding: '0 24px' }}>
          {bookInfo?.allItems.map(wrapped => {
            const itemRelations = getTraceRelations(wrapped.id);
            const isAssociated = itemRelations.length > 0;
            const accentColor = wrapped.type === 'booklifeline' ? SOURCE_ACCENT.native : SOURCE_ACCENT.imported;

            if (wrapped.type === 'wechat') {
              const item = wrapped.data as OldTrace;
              return (
                <div
                  key={item.id}
                  style={{
                    padding: '16px 0',
                    borderBottom: '1px solid var(--separator-light)',
                    position: 'relative',
                    paddingLeft: isAssociated ? '14px' : '0',
                  }}
                >
                  {isAssociated && (
                    <span
                      style={{
                        position: 'absolute',
                        left: 0,
                        top: '16px',
                        bottom: '16px',
                        width: '2px',
                        borderRadius: '1px',
                        backgroundColor: 'var(--green)',
                      }}
                    />
                  )}
                  {/* 元信息行 —— 极轻 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--text-quaternary)',
                    }}>
                      {typeMap[item.sourceType]}
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-quinary)' }}>
                      {sourceMap[item.source]}
                    </span>
                    {item.chapter && (
                      <span style={{ fontSize: '11px', color: 'var(--text-quinary)' }}>
                        · {item.chapter}{item.location && ` · ${item.location}`}
                      </span>
                    )}
                    <span style={{ fontSize: '11px', color: 'var(--text-quinary)', marginLeft: 'auto' }}>
                      {item.createdAt}
                    </span>
                  </div>
                  {/* 原文引用 —— 想法类型 */}
                  {item.sourceType === 'thought' && item.originalText && (
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--text-quaternary)',
                      lineHeight: '1.5',
                      fontStyle: 'italic',
                      marginBottom: '8px',
                    }}>
                      {item.originalText}
                    </p>
                  )}
                  {/* 主体内容 —— 最大存在感 */}
                  <p style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                  }}>
                    {item.content}
                  </p>
                  {/* 关联状态 */}
                  {isAssociated && (
                    <div style={{
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}>
                      {renderRelationTags(itemRelations)}
                      <button
                        onClick={() => navigate(`/book-detail/${encodeURIComponent(selectedBook)}`)}
                        style={{
                          fontSize: '12px',
                          color: 'var(--blue)',
                          fontWeight: 500,
                        }}
                      >
                        查看书脉 →
                      </button>
                    </div>
                  )}
                </div>
              );
            } else {
              const excerpt = wrapped.data as (typeof bookExcerpts)[number];
              return (
                <div
                  key={excerpt.id}
                  style={{
                    padding: '16px 0',
                    borderBottom: '1px solid var(--separator-light)',
                    position: 'relative',
                    paddingLeft: '14px',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '16px',
                      bottom: '16px',
                      width: '2px',
                      borderRadius: '1px',
                      backgroundColor: isAssociated ? 'var(--green)' : accentColor,
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--blue)',
                    }}>
                      书脉书摘
                    </span>
                    <span style={{ fontSize: '11px', color: 'var(--text-quinary)' }}>
                      {excerptSourceMap[excerpt.source]}
                    </span>
                    {excerpt.chapter && (
                      <span style={{ fontSize: '11px', color: 'var(--text-quinary)' }}>
                        · {excerpt.chapter}
                      </span>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteExcerptTarget(excerpt.id); }}
                      style={{
                        marginLeft: 'auto',
                        padding: '2px',
                        color: 'var(--text-quinary)',
                        backgroundColor: 'transparent',
                      }}
                      aria-label="删除书摘"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M3 6h18" />
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                  <p style={{
                    fontSize: '16px',
                    fontWeight: 400,
                    color: 'var(--text-primary)',
                    lineHeight: '1.6',
                    marginBottom: excerpt.note ? '8px' : 0,
                  }}>
                    {excerpt.content}
                  </p>
                  {excerpt.note && (
                    <p style={{
                      fontSize: '13px',
                      color: 'var(--text-tertiary)',
                      lineHeight: '1.5',
                      fontStyle: 'italic',
                    }}>
                      {excerpt.note}
                    </p>
                  )}
                  {isAssociated && (
                    <div style={{
                      marginTop: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}>
                      {renderRelationTags(itemRelations)}
                      <button
                        onClick={() => navigate(`/book-detail/${encodeURIComponent(selectedBook)}`)}
                        style={{
                          fontSize: '12px',
                          color: 'var(--blue)',
                          fontWeight: 500,
                        }}
                      >
                        查看书脉 →
                      </button>
                    </div>
                  )}
                </div>
              );
            }
          })}
        </div>
      </div>
    );
  }

  // ===== 主视图 =====
  return (
    <div style={{ paddingBottom: '80px' }}>
      {/* 页面标题 —— 留白即信息（《白》） */}
      <header style={{ padding: '32px 24px 28px' }}>
        <h1 style={{
          fontSize: '32px',
          fontWeight: 700,
          color: 'var(--text-primary)',
          letterSpacing: '-0.5px',
          marginBottom: '8px',
        }}>
          来源
        </h1>
        <p style={{
          fontSize: '14px',
          color: 'var(--text-tertiary)',
          lineHeight: 1.6,
        }}>
          书摘、日记与书脉输入——三条支流汇入你的书脉。
          <br />
          每一处痕迹，都可能是下一次回响的起点。
        </p>

        {/* 演示数据控制 — 始终显示，零数据时可注入，已注入时可重置 */}
        <div style={{
          marginTop: '20px',
          padding: '16px',
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          border: '0.5px solid var(--border-tertiary)',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '8px',
          }}>
            <span style={{ fontSize: '14px' }}>🎮</span>
            <span style={{
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--text-primary)',
            }}>
              Demo 体验模式
            </span>
          </div>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-quaternary)',
            lineHeight: 1.5,
            margin: '0 0 12px',
          }}>
            {isDemoDataInjected
              ? '已注入演示数据。你可以重置后，从零开始体验书脉的生长过程。'
              : '当前是零数据状态。体验完从零开始的路径后，可以一键注入演示数据，感受数据丰富时的书脉。'
            }
          </p>
          {isDemoDataInjected ? (
            <button
              onClick={resetAllData}
              style={{
                width: '100%',
                height: '40px',
                background: 'var(--bg-tertiary)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                fontWeight: 500,
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              重置为零数据状态
            </button>
          ) : (
            <button
              onClick={injectDemoData}
              style={{
                width: '100%',
                height: '40px',
                background: 'var(--blue)',
                color: '#fff',
                fontSize: '13px',
                fontWeight: 600,
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                boxShadow: '0 2px 8px rgba(0,122,255,0.3)',
              }}
            >
              注入演示数据，体验完整书脉
            </button>
          )}
        </div>
      </header>

      {/* ===== 读书摘要 ===== */}
      <section style={{ padding: '0 24px', marginBottom: '48px' }}>
        {/* 段落标题 + 进度暗示（行为驱动） */}
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            读书摘要
          </h2>
          <span style={{
            fontSize: '12px',
            color: 'var(--text-quaternary)',
          }}>
            {(() => {
              const associated = unifiedBookGroups.filter(g => hasBookRelation(g.bookTitle)).length;
              return `${associated} / ${allBookCount} 已入脉`;
            })()}
          </span>
        </div>

        {/* 搜索框 —— 融入背景，无边框 */}
        <div style={{ position: 'relative', marginBottom: '8px' }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-quinary)"
            strokeWidth="1.5"
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={bookSearchQuery}
            onChange={e => { setBookSearchQuery(e.target.value); setVisibleBookCount(20); }}
            placeholder="搜索书名或作者"
            style={{
              width: '100%',
              padding: '10px 14px 10px 36px',
              marginBottom: '4px',
              borderRadius: 'var(--radius)',
              border: 'none',
              backgroundColor: 'var(--fill-tertiary)',
              fontSize: '14px',
              color: 'var(--text-primary)',
              fontFamily: 'inherit',
              outline: 'none',
            }}
          />
        </div>

        {/* 书籍列表 —— 无边框卡片，靠质感与留白节奏 */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {filteredBookGroups.slice(0, visibleBookCount).map((group, index) => {
            const isAssociated = hasBookRelation(group.bookTitle);
            const associatedCount = getBookAssociatedCount(group.bookTitle);
            const totalCount = group.allItems.length;

            return (
              <button
                key={`${group.bookTitle}-${index}`}
                onClick={() => setSelectedBook(group.bookTitle)}
                style={{
                  textAlign: 'left',
                  padding: '14px 0',
                  backgroundColor: 'transparent',
                  borderBottom: index === Math.min(visibleBookCount, filteredBookGroups.length) - 1
                    ? 'none'
                    : '1px solid var(--separator-light)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                {/* 关联质感条 —— 隐喻"已入脉"（《视觉隐喻研究》） */}
                <span style={{
                  width: '3px',
                  height: '36px',
                  borderRadius: '2px',
                  backgroundColor: isAssociated ? 'var(--green)' : 'var(--separator)',
                  flexShrink: 0,
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px' }}>
                    <h3 style={{
                      fontSize: '15px',
                      fontWeight: 500,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      《{group.bookTitle}》
                    </h3>
                    <span style={{
                      fontSize: '12px',
                      color: isAssociated ? 'var(--green)' : 'var(--text-quinary)',
                      fontWeight: 500,
                      flexShrink: 0,
                    }}>
                      {associatedCount}/{totalCount}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginTop: '2px',
                    fontSize: '12px',
                    color: 'var(--text-quaternary)',
                  }}>
                    {group.bookAuthor && (
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {group.bookAuthor}
                        {group.bookTranslator && ` · 译 ${group.bookTranslator}`}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-quinary)' }}>·</span>
                    <span style={{ flexShrink: 0 }}>
                      {group.thoughtCount + group.bookmarkCount + group.excerptCount} 条
                    </span>
                  </div>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-quinary)" strokeWidth="1.5" style={{ flexShrink: 0 }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            );
          })}
        </div>
        {filteredBookGroups.length > visibleBookCount && (
          <button
            onClick={() => setVisibleBookCount(prev => prev + 20)}
            style={{
              width: '100%',
              padding: '14px',
              marginTop: '8px',
              color: 'var(--blue)',
              fontSize: '14px',
              fontWeight: 500,
            }}
          >
            显示更多（还有 {filteredBookGroups.length - visibleBookCount} 本）
          </button>
        )}
      </section>

      {/* ===== 日记 ===== */}
      <section style={{ padding: '0 24px', marginBottom: '48px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            日记
          </h2>
          <span style={{
            fontSize: '12px',
            color: 'var(--text-quaternary)',
          }}>
            {getDiaryAssociatedCount()} / {allDiaryEntries.length} 已入脉
          </span>
        </div>

        {allDiaryEntries.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: '14px', color: 'var(--text-quaternary)', margin: 0 }}>
              暂无日记
            </p>
          </div>
        ) : (
          <>
            {/* 日记列表 */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
            {allDiaryEntries.slice(0, visibleDiaryCount).map((entry, index) => {
              const isExpanded = expandedDiaryId === entry.id;
              const fragments = getDiaryFragments(entry);
              const isNative = entry.source === 'booklifeline_native';
              const isAssociated = hasRelation(entry.id);
              const itemRelations = getTraceRelations(entry.id);
              const accentColor = isNative ? SOURCE_ACCENT.native : SOURCE_ACCENT.imported;

              // 统计片段类型
              const fragmentTypeCounts: Record<string, number> = {};
              fragments.forEach(f => {
                f.type.forEach(t => {
                  fragmentTypeCounts[t] = (fragmentTypeCounts[t] || 0) + 1;
                });
              });

              return (
                <div
                  key={entry.id}
                  style={{
                    padding: '14px 0',
                    borderBottom: index === Math.min(visibleDiaryCount, allDiaryEntries.length) - 1
                      ? 'none'
                      : '1px solid var(--separator-light)',
                    position: 'relative',
                    paddingLeft: '14px',
                  }}
                >
                  {/* 质感条 —— 来源质地 + 关联状态 */}
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: '14px',
                    bottom: '14px',
                    width: '3px',
                    borderRadius: '2px',
                    backgroundColor: isAssociated ? 'var(--green)' : accentColor,
                    opacity: isAssociated ? 1 : 0.5,
                  }} />

                  {/* 头部：日期 + 来源 + 片段统计 */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '8px',
                  }}>
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}>
                      {formatDiaryDate(entry.date)}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: isNative ? 'var(--blue)' : 'var(--text-quinary)',
                    }}>
                      {diarySourceMap[entry.source]}
                    </span>
                    <span style={{
                      fontSize: '11px',
                      color: 'var(--text-quinary)',
                      marginLeft: 'auto',
                    }}>
                      {fragments.length} 条片段
                    </span>
                    {isNative && (
                      <button
                        onClick={() => setDeleteDiaryTarget(entry.id)}
                        style={{
                          padding: '2px',
                          color: 'var(--text-quinary)',
                          backgroundColor: 'transparent',
                        }}
                        aria-label="删除日记"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 6h18" />
                          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                        </svg>
                      </button>
                    )}
                  </div>

                  {/* 关联标签 */}
                  {isAssociated && (
                    <div style={{ marginBottom: '8px' }}>
                      {renderRelationTags(itemRelations, 'text')}
                    </div>
                  )}

                  {/* 结构化片段卡片 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {(isExpanded ? fragments : fragments.slice(0, 3)).map((fragment, idx) => (
                <div
                  key={fragment.fragmentId}
                  style={{
                    padding: idx === 0 ? '0' : '8px 0',
                    borderBottom: idx === (isExpanded ? fragments.length : 3) - 1 ? 'none' : '1px dashed var(--separator-light)',
                  }}
                >
                  <FragmentDetail
                    fragment={fragment}
                    diaryId={entry.id}
                    onSave={(fragmentId, updates) => {
                      console.log('Save fragment:', fragmentId, updates);
                    }}
                  />
                </div>
              ))}
              {!isExpanded && fragments.length > 3 && (
                <button
                  onClick={() => setExpandedDiaryId(entry.id)}
                  style={{
                    fontSize: '12px',
                    color: 'var(--blue)',
                    textAlign: 'left',
                    padding: '8px 0 0 66px',
                  }}
                >
                  还有 {fragments.length - 3} 条片段
                </button>
              )}
            </div>

                  {/* 展开/收起 */}
                  {isExpanded && (
                    <button
                      onClick={() => setExpandedDiaryId(null)}
                      style={{
                        marginTop: '10px',
                        fontSize: '13px',
                        color: 'var(--blue)',
                        fontWeight: 500,
                      }}
                    >
                      收起
                    </button>
                  )}
                </div>
              );
            })}
            {allDiaryEntries.length > visibleDiaryCount && (
              <button
                onClick={() => setVisibleDiaryCount(prev => prev + 10)}
                style={{
                  width: '100%',
                  padding: '14px',
                  marginTop: '8px',
                  color: 'var(--blue)',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                显示更多（还有 {allDiaryEntries.length - visibleDiaryCount} 条）
              </button>
            )}
            </div>
          </>
        )}
      </section>

      {/* ===== 书脉输入 ===== */}
      <section style={{ padding: '0 24px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: '16px',
        }}>
          <h2 style={{
            fontSize: '17px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}>
            书脉输入
          </h2>
          <span style={{
            fontSize: '12px',
            color: 'var(--text-quaternary)',
          }}>
            {getInputAssociatedCount()} / {booklifelineInputs.length} 已入脉
          </span>
        </div>

        {sortedBooklifelineInputs.length === 0 ? (
          <div style={{
            padding: '40px 20px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: '14px',
              color: 'var(--text-tertiary)',
              marginBottom: '16px',
              lineHeight: 1.6,
            }}>
              还没有书脉输入
              <br />
              <span style={{ fontSize: '13px', color: 'var(--text-quaternary)' }}>
                记录你的所思所感，让痕迹开始沉淀
              </span>
            </p>
            <button
              onClick={() => navigate('/')}
              style={{
                padding: '8px 24px',
                borderRadius: 'var(--radius-pill)',
                backgroundColor: 'var(--blue)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              去记录
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {sortedBooklifelineInputs.map((input, index) => {
              const inputRelations = confirmedRelations.filter(r => r.readingNodeId === input.id);
              const isAssociated = inputRelations.length > 0;
              const isExpanded = expandedInputId === input.id;

              return (
                <div
                  key={input.id}
                  style={{
                    padding: '14px 0',
                    borderBottom: index === sortedBooklifelineInputs.length - 1
                      ? 'none'
                      : '1px solid var(--separator-light)',
                    position: 'relative',
                    paddingLeft: '14px',
                  }}
                >
                  {/* 质感条 —— 书脉原生，蓝色 */}
                  <span style={{
                    position: 'absolute',
                    left: 0,
                    top: '14px',
                    bottom: '14px',
                    width: '3px',
                    borderRadius: '2px',
                    backgroundColor: isAssociated ? 'var(--green)' : SOURCE_ACCENT.native,
                    opacity: isAssociated ? 1 : 0.5,
                  }} />

                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}>
                    <button
                      onClick={() => {
                        if (input.bookTitle) {
                          navigate(`/book-detail/${encodeURIComponent(input.bookTitle)}`);
                        } else if (isAssociated) {
                          setExpandedInputId(isExpanded ? null : input.id);
                        }
                      }}
                      style={{
                        textAlign: 'left',
                        flex: 1,
                        cursor: 'pointer',
                        backgroundColor: 'transparent',
                        padding: 0,
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '8px',
                        marginBottom: '4px',
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: 500,
                          color: 'var(--text-primary)',
                        }}>
                          {input.bookTitle ? `《${input.bookTitle}》` : '生活感悟'}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--text-quinary)',
                        }}>
                          {formatDate(input.createdAt)}
                        </span>
                      </div>
                      <p style={{
                        fontSize: '14px',
                        color: 'var(--text-secondary)',
                        lineHeight: '1.5',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {renderTextWithBookHighlight(input.rawText, (title) => navigate(`/book-detail/${encodeURIComponent(title)}`))}
                      </p>
                    </button>
                    <div style={{ position: 'relative', flexShrink: 0 }} data-menu-container>
                      <button
                        onClick={() => setOpenMenuId(openMenuId === input.id ? null : input.id)}
                        aria-label="更多操作"
                        aria-haspopup="menu"
                        aria-expanded={openMenuId === input.id}
                        style={{
                          padding: '4px',
                          color: 'var(--text-quinary)',
                          backgroundColor: 'transparent',
                        }}
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="1" />
                          <circle cx="19" cy="12" r="1" />
                          <circle cx="5" cy="12" r="1" />
                        </svg>
                      </button>
                      {openMenuId === input.id && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '100%',
                            right: 0,
                            marginTop: '4px',
                            backgroundColor: 'var(--fill-primary)',
                            borderRadius: 'var(--radius-sm)',
                            boxShadow: 'var(--shadow-lg)',
                            zIndex: 100,
                            minWidth: '120px',
                            overflow: 'hidden',
                          }}
                        >
                          <button
                            onClick={() => {
                              setDeleteTarget(input.id);
                              setOpenMenuId(null);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px 16px',
                              textAlign: 'left',
                              fontSize: '14px',
                              color: '#FF3B30',
                              backgroundColor: 'transparent',
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
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 展开关联关系（无书籍关联时） */}
                  {isExpanded && !input.bookTitle && isAssociated && (
                    <div style={{
                      marginTop: '12px',
                      paddingTop: '12px',
                      borderTop: '1px solid var(--separator-light)',
                    }}>
                      <p style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        color: 'var(--text-tertiary)',
                        marginBottom: '8px',
                        letterSpacing: '0.3px',
                      }}>
                        关联的旧痕迹
                      </p>
                      {inputRelations.map(rel => {
                        const trace = isDemoDataInjected ? mockOldTraces.find(t => t.id === rel.oldTraceId) : undefined;
                        if (!trace) return null;
                        const label = RELATION_LABELS[rel.relationType] || rel.relationType;
                        const colors = RELATION_COLORS[rel.relationType] || RELATION_COLORS.echo;
                        return (
                          <div key={rel.id} style={{
                            backgroundColor: 'var(--fill-tertiary)',
                            borderRadius: 'var(--radius-sm)',
                            padding: '10px 12px',
                            marginBottom: '6px',
                          }}>
                            <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              marginBottom: '4px',
                            }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 600,
                                backgroundColor: colors.bg,
                                color: colors.text,
                              }}>
                                {label}
                              </span>
                              <span style={{
                                fontSize: '11px',
                                color: 'var(--text-quinary)',
                              }}>
                                {trace.bookTitle ? `《${trace.bookTitle}》` : '日记'}
                                {' · '}{trace.createdAt}
                              </span>
                            </div>
                            <p style={{
                              fontSize: '13px',
                              color: 'var(--text-secondary)',
                              lineHeight: '1.5',
                            }}>
                              {renderTextWithBookHighlight(trace.content, (title) => navigate(`/book-detail/${encodeURIComponent(title)}`))}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 已关联标记 —— 极简文字标签 */}
                  {isAssociated && !isExpanded && (
                    <div style={{ marginTop: '6px' }}>
                      {renderRelationTags(inputRelations, 'text')}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 删除确认对话框 —— 保留原有逻辑 */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="删除这条书脉输入？"
        message="删除后相关的书脉关系也会一并移除，此操作不可撤销。"
        confirmLabel="删除"
        cancelLabel="取消"
        destructive
        onConfirm={() => {
          if (deleteTarget) removeBooklifelineInput(deleteTarget);
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
      <ConfirmDialog
        open={deleteDiaryTarget !== null}
        title="删除这条日记？"
        message="删除后此日记将永久移除，此操作不可撤销。"
        confirmLabel="删除"
        cancelLabel="取消"
        destructive
        onConfirm={() => {
          if (deleteDiaryTarget) removeDiaryEntry(deleteDiaryTarget);
          setDeleteDiaryTarget(null);
        }}
        onCancel={() => setDeleteDiaryTarget(null)}
      />
      <ConfirmDialog
        open={deleteExcerptTarget !== null}
        title="删除这条书摘？"
        message="删除后此书摘将永久移除，此操作不可撤销。"
        confirmLabel="删除"
        cancelLabel="取消"
        destructive
        onConfirm={() => {
          if (deleteExcerptTarget) removeBookExcerpt(deleteExcerptTarget);
          setDeleteExcerptTarget(null);
        }}
        onCancel={() => setDeleteExcerptTarget(null)}
      />
    </div>
  );
}
