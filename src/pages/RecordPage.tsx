import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { analyzeInput } from '../api';
import { mockOldTraces, notionDiaryEntries } from '../data/mockData';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// 场景卡片 —— 零数据用户的"空展位"
const sceneCards = [
  { id: 'book', icon: '📚', label: '一本书', hint: '刚读完一本书，有感受想说' },
  { id: 'thought', icon: '💭', label: '一个想法', hint: '想到了一个问题，想记下来' },
  { id: 'quote', icon: '✍️', label: '一段话', hint: '看到了一段话，想记住它' },
  { id: 'moment', icon: '🌟', label: '一个瞬间', hint: '经历了一个瞬间，想留住它' },
];

const sceneExampleTexts: Record<string, string[]> = {
  book: [
    '读《世界简史》看到苏美尔那段，突然想到一个词——"苏美尔时刻"。真正的历史转折，不是出现了某个新东西，而是村落、城市、文字、神庙、法律、贸易这些部件忽然彼此连了起来，织成一张网，之后就再也退不回去了。这不就是书脉在做的事吗？',
    '《专注的真相》里有一句话："短时间内足量重复地向自己复述重要的道理，是真正改变自己的最有效方式"。之前总觉得重复是笨办法，现在才明白，注意力本身就是一种需要训练的肌肉，你重复什么，就会把什么刻进自己的认知里。',
    '读《乡土中国》，费孝通说在熟悉的社会里，有语言但不一定有文字，因为面对面就能说清楚。这句话让我想到，我们现在记录了这么多东西，到底是因为更丰富了，还是因为人和人之间反而没那么熟悉了？',
  ],
  thought: [
    '我们总说"建立连接"，但连接本身可能不是目的——连接是为了让新的东西从缝隙里长出来。就像书脉里，两条看似无关的痕迹碰在一起，可能就生出一个之前没有过的想法。知识不是被存储的，是被连接出来的。',
    '记忆到底是用来记住还是用来遗忘的？如果什么都记得，大脑岂不是会被信息淹没？也许记录的意义，就是帮我们在想找的时候还能找得到，而那些忘了的，本来就该让它走。记是为了忘，这好像有点悖论。',
    '专注力可能真的是一种免疫系统——你刷手机刷得越多，注意力的防线就越弱；越能长时间专注于一件事，就越能抵御碎片化信息的入侵。保护专注力，可能就是保护我们精神上的免疫力。',
  ],
  quote: [
    '《禅与摩托车维修艺术》里说："真正的学习，是理解之后的忘记。" 就像把书读薄了，最后剩下的不是知识点，而是变成了你自己的一部分。记笔记也是一样吧？不是为了记住原话，是为了让它穿过你，然后长成你的东西。',
    ' "人是悬挂在自己编织的意义之网上的动物。" ——社会学家马克斯·韦伯。每次读到都觉得，我们记录、思考、和不同的想法建立连接，不就是在编织这张网吗？密可追影，疏可回时。',
    '《专注的真相》里说："真正把书读进去的，只有上台分享的那个人。" 深以为然。输出才是最好的输入，就像现在我把感受写下来，其实也是在逼自己更专注地想清楚这件事。说不清楚的，往往就是还没想明白的。',
  ],
  moment: [
    '刚回家就看到一地狼藉——我家猫把书架最上面那层弄塌了，书哗啦啦散了一地。我蹲下来捡，最底下压着一本《演讲的力量》，就是TED掌门人克里斯·安德森写的那本。我都忘了自己还买过这本书。拿在手里翻了两页，突然就想起大学那阵子，TED演讲特别火，吃饭都在看。原来书还有一个功能，就是帮你存着某一段时间的记忆——你以为忘了，一碰到它，那些零散的日子就突然有了重量。',
    '今天整理旧手机的相册，翻到三年前拍的一张书的照片，具体内容已经记不清了，但当时读这本书的感觉一下子就回来了。记忆真是奇怪的东西，细节都模糊了，感觉却还完好地保存在某个地方，等着你去碰一下。',
    '今天在茑屋书店看到一个姑娘捧着《专注的真相》看得很认真。我们对视了一眼，把我逗笑了——这本书我也看过，是本好书。我更希望她读的是电子书，那样说不定就能读到我的公开留言和想法了。',
  ],
};

