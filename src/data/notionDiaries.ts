import { DiaryEntry, DiaryEvent, AIObservation } from '../types';
import { recognizeFragments, generateDiaryCandidateRelations } from './diaryRecognition';
import { applyEditsToFragments } from './diaryContentStorage';
import { runValidation, printValidationResult, cleanupOldData } from './dataValidation';
import diaryData from './notion-diaries-cleaned.json';

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
  // 相对时间词（保持原样，排序用默认值）
  { kw: '白天', val: 600 },
  { kw: '今天', val: 600 },
  { kw: '随后', val: 660 },
  { kw: '途中', val: 780 },
  { kw: '上车后', val: 540 },
  { kw: '起床后', val: 420 },
  { kw: '观演后', val: 1020 },
  { kw: '另', val: 0 },
  // 以下为短词，须放在后面避免误匹配（如"晚"不能先于"晚上"匹配）
  { kw: '全天', val: 600 },
  { kw: '前夜', val: 1320 },
  { kw: '线下', val: 600 },
  { kw: '晚', val: 1200 },
];

/** 解析时间标签 */
function parseTime(text: string): { label: string; value: number | null } {
  if (!text) return { label: '', value: null };

  const hasYue = text.startsWith('约');
  const checkStr = hasYue ? text.substring(1).trim() : text;
  const prefix = hasYue ? '约 ' : '';

  let normalizedStr = checkStr;
  const periodKwMap: Record<string, number> = { '上午': 0, '下午': 12, '晚上': 18 };
  
  // 处理"14:00 下午14:00"或"下午14:00"这种重复格式
  for (const [kw, _offset] of Object.entries(periodKwMap)) {
    const pattern = new RegExp(`(\\d{1,2})[:：](\\d{1,2})\\s*${kw}\\s*\\d{1,2}[:：]\\d{1,2}`);
    const match = checkStr.match(pattern);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      if (h >= 12 && kw === '下午') h -= 12;
      if (h >= 18 && kw === '晚上') h -= 18;
      normalizedStr = `${kw}${h}:${m.toString().padStart(2, '0')}`;
      break;
    }
    // 处理"下午14:00"这种格式
    const pattern2 = new RegExp(`${kw}(\\d{1,2})[:：](\\d{1,2})`);
    const match2 = checkStr.match(pattern2);
    if (match2) {
      let h = parseInt(match2[1], 10);
      const m = parseInt(match2[2], 10);
      if (h >= 12 && kw === '下午') h -= 12;
      if (h >= 18 && kw === '晚上') h -= 18;
      normalizedStr = `${kw}${h}:${m.toString().padStart(2, '0')}`;
      break;
    }
  }

  // 时间段 HH:MM-HH:MM
  let match = normalizedStr.match(/(\d{1,2})[:：](\d{1,2})\s*[-~～～]\s*\d{1,2}[:：]\d{1,2}/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    let val = h * 60 + m;
    if (h > 0 && h < 6) val += 1440;
    return { label: prefix + match[0].replace(/：/g, ':'), value: val };
  }

  // HH:MM
  match = normalizedStr.match(/(\d{1,2})[:：](\d{1,2})/);
  if (match) {
    const h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    let val = h * 60 + m;
    if (h > 0 && h < 6) val += 1440;
    return { label: prefix + match[0].replace(/：/g, ':'), value: val };
  }

  // HH:xx（模糊时间，如"08:xx"）
  match = normalizedStr.match(/(\d{1,2})[:：]xx/i);
  if (match) {
    const h = parseInt(match[1], 10);
    let val = h * 60;
    if (h > 0 && h < 6) val += 1440;
    return { label: prefix + match[0].replace(/：/g, ':'), value: val };
  }

  // HH点MM分 或 HH点
  match = normalizedStr.match(/(\d{1,2}点(?:\d{1,2}分)?)/);
  if (match) {
    const hMatch = match[0].match(/(\d{1,2})点/);
    if (hMatch) {
      const h = parseInt(hMatch[1], 10);
      let val = h * 60;
      const mMatch = match[0].match(/(\d{1,2})分/);
      if (mMatch) val += parseInt(mMatch[1], 10);
      if (h > 0 && h < 6) val += 1440;
      return { label: prefix + match[0], value: val };
    }
  }

  // 模糊时间词
  for (const ft of FUZZY_TIMES) {
    if (normalizedStr.startsWith(ft.kw) || normalizedStr.includes(ft.kw + '｜') || normalizedStr.includes(ft.kw + ' ')) {
      return { label: prefix + ft.kw, value: ft.val };
    }
  }

  return { label: '', value: null };
}

