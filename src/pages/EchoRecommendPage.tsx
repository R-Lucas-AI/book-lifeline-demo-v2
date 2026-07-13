import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getTraceById } from '../data/mockData';
import { EchoRelation } from '../types';
import { renderTextWithBookHighlight } from '../utils/BookHighlight';

const typeColors: Record<string, { color: string; bg: string; shadow: string }> = {
  source: { color: 'var(--purple)', bg: 'rgba(175,82,222,0.08)', shadow: 'rgba(175,82,222,0.15)' },
  contrast: { color: 'var(--orange)', bg: 'rgba(255,149,0,0.08)', shadow: 'rgba(255,149,0,0.15)' },
  echo: { color: 'var(--green)', bg: 'rgba(52,199,89,0.08)', shadow: 'rgba(52,199,89,0.15)' },
  example: { color: 'var(--blue)', bg: 'rgba(0,122,255,0.08)', shadow: 'rgba(0,122,255,0.15)' },
  question: { color: 'var(--orange)', bg: 'rgba(255,149,0,0.08)', shadow: 'rgba(255,149,0,0.15)' },
  correction: { color: '#FF3B30', bg: 'rgba(255,59,48,0.08)', shadow: 'rgba(255,59,48,0.15)' },
  encounter: { color: 'var(--blue)', bg: 'rgba(0,122,255,0.08)', shadow: 'rgba(0,122,255,0.15)' },
};

const typeLabels: Record<string, string> = {
  source: '溯源',
  contrast: '对照',
  echo: '回响',
  example: '例证',
  question: '追问',
  correction: '校正',
  encounter: '邂逅',
};

const cardInDelays = ['0.1s', '0.25s', '0.4s'];