// 获取最近的痕迹 —— 用于展品层
function getRecentTraces(
  mockTraces: typeof mockOldTraces,
  bookExcerpts: ReturnType<typeof useApp>['bookExcerpts'],
  booklifelineInputs: ReturnType<typeof useApp>['booklifelineInputs'],
  diaryEntries: ReturnType<typeof useApp>['diaryEntries'],
  limit = 4
) {
  const all: { id: string; content: string; source: string; type: string }[] = [];

  // 书脉输入（最近）
  booklifelineInputs.slice(0, 2).forEach(node => {
    all.push({
      id: node.id,
      content: node.rawText,
      source: node.bookTitle ? `《${node.bookTitle}》` : '生活感悟',
      type: '书脉输入',
    });
  });

  // 书摘（微信读书 + 书脉书摘）
  [...mockTraces, ...bookExcerpts.map(e => ({
    id: e.id,
    content: e.content,
    bookTitle: e.bookTitle,
    source: 'wechat_reading' as const,
    sourceType: 'bookmark' as const,
    createdAt: e.createdAt,
  }))].slice(0, 4).forEach(trace => {
    all.push({
      id: trace.id,
      content: trace.content,
      source: trace.bookTitle ? `《${trace.bookTitle}》` : '读书摘要',
      type: '书摘',
    });
  });

  // 日记
  diaryEntries.slice(0, 2).forEach(entry => {
    const firstEvent = entry.events[0];
    if (firstEvent) {
      all.push({
        id: entry.id,
        content: firstEvent.content,
        source: entry.date,
        type: '日记',
      });
    }
  });

  // 按"看起来像最近的"排序（简单截取前limit个）
  return all.slice(0, limit);
}