/** 提取 emoji */
function extractEmoji(text: string): string | undefined {
  const match = text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/u);
  return match ? match[0] : undefined;
}

/** 清洗 HTML 标签，保留文本内容 */
function cleanHtmlTags(text: string): string {
  return text
    .replace(/<table[^>]*>/g, '')
    .replace(/<\/table>/g, '')
    .replace(/<tr[^>]*>/g, '')
    .replace(/<\/tr>/g, '\n')
    .replace(/<td[^>]*>/g, '')
    .replace(/<\/td>/g, ' | ')
    .replace(/<\\?strong>/g, '')
    .replace(/<\/\\?strong>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\\(?=[^\\])/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 清洗 Markdown 格式残留 */
function cleanMarkdown(text: string): string {
  return text
    // **加粗** → 普通文本
    .replace(/\*\*(.+?)\*\*/g, '$1')
    // *斜体* → 普通文本
    .replace(/\*([^*]+?)\*/g, '$1')
    // {color="xxx"} 属性移除
    .replace(/\s*\{[^}]*\}/g, '')
    // --- 分隔线移除
    .replace(/^---$/gm, '')
    // 清理多余空格
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** 剥离事件行中的日期前缀和特殊标记前缀 */
function stripDatePrefix(text: string): string {
  return text
    .replace(/^时间地点[：:]\s*/, '')
    .replace(/^研学班时间[：:]\s*/, '')
    .replace(/^事件[：:]\s*/, '')
    .replace(/^\d{1,2}月\d{1,2}日\s*/, '')
    .replace(/^\d{4}-\d{1,2}-\d{1,2}\s*/, '')
    .replace(/^[｜|]\s*/, '');
}

/** 判断行是否是事件标记（· 事件 / · 事件：xxx 等） */
function isEventMarker(line: string): boolean {
  const trimmed = line.trim();
  // · 事件 / · 事件：/ · 事件(...) / · 事件（...）
  return /^·\s*事件[：:（(]/.test(trimmed) || /^·\s*事件\s*$/.test(trimmed);
}

/** 判断行是否是观察类标记（以 · 开头但不是事件） */
function isObservationMarker(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.startsWith('·')) return false;
  if (isEventMarker(trimmed)) return false;
  // 观察类关键词
  const obsKeywords = [
    'AI 观察', 'AI观察', '观察', '你意识到', '你发现', '你判断', '你认为',
    '候选', '这很像', '这是', '背景是', '关键是', '你说', '你提出', '你指出',
    '你补充', '你确认', '你反问', '你猜测', '你感觉', '你观察到', '你联想到',
    '可落到', '可迁移', '最小证据', '验证信号', '作品回声', '纠错',
    '我原声', '原声', '待补', '另一条诱因', '视觉锚点', '入口的',
    '过程', '你一路感受', '你原本打算', '触发', '司机回你一句',
    '你因此意识到', '你反而觉得', '最终拍板', '因此你决定', '你把问题落回到根上',
    '你站在画前', '你给自己立了', '你想加的结尾', '你说的一句话',
    '你对', '你准备', '你提议', '你承认', '你澄清', '你希望',
  ];
  const afterDot = trimmed.replace(/^·\s*/, '');
  for (const kw of obsKeywords) {
    if (afterDot.startsWith(kw)) return true;
  }
  return false;
}

/** 判断分区标题是否是时间事件标题（【HH:MM｜标题】格式） */
function isEventSectionHeader(header: string): { isEvent: boolean; timeLabel: string; title: string } {
  if (!header) return { isEvent: false, timeLabel: '', title: '' };
  // 先去掉可能的 · 前缀
  const cleanedHeader = header.replace(/^[·\s]+/, '');
  const stripped = stripDatePrefix(cleanedHeader);
  const { label } = parseTime(stripped);
  const isNumeric = /^\d{1,2}[:：](\d{1,2}|xx)/.test(stripped);
  const isFuzzy = FUZZY_TIMES.some(ft => stripped.startsWith(ft.kw));

  if ((label || isNumeric || isFuzzy) && (stripped.includes('｜') || stripped.includes('|'))) {
    const sepIdx = Math.max(stripped.indexOf('｜'), stripped.indexOf('|'));
    const timePart = stripped.substring(0, sepIdx).trim();
    const titlePart = stripped.substring(sepIdx + 1).trim();
    return { isEvent: true, timeLabel: timePart, title: titlePart };
  }
  // 整体观察/金句/附记等明确的非事件分区
  const nonEventKeywords = ['整体观察', '今日金句', '附记', '附录', '观察'];
  for (const kw of nonEventKeywords) {
    if (header.includes(kw)) return { isEvent: false, timeLabel: '', title: '' };
  }
  return { isEvent: false, timeLabel: '', title: '' };
}

/** 判断行是否以"事件："/"线索："等顶层事件标记开头 */
function isTopLevelEventLine(line: string): boolean {
  const trimmed = line.trim();
  // 事件：/ 线索：/ 关联素材：/ 触发：/ 触发点：
  return /^(事件|事件链|线索|关联素材|触发|触发点|背景)[：:]/.test(trimmed);
}

/** 判断行是否是观察类顶层标记（非事件） */
function isTopLevelObsLine(line: string): boolean {
  const trimmed = line.trim();
  return /^(观察|证据|AI观察|AI 观察|反思|感悟|收获|总结|结论|启发)[：:]/.test(trimmed);
}

/**
 * 将 content 按【...】标记分区
 * 返回：事件区文本、观察区文本、金句列表、附记区文本
 */
function splitContentSections(content: string): {
  eventsContent: string;
  observationsContent: string;
  goldenQuotes: string[];
  appendixContent: string;
} {
  const cleaned = cleanMarkdown(cleanHtmlTags(content));

  const lines = cleaned.split('\n');
  const sections: { header: string; lines: string[] }[] = [];
  let currentHeader = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    const headerMatch = trimmed.match(/^【(.+?)】$/);
    if (headerMatch) {
      if (currentHeader || currentLines.length) {
        sections.push({ header: currentHeader, lines: currentLines });
      }
      currentHeader = headerMatch[1];
      currentLines = [];
    } else if (trimmed) {
      currentLines.push(line);
    }
  }
  if (currentHeader || currentLines.length) {
    sections.push({ header: currentHeader, lines: currentLines });
  }

  let eventsContent = '';
  let observationsContent = '';
  let goldenQuotes: string[] = [];
  let appendixContent = '';

  for (const sec of sections) {
    const h = sec.header;

    // 1. 金句区
    if (h === '今日金句' || h.includes('金句')) {
      const quotes = sec.lines
        .filter(l => l.startsWith('·') || l.startsWith('-'))
        .map(l => l.replace(/^[·\-\s]+/, '').trim())
        .filter(l => l.length > 5);
      goldenQuotes.push(...quotes);
      continue;
    }

    // 2. 附记区
    if (h === '附记' || h.includes('附记') || h.includes('附录')) {
      appendixContent += (appendixContent ? '\n' : '') + sec.lines.join('\n');
      continue;
    }

    // 3. 观察区（整体观察 / 观察 等）
    if (h === '整体观察' || h === '观察' || (h.includes('观察') && !h.includes('｜'))) {
      const { eventLines, obsLines } = separateEventsFromLines(sec.lines);
      observationsContent += (observationsContent ? '\n' : '') + obsLines.join('\n');
      if (eventLines.length) {
        eventsContent += (eventsContent ? '\n' : '') + eventLines.join('\n');
      }
      continue;
    }

    // 4. 事件区（空标题 / 带时间的标题 / 默认）
    const secInfo = isEventSectionHeader(h);
    const sectionEventLines: string[] = [];
    const sectionObsLines: string[] = [];

    // 如果分区标题本身是事件标题，作为事件首行
    if (secInfo.isEvent) {
      sectionEventLines.push(h);
    }

    const { eventLines, obsLines } = separateEventsFromLines(sec.lines);
    sectionEventLines.push(...eventLines);
    sectionObsLines.push(...obsLines);

    if (sectionEventLines.length) {
      eventsContent += (eventsContent ? '\n' : '') + sectionEventLines.join('\n');
    }
    if (sectionObsLines.length) {
      observationsContent += (observationsContent ? '\n' : '') + sectionObsLines.join('\n');
    }
  }

  return { eventsContent, observationsContent, goldenQuotes, appendixContent };
}

/**
 * 从一组行中分离事件行和观察行
 * 处理：事件：/ ◦ 事件 / · 事件 / ◦ 证据 / · 观察 等前缀
 */
function separateEventsFromLines(lines: string[]): { eventLines: string[]; obsLines: string[] } {
  const eventLines: string[] = [];
  const obsLines: string[] = [];
  let mode: 'event' | 'obs' | 'unknown' = 'unknown';

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const isIndented = rawLine.startsWith('  ') || rawLine.startsWith('\t');

    // 1. 顶层事件标记（非缩进）→ 事件
    if (!isIndented && isTopLevelEventLine(trimmed)) {
      mode = 'event';
      eventLines.push(rawLine);
      continue;
    }

    // 2. 顶层观察标记（非缩进）→ 观察
    if (!isIndented && isTopLevelObsLine(trimmed)) {
      mode = 'obs';
      obsLines.push(rawLine);
      continue;
    }

    // 3. ◦ 事件 → 事件
    if (/^◦\s*事件[：:（(]?/.test(trimmed)) {
      mode = 'event';
      eventLines.push(rawLine);
      continue;
    }

    // 4. · 事件 → 事件
    if (isEventMarker(trimmed)) {
      mode = 'event';
      eventLines.push(rawLine);
      continue;
    }

    // 5. ◦ + 其他 → 观察
    if (trimmed.startsWith('◦')) {
      mode = 'obs';
      obsLines.push(rawLine);
      continue;
    }

    // 6. · + 观察关键词 → 观察
    if (isObservationMarker(trimmed)) {
      mode = 'obs';
      obsLines.push(rawLine);
      continue;
    }

    // 7. · + 时间 → 事件
    if (trimmed.startsWith('·')) {
      const afterDot = trimmed.replace(/^·\s*/, '');
      const stripped = stripDatePrefix(afterDot);
      const { label } = parseTime(stripped);
      const isNumeric = /^\d{1,2}[:：点]/.test(stripped);
      const isFuzzy = FUZZY_TIMES.some(ft => stripped.startsWith(ft.kw));
      if (label || isNumeric || isFuzzy) {
        mode = 'event';
        eventLines.push(rawLine);
      } else if (/事件[链]?/.test(afterDot) && !afterDot.startsWith('观察') && !afterDot.startsWith('AI观察') && !afterDot.startsWith('AI 观察')) {
        // 包含"事件"但不是观察类的 → 事件模式
        mode = 'event';
        eventLines.push(rawLine);
      } else {
        mode = 'event';
        eventLines.push(rawLine);
      }
      continue;
    }

    // 8. 缩进行 → 跟随当前模式
    if (isIndented) {
      if (mode === 'event') {
        eventLines.push(rawLine);
      } else if (mode === 'obs') {
        obsLines.push(rawLine);
      } else {
        // 未知模式默认事件
        eventLines.push(rawLine);
      }
      continue;
    }

    // 9. 顶层普通行 → 跟随当前模式，未知则默认事件
    if (mode === 'event') {
      eventLines.push(rawLine);
    } else if (mode === 'obs') {
      obsLines.push(rawLine);
    } else {
      eventLines.push(rawLine);
    }
  }

  return { eventLines, obsLines };
}

/**
 * 从事件区文本中解析事件列表
 * 支持多种格式：
 * 1. 时间行事件：HH:MM｜内容 / 下午｜内容
 * 2. 事件前缀行：事件：xxx / 线索：xxx / 关联素材：xxx
 * 3. 分区标题事件：【HH:MM｜标题】
 * 4. · 事件 / ◦ 事件 子项 → 合并到当前事件
 */
function parseEventsFromSection(eventsContent: string): DiaryEvent[] {
  if (!eventsContent.trim()) return [];

  const rawLines = eventsContent.split('\n').filter(l => l.trim() && l.trim() !== '-' && l.trim() !== '—');
  const events: DiaryEvent[] = [];
  let current: DiaryEvent | null = null;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();
    const isIndented = rawLine.startsWith('  ') || rawLine.startsWith('\t');
    const isDotLine = line.startsWith('·');
    const isCircleLine = line.startsWith('◦');
    const afterPrefix = isDotLine
      ? line.replace(/^·\s*/, '')
      : isCircleLine
      ? line.replace(/^◦\s*/, '')
      : line;

    // 1. 分区标题格式（带时间 + ｜）→ 新事件
    const secInfo = isEventSectionHeader(line);
    if (secInfo.isEvent) {
      if (current) events.push(current);
      const emoji = extractEmoji(secInfo.title);
      let titleText = secInfo.title;
      if (emoji && titleText.startsWith(emoji)) {
        titleText = titleText.substring(emoji.length).replace(/^[｜|\s,，.。、]+/, '');
      }
      const { value } = parseTime(secInfo.timeLabel);
      current = {
        id: `evt-${Date.now()}-${events.length}-${Math.random().toString(36).slice(2, 6)}`,
        timeLabel: secInfo.timeLabel,
        timeValue: value,
        content: titleText.trim(),
        emoji,
      };
      continue;
    }

    // 2. 顶层事件标记（事件：/ 线索：/ 关联素材：等）→ 新事件（仅非缩进行）
    if (!isIndented && !isDotLine && !isCircleLine && isTopLevelEventLine(line)) {
      if (current) events.push(current);
      // 提取前缀后的内容
      const contentAfter = line.replace(/^(事件|事件链|线索|关联素材|触发|触发点|背景)[：:]\s*/, '');
      current = {
        id: `evt-${Date.now()}-${events.length}-${Math.random().toString(36).slice(2, 6)}`,
        timeLabel: '',
        timeValue: null,
        content: contentAfter.trim(),
      };
      continue;
    }

    // 2b. 缩进的事件标记 → 当前事件的内容延续
    if (isIndented && !isDotLine && !isCircleLine && isTopLevelEventLine(line)) {
      const contentAfter = line.replace(/^(事件|事件链|线索|关联素材|触发|触发点|背景)[：:]\s*/, '');
      if (current && contentAfter) {
        current.content += (current.content ? '\n' : '') + contentAfter;
      }
      continue;
    }

    // 3. ◦ 事件 / · 事件 → 当前事件的内容延续
    if (isCircleLine && /^事件[：:（(]?/.test(afterPrefix)) {
      const eventContent = afterPrefix.replace(/^事件[：:（(][^）)]*[）)]?\s*/, '').replace(/^事件\s*/, '');
      if (eventContent && current) {
        current.content += (current.content ? '\n' : '') + eventContent;
      } else if (!eventContent && current) {
        // 只有"事件"两个字，下面的行是内容 → 保持当前事件
      }
      continue;
    }

    if (isDotLine && isEventMarker(line)) {
      const eventContent = afterPrefix.replace(/^事件[：:（(][^）)]*[）)]?\s*/, '').replace(/^事件\s*/, '');
      if (eventContent && current) {
        current.content += (current.content ? '\n' : '') + eventContent;
      }
      continue;
    }

    // 4. ◦ + 其他 / · + 观察关键词 → 跳过（应该已在分离阶段被过滤）
    if (isCircleLine || (isDotLine && isObservationMarker(line))) {
      continue;
    }

    // 5. · + 时间 → 新事件
    if (isDotLine) {
      const stripped = stripDatePrefix(afterPrefix);
      const { label, value } = parseTime(stripped);
      const isNumeric = /^\d{1,2}[:：点]/.test(stripped);
      const isFuzzy = FUZZY_TIMES.some(ft => stripped.startsWith(ft.kw));

      if (label || isNumeric || isFuzzy) {
        if (current) events.push(current);
        let titleText = stripped;
        let timeLabel = label || '';
        // 从文本中提取时间部分作为 label（去掉多余的 · 前缀）
        const timeMatch = stripped.match(/^(\d{1,2}[:：](?:\d{1,2}|xx)(?:\s*[-～~]\s*\d{1,2}[:：]\d{1,2})?)/i);
        if (timeMatch) {
          timeLabel = timeMatch[1].replace(/：/g, ':');
          titleText = stripped.substring(timeMatch[0].length);
          titleText = titleText.replace(/^[｜|\s,，.。、]+/, '');
        } else if (label) {
          if (titleText.startsWith(label)) titleText = titleText.substring(label.length);
          titleText = titleText.replace(/^[｜|\s,，.。、]+/, '');
        }
        const emoji = extractEmoji(titleText);
        if (emoji && titleText.startsWith(emoji)) {
          titleText = titleText.substring(emoji.length).replace(/^[｜|\s,，.。、]+/, '');
        }
        if (titleText.length < 2) titleText = stripped;
        current = {
          id: `evt-${Date.now()}-${events.length}-${Math.random().toString(36).slice(2, 6)}`,
          timeLabel,
          timeValue: value,
          content: titleText.trim(),
          emoji,
        };
        continue;
      }

      // 其他 · 行 → 检查是否是事件类标题（如 "1.1｜事件链"）
      const hasEventKeyword = /事件[链]?/.test(afterPrefix);
      const hasSeparator = afterPrefix.includes('｜') || afterPrefix.includes('|');
      if (hasEventKeyword && hasSeparator && current) {
        events.push(current);
        const titleText = afterPrefix.replace(/^[\d.]+\s*[｜|]\s*/, '');
        current = {
          id: `evt-${Date.now()}-${events.length}-${Math.random().toString(36).slice(2, 6)}`,
          timeLabel: '',
          timeValue: null,
          content: titleText.trim(),
        };
      } else if (current) {
        current.content += '\n' + afterPrefix;
      }
      continue;
    }

    // 6. 非前缀行：检查是否是时间开头的新事件
    const cleanedLine = stripDatePrefix(line);
    const { label, value } = parseTime(cleanedLine);
    const isTimeStart = label && (
      cleanedLine.startsWith(label) ||
      cleanedLine.startsWith('约' + label) ||
      cleanedLine.startsWith('约 ' + label)
    );
    const isNumericTime = /^\d{1,2}[:：点]/.test(cleanedLine);
    const isFuzzyStart = FUZZY_TIMES.some(ft => cleanedLine.startsWith(ft.kw));

    if (isTimeStart || isNumericTime || isFuzzyStart) {
      if (current) events.push(current);

      let titleText = cleanedLine;
      if (label) {
        if (titleText.startsWith('约 ' + label)) titleText = titleText.substring(('约 ' + label).length);
        else if (titleText.startsWith('约' + label)) titleText = titleText.substring(('约' + label).length);
        else if (titleText.startsWith(label)) titleText = titleText.substring(label.length);
        titleText = titleText.replace(/^[｜|\s,，.。、]+/, '');
      }
      if (titleText.length < 2) titleText = cleanedLine;

      const emoji = extractEmoji(titleText);
      if (emoji && titleText.startsWith(emoji)) {
        titleText = titleText.substring(emoji.length).replace(/^[｜|\s,，.。、]+/, '');
      }

      current = {
        id: `evt-${Date.now()}-${events.length}-${Math.random().toString(36).slice(2, 6)}`,
        timeLabel: label || '',
        timeValue: value,
        content: titleText.trim(),
        emoji,
      };
    } else if (current) {
      current.content += (current.content ? '\n' : '') + cleanedLine;
    } else {
      current = {
        id: `evt-${Date.now()}-${events.length}-${Math.random().toString(36).slice(2, 6)}`,
        timeLabel: '',
        timeValue: null,
        content: cleanedLine,
      };
    }
  }

  if (current) events.push(current);
  return events.filter(e => e.content.trim().length >= 3);
}

