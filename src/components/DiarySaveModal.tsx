import { useState, useMemo, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { DiaryEvent, AIObservation, DiaryEntry } from '../types';
import { toLocalDateString, getTimezoneLabel } from '../utils/time';

interface DiarySaveModalProps {
  open: boolean;
  onClose: () => void;
  rawContent: string;
}

/** 模糊时间词到分钟数的映射 */
const FUZZY_TIMES: { kw: string; val: number }[] = [
  { kw: '凌晨', val: 180 + 1440 },
  { kw: '清晨', val: 360 },
  { kw: '晨起', val: 420 },
  { kw: '早起', val: 420 },
  { kw: '晨读', val: 480 },
  { kw: '早上', val: 480 },
  { kw: '上午', val: 540 },
  { kw: '午前', val: 660 },
  { kw: '中午', val: 720 },
  { kw: '午间', val: 720 },
  { kw: '午饭', val: 720 },
  { kw: '午后', val: 780 },
  { kw: '下午', val: 900 },
  { kw: '傍晚', val: 1080 },
  { kw: '黄昏', val: 1080 },
  { kw: '日落', val: 1080 },
  { kw: '晚饭', val: 1140 },
  { kw: '晚餐', val: 1140 },
  { kw: '晚间', val: 1200 },
  { kw: '晚上', val: 1200 },
  { kw: '入夜', val: 1260 },
  { kw: '深夜', val: 1320 },
  { kw: '夜间', val: 1320 },
  { kw: '半夜', val: 1380 },
  { kw: '午夜', val: 1440 },
];

/** 解析时间标签 */
function parseTime(text: string): { label: string; value: number | null } {
  if (!text) return { label: '', value: null };

  const hasYue = text.startsWith('约');
  const checkStr = hasYue ? text.substring(1).trim() : text;
  const prefix = hasYue ? '约 ' : '';

  // 时间段 HH:MM-HH:MM
  let match = checkStr.match(/(\d{1,2})[:：](\d{1,2})\s*[-~～]\s*\d{1,2}[:：]\d{1,2}/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    let val = h * 60 + m;
    if (h > 0 && h < 6) val += 1440;
    return { label: prefix + match[0].replace(/：/g, ':'), value: val };
  }

  // HH:MM
  match = checkStr.match(/(\d{1,2})[:：](\d{1,2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    let val = h * 60 + m;
    if (h > 0 && h < 6) val += 1440;
    return { label: prefix + match[0].replace(/：/g, ':'), value: val };
  }

  // HH点
  match = checkStr.match(/(\d{1,2})点/);
  if (match) {
    const h = parseInt(match[1], 10);
    let val = h * 60;
    if (h > 0 && h < 6) val += 1440;
    return { label: prefix + match[0], value: val };
  }

  // 模糊时间词
  for (const ft of FUZZY_TIMES) {
    if (checkStr.startsWith(ft.kw) || checkStr.includes(ft.kw + '｜') || checkStr.includes(ft.kw + ' ')) {
      return { label: prefix + ft.kw, value: ft.val };
    }
  }

  return { label: '', value: null };
}

/** 将原始内容解析为事件列表 */
function parseContentToEvents(content: string): DiaryEvent[] {
  const lines = content.split('\n').map(l => l.trim()).filter(l => l);
  const events: DiaryEvent[] = [];
  let current: DiaryEvent | null = null;

  for (const line of lines) {
    const { label, value } = parseTime(line);
    const isTimeStart = label && (
      line.startsWith(label) ||
      line.startsWith('约' + label) ||
      line.startsWith('约 ' + label)
    );

    // 也检测数字开头的行
    const isNumericTime = /^\d{1,2}[:：点]/.test(line);
    const isFuzzyStart = FUZZY_TIMES.some(ft => line.startsWith(ft.kw));

    if (isTimeStart || isNumericTime || isFuzzyStart) {
      if (current) events.push(current);
      let titleText = line;
      if (label) {
        if (titleText.startsWith('约 ' + label)) titleText = titleText.substring(('约 ' + label).length);
        else if (titleText.startsWith('约' + label)) titleText = titleText.substring(('约' + label).length);
        else if (titleText.startsWith(label)) titleText = titleText.substring(label.length);
        titleText = titleText.replace(/^[｜|\s,，.。、]+/, '');
      }
      if (titleText.length < 2) titleText = line;

      current = {
        id: `evt-${Date.now()}-${events.length}`,
        timeLabel: label || '',
        timeValue: value,
        content: titleText.trim(),
      };
    } else if (current) {
      current.content += (current.content ? '\n' : '') + line;
    } else {
      // 没有时间前缀的首行
      current = {
        id: `evt-${Date.now()}-${events.length}`,
        timeLabel: '',
        timeValue: null,
        content: line,
      };
    }
  }

  if (current) events.push(current);
  return events.filter(e => e.content.length > 0);
}

/** 检测内容中是否包含书名 */
function detectBooks(content: string): string[] {
  const matches = content.match(/《([^》]+)》/g) || [];
  return [...new Set(matches.map(m => m.slice(1, -1)))];
}

export default function DiarySaveModal({ open, onClose, rawContent }: DiarySaveModalProps) {
  const { addDiaryEntry, diaryEntries } = useApp();
  const [events, setEvents] = useState<DiaryEvent[]>([]);
  const [observations, setObservations] = useState<AIObservation[]>([]);
  const [goldenQuote, setGoldenQuote] = useState('');
  const [showObservationInput, setShowObservationInput] = useState(false);
  const [newObsTitle, setNewObsTitle] = useState('');
  const [newObsContent, setNewObsContent] = useState('');
  const [date, setDate] = useState(toLocalDateString(new Date()));

  // 初始化事件解析
  const detectedBooks = useMemo(() => detectBooks(rawContent), [rawContent]);

  // 当 modal 打开且 events 为空时，解析内容
  useEffect(() => {
    if (open && events.length === 0 && rawContent) {
      setEvents(parseContentToEvents(rawContent));
    }
  }, [open, rawContent, events.length]);

  const handleEventContentChange = (eventId: string, newContent: string) => {
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, content: newContent } : e));
  };

  const handleEventTimeChange = (eventId: string, timeLabel: string) => {
    const { value } = parseTime(timeLabel);
    setEvents(prev => prev.map(e => e.id === eventId ? { ...e, timeLabel, timeValue: value } : e));
  };

  const handleRemoveEvent = (eventId: string) => {
    setEvents(prev => prev.filter(e => e.id !== eventId));
  };

  const handleAddObservation = () => {
    if (!newObsTitle.trim() && !newObsContent.trim()) return;
    setObservations(prev => [...prev, {
      id: `obs-${Date.now()}-${prev.length}`,
      title: newObsTitle.trim(),
      content: newObsContent.trim(),
      isLegacy: false, // 书脉原生输入的 AI 观察为 current
    }]);
    setNewObsTitle('');
    setNewObsContent('');
    setShowObservationInput(false);
  };

  const handleRemoveObservation = (obsId: string) => {
    setObservations(prev => prev.filter(o => o.id !== obsId));
  };

  const handleSave = () => {
    if (events.length === 0) return;
    const entry: DiaryEntry = {
      id: `diary-${Date.now()}`,
      date,
      source: 'booklifeline_native',
      events: events.sort((a, b) => (a.timeValue || 9999) - (b.timeValue || 9999)),
      observations,
      goldenQuote: goldenQuote.trim() || undefined,
      relatedBooks: detectedBooks.length > 0 ? detectedBooks : undefined,
      createdAt: new Date().toISOString(),
      rawContent,
    };
    addDiaryEntry(entry);
    // 重置
    setEvents([]);
    setObservations([]);
    setGoldenQuote('');
    onClose();
  };

  const handleClose = () => {
    setEvents([]);
    setObservations([]);
    setGoldenQuote('');
    setShowObservationInput(false);
    onClose();
  };

  if (!open) return null;

  const todayDiaries = diaryEntries.filter(d => d.date === date).length;

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
              存为日记
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-quaternary)', marginTop: '2px' }}>
              书脉原生 · {date} {getTimezoneLabel()} {todayDiaries > 0 && `· 今日已有 ${todayDiaries} 条`}
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
          {/* 日期选择 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              日期
            </label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
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

          {/* 事件列表 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                事件（按时间节点分行）
              </label>
              <span style={{ fontSize: '12px', color: 'var(--text-quaternary)' }}>
                {events.length} 条
              </span>
            </div>

            {events.length === 0 ? (
              <div style={{
                padding: '24px',
                textAlign: 'center',
                backgroundColor: 'var(--fill-secondary)',
                borderRadius: '12px',
                color: 'var(--text-quaternary)',
                fontSize: '14px',
              }}>
                暂无事件，内容已为空
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {events.map((evt, index) => (
                  <div
                    key={evt.id}
                    style={{
                      backgroundColor: 'var(--fill-primary)',
                      borderRadius: '12px',
                      border: '1px solid var(--separator)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{
                        fontSize: '11px',
                        color: 'var(--text-quaternary)',
                        backgroundColor: 'var(--fill-tertiary)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        flexShrink: 0,
                      }}>
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={evt.timeLabel}
                        onChange={e => handleEventTimeChange(evt.id, e.target.value)}
                        placeholder="时间（如 10:30）"
                        style={{
                          width: '100px',
                          padding: '4px 8px',
                          border: '1px solid var(--separator)',
                          borderRadius: '6px',
                          backgroundColor: 'var(--background-primary)',
                          fontSize: '13px',
                          color: 'var(--text-primary)',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={() => handleRemoveEvent(evt.id)}
                        style={{
                          marginLeft: 'auto',
                          width: '24px', height: '24px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--text-quaternary)',
                          fontSize: '16px',
                          cursor: 'pointer',
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <textarea
                      value={evt.content}
                      onChange={e => handleEventContentChange(evt.id, e.target.value)}
                      style={{
                        width: '100%',
                        minHeight: '40px',
                        border: 'none',
                        outline: 'none',
                        resize: 'vertical',
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        lineHeight: '1.5',
                        backgroundColor: 'transparent',
                        fontFamily: 'inherit',
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI 观察区域 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                AI 观察（可选）
              </label>
              <button
                onClick={() => setShowObservationInput(!showObservationInput)}
                style={{
                  fontSize: '13px',
                  color: 'var(--blue)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  cursor: 'pointer',
                  padding: '4px 8px',
                }}
              >
                + 添加
              </button>
            </div>

            {/* 新观察输入区 */}
            {showObservationInput && (
              <div
                style={{
                  backgroundColor: 'var(--fill-primary)',
                  borderRadius: '12px',
                  border: '1px solid var(--blue)',
                  padding: '12px',
                  marginBottom: '10px',
                }}
              >
                <input
                  type="text"
                  value={newObsTitle}
                  onChange={e => setNewObsTitle(e.target.value)}
                  placeholder="观察标题（如：情绪模式）"
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    border: '1px solid var(--separator)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--background-primary)',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    marginBottom: '8px',
                  }}
                />
                <textarea
                  value={newObsContent}
                  onChange={e => setNewObsContent(e.target.value)}
                  placeholder="观察内容……"
                  style={{
                    width: '100%',
                    minHeight: '60px',
                    padding: '8px 10px',
                    border: '1px solid var(--separator)',
                    borderRadius: '8px',
                    backgroundColor: 'var(--background-primary)',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                    lineHeight: '1.5',
                  }}
                />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => setShowObservationInput(false)}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: '1px solid var(--separator)',
                      borderRadius: '8px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-secondary)',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    取消
                  </button>
                  <button
                    onClick={handleAddObservation}
                    style={{
                      flex: 1,
                      padding: '8px',
                      border: 'none',
                      borderRadius: '8px',
                      backgroundColor: 'var(--blue)',
                      color: 'white',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    确认添加
                  </button>
                </div>
              </div>
            )}

            {/* 已有观察列表 */}
            {observations.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {observations.map(obs => (
                  <div
                    key={obs.id}
                    style={{
                      backgroundColor: 'var(--blue-bg, rgba(0,122,255,0.08))',
                      borderRadius: '12px',
                      border: '1px solid var(--separator)',
                      padding: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                      <div style={{ flex: 1 }}>
                        {obs.title && (
                          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '4px' }}>
                            {obs.title}
                          </p>
                        )}
                        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                          {obs.content}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveObservation(obs.id)}
                        style={{
                          marginLeft: '8px',
                          width: '24px', height: '24px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--text-quaternary)',
                          fontSize: '16px',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <span style={{
                      display: 'inline-block',
                      marginTop: '6px',
                      fontSize: '10px',
                      color: 'var(--blue)',
                      backgroundColor: 'var(--blue-bg, rgba(0,122,255,0.08))',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}>
                      书脉 AI 观察
                    </span>
                  </div>
                ))}
              </div>
            )}

            {observations.length === 0 && !showObservationInput && (
              <p style={{ fontSize: '12px', color: 'var(--text-quinary)', textAlign: 'center', padding: '8px' }}>
                未添加 AI 观察时，内容仅作为事件保存
              </p>
            )}
          </div>

          {/* 今日金句 */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
              今日金句（可选）
            </label>
            <input
              type="text"
              value={goldenQuote}
              onChange={e => setGoldenQuote(e.target.value)}
              placeholder="一句话总结今日……"
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

          {/* 关联书籍 */}
          {detectedBooks.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                关联书籍
              </label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {detectedBooks.map(book => (
                  <span
                    key={book}
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      backgroundColor: 'var(--fill-tertiary)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                    }}
                  >
                    《{book}》
                  </span>
                ))}
              </div>
            </div>
          )}
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
            disabled={events.length === 0}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: events.length > 0 ? 'var(--blue)' : 'var(--fill-tertiary)',
              color: events.length > 0 ? 'white' : 'var(--text-quaternary)',
              border: 'none',
              borderRadius: '24px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: events.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            保存日记
          </button>
        </div>
      </div>
    </div>
  );
}