export default function RecordPage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ripples, setRipples] = useState<number[]>([]);
  const [selectedScene, setSelectedScene] = useState<string | null>(null);
  const [suggestedScene] = useState<string>(() => {
    const scenes = sceneCards.map(s => s.id);
    return scenes[Math.floor(Math.random() * scenes.length)];
  });
  const [exampleIndex, setExampleIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const rippleIdRef = useRef(0);
  const navigate = useNavigate();
  const { setCurrentNode, booklifelineInputs, diaryEntries, bookExcerpts, fetchBookMeta, isDemoDataInjected, resetAllData } = useApp();

  const handleFinalResult = useCallback((text: string) => {
    setInput(prev => prev + text);
  }, []);

  const {
    isListening,
    interimTranscript,
    error: voiceError,
    isSupported: voiceSupported,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    lang: 'zh-CN',
    continuous: true,
    interimResults: true,
    onFinalResult: handleFinalResult,
  });

  const toggleVoiceInput = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      resetTranscript();
      startListening();
    }
  }, [isListening, startListening, stopListening, resetTranscript]);

  // 计算数据量（静态数据仅在注入演示数据后显示）
  const staticTraces = isDemoDataInjected ? mockOldTraces : [];
  const staticDiaries = isDemoDataInjected ? notionDiaryEntries : [];
  const traceCount = staticTraces.length + bookExcerpts.length;
  const diaryCount = staticDiaries.length + diaryEntries.length;
  const inputCount = booklifelineInputs.length;
  const totalCount = traceCount + diaryCount + inputCount;

  // 获取展品层数据
  const exhibitTraces = useMemo(() =>
    getRecentTraces(staticTraces, bookExcerpts, booklifelineInputs, diaryEntries, 4),
    [bookExcerpts, booklifelineInputs, diaryEntries, isDemoDataInjected]
  );

  // 是否有数据
  const hasData = totalCount > 0;

  // 新手引导是否可见 — 用户输入少于 3 条时显示展品层
  // 3 条之后藏起来，页面更留白
  const showExhibitLayer = inputCount < 3;

  // 展品层隐藏时重置选中的场景
  useEffect(() => {
    if (!showExhibitLayer) {
      setSelectedScene(null);
    }
  }, [showExhibitLayer]);

  // 按钮文案梯度
  const getSubmitText = () => {
    if (isLoading) return '正在连接...';
    if (inputCount === 0 && totalCount - inputCount === 0) return '种下第一条痕迹';
    if (inputCount === 0) return '种下第一条感受';
    if (inputCount === 1) return '看看它们会怎么连接';
    if (inputCount < 5) return '建立连接';
    return '开始回捞';
  };

  // 输入框 placeholder
  const getPlaceholder = () => {
    if (selectedScene === 'book') return '刚读完的书是……你的感受是什么？';
    if (selectedScene === 'thought') return '你在想什么问题？';
    if (selectedScene === 'quote') return '把你看到的那段话粘贴进来……';
    if (selectedScene === 'moment') return '刚才发生了什么？';
    return '你刚刚感受到了什么？';
  };

  const triggerRipple = () => {
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const id = rippleIdRef.current++;
        setRipples(prev => [...prev, id]);
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r !== id));
        }, 1600);
      }, i * 200);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return;
    triggerRipple();
    setIsLoading(true);
    try {
      const node = await analyzeInput(input);
      setCurrentNode(node);
      navigate('/confirm-node');

      // 后台静默生成书籍元信息
      if (node.bookTitle) {
        fetchBookMeta(node.bookTitle, node.bookAuthor).catch(() => {});
      }
    } catch {
      setIsLoading(false);
    }
  };

  const handleSceneClick = (sceneId: string) => {
    setSelectedScene(sceneId);
    setExampleIndex(0);
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 300);
  };

  const currentExample = useMemo(() => {
    if (!selectedScene) return null;
    const examples = sceneExampleTexts[selectedScene];
    if (!examples || examples.length === 0) return null;
    return examples[exampleIndex % examples.length];
  }, [selectedScene, exampleIndex]);

  const handleUseExample = () => {
    if (currentExample) {
      setInput(currentExample);
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
    }
  };

  const handleNextExample = () => {
    setExampleIndex(prev => prev + 1);
  };

  const charCount = input.length;

  return (
    <>
      {/* 环境层纹理 */}
      <div className="env-texture" />

      <div
        style={{
          maxWidth: '640px',
          width: '100%',
          margin: '0 auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 24px 72px',
          position: 'relative',
        }}
      >
        {/* ===== 展品层（远景）— 新手引导期显示，3 条输入后自动隐藏 ===== */}
        {showExhibitLayer && (
          <div
            style={{
              marginBottom: '32px',
              opacity: hasData ? 1 : 0.9,
              animation: 'fadeUp 0.6s ease both 0.05s',
              transform: 'perspective(1200px) translateZ(-40px) rotateX(1deg)',
              transformOrigin: 'center bottom',
            }}
          >
          {/* 层标签 */}
          <p
            style={{
              fontSize: '11px',
              color: 'var(--text-quinary)',
              letterSpacing: '0.08em',
              textAlign: 'center',
              marginBottom: '14px',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}
          >
            {hasData ? '你的痕迹碎片 · 选一个继续' : '为你的第一个痕迹选一个位置'}
          </p>

          {/* 展品卡片行 */}
          <div
            style={{
              display: 'flex',
              gap: '10px',
              overflowX: 'auto',
              padding: '4px 2px 8px',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {/* 真实痕迹卡片（有数据时显示） */}
            {hasData && exhibitTraces.map((trace, index) => (
              <div
                key={trace.id}
                className="float-card"
                style={{
                  flexShrink: 0,
                  width: '160px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  animationDelay: `${index * 0.08}s`,
                  background: '#fff',
                  boxShadow:
                    '0 2px 12px rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04)',
                  border: '0.5px solid rgba(0, 0, 0, 0.04)',
                }}
                onClick={() => {
                  setInput(trace.content.substring(0, 80) + '——这让我想到了');
                  textareaRef.current?.focus();
                }}
              >
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--text-quaternary)',
                    marginBottom: '6px',
                    fontWeight: 500,
                    letterSpacing: '0.02em',
                  }}
                >
                  {trace.source}
                </div>
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-tertiary)',
                    lineHeight: '1.5',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    margin: 0,
                  }}
                >
                  {trace.content}
                </p>
              </div>
            ))}

            {/* 场景卡片 — 始终显示，作为"再加一个"的入口 */}
            {sceneCards.map((scene, index) => {
              const isSelected = selectedScene === scene.id;
              const isSuggested = suggestedScene === scene.id && !selectedScene && !hasData;
              const sceneIndex = hasData ? exhibitTraces.length + index : index;
              return (
              <button
                key={scene.id}
                type="button"
                onClick={() => handleSceneClick(scene.id)}
                className="float-card"
                style={{
                  position: 'relative',
                  flexShrink: 0,
                  width: hasData ? '110px' : '130px',
                  padding: hasData ? '12px 10px' : '16px 12px',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  animationDelay: `${sceneIndex * 0.1}s`,
                  border: isSelected
                    ? '1.5px solid var(--blue)'
                    : isSuggested
                      ? '1px solid rgba(0, 122, 255, 0.3)'
                      : '1px dashed rgba(0, 0, 0, 0.12)',
                  background: isSelected
                    ? 'rgba(0, 122, 255, 0.06)'
                    : isSuggested
                      ? 'rgba(0, 122, 255, 0.03)'
                      : 'rgba(255, 255, 255, 0.6)',
                  boxShadow: isSelected
                    ? '0 2px 12px rgba(0, 122, 255, 0.15)'
                    : isSuggested
                      ? '0 1px 8px rgba(0, 122, 255, 0.08)'
                      : '0 1px 4px rgba(0, 0, 0, 0.03)',
                  opacity: !selectedScene && !isSuggested && !hasData ? 0.7 : 1,
                }}
              >
                {isSuggested && (
                  <div style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '8px',
                    fontSize: '10px',
                    color: 'var(--blue)',
                    background: 'rgba(0, 122, 255, 0.1)',
                    padding: '2px 6px',
                    borderRadius: '8px',
                    fontWeight: 500,
                  }}>
                    试试这个
                  </div>
                )}
                <div style={{ fontSize: hasData ? '22px' : '28px', marginBottom: '6px' }}>
                  {scene.icon}
                </div>
                <div
                  style={{
                    fontSize: hasData ? '12px' : '13px',
                    fontWeight: 600,
                    color: isSelected ? 'var(--blue)' : isSuggested ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                    marginBottom: '2px',
                  }}
                >
                  {scene.label}
                </div>
                {!hasData && (
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--text-quaternary)',
                      lineHeight: '1.4',
                    }}
                  >
                    {scene.hint}
                  </div>
                )}
              </button>
            )})}
          </div>

          {/* 展品层底部渐变分隔 */}
          <div
            style={{
              height: '1px',
              background: 'linear-gradient(to right, transparent, var(--separator-light), transparent)',
              marginTop: '4px',
            }}
          />
          </div>
        )}

        {/* ===== 动作层（近景）—— 输入区 ===== */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            transform: 'translateZ(0)',
          }}
        >
          <p
            style={{
              fontSize: '13px',
              color: 'var(--text-quinary)',
              letterSpacing: '0.02em',
              margin: '0 0 16px',
              animation: 'fadeUp 0.5s ease both 0.15s',
            }}
          >
            {hasData ? '在这些痕迹之间建立连接' : selectedScene ? '说说你的感受' : '记录此刻的感受'}
          </p>

          {/* 鱼影示例 — 选中场景 + 未输入时显示（无论有没有数据） */}
          {selectedScene && !input && currentExample && (
            <div
              style={{
                width: '100%',
                marginBottom: '14px',
                animation: 'fadeUp 0.5s ease both 0.18s',
              }}
            >
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-quaternary)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span style={{ fontSize: '14px' }}>💡</span>
                <span>不知道说什么？试试这个</span>
              </div>
              <button
                onClick={handleUseExample}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '14px 16px',
                  background: 'rgba(255,255,255,0.5)',
                  border: '1px dashed rgba(0, 122, 255, 0.3)',
                  borderRadius: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.25s ease',
                  position: 'relative',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(0, 122, 255, 0.06)';
                  e.currentTarget.style.borderStyle = 'solid';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.5)';
                  e.currentTarget.style.borderStyle = 'dashed';
                }}
              >
                <p
                  style={{
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'var(--text-tertiary)',
                    margin: 0,
                    fontStyle: 'italic',
                    opacity: 0.7,
                  }}
                >
                  "{currentExample}"
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '10px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(0, 0, 0, 0.05)',
                  }}
                >
                  <span
                    style={{
                      fontSize: '12px',
                      color: 'var(--blue)',
                      fontWeight: 500,
                    }}
                  >
                    点我，直接用这段话
                  </span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      handleNextExample();
                    }}
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-quaternary)',
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--text-tertiary)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--text-quaternary)';
                    }}
                  >
                    ↻ 换一个
                  </button>
                </div>
              </button>
            </div>
          )}

          <div
            style={{
              padding: '22px',
              width: '100%',
              position: 'relative',
              overflow: 'visible',
              borderRadius: '20px',
              animation: 'fadeUp 0.5s ease both 0.2s',
              // 输入框是实体卡片 — 内容层的主交互对象
              // 不用 Liquid Glass（下面没有滚动内容），用阴影和内高光创造深度
              background: '#fff',
              boxShadow:
                '0 12px 40px rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.04), 0 0 0 0.5px rgba(0, 0, 0, 0.04) inset',
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={getPlaceholder()}
              style={{
                width: '100%',
                minHeight: '140px',
                fontSize: '17px',
                lineHeight: '1.65',
                border: 'none',
                background: 'transparent',
                resize: 'none',
                outline: 'none',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
              }}
            />

            {/* Interim transcript */}
            {isListening && interimTranscript && (
              <div
                style={{
                  fontSize: '13px',
                  color: 'var(--blue)',
                  fontStyle: 'italic',
                  padding: '4px 0 8px',
                  lineHeight: '1.5',
                }}
              >
                正在识别: {interimTranscript}
              </div>
            )}

            {/* Voice error */}
            {voiceError && (
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--orange)',
                  padding: '4px 0 8px',
                  lineHeight: '1.5',
                }}
              >
                {voiceError}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(0, 0, 0, 0.06)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {voiceSupported && (
                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      cursor: 'pointer',
                      background: isListening
                        ? 'rgba(255, 59, 48, 0.1)'
                        : 'var(--fill-quaternary)',
                      border: 'none',
                      fontFamily: 'inherit',
                      padding: '6px 12px',
                      borderRadius: '16px',
                      WebkitTapHighlightColor: 'transparent',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      style={{
                        width: '18px',
                        height: '18px',
                        stroke: isListening ? '#FF3B30' : 'var(--blue)',
                        fill: 'none',
                        strokeWidth: 1.5,
                        strokeLinecap: 'round',
                        strokeLinejoin: 'round',
                        flexShrink: 0,
                        animation: isListening ? 'pulse 1s infinite' : 'none',
                      }}
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" y1="19" x2="12" y2="23" />
                      <line x1="8" y1="23" x2="16" y2="23" />
                    </svg>
                    <span
                      style={{
                        fontSize: '12px',
                        color: isListening ? '#FF3B30' : 'var(--blue)',
                        whiteSpace: 'nowrap',
                        fontWeight: 500,
                      }}
                    >
                      {isListening ? '正在聆听' : '语音'}
                    </span>
                  </button>
                )}

                <span style={{ fontSize: '12px', color: 'var(--text-quinary)' }}>
                  {charCount} 字
                </span>
              </div>

              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  background: 'none',
                  border: 'none',
                  fontFamily: 'inherit',
                  padding: '4px 0',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <svg
                  viewBox="0 0 24 24"
                  style={{
                    width: '24px',
                    height: '24px',
                    stroke: 'var(--text-tertiary)',
                    fill: 'none',
                    strokeWidth: 1.5,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round',
                    flexShrink: 0,
                  }}
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <polyline points="21 15 16 10 5 21" />
                </svg>
              </button>
            </div>
          </div>

          {/* Echo ripples */}
          {ripples.map(id => (
            <div
              key={id}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                border: '1px solid var(--blue)',
                transform: 'translate(-50%, -50%) scale(0)',
                animation: 'rippleExpand 1.6s ease-out forwards',
                pointerEvents: 'none',
                zIndex: 0,
              }}
            />
          ))}

          {/* 提交按钮 */}
          <div
            style={{
              padding: '28px 0 0',
              width: '100%',
              animation: 'fadeUp 0.5s ease both 0.3s',
              position: 'relative',
              zIndex: 20,
            }}
          >
            <button
              onClick={handleSubmit}
              disabled={!input.trim() || isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '100%',
                height: '52px',
                background: input.trim() && !isLoading
                  ? 'var(--blue)'
                  : 'var(--fill-tertiary)',
                color: input.trim() && !isLoading ? '#fff' : 'var(--text-quaternary)',
                fontSize: '16px',
                fontWeight: 600,
                fontFamily: 'inherit',
                border: 'none',
                borderRadius: '26px',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                letterSpacing: '-0.1px',
                boxShadow: input.trim() && !isLoading
                  ? '0 4px 16px rgba(0, 122, 255, 0.35)'
                  : 'none',
              }}
            >
              {getSubmitText()}
            </button>
          </div>
        </section>
      </div>

      {/* 底部痕迹计数 */}
      <div
        style={{
          position: 'fixed',
          bottom: '68px',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-quinary)',
          letterSpacing: '0.01em',
          animation: 'fadeUp 0.5s ease both 0.4s',
        }}
      >
        {hasData
          ? `你在这里留下了 ${totalCount} 条痕迹`
          : '先从一条痕迹开始，慢慢长出你的书脉'}
      </div>

      {/* 重置按钮 — 演示用，方便随时回到零数据状态 */}
      {(hasData || isDemoDataInjected) && (
        <button
          onClick={resetAllData}
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            fontSize: '11px',
            color: 'var(--text-quaternary)',
            background: 'rgba(255,255,255,0.7)',
            border: '1px solid var(--separator)',
            borderRadius: '12px',
            padding: '6px 12px',
            cursor: 'pointer',
            fontFamily: 'inherit',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            zIndex: 100,
            opacity: 0.6,
            transition: 'opacity 0.2s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
        >
          重置数据
        </button>
      )}
    </>
  );
}