export default function EchoRecommendPage() {
  const { currentNode, relations, addConfirmedRelation, addBooklifelineInput, isDemoDataInjected, booklifelineInputs } = useApp();
  const navigate = useNavigate();
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const hasNavigatedRef = useRef(false);

  if (!currentNode) return null;

  const isFirstTrace = relations.length === 0;
  const getTrace = (traceId: string) => {
    if (!isDemoDataInjected) return undefined;
    const trace = getTraceById(traceId);
    if (trace) return trace;
    const input = booklifelineInputs.find(n => n.id === traceId);
    if (input) {
      return {
        id: input.id,
        content: input.rawText,
        originalText: input.rawText,
        chapter: input.createdAt?.substring(0, 10) || '',
        source: 'booklifeline',
        sourceType: 'booklifeline_input',
        bookTitle: input.bookTitle,
        bookAuthor: input.bookAuthor,
        createdAt: input.createdAt || new Date().toISOString(),
      };
    }
    return undefined;
  };
  const visibleRelations = relations.filter(r => !dismissedIds.has(r.id));

  const handleConfirm = (relation: EchoRelation) => {
    setConfirmedIds(prev => new Set([...prev, relation.id]));
    addConfirmedRelation(relation);
  };

  const handleDismiss = (relation: EchoRelation) => {
    setDismissedIds(prev => new Set([...prev, relation.id]));
  };

  const handleConfirmAll = () => {
    if (hasNavigatedRef.current) return;
    hasNavigatedRef.current = true;
    visibleRelations.forEach(r => {
      if (!confirmedIds.has(r.id)) {
        addConfirmedRelation(r);
      }
    });
    addBooklifelineInput(currentNode);
    navigate('/lifeline-review');
  };

  const handleSkip = () => {
    addBooklifelineInput(currentNode);
    navigate('/new-node-confirm');
  };

  // 第一条痕迹的特殊体验 —— 种子节点
  if (isFirstTrace) {
    return (
      <div style={{
        maxWidth: '640px',
        margin: '0 auto',
        padding: '0 24px 72px',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
      }}>
        {/* 仪式感的种子节点展示 */}
        <div style={{ textAlign: 'center', marginBottom: '40px', animation: 'fadeUp 0.6s ease both' }}>
          <div style={{
            width: '64px', height: '64px',
            margin: '0 auto 24px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(0,122,255,0.2), rgba(0,122,255,0.05))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px',
            boxShadow: '0 0 40px rgba(0,122,255,0.15)',
          }}>
            🌱
          </div>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-quaternary)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginBottom: '12px',
            fontWeight: 500,
          }}>
            第一条痕迹
          </p>
          <h1 style={{
            fontSize: '22px',
            fontWeight: 700,
            color: 'var(--text-primary)',
            margin: '0 0 8px',
            letterSpacing: '-0.3px',
          }}>
            你的第一颗种子落下了
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'var(--text-tertiary)',
            lineHeight: '1.6',
            margin: '0 auto',
            maxWidth: '280px',
          }}>
            它会成为你所有连接的起点。下一次记录时，你会看到它如何与新的感受相遇。
          </p>
        </div>

        {/* 刚才写下的内容 */}
        <div style={{
          background: '#fff',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '28px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
          border: '0.5px solid rgba(0,0,0,0.04)',
          animation: 'fadeUp 0.6s ease both 0.1s',
        }}>
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--text-quaternary)',
            letterSpacing: '0.06em',
            marginBottom: '10px',
          }}>
            你刚才写下的
          </div>
          {currentNode.bookTitle && (
            <div style={{
              fontSize: '13px',
              color: 'var(--blue)',
              fontWeight: 500,
              marginBottom: '8px',
            }}>
              《{currentNode.bookTitle}》
            </div>
          )}
          <p style={{
            fontSize: '15px',
            color: 'var(--text-primary)',
            lineHeight: '1.65',
            margin: 0,
          }}>
            {currentNode.rawText}
          </p>
        </div>

        {/* 核心洞察 */}
        <div style={{
          background: 'var(--fill-context)',
          borderRadius: '14px',
          padding: '16px',
          marginBottom: '32px',
          animation: 'fadeUp 0.6s ease both 0.2s',
        }}>
          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            lineHeight: '1.6',
            margin: 0,
          }}>
            {currentNode.tags?.[0] || '每一条感受都是一颗种子。当你记录更多，它们会彼此连接，长出属于你的书脉。'}
          </p>
        </div>

        {/* 种子标签 */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          marginBottom: '32px',
          justifyContent: 'center',
          animation: 'fadeUp 0.6s ease both 0.3s',
        }}>
          {currentNode.tags?.slice(0, 3).map((tag, i) => (
            <span key={i} style={{
              fontSize: '12px',
              padding: '4px 10px',
              borderRadius: '12px',
              background: 'rgba(0,122,255,0.08)',
              color: 'var(--blue)',
              fontWeight: 500,
            }}>
              {tag}
            </span>
          ))}
        </div>

        {/* 下一步提示 */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          animation: 'fadeUp 0.6s ease both 0.35s',
        }}>
          <p style={{
            fontSize: '12px',
            color: 'var(--text-quinary)',
            margin: 0,
          }}>
            再记 1 条，看看它们如何连接
          </p>
        </div>

        {/* 主按钮：继续记录 */}
        <button
          onClick={() => {
            if (hasNavigatedRef.current) return;
            hasNavigatedRef.current = true;
            addBooklifelineInput(currentNode);
            navigate('/');
          }}
          style={{
            width: '100%',
            height: '52px',
            background: 'var(--blue)',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 600,
            fontFamily: 'inherit',
            border: 'none',
            borderRadius: '26px',
            cursor: 'pointer',
            transition: 'all 0.3s ease',
            boxShadow: '0 4px 16px rgba(0,122,255,0.35)',
            animation: 'fadeUp 0.6s ease both 0.4s',
          }}
        >
          再记一条感受
        </button>

        {/* 次级引导：去来源页看看 */}
        <button
          onClick={() => {
            if (hasNavigatedRef.current) return;
            hasNavigatedRef.current = true;
            addBooklifelineInput(currentNode);
            navigate('/sources');
          }}
          style={{
            width: '100%',
            height: '40px',
            marginTop: '12px',
            background: 'none',
            color: 'var(--text-quaternary)',
            fontSize: '13px',
            fontWeight: 500,
            fontFamily: 'inherit',
            border: 'none',
            cursor: 'pointer',
            transition: 'color 0.2s ease',
            animation: 'fadeUp 0.6s ease both 0.5s',
          }}
        >
          去来源页看看它保存在哪里 →
        </button>
      </div>
    );
  }

  const getSourceLine = (relation: EchoRelation) => {
    const trace = getTrace(relation.oldTraceId);
    if (!trace) return '';
    const bookTitle = trace.bookTitle || '';
    if (trace.source === 'notion') {
      return `你在阅读《${bookTitle}》时的日记中写过`;
    }
    if (trace.sourceType === 'thought') {
      return `你在《${bookTitle}》中写过`;
    }
    return `你在《${bookTitle}》中划线标记过`;
  };

  const getTraceMeta = (relation: EchoRelation) => {
    const trace = getTrace(relation.oldTraceId);
    if (!trace) return '';
    const rawDate = (trace.createdAt || '').substring(0, 10);
    const datePart = rawDate.replace(/-/g, '.');
    let sourceLabel = '微信读书划线';
    if (trace.source === 'notion') {
      sourceLabel = 'Notion 日记';
    } else if (trace.sourceType === 'thought') {
      sourceLabel = '微信读书想法';
    }
    return `${datePart} · ${sourceLabel}`;
  };

  const getPatternText = () => {
    const tag = currentNode.tags?.[0] || '连接与系统';
    return `你在这 ${visibleRelations.length} 条旧痕迹中反复触碰的，是「${tag}」这个深层认知——你在不同时间点、不同书籍中回到的，其实是同一个问题。这就是你认知网络中正在生长的节点。`;
  };

  return (
    <div style={{
      maxWidth: '640px',
      margin: '0 auto',
      padding: '0 24px 72px',
    }}>
      {/* 1. Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 0',
        position: 'sticky',
        top: 0,
        background: 'var(--fill-secondary)',
        zIndex: 10,
      }}>
        <button
          onClick={() => navigate('/ai-analyzing')}
          aria-label="返回"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            color: 'var(--blue)',
            cursor: 'pointer',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            transition: 'background 0.15s ease',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-quinary)',
          fontWeight: 500,
        }}>
          3 / 4
        </div>
      </div>

      {/* 2. Context strip — "你刚才写下的" */}
      <div style={{
        background: 'var(--fill-context)',
        border: '1px solid var(--separator)',
        borderRadius: '12px',
        padding: '12px 16px',
        marginBottom: '28px',
      }}>
        <div style={{
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-quaternary)',
          marginBottom: '8px',
        }}>
          你刚才写下的
        </div>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '6px',
          marginBottom: '6px',
        }}>
          {currentNode.bookTitle && !currentNode.tags?.includes(`《${currentNode.bookTitle}》`) && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '12px',
              fontWeight: 500,
              padding: '3px 10px',
              borderRadius: '20px',
              whiteSpace: 'nowrap',
              background: 'rgba(0,122,255,0.08)',
              color: 'var(--blue)',
            }}>
              《{currentNode.bookTitle}》
            </span>
          )}
          {!currentNode.tags?.includes(currentNode.type) && (
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: '12px',
              fontWeight: 500,
              padding: '3px 10px',
              borderRadius: '20px',
              whiteSpace: 'nowrap',
              background: 'rgba(175,82,222,0.08)',
              color: 'var(--purple)',
            }}>
              {currentNode.type}
            </span>
          )}
        </div>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-tertiary)',
          lineHeight: '1.5',
        }}>
          {currentNode.rawText}
        </div>
      </div>

      {/* 3. Section header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{
          fontSize: '20px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          letterSpacing: '-0.02em',
          marginBottom: '4px',
        }}>
          你在旧痕迹中找到了 {visibleRelations.length} 条连接
        </div>
        <div style={{
          fontSize: '13px',
          color: 'var(--text-quinary)',
        }}>
          确认你认为有价值的
        </div>
      </div>

      {/* 4. Echo list — timeline with connection line */}
      <div style={{
        position: 'relative',
        paddingLeft: '24px',
        marginBottom: '32px',
      }}>
        {/* The vertical connection line */}
        <div style={{
          position: 'absolute',
          left: '8px',
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'var(--fill-tertiary)',
          borderRadius: '1px',
        }} />

        {visibleRelations.map((relation, index) => {
          const trace = getTrace(relation.oldTraceId);
          if (!trace) return null;
          const isConfirmed = confirmedIds.has(relation.id);
          const colors = typeColors[relation.relationType] || typeColors.echo;
          const relationLabel = typeLabels[relation.relationType] || '回响';
          const delay = cardInDelays[index] || '0.4s';

          return (
            <div
              key={relation.id}
              style={{
                position: 'relative',
                marginBottom: '24px',
                animation: `cardIn 0.4s ease both ${delay}`,
              }}
            >
              {/* Echo dot on the timeline */}
              <div style={{
                position: 'absolute',
                left: '-20px',
                top: '20px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                zIndex: 2,
                background: colors.color,
                boxShadow: `0 0 0 3px ${colors.shadow}`,
              }} />

              {/* Echo card */}
              <div style={{
                background: 'var(--fill-primary)',
                border: isConfirmed ? '1px solid var(--green)' : '1px solid var(--separator)',
                borderRadius: '12px',
                padding: '20px',
                transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
              }}>
                <span style={{
                  display: 'inline-block',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '4px',
                  marginBottom: '8px',
                  background: colors.bg,
                  color: colors.color,
                }}>
                  {relationLabel}
                </span>

                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  lineHeight: '1.55',
                  margin: '0 0 14px 0',
                }}>
                  {relation.reason}
                </p>

                <div style={{
                  height: '0.5px',
                  background: 'var(--separator-light)',
                  marginBottom: '14px',
                }} />

                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-tertiary)',
                  margin: '0 0 6px 0',
                }}>
                  {getSourceLine(relation)}
                </p>

                <p style={{
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  fontStyle: 'italic',
                  lineHeight: '1.65',
                  paddingLeft: '12px',
                  borderLeft: '2px solid var(--fill-tertiary)',
                  margin: '0 0 8px 0',
                }}>
                  &ldquo;{renderTextWithBookHighlight(trace.content || '', (title) => navigate(`/book-detail/${encodeURIComponent(title)}`))}&rdquo;
                </p>

                <p style={{
                  fontSize: '11px',
                  color: 'var(--text-quinary)',
                  margin: 0,
                }}>
                  {getTraceMeta(relation)}
                </p>

                {/* Card actions */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginTop: '14px',
                  paddingTop: '12px',
                  borderTop: '0.5px solid var(--separator-light)',
                }}>
                  <button
                    onClick={() => handleConfirm(relation)}
                    disabled={isConfirmed}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      fontSize: '13px',
                      fontWeight: 600,
                      padding: '6px 16px',
                      borderRadius: '20px',
                      border: 'none',
                      background: isConfirmed ? 'var(--green)' : 'var(--blue)',
                      color: '#FFFFFF',
                      cursor: isConfirmed ? 'default' : 'pointer',
                      fontFamily: 'inherit',
                      transition: 'opacity 0.15s ease',
                      opacity: isConfirmed ? 0.7 : 1,
                    }}
                  >
                    {isConfirmed ? '✓ 已确认' : '确认'}
                  </button>
                  <button
                    onClick={() => handleDismiss(relation)}
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-quinary)',
                      cursor: 'pointer',
                      transition: 'color 0.15s ease',
                      background: 'transparent',
                      border: 'none',
                      padding: 0,
                      fontFamily: 'inherit',
                    }}
                  >
                    跳过
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. AI Pattern Insight */}
      <div style={{
        background: 'var(--fill-context)',
        border: '1px solid var(--separator)',
        borderRadius: '12px',
        padding: '16px 20px',
        marginBottom: '36px',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '11px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--text-quaternary)',
          marginBottom: '10px',
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--blue)' }}>
            <path d="M8 1L9.79 5.59L14.5 5.88L10.83 8.99L11.93 13.56L8 11.1L4.07 13.56L5.17 8.99L1.5 5.88L6.21 5.59L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
          </svg>
          书脉洞察
        </div>
        <div style={{
          fontSize: '14px',
          color: 'var(--text-secondary)',
          lineHeight: '1.65',
        }}>
          {getPatternText()}
        </div>
      </div>

      {/* 6. Bottom confirm */}
      <div style={{ textAlign: 'center' }}>
        <button
          onClick={handleConfirmAll}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            fontSize: '15px',
            fontWeight: 600,
            padding: '14px 32px',
            borderRadius: '20px',
            border: 'none',
            background: 'var(--blue)',
            color: '#FFFFFF',
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '-0.01em',
            transition: 'opacity 0.15s ease',
            marginBottom: '12px',
          }}
        >
          确认关系，进入书脉
        </button>
        <button
          onClick={handleSkip}
          style={{
            display: 'block',
            margin: '8px auto 0',
            fontSize: '12px',
            color: 'var(--text-quinary)',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
            fontFamily: 'inherit',
            transition: 'color 0.15s ease',
          }}
        >
          没有找到相关的旧痕迹？跳过
        </button>
      </div>
    </div>
  );
}