/**
 * 从观察文本中解析 AI 观察条目
 * 支持两种格式：
 * 1. ### emoji 标题（来自 observations 字段）
 * 2. · X.X 标题 / ◦ emoji 标题（来自 content 中的【整体观察】区）
 */
function parseObservations(observations: string, extractedObs: string): AIObservation[] {
  const result: AIObservation[] = [];

  // 1. 解析 observations 字段（### 格式）
  if (observations && observations.trim() !== '待补。' && observations.trim() !== '') {
    const sections = observations.split(/^###\s+/m).filter(s => s.trim());

    for (const section of sections) {
      const lines = section.split('\n');
      const firstLine = lines[0].trim();
      if (!firstLine) continue;

      const emoji = extractEmoji(firstLine);
      let title = firstLine;
      if (emoji && title.startsWith(emoji)) {
        title = title.substring(emoji.length).trim();
      }

      let content = '';
      const colonIdx = title.indexOf('：');
      if (colonIdx > 0 && colonIdx < 40) {
        const before = title.substring(0, colonIdx).trim();
        const after = title.substring(colonIdx + 1).trim();
        content = after;
        if (lines.length > 1) {
          content += '\n' + lines.slice(1).join('\n').trim();
        }
        title = before;
      } else {
        content = lines.slice(1).join('\n').trim();
      }

      content = content.replace(/^---$/, '').trim();

      if (title || content) {
        result.push({
          id: `obs-${Date.now()}-${result.length}-${Math.random().toString(36).slice(2, 6)}`,
          title: title || '观察',
          content,
          emoji,
          isLegacy: true,
        });
      }
    }
  }

  // 2. 解析从 content 中提取的观察文本（· X.X 或 ◦ 格式）
  if (extractedObs.trim()) {
    const obsLines = extractedObs.split('\n');
    let currentObs: AIObservation | null = null;

    for (const rawLine of obsLines) {
      const line = rawLine.trim();
      if (!line) continue;

      // "· X｜标题" 或 "· X.X｜标题" 格式 → 新观察条目（必须有编号）
      const dotMatch = line.match(/^·\s*(\d+(?:\.\d+)?)\s*[｜|]\s*(.+)/);
      // "· X 标题" 或 "· X.X 标题" 格式（无分隔符但有编号）
      const dotNumberMatch = line.match(/^·\s*(\d+(?:\.\d+)?)\s+(.+)/);
      // "◦ emoji 标题" 格式 → 新观察条目
      const circleMatch = line.match(/^◦\s+(.*)/);

      if (dotMatch || dotNumberMatch) {
        if (currentObs) result.push(currentObs);

        const titleText = dotMatch ? dotMatch[2] : (dotNumberMatch ? dotNumberMatch[2] : line);
        const emoji = extractEmoji(titleText);
        let title = titleText;
        if (emoji && title.startsWith(emoji)) {
          title = title.substring(emoji.length).replace(/^[｜|\s,，.。、]+/, '').trim();
        }

        currentObs = {
          id: `obs-${Date.now()}-${result.length}-${Math.random().toString(36).slice(2, 6)}`,
          title: title || '观察',
          content: '',
          emoji,
          isLegacy: true,
        };
      } else if (circleMatch) {
        if (currentObs) result.push(currentObs);

        const titleText = circleMatch[1];
        const emoji = extractEmoji(titleText);
        let title = titleText;
        if (emoji && title.startsWith(emoji)) {
          title = title.substring(emoji.length).replace(/^[｜|\s,，.。、]+/, '').trim();
        }

        currentObs = {
          id: `obs-${Date.now()}-${result.length}-${Math.random().toString(36).slice(2, 6)}`,
          title: title || '观察',
          content: '',
          emoji,
          isLegacy: true,
        };
      } else if (line.startsWith('·')) {
        // "· 内容" 格式 → 当前观察的内容延续（不是新标题）
        const content = line.replace(/^·\s*/, '');
        if (currentObs) {
          currentObs.content += (currentObs.content ? '\n' : '') + content;
        } else {
          currentObs = {
            id: `obs-${Date.now()}-${result.length}-${Math.random().toString(36).slice(2, 6)}`,
            title: '观察',
            content: content,
            isLegacy: true,
          };
        }
      } else if (currentObs) {
        // 内容行
        currentObs.content += (currentObs.content ? '\n' : '') + line;
      } else {
        currentObs = {
          id: `obs-${Date.now()}-${result.length}-${Math.random().toString(36).slice(2, 6)}`,
          title: '观察',
          content: line,
          isLegacy: true,
        };
      }
    }
    if (currentObs) result.push(currentObs);
  }

  return result;
}

/** Notion 日记的原始 JSON 类型 */
interface NotionDiaryRaw {
  id: string;
  date: string;
  title: string;
  content: string;
  observations: string;
  goldenSentences: string[];
  relatedBooks: string[];
  excerpt: string;
}

/**
 * 将重组后的 Notion 日记数据转为 DiaryEntry 格式
 * 统一使用 DiaryEntry 结构，与书脉原生日记一致
 * 并应用 localStorage 中保存的编辑
 */
export const notionDiaryEntries: DiaryEntry[] = (diaryData as NotionDiaryRaw[]).map(entry => {
  // 一次性分区，避免重复计算
  const sections = splitContentSections(entry.content);

  // 合并金句：优先使用 goldenSentences 字段，为空时用提取的
  const allGoldenQuotes = (entry.goldenSentences && entry.goldenSentences.length > 0)
    ? entry.goldenSentences
    : sections.goldenQuotes;

  // 解析事件
  const events = parseEventsFromSection(sections.eventsContent);

  // 构建 DiaryEntry 以便识别片段
  const diaryEntry: DiaryEntry = {
    id: entry.id,
    date: entry.date,
    source: 'notion_sync' as const,
    events,
    observations: parseObservations(entry.observations, sections.observationsContent),
    goldenQuote: allGoldenQuotes[0],
    relatedBooks: entry.relatedBooks?.length > 0 ? entry.relatedBooks : undefined,
    createdAt: entry.date,
    rawContent: entry.content,
  };

  // 运行日记识别层，生成片段
  diaryEntry.fragments = recognizeFragments(diaryEntry);
  
  // 应用 localStorage 中保存的编辑
  if (diaryEntry.fragments) {
    diaryEntry.fragments = applyEditsToFragments(entry.id, diaryEntry.fragments);
  }

  return diaryEntry;
});

// 从所有日记生成候选书脉关系
export const allDiaryCandidateRelations = notionDiaryEntries.flatMap(entry =>
  generateDiaryCandidateRelations(entry)
);

// PDCA 校验：验证日记数据完整性
const validationResult = runValidation(diaryData);
console.log(printValidationResult(validationResult));

// 清理旧数据（首次加载时执行）
const cleanupResult = cleanupOldData();
if (cleanupResult.removedKeys.length > 0) {
  console.log('已清理旧数据:', cleanupResult.removedKeys);
}
