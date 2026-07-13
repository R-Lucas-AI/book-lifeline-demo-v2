import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { mockOldTraces } from '../data/mockData';
import type { OldTrace, RelationType } from '../types';
import { renderTextWithBookHighlight } from '../utils/BookHighlight';

const relationTypeLabel: Record<RelationType, string> = {
  echo: '回响',
  contrast: '对照',
  source: '溯源',
  example: '例证',
  question: '追问',
  correction: '修正',
  encounter: '邂逅',
};

const relationToColorKey: Record<RelationType, string> = {
  source: 'purple',
  contrast: 'orange',
  echo: 'green',
  example: 'blue',
  question: 'green',
  correction: 'orange',
  encounter: 'blue',
};

const dotStyles: Record<string, { bg: string; shadow: string }> = {
  blue: { bg: 'var(--blue)', shadow: '0 0 0 3px rgba(0,122,255,0.15)' },
  purple: { bg: 'var(--purple)', shadow: '0 0 0 3px rgba(175,82,222,0.15)' },
  orange: { bg: 'var(--orange)', shadow: '0 0 0 3px rgba(255,149,0,0.15)' },
  green: { bg: 'var(--green)', shadow: '0 0 0 3px rgba(52,199,89,0.15)' },
};

const badgeStyles: Record<string, { bg: string; color: string }> = {
  blue: { bg: 'rgba(0,122,255,0.08)', color: 'var(--blue)' },
  purple: { bg: 'rgba(175,82,222,0.08)', color: 'var(--purple)' },
  orange: { bg: 'rgba(255,149,0,0.08)', color: 'var(--orange)' },
  green: { bg: 'rgba(52,199,89,0.08)', color: 'var(--green)' },
};

function formatDate(dateStr: string): string {
  return dateStr.replace(/-/g, '.');
}

function getSourceLabel(trace: OldTrace): string {
  if (trace.source === 'wechat_reading') {
    return trace.sourceType === 'bookmark' ? '微信读书划线' : '微信读书想法';
  }
  if (trace.source === 'notion') return 'Notion 日记';
  return '书脉输入';
}

function getTraceSourceLine(trace: OldTrace): string {
  const title = trace.bookTitle ? `《${trace.bookTitle}》` : '';
  if (trace.sourceType === 'bookmark') return `你在${title}中划线标记过`;
  if (trace.sourceType === 'thought') return `你在${title}中写过`;
  if (trace.sourceType === 'diary') return `你在阅读${title}时的日记中写过`;
  return `你在书脉中记录过`;
}

