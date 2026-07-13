import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { findOldTraces } from '../api';

export default function AIAnalyzingPage() {
  const { currentNode, setRelations, isDemoDataInjected, booklifelineInputs } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    if (!currentNode) {
      navigate('/');
      return;
    }

    const timer1 = setTimeout(() => { if (isMountedRef.current) setStep(2); }, 800);
    const timer2 = setTimeout(() => { if (isMountedRef.current) setStep(3); }, 1800);

    let navTimer: ReturnType<typeof setTimeout>;

    const runAnalysis = async () => {
      try {
        const extraTraces = booklifelineInputs
          .filter(n => n.id !== currentNode.id)
          .map(n => ({
            id: n.id,
            content: n.rawText,
            source: 'booklifeline' as const,
            sourceType: 'booklifeline_input' as const,
            bookTitle: n.bookTitle,
            bookAuthor: n.bookAuthor,
            createdAt: n.createdAt,
          }));
        const result = isDemoDataInjected
          ? await findOldTraces(currentNode, extraTraces)
          : await findOldTraces(currentNode, extraTraces);
        if (!isMountedRef.current) return;
        setRelations(result);
        navTimer = setTimeout(() => {
          if (!isMountedRef.current) return;
          navigate('/echo-recommend');
        }, 1500);
      } catch {
        if (!isMountedRef.current) return;
        navigate('/new-node-confirm');
      }
    };

    runAnalysis();

    return () => {
      isMountedRef.current = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(navTimer);
    };
  }, [currentNode, navigate, setRelations]);

  const handleBack = () => {
    navigate('/confirm-node');
  };

  // Derive step 1 result text from currentNode
  const step1Result = currentNode?.tags?.[0]
    ? `感受到你的关注点：${currentNode.tags[0]}`
    : currentNode?.bookTitle
      ? `正在分析《${currentNode.bookTitle}》的相关内容`
      : '正在理解你的感受';

  return (
    <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 24px 152px' }}>
      {/* 1. Toolbar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', marginBottom: '32px' }}>
        <div>
          <button onClick={handleBack} aria-label="返回" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12.5 15.5L7 10L12.5 4.5" stroke="#1D1D1F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        <div style={{ flexShrink: 0, width: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--blue)', animation: 'pulse-dot 2s ease-in-out infinite' }} />
        </div>
      </header>

      {/* 2. Input context */}
      <section style={{ marginBottom: '40px' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-quaternary)', marginBottom: '8px' }}>
          你的输入
        </div>
        <div style={{ background: 'var(--fill-secondary)', border: '1px solid var(--separator)', borderRadius: 'var(--radius)', padding: '16px' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            {currentNode?.rawText || ''}
          </p>
        </div>
      </section>

      {/* 3. Steps */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '32px' }}>
        {/* Step 1 */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', animation: 'fade-in 0.5s ease-out both' }}>
          <div style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', ...(step >= 2 ? { background: 'var(--green)' } : step === 1 ? { background: 'transparent' } : { background: 'var(--fill-tertiary)' }) }}>
            {step >= 2 ? (
              <svg viewBox="0 0 10 10" fill="none" style={{ width: '10px', height: '10px' }}>
                <path d="M2 5.2L4 7.2L8 3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : step === 1 ? (
              <svg viewBox="0 0 20 20" fill="none" style={{ width: '20px', height: '20px', animation: 'spin 3s linear infinite' }}>
                <circle cx="10" cy="10" r="7" stroke="#007AFF" strokeWidth="1.5" strokeDasharray="30 14" strokeLinecap="round"/>
              </svg>
            ) : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <span style={{
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              ...(step >= 2
                ? { color: 'var(--text-primary)' }
                : step === 1
                  ? { color: 'var(--text-primary)', animation: 'pulse-text 2s ease-in-out infinite' }
                  : { color: 'var(--text-quaternary)' }
              )
            }}>
              理解这段感受
            </span>
            <span style={{
              fontSize: '13px',
              ...(step >= 3 ? { color: 'var(--text-quaternary)' } : { color: 'var(--text-quinary)' })
            }}>
              识别关键主题与知识语境
            </span>
            {step >= 2 && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '5px', marginTop: '6px', paddingLeft: '2px', animation: 'fade-in 0.6s ease-out 0.3s both' }}>
                <svg viewBox="0 0 10 10" fill="none" style={{ display: 'block', width: '10px', height: '10px', flexShrink: 0, marginTop: '2px' }}>
                  <path d="M5 0.5L6.1 3.5L9.5 5L6.1 6.5L5 9.5L3.9 6.5L0.5 5L3.9 3.5Z" fill="#007AFF"/>
                </svg>
                <span style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: '1.45' }}>
                  {step1Result}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Step 2 */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', animation: 'fade-in 0.5s ease-out 0.1s both', ...(step > 2 ? {} : step === 2 ? {} : { opacity: 0.5 }) }}>
          <div style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', ...(step > 2 ? { background: 'var(--green)' } : step === 2 ? { background: 'transparent' } : { background: 'var(--fill-tertiary)' }) }}>
            {step > 2 ? (
              <svg viewBox="0 0 10 10" fill="none" style={{ width: '10px', height: '10px' }}>
                <path d="M2 5.2L4 7.2L8 3" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : step === 2 ? (
              <svg viewBox="0 0 20 20" fill="none" style={{ width: '20px', height: '20px', animation: 'spin 3s linear infinite' }}>
                <circle cx="10" cy="10" r="7" stroke="#007AFF" strokeWidth="1.5" strokeDasharray="30 14" strokeLinecap="round"/>
              </svg>
            ) : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <span style={{
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              ...(step > 2
                ? { color: 'var(--text-primary)' }
                : step === 2
                  ? { color: 'var(--text-primary)', animation: 'pulse-text 2s ease-in-out infinite' }
                  : { color: 'var(--text-quaternary)' }
              )
            }}>
              整理节点
            </span>
            <span style={{
              fontSize: '13px',
              ...(step > 2 ? { color: 'var(--text-quaternary)' } : { color: 'var(--text-quinary)' })
            }}>
              提取书名、摘录与核心语义
            </span>
          </div>
        </div>

        {/* Step 3 */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', animation: 'fade-in 0.5s ease-out 0.2s both', ...(step < 3 ? { opacity: 0.5 } : {}) }}>
          <div style={{ flexShrink: 0, width: '20px', height: '20px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: '2px', ...(step >= 3 ? { background: 'transparent' } : { background: 'var(--fill-tertiary)' }) }}>
            {step >= 3 ? (
              <svg viewBox="0 0 20 20" fill="none" style={{ width: '20px', height: '20px', animation: 'spin 3s linear infinite' }}>
                <circle cx="10" cy="10" r="7" stroke="#007AFF" strokeWidth="1.5" strokeDasharray="30 14" strokeLinecap="round"/>
              </svg>
            ) : null}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
            <span style={{
              fontSize: '15px',
              fontWeight: 600,
              letterSpacing: '-0.01em',
              ...(step >= 3
                ? { color: 'var(--text-primary)', animation: 'pulse-text 2s ease-in-out infinite' }
                : { color: 'var(--text-quaternary)' }
              )
            }}>
              从你的读书摘要和日记中寻找旧痕迹
            </span>
            <span style={{
              fontSize: '13px',
              ...(step >= 3 ? { color: 'var(--text-quaternary)' } : { color: 'var(--text-quinary)' })
            }}>
              搜索相关的旧回声
            </span>
          </div>
        </div>
      </section>

      {/* 4. Time hint */}
      <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-quinary)', marginBottom: '36px' }}>
        正在向你的过去发送回声
      </div>

      {/* 5. Pool scan — echo ripple metaphor */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ position: 'relative', width: '20px', height: '20px', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '4px', height: '4px', marginTop: '-2px', marginLeft: '-2px', borderRadius: '50%', background: 'var(--blue)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', border: '1.5px solid var(--blue)', borderRadius: '50%', opacity: 0, animation: 'echo-pulse 2s ease-out infinite' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', border: '1.5px solid var(--blue)', borderRadius: '50%', opacity: 0, animation: 'echo-pulse 2s ease-out 0.6s infinite' }} />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>读书摘要</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{ position: 'relative', width: '20px', height: '20px', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: '50%', left: '50%', width: '4px', height: '4px', marginTop: '-2px', marginLeft: '-2px', borderRadius: '50%', background: 'var(--blue)' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', border: '1.5px solid var(--blue)', borderRadius: '50%', opacity: 0, animation: 'echo-pulse 2s ease-out 0.4s infinite' }} />
            <div style={{ position: 'absolute', top: 0, left: 0, width: '20px', height: '20px', border: '1.5px solid var(--blue)', borderRadius: '50%', opacity: 0, animation: 'echo-pulse 2s ease-out 1s infinite' }} />
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>日记</span>
        </div>
      </div>
    </div>
  );
}
