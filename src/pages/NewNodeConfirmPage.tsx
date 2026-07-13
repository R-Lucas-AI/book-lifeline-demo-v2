import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { mockOldTraces } from '../data/mockData';

export default function NewNodeConfirmPage() {
  const { currentNode, addBooklifelineInput, addFirstEncounterBook, booklifelineInputs, firstEncounterBooks, isDemoDataInjected } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentNode) {
      addBooklifelineInput(currentNode);

      if (currentNode.bookTitle) {
        const staticTraces = isDemoDataInjected ? mockOldTraces : [];
        const bookExistsInTraces = staticTraces.some(t => t.bookTitle === currentNode.bookTitle);
        const bookExistsInEncounters = firstEncounterBooks.some(b => b.bookTitle === currentNode.bookTitle);
        const bookExistsInInputs = booklifelineInputs.some(n => n.id !== currentNode.id && n.bookTitle === currentNode.bookTitle);
        if (!bookExistsInTraces && !bookExistsInEncounters && !bookExistsInInputs) {
          addFirstEncounterBook({
            bookTitle: currentNode.bookTitle,
            bookAuthor: currentNode.bookAuthor,
            bookTranslator: currentNode.bookTranslator,
            readingNodeId: currentNode.id,
            createdAt: currentNode.createdAt,
          });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNode, isDemoDataInjected]);

  if (!currentNode) {
    return (
      <div style={{ padding: '24px' }}>
        <p style={{ color: 'var(--text-tertiary)' }}>没有可查看的内容</p>
        <button onClick={() => navigate('/')} style={{ marginTop: '12px', color: 'var(--blue)' }}>
          去输入
        </button>
      </div>
    );
  }

  const isReadingRelated = !!currentNode.bookTitle;
  const typeBadge = isReadingRelated ? '读后感' : '生活感悟';

  return (
    <div style={{ maxWidth: '640px', margin: '0 auto', padding: '0 20px 96px' }}>
      {/* 1. Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', padding: '16px 0 14px', animation: 'fadeUp 0.32s ease both 0s' }}>
        <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={() => navigate('/confirm-node')} aria-label="返回" style={{ display: 'flex', alignItems: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="11 4 6 9 11 14"/>
            </svg>
          </button>
        </div>
      </div>

      {/* 2. Locator */}
      <div style={{ textAlign: 'center', padding: '28px 0 32px', animation: 'fadeUp 0.32s ease both 0.08s' }}>
        <p style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-secondary)', lineHeight: '1.5' }}>
          你在这里留下了新的痕迹
        </p>
      </div>

      {/* 3. Card */}
      <div style={{
        background: 'var(--fill-primary)',
        border: '1px solid var(--separator)',
        borderRadius: 'var(--radius)',
        padding: '20px',
        animation: 'fadeUp 0.36s ease both 0.20s',
      }}>
        <div style={{ fontSize: '15px', color: 'var(--text-secondary)', lineHeight: '1.65' }}>
          {currentNode.rawText}
        </div>
        <div style={{ height: '1px', background: 'var(--separator)', margin: '16px 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-quaternary)' }}>
            {isReadingRelated && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, color: 'var(--text-quaternary)' }}>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z"/>
              </svg>
            )}
            <span>
              {isReadingRelated
                ? `《${currentNode.bookTitle}》${currentNode.bookAuthor ? '· ' + currentNode.bookAuthor : ''}`
                : '生活感悟'
              }
            </span>
          </div>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: '980px', fontSize: '11px', fontWeight: 500, color: 'var(--blue)', background: '#E8F2FF' }}>
            {typeBadge}
          </span>
        </div>
      </div>

      {/* 4. Reflection */}
      <div style={{ textAlign: 'center', marginTop: '28px', marginBottom: '36px', animation: 'fadeUp 0.36s ease both 0.36s' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-quaternary)', lineHeight: '1.65' }}>
          这是一条全新的痕迹。未来某天，它可能成为其他感悟的旧回声。
        </p>
      </div>

      {/* 5. Actions */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', animation: 'fadeUp 0.36s ease both 0.52s' }}>
        <button
          onClick={() => navigate('/lifeline')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px 24px',
            borderRadius: '980px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'inherit',
            cursor: 'pointer',
            border: 'none',
            background: 'var(--blue)',
            color: '#FFFFFF',
          }}
        >
          进入书脉
        </button>
        <button
          onClick={() => navigate('/')}
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
            background: 'var(--fill-secondary)',
            color: 'var(--text-secondary)',
          }}
        >
          继续记录
        </button>
      </div>
    </div>
  );
}