export default function LifelineReviewPage() {
  const { currentNode, confirmedRelations, addBooklifelineInput, booklifelineInputs, injectDemoData, isDemoDataInjected } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentNode) {
      addBooklifelineInput(currentNode);
    }
  }, [currentNode, addBooklifelineInput]);

  if (!currentNode) {
    return (
      <div style={{ padding: '24px', paddingBottom: '72px' }}>
        <p style={{ color: 'var(--text-tertiary)' }}>没有可查看的内容</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '12px', color: 'var(--blue)' }}>
          去输入
        </button>
      </div>
    );
  }

  const getTrace = (traceId: string) => isDemoDataInjected ? mockOldTraces.find(t => t.id === traceId) : undefined;
  const currentNodeRelations = confirmedRelations.filter(r => r.readingNodeId === currentNode.id);

  // 判断是否是种子节点（用户只有1条书脉输入，且没有旧痕迹关系）
  const totalInputs = booklifelineInputs.length;
  const isSeedNode = totalInputs <= 1 && currentNodeRelations.length === 0;

  // Build timeline items: first is "此刻" (current node), rest are confirmed relations
  const relationItems = currentNodeRelations
    .map(r => {
      const trace = getTrace(r.oldTraceId);
      if (!trace) return null;
      return { relation: r, trace };
    })
    .filter(Boolean) as { relation: typeof currentNodeRelations[0]; trace: OldTrace }[];

  // 第一次连接的特殊体验（第2条输入，有1条关系）— 待实现
  // const isFirstConnection = totalInputs === 2 && currentNodeRelations.length >= 1;

  // Context strip excerpt: first sentence or first 50 chars
  const thoughtExcerpt = currentNode.rawText.split(/[。！？\n]/)[0].substring(0, 50) || currentNode.rawText.substring(0, 50);
  const contextSource = currentNode.bookTitle
    ? `《${currentNode.bookTitle}》${currentNode.bookAuthor ? '· ' + currentNode.bookAuthor : ''}`
    : '生活感悟';

  // Insight text
  const earliestDate = relationItems.length > 0
    ? relationItems.map(i => i.trace.createdAt).sort()[0]
    : '';
  const insightText = relationItems.length >= 2
    ? `从${formatDate(earliestDate)}到今天，你在不同的场景中反复触碰着同一个深层认知。今天，这些分散的痕迹被连在了一起，成为你书脉的一部分。`
    : relationItems.length === 1
      ? `你在更早的时候已经触碰过类似的认知。今天，这条分散的痕迹被连在了一起，成为你书脉的一部分。`
      : '这条感悟已经保存为你的书脉节点。随着你记录更多感受，它会逐渐与其他内容建立连接。';

  // Staggered animation delays for timeline items
  const itemDelays = [0.16, 0.30, 0.44, 0.58, 0.72, 0.86];

  // ===== 种子节点：第一条痕迹的特殊展示 =====
  if (isSeedNode) {
    return (
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 24px 72px', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {/* Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
          <button onClick={() => navigate('/')} aria-label="关闭" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', color: 'var(--text-tertiary)', borderRadius: '6px', border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* 中心仪式感 */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
          <div style={{ animation: 'fadeUp 0.6s ease both' }}>
            <div style={{
              width: '80px', height: '80px',
              margin: '0 auto 28px',
              borderRadius: '50%',
              background: 'radial-gradient(circle at 30% 30%, rgba(0,122,255,0.25), rgba(0,122,255,0.06))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '40px',
              boxShadow: '0 0 60px rgba(0,122,255,0.2)',
              animation: 'float-gentle 4s ease-in-out infinite',
            }}>
              🌱
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-quaternary)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '16px', fontWeight: 500 }}>
              书脉初成
            </p>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 12px', letterSpacing: '-0.4px' }}>
              你的第一颗种子
            </h1>
            <p style={{ fontSize: '14px', color: 'var(--text-tertiary)', lineHeight: '1.7', margin: '0 auto 32px', maxWidth: '280px' }}>
              它孤零零地站在这里，等待着与未来的你相遇。<br/>每多记录一条感受，就多一条连接。
            </p>
          </div>

          {/* 单颗种子节点 */}
          <div style={{
            width: '100%',
            background: '#fff',
            borderRadius: '18px',
            padding: '20px',
            marginBottom: '24px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            border: '0.5px solid rgba(0,0,0,0.04)',
            animation: 'fadeUp 0.6s ease both 0.15s',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: 'var(--blue)',
                boxShadow: '0 0 0 4px rgba(0,122,255,0.15)',
              }} />
              <span style={{ fontSize: '12px', color: 'var(--blue)', fontWeight: 600 }}>
                种子节点
              </span>
            </div>
            {currentNode.bookTitle && (
              <p style={{ fontSize: '13px', color: 'var(--blue)', fontWeight: 500, marginBottom: '8px' }}>
                《{currentNode.bookTitle}》
              </p>
            )}
            <p style={{ fontSize: '15px', color: 'var(--text-primary)', lineHeight: '1.65', margin: 0 }}>
              {thoughtExcerpt}
            </p>
          </div>

          {/* 生长提示 */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '32px',
            animation: 'fadeUp 0.6s ease both 0.25s',
          }}>
            <div style={{ width: '24px', height: '1px', background: 'var(--separator-light)' }} />
            <span style={{ fontSize: '12px', color: 'var(--text-quinary)' }}>
              再记 1 条，长出第一条连接
            </span>
            <div style={{ width: '24px', height: '1px', background: 'var(--separator-light)' }} />
          </div>

          {/* 标签 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', justifyContent: 'center', marginBottom: '36px', animation: 'fadeUp 0.6s ease both 0.3s' }}>
            {currentNode.tags?.slice(0, 3).map((tag, i) => (
              <span key={i} style={{
                fontSize: '12px',
                padding: '4px 12px',
                borderRadius: '12px',
                background: 'rgba(0,122,255,0.08)',
                color: 'var(--blue)',
                fontWeight: 500,
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* 按钮 */}
          <div style={{ width: '100%', animation: 'fadeUp 0.6s ease both 0.4s' }}>
            <button
              onClick={() => navigate('/')}
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
                boxShadow: '0 4px 16px rgba(0,122,255,0.35)',
                marginBottom: '12px',
              }}
            >
              再记一条感受
            </button>
            <button
              onClick={() => navigate('/lifeline')}
              style={{
                width: '100%',
                height: '48px',
                background: 'transparent',
                color: 'var(--text-tertiary)',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'inherit',
                border: 'none',
                borderRadius: '24px',
                cursor: 'pointer',
              }}
            >
              看看现在的书脉
            </button>

            {/* 演示数据引导 */}
            {!isDemoDataInjected && (
              <div style={{
                marginTop: '28px',
                padding: '16px',
                background: 'var(--bg-secondary)',
                borderRadius: '14px',
                border: '0.5px solid var(--border-tertiary)',
                animation: 'fadeUp 0.6s ease both 0.5s',
              }}>
                <p style={{
                  fontSize: '12px',
                  color: 'var(--text-quaternary)',
                  lineHeight: 1.5,
                  margin: '0 0 10px',
                  textAlign: 'center',
                }}>
                  想看看有数据时的书脉是什么样？
                </p>
                <button
                  onClick={() => {
                    injectDemoData();
                  }}
                  style={{
                    width: '100%',
                    height: '36px',
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    borderRadius: '10px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  一键注入演示数据 →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 24px 72px' }}>
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
        <button onClick={() => navigate(-1)} aria-label="返回" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', color: 'var(--blue)', borderRadius: '6px' }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15L7.5 10L12.5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div />
      </div>

      {/* 2. Locator */}
      <div style={{ textAlign: 'center', padding: '32px 0 36px', animation: 'fadeUp 0.5s ease 0.04s both' }}>
        <p style={{ fontSize: '13px', color: 'var(--text-quinary)', letterSpacing: '0.02em' }}>
          你的书脉在这一刻延伸
        </p>
      </div>

      {/* 3. Context strip */}
      <div style={{
        background: 'var(--fill-context)',
        border: '1px solid var(--separator)',
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        marginBottom: '28px',
        animation: 'fadeUp 0.5s ease 0.08s both',
      }}>
        <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-quaternary)', marginBottom: '8px' }}>
          你刚刚记录的
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '4px' }}>
          {thoughtExcerpt}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--text-quinary)' }}>
          {contextSource}
        </p>
      </div>

      {/* 4. Lifeline timeline */}
      <div style={{ position: 'relative', paddingLeft: '24px', marginBottom: '32px' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute',
          left: '8px',
          top: 0,
          bottom: 0,
          width: '2px',
          background: 'var(--fill-tertiary)',
          borderRadius: '1px',
        }} />

        {/* Item 1: 此刻 (current node) */}
        <div style={{ position: 'relative', marginBottom: '24px', animation: `cardIn 0.4s ease both ${itemDelays[0]}s` }}>
          <div style={{
            position: 'absolute',
            left: '-20px',
            top: '20px',
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            zIndex: 2,
            background: dotStyles.blue.bg,
            boxShadow: dotStyles.blue.shadow,
          }} />
          <div style={{
            background: 'var(--fill-primary)',
            border: '1px solid var(--separator)',
            borderRadius: 'var(--radius)',
            padding: '20px',
          }}>
            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', marginBottom: '8px', ...badgeStyles.blue }}>
              此刻
            </span>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.55' }}>
              {currentNode.bookTitle
                ? `你在阅读《${currentNode.bookTitle}》后，写下了这个感悟。`
                : '你记录了这个感悟。'
              }
            </p>
          </div>
        </div>

        {/* Relation items */}
        {relationItems.map((item, index) => {
          const colorKey = relationToColorKey[item.relation.relationType];
          const dot = dotStyles[colorKey];
          const badge = badgeStyles[colorKey];
          const label = relationTypeLabel[item.relation.relationType];
          const delay = itemDelays[index + 1] || 0.86;
          const isLast = index === relationItems.length - 1;

          return (
            <div key={item.relation.id} style={{ position: 'relative', marginBottom: isLast ? 0 : '24px', animation: `cardIn 0.4s ease both ${delay}s` }}>
              <div style={{
                position: 'absolute',
                left: '-20px',
                top: '20px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                zIndex: 2,
                background: dot.bg,
                boxShadow: dot.shadow,
              }} />
              <div style={{
                background: 'var(--fill-primary)',
                border: '1px solid var(--separator)',
                borderRadius: 'var(--radius)',
                padding: '20px',
              }}>
                <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px', marginBottom: '8px', background: badge.bg, color: badge.color }}>
                  {label}
                </span>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.55', marginBottom: '14px' }}>
                  {renderTextWithBookHighlight(item.relation.reason, (title) => navigate(`/book-detail/${encodeURIComponent(title)}`))}
                </p>
                <div style={{ height: '0.5px', background: 'var(--separator-light)', marginBottom: '14px' }} />
                <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginBottom: '6px' }}>
                  {getTraceSourceLine(item.trace)}
                </p>
                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic', lineHeight: '1.65', paddingLeft: '12px', borderLeft: '2px solid var(--fill-tertiary)', marginBottom: '8px' }}>
                  {renderTextWithBookHighlight(item.trace.content.length > 120 ? item.trace.content.substring(0, 120) + '...' : item.trace.content, (title) => navigate(`/book-detail/${encodeURIComponent(title)}`))}
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-quinary)' }}>
                  {formatDate(item.trace.createdAt)} · {getSourceLabel(item.trace)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. 书脉洞察 */}
      <div style={{
        background: 'var(--fill-context)',
        border: '1px solid var(--separator)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        marginBottom: '36px',
        animation: 'fadeUp 0.5s ease 0.72s both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-quaternary)', marginBottom: '10px' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, color: 'var(--blue)' }}>
            <path d="M8 1L9.79 5.59L14.5 5.88L10.83 8.99L11.93 13.56L8 11.1L4.07 13.56L5.17 8.99L1.5 5.88L6.21 5.59L8 1Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none"/>
          </svg>
          书脉洞察
        </div>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.65' }}>
          {insightText}
        </p>
      </div>

      {/* 6. Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', animation: 'fadeUp 0.5s ease 0.88s both' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            borderRadius: 'var(--radius-pill)',
            padding: '12px 28px',
            letterSpacing: '-0.01em',
            background: 'var(--blue)',
            color: '#FFFFFF',
            minWidth: '220px',
          }}
        >
          继续记录
        </button>
        <button
          onClick={() => navigate('/lifeline')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '15px',
            fontWeight: 500,
            border: 'none',
            cursor: 'pointer',
            borderRadius: 'var(--radius-pill)',
            padding: '12px 28px',
            letterSpacing: '-0.01em',
            background: 'var(--fill-secondary)',
            color: 'var(--text-secondary)',
            minWidth: '220px',
          }}
        >
          查看书脉
        </button>
      </div>
    </div>
  );
}
