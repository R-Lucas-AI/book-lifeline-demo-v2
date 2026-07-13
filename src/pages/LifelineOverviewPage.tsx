import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { mockOldTraces, getTraceById } from '../data/mockData';
import { notionDiaryEntries } from '../data/notionDiaries';
import { searchBookCovers } from '../api';
import { EchoRelation } from '../types';

interface BookGroup {
  bookTitle: string;
  bookAuthor?: string;
  bookTranslator?: string;
  tracesCount: number;
  readingNodesCount: number;
  isFirstEncounter: boolean;
  firstEncounterDate?: string;
  relations: EchoRelation[];
  pendingCount: number;
}

const CARD_WIDTH_KEY = 'booklifeline_card_width';
const CARD_VIEW_KEY = 'booklifeline_card_view';
const DEFAULT_CARD_WIDTH = 160;
const MIN_CARD_WIDTH = 110;
const MAX_CARD_WIDTH = 240;
const COVER_RATIO = 1.375;
type CardViewMode = 'info' | 'cover';

export default function LifelineOverviewPage() {
  const { confirmedRelations, firstEncounterBooks, booklifelineInputs, getBookMeta, saveBookMeta, bookLibrary, isDemoDataInjected, diaryEntries, diaryCandidateRelations } = useApp();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [rescanning, setRescanning] = useState(false);
  const [rescanProgress, setRescanProgress] = useState({ current: 0, total: 0, success: 0, failed: 0, results: [] as { title: string; coverCount: number; hasCover: boolean }[], speed: 0, eta: '' });
  const [rescanMode, setRescanMode] = useState<'missing' | 'all'>('missing');
  const abortControllerRef = useRef<AbortController | null>(null);
  const rescanStartTimeRef = useRef<number>(0);
  const [cardWidth, setCardWidth] = useState(() => {
    const saved = localStorage.getItem(CARD_WIDTH_KEY);
    const w = saved ? parseInt(saved, 10) : DEFAULT_CARD_WIDTH;
    return Math.max(MIN_CARD_WIDTH, Math.min(MAX_CARD_WIDTH, w));
  });
  const [cardView, setCardView] = useState<CardViewMode>(() => {
    const saved = localStorage.getItem(CARD_VIEW_KEY) as CardViewMode | null;
    return saved === 'info' ? 'info' : 'cover';
  });
  const [visibleCount, setVisibleCount] = useState(40);
  const sliderRef = useRef<HTMLInputElement>(null);

  // Persist card width to localStorage (debounced via rAF)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      localStorage.setItem(CARD_WIDTH_KEY, String(cardWidth));
    }, 300);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [cardWidth]);

  // Persist card view mode
  useEffect(() => {
    localStorage.setItem(CARD_VIEW_KEY, cardView);
  }, [cardView]);

  // Reset visible count when search changes
  useEffect(() => { setVisibleCount(40); }, [searchQuery]);

  const getBookGroups = (): BookGroup[] => {
    const groups: Record<string, BookGroup> = {};
    const staticTraces = isDemoDataInjected ? mockOldTraces : [];

    staticTraces.forEach(trace => {
      if (!trace.bookTitle) return;
      const key = trace.bookTitle;
      if (!groups[key]) {
        groups[key] = {
          bookTitle: trace.bookTitle,
          bookAuthor: trace.bookAuthor,
          bookTranslator: trace.bookTranslator,
          tracesCount: 0,
          readingNodesCount: 0,
          isFirstEncounter: false,
          relations: [],
          pendingCount: 0,
        };
      }
      groups[key].tracesCount += 1;
      if (trace.bookAuthor && !groups[key].bookAuthor) {
        groups[key].bookAuthor = trace.bookAuthor;
      }
      if (trace.bookTranslator && !groups[key].bookTranslator) {
        groups[key].bookTranslator = trace.bookTranslator;
      }
    });

    confirmedRelations.forEach(relation => {
      const trace = isDemoDataInjected ? getTraceById(relation.oldTraceId) : null;
      const node = booklifelineInputs.find(n => n.id === relation.readingNodeId);
      const bookTitle = trace?.bookTitle || node?.bookTitle;
      if (!bookTitle) return;

      const key = bookTitle;
      if (!groups[key]) {
        groups[key] = {
          bookTitle,
          bookAuthor: trace?.bookAuthor || node?.bookAuthor,
          bookTranslator: trace?.bookTranslator || node?.bookTranslator,
          tracesCount: 0,
          readingNodesCount: 0,
          isFirstEncounter: false,
          relations: [],
          pendingCount: 0,
        };
      }
      groups[key].relations.push(relation);
    });

    booklifelineInputs.forEach(node => {
      if (!node.bookTitle) return;
      const key = node.bookTitle;
      if (!groups[key]) {
        groups[key] = {
          bookTitle: node.bookTitle,
          bookAuthor: node.bookAuthor,
          bookTranslator: node.bookTranslator,
          tracesCount: 0,
          readingNodesCount: 0,
          isFirstEncounter: false,
          relations: [],
          pendingCount: 0,
        };
      }
      groups[key].readingNodesCount += 1;
      if (node.bookAuthor && !groups[key].bookAuthor) {
        groups[key].bookAuthor = node.bookAuthor;
      }
    });

    firstEncounterBooks.forEach(book => {
      const key = book.bookTitle;
      if (!groups[key]) {
        groups[key] = {
          bookTitle: book.bookTitle,
          bookAuthor: book.bookAuthor,
          bookTranslator: book.bookTranslator,
          tracesCount: 0,
          readingNodesCount: 0,
          isFirstEncounter: true,
          firstEncounterDate: book.createdAt,
          relations: [],
          pendingCount: 0,
        };
      } else {
        groups[key].isFirstEncounter = true;
        groups[key].firstEncounterDate = book.createdAt;
      }
    });

    const effectiveDiaryEntries = isDemoDataInjected ? notionDiaryEntries : diaryEntries;
    effectiveDiaryEntries.forEach(entry => {
      entry.fragments?.forEach(fragment => {
        fragment.relatedBooks?.forEach(bookTitle => {
          const key = bookTitle;
          if (!groups[key]) {
            groups[key] = {
              bookTitle,
              bookAuthor: fragment.relatedAuthors?.[0],
              bookTranslator: undefined,
              tracesCount: 0,
              readingNodesCount: 0,
              isFirstEncounter: false,
              relations: [],
              pendingCount: 0,
            };
          }
          if (fragment.relatedAuthors?.[0] && !groups[key].bookAuthor) {
            groups[key].bookAuthor = fragment.relatedAuthors[0];
          }
        });
      });
    });

    // 统计待确认书碟节点数量（只统计 status 为 pending 的）
    diaryCandidateRelations.forEach(candidate => {
      if (candidate.status !== 'pending') return;
      const key = candidate.bookTitle;
      if (groups[key]) {
        groups[key].pendingCount += 1;
      }
    });

    return Object.values(groups);
  };

  const allBookGroups = useMemo(() => getBookGroups(), [confirmedRelations, firstEncounterBooks, booklifelineInputs, isDemoDataInjected, diaryEntries, diaryCandidateRelations]);

  // Filter by search query (same logic as SourcesPage)
  const filteredBookGroups = useMemo(() => {
    if (!searchQuery.trim()) return allBookGroups;
    const query = searchQuery.toLowerCase();
    return allBookGroups.filter(g =>
      g.bookTitle.toLowerCase().includes(query) ||
      (g.bookAuthor || '').toLowerCase().includes(query)
    );
  }, [allBookGroups, searchQuery]);

  // Sort: pending first, then new, then regular
  const sortedBookGroups = useMemo(() => {
    return [...filteredBookGroups].sort((a, b) => {
      if (a.pendingCount > 0 && b.pendingCount === 0) return -1;
      if (a.pendingCount === 0 && b.pendingCount > 0) return 1;
      if (a.isFirstEncounter && !b.isFirstEncounter) return -1;
      if (!a.isFirstEncounter && b.isFirstEncounter) return 1;
      return 0;
    });
  }, [filteredBookGroups]);

  const visibleBookGroups = sortedBookGroups.slice(0, visibleCount);

  const getInsightText = (): string => {
    if (allBookGroups.length === 0) {
      return '记录你的第一条阅读感受，让书脉开始生长。每一本书、每一条划线、每一次思考，都会在这里留下痕迹。';
    }

    const allTags: string[] = [];
    booklifelineInputs.forEach(node => {
      allTags.push(...node.tags);
    });

    const tagCounts: Record<string, number> = {};
    allTags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });

    const sortedTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
    const topTags = sortedTags.slice(0, 3).map(([tag]) => tag);

    if (topTags.length > 0) {
      const themeText = topTags.length > 1
        ? `"${topTags.slice(0, -1).join('、')}"与"${topTags[topTags.length - 1]}"`
        : `"${topTags[0]}"`;
      return `在最近的记录中，${themeText}是你反复触碰的核心主题。你正在用不同的书籍和经历反复走向同一个深层认知。`;
    }

    return `你已建立 ${allBookGroups.length} 本书的书脉。继续记录感受，让阅读痕迹在这里生长。`;
  };

  const handleBookClick = (bookTitle: string) => {
    navigate(`/book-detail/${encodeURIComponent(bookTitle)}`);
  };

  const handleNewInput = () => {
    navigate('/');
  };

  const CONCURRENCY = 5;

  const handleRescanAllCovers = async () => {
    const allBooks = Object.values(bookLibrary);
    if (allBooks.length === 0 || rescanning) return;

    // 根据模式筛选要搜索的书
    const booksToSearch = rescanMode === 'missing'
      ? allBooks.filter(b => !b.coverUrl)
      : allBooks;

    if (booksToSearch.length === 0) {
      setRescanProgress({ current: 0, total: 0, success: 0, failed: 0, results: [], speed: 0, eta: '' });
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    rescanStartTimeRef.current = Date.now();

    setRescanning(true);
    setRescanProgress({ current: 0, total: booksToSearch.length, success: 0, failed: 0, results: [], speed: 0, eta: '' });

    const resultsMap = new Map<string, { title: string; coverCount: number; hasCover: boolean }>();
    let completed = 0;
    let success = 0;
    let failed = 0;

    const updateProgress = () => {
      const elapsed = (Date.now() - rescanStartTimeRef.current) / 1000;
      const speed = completed > 0 ? completed / elapsed : 0;
      const remaining = booksToSearch.length - completed;
      const etaSec = speed > 0 ? Math.round(remaining / speed) : 0;
      const eta = etaSec > 60 ? `${Math.floor(etaSec / 60)}分${etaSec % 60}秒` : `${etaSec}秒`;

      setRescanProgress({
        current: completed,
        total: booksToSearch.length,
        success,
        failed,
        results: Array.from(resultsMap.values()),
        speed: Math.round(speed * 10) / 10,
        eta: completed < booksToSearch.length ? eta : '',
      });
    };

    // 并发控制：worker 池模式
    let index = 0;

    const worker = async () => {
      while (index < booksToSearch.length && !controller.signal.aborted) {
        const currentIndex = index++;
        const book = booksToSearch[currentIndex];

        try {
          const coverResult = await searchBookCovers(book.title, book.author, controller.signal);
          const coverCount = coverResult.coverOptions?.length || (coverResult.coverUrl ? 1 : 0);
          const hasCover = !!coverResult.coverUrl;

          if (hasCover) {
            const existing = getBookMeta(book.title);
            if (existing) {
              saveBookMeta({
                ...existing,
                coverUrl: coverResult.coverUrl!,
                coverOptions: coverResult.coverOptions,
                updatedAt: new Date().toISOString(),
              });
            }
            success++;
          } else {
            failed++;
          }

          resultsMap.set(book.title, { title: book.title, coverCount, hasCover });
        } catch (e) {
          if ((e as Error).name === 'AbortError') break;
          failed++;
          resultsMap.set(book.title, { title: book.title, coverCount: 0, hasCover: false });
        }

        completed++;
        updateProgress();
      }
    };

    // 启动 N 个 worker
    const workers = Array.from({ length: Math.min(CONCURRENCY, booksToSearch.length) }, () => worker());
    await Promise.all(workers);

    setRescanning(false);
    abortControllerRef.current = null;
  };

  const handleCancelRescan = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setRescanning(false);
  };

  // Dynamic gap based on card width
  const gap = Math.round(cardWidth * 0.15);

  return (
    <>
      <style>{`
        .lifeline-book-card {
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .lifeline-book-card:hover {
          transform: translateY(-6px) scale(1.02);
          box-shadow: 0 12px 32px rgba(0, 0, 0, 0.1), 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .lifeline-book-title {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .lifeline-book-author {
          display: -webkit-box;
          -webkit-line-clamp: 1;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
        .card-size-slider {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 2px;
          background: var(--fill-tertiary);
          outline: none;
          cursor: pointer;
        }
        .card-size-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--blue);
          cursor: grab;
          border: none;
          box-shadow: 0 1px 4px rgba(0,122,255,0.3);
          transition: transform 0.1s ease;
        }
        .card-size-slider::-webkit-slider-thumb:active {
          cursor: grabbing;
          transform: scale(1.2);
        }
        .card-size-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: var(--blue);
          cursor: grab;
          border: none;
          box-shadow: 0 1px 4px rgba(0,122,255,0.3);
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @media (max-width: 480px) {
          .lifeline-page-container {
            padding: 16px 16px 72px !important;
          }
        }
      `}</style>

      <div
        className="lifeline-page-container"
        style={{
          maxWidth: '960px',
          margin: '0 auto',
          padding: '20px 24px 72px',
          background: 'var(--fill-secondary)',
          minHeight: '100vh',
        }}
      >
        {/* 1. Locator */}
        <div
          style={{
            textAlign: 'center',
            padding: '36px 0 40px',
            opacity: 0,
            animation: 'fadeUp 0.5s ease both 0.1s',
          }}
        >
          <p
            style={{
              fontSize: '15px',
              fontWeight: 500,
              color: 'var(--text-quaternary)',
              letterSpacing: '0.02em',
            }}
          >
            你的阅读痕迹在这里生长
          </p>
        </div>

        {/* 2. Search + Card size control */}
        <div
          style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            marginBottom: '20px',
            opacity: 0,
            animation: 'fadeUp 0.5s ease both 0.35s',
          }}
        >
          {/* Search input */}
          <div style={{ flex: 1, position: 'relative' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--text-quinary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
              }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="搜索书名或作者…"
              style={{
                width: '100%',
                padding: '9px 14px 9px 36px',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--separator)',
                backgroundColor: 'var(--fill-primary)',
                fontSize: '14px',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={e => { e.target.style.borderColor = 'var(--blue)'; }}
              onBlur={e => { e.target.style.borderColor = 'var(--separator)'; }}
            />
          </div>

          {/* View toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--fill-primary)',
              border: '1px solid var(--separator)',
              borderRadius: 'var(--radius)',
              padding: '3px',
              flexShrink: 0,
              gap: '2px',
            }}
          >
            <button
              onClick={() => setCardView('cover')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px 10px',
                borderRadius: 'calc(var(--radius) - 2px)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                background: cardView === 'cover' ? 'var(--blue)' : 'transparent',
                color: cardView === 'cover' ? '#fff' : 'var(--text-quaternary)',
              }}
              aria-label="封面视图"
            >
              封面
            </button>
            <button
              onClick={() => setCardView('info')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '5px 10px',
                borderRadius: 'calc(var(--radius) - 2px)',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: '12px',
                fontWeight: 500,
                transition: 'all 0.2s ease',
                background: cardView === 'info' ? 'var(--blue)' : 'transparent',
                color: cardView === 'info' ? '#fff' : 'var(--text-quaternary)',
              }}
              aria-label="信息视图"
            >
              信息
            </button>
          </div>

          {/* Card size slider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              background: 'var(--fill-primary)',
              border: '1px solid var(--separator)',
              borderRadius: 'var(--radius)',
              padding: '7px 12px',
              flexShrink: 0,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-quaternary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="8" height="8" rx="1" />
              <rect x="13" y="3" width="8" height="8" rx="1" />
              <rect x="3" y="13" width="8" height="8" rx="1" />
              <rect x="13" y="13" width="8" height="8" rx="1" />
            </svg>
            <input
              ref={sliderRef}
              type="range"
              min={MIN_CARD_WIDTH}
              max={MAX_CARD_WIDTH}
              value={cardWidth}
              onChange={e => setCardWidth(parseInt(e.target.value, 10))}
              className="card-size-slider"
              style={{ width: '100px' }}
              aria-label="卡片大小"
            />
          </div>
        </div>

        {/* Book count */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: '16px',
            opacity: 0,
            animation: 'fadeUp 0.5s ease both 0.40s',
          }}
        >
          <span style={{ fontSize: '13px', color: 'var(--text-quaternary)' }}>
            共 {filteredBookGroups.length} 本
          </span>
        </div>

        {/* 4. Bookshelf */}
        <div
          style={{
            opacity: 0,
            animation: 'fadeUp 0.5s ease both 0.40s',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: `${gap}px`,
              justifyContent: 'flex-start',
              position: 'relative',
              paddingBottom: '16px',
            }}
          >
            {visibleBookGroups.length > 0 ? (
              visibleBookGroups.map((group) => {
                const nodeCount = group.readingNodesCount + (group.isFirstEncounter ? 1 : 0);
                const relationCount = group.relations.length;
                const isConnected = nodeCount > 0 || relationCount > 0;

                const bookTags = booklifelineInputs
                  .filter(n => n.bookTitle === group.bookTitle)
                  .flatMap(n => n.tags)
                  .filter((tag, index, arr) => arr.indexOf(tag) === index)
                  .slice(0, 5);

                // Book meta — core question and key ideas (from library)
                const bookMeta = getBookMeta(group.bookTitle);

                // --- Cover view ---
                if (cardView === 'cover') {
                  const coverHeight = Math.round(cardWidth * COVER_RATIO);
                  return (
                    <div
                      key={`${group.bookTitle}-${group.bookAuthor || 'no-author'}`}
                      className="lifeline-book-card"
                      onClick={() => handleBookClick(group.bookTitle)}
                      style={{
                        display: 'block',
                        width: `${cardWidth}px`,
                        minWidth: `${cardWidth}px`,
                        background: 'var(--fill-primary)',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'transform 0.25s ease, box-shadow 0.25s ease, width 0.1s ease',
                        WebkitTapHighlightColor: 'transparent',
                        border: '1px solid var(--separator)',
                        textDecoration: 'none',
                        color: 'inherit',
                      }}
                    >
                      {/* NEW badge */}
                      {group.isFirstEncounter && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            left: '8px',
                            zIndex: 2,
                          }}
                        >
                          <span
                            style={{
                              background: 'var(--blue)',
                              color: '#fff',
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              letterSpacing: '0.04em',
                              display: 'inline-block',
                            }}
                          >
                            NEW
                          </span>
                        </div>
                      )}

                      {/* Pending badge - only show when there are pending relations */}
                      {group.pendingCount > 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '18px',
                            zIndex: 2,
                          }}
                        >
                          <span
                            style={{
                              background: 'var(--orange)',
                              color: '#fff',
                              fontSize: '9px',
                              fontWeight: 700,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              letterSpacing: '0.02em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {group.pendingCount}
                          </span>
                        </div>
                      )}

                      {/* Connection dot indicator */}
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          right: '10px',
                          zIndex: 2,
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: isConnected ? 'var(--green)' : 'var(--text-quinary)',
                          opacity: isConnected ? 1 : 0.4,
                          boxShadow: isConnected ? '0 0 0 3px rgba(52, 199, 89, 0.15)' : 'none',
                        }}
                      />

                      {/* Book cover — 豆瓣封面优先，无封面时用书名占位 */}
                      <div
                        style={{
                          width: '100%',
                          height: `${coverHeight}px`,
                          overflow: 'hidden',
                          background: 'var(--fill-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {bookMeta?.coverUrl ? (
                          <img
                            src={bookMeta.coverUrl}
                            alt={`《${group.bookTitle}》封面`}
                            loading="lazy"
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                              display: 'block',
                            }}
                            onError={(e) => {
                              // 封面加载失败 — 隐藏 img，显示占位（通过父容子的span兜底较复杂，这里直接替换为文字）
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <span
                            style={{
                              fontSize: `${Math.max(10, Math.round(cardWidth * 0.08))}px`,
                              fontWeight: 500,
                              color: 'var(--text-quaternary)',
                              textAlign: 'center',
                              padding: '0 12px',
                              lineHeight: 1.4,
                            }}
                          >
                            《{group.bookTitle}》
                          </span>
                        )}
                      </div>

                      {/* Book info */}
                      <div
                        style={{
                          padding: `${Math.max(8, Math.round(cardWidth * 0.075))}px ${Math.max(8, Math.round(cardWidth * 0.06))}px`,
                          textAlign: 'center',
                        }}
                      >
                        <div
                          className="lifeline-book-title"
                          style={{
                            fontSize: `${Math.max(11, Math.round(cardWidth * 0.085))}px`,
                            fontWeight: 600,
                            color: 'var(--text-primary)',
                            lineHeight: 1.3,
                            letterSpacing: '-0.01em',
                            marginBottom: '2px',
                          }}
                        >
                          《{group.bookTitle}》
                        </div>
                        <div
                          className="lifeline-book-author"
                          style={{
                            fontSize: `${Math.max(10, Math.round(cardWidth * 0.07))}px`,
                            color: 'var(--text-quaternary)',
                            lineHeight: 1.3,
                            marginBottom: '4px',
                          }}
                        >
                          {group.bookAuthor || ''}
                        </div>
                        <div
                          style={{
                            fontSize: `${Math.max(9, Math.round(cardWidth * 0.065))}px`,
                            color: 'var(--text-quinary)',
                          }}
                        >
                          {nodeCount > 0 ? `${nodeCount} 条书脉节点` : `${group.tracesCount} 条阅读痕迹`}
                        </div>
                      </div>
                    </div>
                  );
                }

                // --- Info view ---
                const metricLabelSize = cardWidth < 140 ? '10px' : '11px';
                const badgeFontSize = cardWidth < 140 ? '10px' : '11px';
                const titleSize = cardWidth < 140
                  ? '13px'
                  : `${Math.max(13, Math.round(cardWidth * 0.08))}px`;
                const authorSize = cardWidth < 140 ? '11px' : `${Math.max(10, Math.round(cardWidth * 0.065))}px`;
                const cardPadding = cardWidth < 140 ? '12px' : '16px';
                const coreQuestionSize = cardWidth < 140 ? '12px' : '13px';

                return (
                  <div
                    key={`${group.bookTitle}-${group.bookAuthor || 'no-author'}`}
                    className="lifeline-book-card"
                    onClick={() => handleBookClick(group.bookTitle)}
                    style={{
                      display: 'block',
                      width: `${cardWidth}px`,
                      minWidth: `${cardWidth}px`,
                      background: 'var(--fill-primary)',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'transform 0.25s ease, box-shadow 0.25s ease, width 0.1s ease',
                      WebkitTapHighlightColor: 'transparent',
                      border: '1px solid color-mix(in srgb, var(--separator) 92%, transparent)',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <div style={{ padding: cardPadding }}>
                      {/* Badge + category */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginBottom: cardWidth < 140 ? '8px' : '10px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            minHeight: '20px',
                            padding: '0 8px',
                            borderRadius: '999px',
                            fontSize: badgeFontSize,
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
                              minHeight: '20px',
                              padding: '0 8px',
                              borderRadius: '999px',
                              fontSize: badgeFontSize,
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
                        {group.pendingCount > 0 && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minHeight: '20px',
                              padding: '0 8px',
                              borderRadius: '999px',
                              fontSize: badgeFontSize,
                              fontWeight: 500,
                              lineHeight: '18px',
                              color: '#fff',
                              backgroundColor: 'var(--orange)',
                              gap: '3px',
                            }}
                          >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            {group.pendingCount}
                          </span>
                        )}
                      </div>

                      {/* Title and author */}
                      <div
                        style={{
                          display: 'grid',
                          gap: '2px',
                          marginBottom: cardWidth < 140 ? '8px' : '12px',
                        }}
                      >
                        <div
                          className="lifeline-book-title"
                          style={{
                            fontSize: titleSize,
                            fontWeight: 500,
                            color: 'var(--text-primary)',
                            lineHeight: 1.4,
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          《{group.bookTitle}》
                        </div>
                        <div
                          className="lifeline-book-author"
                          style={{
                            fontSize: authorSize,
                            fontWeight: 400,
                            color: 'var(--text-quaternary)',
                            lineHeight: 1.4,
                            margin: 0,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {bookMeta?.author || group.bookAuthor || ''}
                        </div>
                      </div>

                      {/* Core question — primary content */}
                      {bookMeta?.coreQuestion && (
                        <div
                          style={{
                            padding: `${cardWidth < 140 ? '8px' : '10px'} 0`,
                            borderTop: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
                            borderBottom: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
                            marginBottom: cardWidth < 140 ? '6px' : '8px',
                          }}
                        >
                          <p
                            style={{
                              fontSize: coreQuestionSize,
                              fontWeight: 500,
                              color: 'var(--text-secondary)',
                              lineHeight: 1.5,
                              margin: 0,
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                            }}
                          >
                            {bookMeta.coreQuestion}
                          </p>
                        </div>
                      )}

                      {/* Key ideas — if card is large enough */}
                      {bookMeta?.keyIdeas && bookMeta.keyIdeas.length > 0 && cardWidth >= 160 && (
                        <div
                          style={{
                            padding: '8px 0',
                            borderBottom: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
                          }}
                        >
                          {bookMeta.keyIdeas.slice(0, 2).map((idea, idx) => (
                            <p
                              key={idx}
                              style={{
                                fontSize: '12px',
                                fontWeight: 400,
                                color: 'var(--text-tertiary)',
                                lineHeight: 1.5,
                                margin: 0,
                                marginBottom: idx === 0 ? '4px' : 0,
                                display: '-webkit-box',
                                WebkitLineClamp: 1,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                              }}
                            >
                              · {idea}
                            </p>
                          ))}
                        </div>
                      )}

                      {/* Stats — single line, de-emphasized */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginTop: '6px',
                          paddingTop: bookMeta?.coreQuestion ? '0' : '8px',
                        }}
                      >
                        <span style={{
                          fontSize: metricLabelSize,
                          fontWeight: 400,
                          color: 'var(--text-quinary)',
                          lineHeight: '16px',
                        }}>
                          {nodeCount > 0 ? `${nodeCount} 节点` : `${group.tracesCount} 痕迹`}
                          {relationCount > 0 && ` · ${relationCount} 回响`}
                        </span>
                      </div>

                      {/* Tags */}
                      {bookTags.length > 0 && (
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '8px',
                            paddingTop: '8px',
                            borderTop: '1px solid color-mix(in srgb, var(--separator) 76%, transparent)',
                          }}
                        >
                          {bookTags.slice(0, cardWidth < 160 ? 3 : 5).map(tag => (
                            <span
                              key={tag}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                minHeight: '18px',
                                padding: '0 6px',
                                borderRadius: '999px',
                                fontSize: '10px',
                                fontWeight: 500,
                                lineHeight: '16px',
                                color: 'var(--text-quaternary)',
                                backgroundColor: 'var(--fill-tertiary)',
                                border: '1px solid color-mix(in srgb, var(--separator) 84%, transparent)',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                maxWidth: '100%',
                              }}
                            >
                              {tag}
                            </span>
                          ))}
                          {bookTags.length > (cardWidth < 160 ? 3 : 5) && (
                            <span
                              style={{
                                fontSize: '10px',
                                fontWeight: 500,
                                color: 'var(--text-quinary)',
                              }}
                            >
                              +{bookTags.length - (cardWidth < 160 ? 3 : 5)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div
                style={{
                  textAlign: 'center',
                  padding: '40px 20px',
                  color: 'var(--text-quaternary)',
                  fontSize: '14px',
                  width: '100%',
                }}
              >
                {searchQuery.trim() ? '没有找到匹配的书籍' : '还没有书脉，记录第一条感受开始建立你的阅读书脉'}
              </div>
            )}
          </div>

          {/* Load more */}
          {filteredBookGroups.length > visibleCount && (
            <button
              onClick={() => setVisibleCount(prev => prev + 40)}
              style={{
                width: '100%',
                padding: '12px',
                marginTop: '12px',
                backgroundColor: 'var(--fill-primary)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--separator)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              显示更多（还有 {filteredBookGroups.length - visibleCount} 本）
            </button>
          )}
        </div>

        {/* 5. 书脉洞察 */}
        <div
          style={{
            background: 'var(--fill-context)',
            border: '1px solid var(--separator)',
            borderRadius: '12px',
            padding: '16px 20px',
            marginBottom: '16px',
            marginTop: '8px',
            opacity: 0,
            animation: 'fadeUp 0.5s ease both 0.45s',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-quaternary)',
              marginBottom: '10px',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--blue)' }}>
              <path d="M8 1L9.79 5.59L14.5 5.88L10.83 8.99L11.93 13.56L8 11.1L4.07 13.56L5.17 8.99L1.5 5.88L6.21 5.59L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
            书脉洞察
          </div>
          <div
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              lineHeight: 1.65,
              letterSpacing: '-0.01em',
            }}
          >
            {getInsightText()}
          </div>
        </div>

        {/* 6. 封面搜索面板 */}
        <div
          style={{
            background: 'var(--fill-primary)',
            border: '1px solid var(--separator)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '16px',
            opacity: 0,
            animation: 'fadeUp 0.4s ease both 0.5s',
          }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                  封面搜索
                </span>
                <div style={{ display: 'flex', background: 'var(--fill-tertiary)', borderRadius: '6px', padding: '2px', fontSize: '10px' }}>
                  <button
                    type="button"
                    onClick={() => !rescanning && setRescanMode('missing')}
                    disabled={rescanning}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: rescanMode === 'missing' ? 'var(--blue)' : 'transparent',
                      color: rescanMode === 'missing' ? '#fff' : 'var(--text-tertiary)',
                      cursor: rescanning ? 'not-allowed' : 'pointer',
                      fontSize: '10px',
                      fontWeight: 500,
                      fontFamily: 'inherit',
                    }}
                  >
                    仅缺失
                  </button>
                  <button
                    type="button"
                    onClick={() => !rescanning && setRescanMode('all')}
                    disabled={rescanning}
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      border: 'none',
                      background: rescanMode === 'all' ? 'var(--blue)' : 'transparent',
                      color: rescanMode === 'all' ? '#fff' : 'var(--text-tertiary)',
                      cursor: rescanning ? 'not-allowed' : 'pointer',
                      fontSize: '10px',
                      fontWeight: 500,
                      fontFamily: 'inherit',
                    }}
                  >
                    全部重搜
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>
                  {rescanProgress.total > 0 ? `${rescanProgress.current} / ${rescanProgress.total} · 成功 ${rescanProgress.success} · 失败 ${rescanProgress.failed}` : `${rescanMode === 'missing' ? `共 ${Object.values(bookLibrary).filter(b => !b.coverUrl).length} 本待补` : `共 ${Object.values(bookLibrary).length} 本待搜`}`}
                </span>
                {rescanning ? (
                  <button
                    type="button"
                    onClick={handleCancelRescan}
                    style={{
                      padding: '2px 10px',
                      fontSize: '11px',
                      color: 'var(--red, #ff3b30)',
                      background: 'transparent',
                      border: '1px solid color-mix(in srgb, var(--red, #ff3b30) 30%, transparent)',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    取消
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleRescanAllCovers}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--blue)',
                      background: 'transparent',
                      border: '1px solid color-mix(in srgb, var(--blue) 30%, transparent)',
                      borderRadius: '999px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12a9 9 0 1 1-3-6.7" />
                      <polyline points="21 3 21 9 15 9" />
                    </svg>
                    开始搜索
                  </button>
                )}
              </div>
            </div>
            <div style={{ width: '100%', height: '4px', background: 'var(--fill-tertiary)', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
              <div
                style={{
                  height: '100%',
                  width: `${rescanProgress.total > 0 ? (rescanProgress.current / rescanProgress.total) * 100 : 0}%`,
                  background: 'var(--blue)',
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            {rescanning && rescanProgress.speed > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-quaternary)', marginBottom: '8px' }}>
                <span>速度：{rescanProgress.speed} 本/秒 · 并发 {CONCURRENCY}</span>
                {rescanProgress.eta && <span>预计剩余：{rescanProgress.eta}</span>}
              </div>
            )}
            {rescanProgress.results.length > 0 && (
              <div style={{ maxHeight: '120px', overflowY: 'auto', fontSize: '11px', lineHeight: '1.8' }}>
                {rescanProgress.results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', color: r.hasCover ? 'var(--text-tertiary)' : 'var(--text-quinary)' }}>
                    <span style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '70%',
                    }}>
                      {r.title}
                    </span>
                    <span>
                      {r.hasCover ? `✓ ${r.coverCount}个封面` : '✗ 未找到'}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {!rescanning && rescanProgress.total === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-quaternary)', marginTop: '4px' }}>
                {rescanMode === 'missing'
                  ? `仅搜索暂无封面的书籍，快速补齐。`
                  : `重新搜索全部书籍的封面，可能需要较长时间。`}
              </div>
            )}
        </div>

        {/* 7. Bottom Action */}
        <p
          style={{
            textAlign: 'center',
            fontSize: '11px',
            color: 'var(--text-quinary)',
            marginTop: '24px',
            lineHeight: '1.6',
            opacity: 0,
            animation: 'fadeUp 0.5s ease both 0.50s',
          }}
        >
          书籍概要由 AI 生成，仅供参考
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '16px 16px 24px',
            opacity: 0,
            animation: 'fadeUp 0.5s ease both 0.55s',
          }}
        >
          <button
            onClick={handleNewInput}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--blue)',
              color: '#fff',
              border: 'none',
              padding: '12px 28px',
              borderRadius: '24px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '-0.01em',
              WebkitTapHighlightColor: 'transparent',
              transition: 'opacity 0.15s ease',
              fontFamily: 'inherit',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3.5V12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              <path d="M3.5 8H12.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            记录新的感受
          </button>
        </div>
      </div>
    </>
  );
}
