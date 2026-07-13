/**
 * 日记重组脚本 v3 - 优化版
 *
 * 改进点：
 * - 修复"观察者视角"section识别（加入观察类关键词）
 * - 改进观察与事件的匹配策略：增加关键词匹配权重
 * - 优化时间排序：确保时间段事件按开始时间正确排序
 * - 更好地处理"XX：YY"格式的观察条目
 * - 修复"中午"排在"11:55"之后的问题
 */

const fs = require('fs');
const path = require('path');

const rawData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'notion-diaries-cleaned.json'), 'utf-8')
);

// ============== Section 分类关键词 ==============
const EVENT_KEYWORDS = [
  '事件链', '时间线', '行动轨迹', '行程', '现实事件', 'L1 事件',
  '事实轨迹', '时间线与事件', '行动轨迹留痕', '输入', '时间线 + 资产',
  '时间线+资产', '时间线与资产', '今日事件', '今日时间线',
];

const OBSERVATION_KEYWORDS = [
  '观察链', '格物时刻', 'AI观察', 'L2', 'L3', 'L4', 'L5', 'L6',
  '感受', '需求', '模式', '规律', '心智模型', '观察',
  '猜想', '对照推论', '新增截面', '用户视角', '今日总结',
  '可抽象方法', '可复用', '经验', '夜间推演', '深层影响',
  '观察者视角', '观察者视角：', '观察者视角：我的现实事件切片',
  '观察者视角:我的现实事件切片',
];

const GOLDEN_KEYWORDS = [
  '今日金句', '今日一句话', '一句话收束', '一句话',
];

const APPENDIX_KEYWORDS = [
  '证据槽', '待补', '待回钉', '留白', '未结案', '明日提醒',
  '元数据', '待办', 'Parking Lot', '待补充', '未验证',
  '种子', '问题', '备注', '索引', '落库索引', '今日落库',
  '已挂接', '自检', '写法纪律', '写法校验', '今日校正',
  '开卷时刻', '原文摘录', '我原话', '证据', '提示原文',
  '推荐阅读顺序', '今夜落库说明', '分身命名', '跨环境迁移',
  '系统摩擦力', 'Event 的生活层', '今日餐桌', '最小留痕',
  '触发点原话', '讨论为什么', '道法相遇时刻',
  '身体指标', '睡眠/恢复', '全天产出', '产品 / 系统回写',
  '今日沉淀页', '后续待办', '可复用', '待观察', '初步判断',
  '元判断升级', '元规律', '教训', '待决定',
  '降温与私心披露', '猫之代码', '清晨收束', '架构灰度盲测',
  '绝妙时刻重命名', '§ 语言讨论', '我的现实事件切片',
  '元规律（今日）', '咖啡馆田野测试', '附记',
];

const NIGHT_ADDON_KEYWORDS = [
  '夜间补记', '晚间补记', '夜间阅读', '深夜读书', '深夜补记',
  '夜半收口', '夜间增补', '晚间自我观测', '睡前回响',
  '晚间延伸', '晚间星际旅行', '夜｜美学漫游',
  '午后补记',
];

const NOTE_KEYWORDS = [
  '读书笔记', '读书摘录', '书摘', '阅读笔记', '读书',
];

function classifySection(title) {
  const t = title;
  for (const kw of GOLDEN_KEYWORDS) if (t.includes(kw)) return 'golden';
  for (const kw of NIGHT_ADDON_KEYWORDS) if (t.includes(kw)) return 'nightAddon';
  for (const kw of EVENT_KEYWORDS) if (t.includes(kw)) return 'event';
  for (const kw of OBSERVATION_KEYWORDS) if (t.includes(kw)) return 'observation';
  for (const kw of NOTE_KEYWORDS) if (t.includes(kw)) return 'note';
  for (const kw of APPENDIX_KEYWORDS) if (t.includes(kw)) return 'appendix';
  return 'other';
}

// ============== 时间解析 ==============
function parseTime(text) {
  if (!text) return null;

  // 模式1: HH:MM - HH:MM 时间段，取开始时间
  let match = text.match(/(\d{1,2})[:：](\d{1,2})\s*[-~～]\s*\d{1,2}[:：]\d{1,2}/);
  if (match) {
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    if (hour >= 24) return hour * 60 + minute;
    return hour * 60 + minute;
  }

  // 模式2: HH:MM 或 HH.MM 或 HH点MM分
  match = text.match(/(\d{1,2})[:：.点](\d{1,2})/);
  if (match) {
    let hour = parseInt(match[1], 10);
    let minute = parseInt(match[2], 10);
    if (hour >= 24) return hour * 60 + minute;
    return hour * 60 + minute;
  }

  // 模式3: HH点（单独的小时）
  match = text.match(/(\d{1,2})点/);
  if (match) {
    const hour = parseInt(match[1], 10);
    return hour * 60;
  }

  // 模式4: 模糊时间词（更精确的排序）
  const fuzzyTimes = [
    { kw: '凌晨', val: 180 },
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

  for (const ft of fuzzyTimes) {
    if (text.includes(ft.kw)) {
      return ft.val;
    }
  }

  return null;
}

function extractTimeLabel(text) {
  if (!text) return '';

  // 时间段 HH:MM - HH:MM
  let match = text.match(/(\d{1,2}[:：]\d{1,2}\s*[-~～]\s*\d{1,2}[:：]\d{1,2})/);
  if (match) return match[1].replace(/：/g, ':');

  // HH:MM
  match = text.match(/(\d{1,2}[:：]\d{1,2})/);
  if (match) return match[1].replace(/：/g, ':');

  // HH点MM分 或 HH点
  match = text.match(/(\d{1,2}点(?:\d{1,2}分)?)/);
  if (match) return match[1];

  // 24:00+
  match = text.match(/(\d{1,2}:00\+)/);
  if (match) return match[1];

  // 模糊时间词
  const fuzzyKws = ['凌晨', '清晨', '晨起', '早起', '晨读', '早上', '上午', '午前',
    '中午', '午间', '午饭', '午后', '下午', '傍晚', '黄昏', '日落',
    '晚饭', '晚餐', '晚间', '晚上', '入夜', '深夜', '夜间', '半夜', '午夜'];
  for (const kw of fuzzyKws) {
    if (text.startsWith(kw) || text.includes(kw + '｜') || text.includes(kw + ' ')) {
      return kw;
    }
  }

  return '';
}

// ============== Emoji 提取 ==============
function extractEmoji(text) {
  const emojiMatch = text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/u);
  return emojiMatch ? emojiMatch[0] : null;
}

// ============== Section 解析 ==============
function parseSections(content) {
  const sections = [];
  const regex = /【([^】]+)】\s*\n([\s\S]*?)(?=\n【|$)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    sections.push({
      title: match[1].trim(),
      content: match[2].trim(),
      type: classifySection(match[1].trim()),
    });
  }

  if (sections.length === 0) {
    sections.push({
      title: '今日记录',
      content: content.trim(),
      type: 'event',
    });
  }

  return sections;
}

// ============== 从事件 section 中按时间行拆分为独立事件 ==============
function extractEventsFromSection(sectionContent, sectionTitle) {
  const events = [];
  const lines = sectionContent.split('\n');

  let currentEvent = null;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const timeLabel = extractTimeLabel(line);
    const timeVal = parseTime(line);
    const emoji = extractEmoji(line);

    // 判断是否是新事件开头
    let isNewEvent = false;

    // 条件1：行首有明确的时间标签
    if (timeLabel && (
      line.startsWith(timeLabel) ||
      line.startsWith(timeLabel + ' ') ||
      line.startsWith(timeLabel + '｜') ||
      line.startsWith(timeLabel + '|') ||
      line.startsWith(timeLabel + ',') ||
      line.startsWith(timeLabel + '，')
    )) {
      isNewEvent = true;
    }

    // 条件2：emoji 在行首附近 + 有时间相关内容
    if (!isNewEvent && emoji && timeVal !== null) {
      const emojiPos = line.indexOf(emoji);
      if (emojiPos < 8) isNewEvent = true;
    }

    // 条件3：行首是数字+点/冒号（时间格式）
    if (!isNewEvent && /^\d{1,2}[点:：]/.test(line)) {
      isNewEvent = true;
    }

    // 条件4：行首是模糊时间词
    if (!isNewEvent && /^(凌晨|清晨|晨起|早上|上午|中午|午后|下午|傍晚|晚上|夜间|深夜|半夜|晨读|午饭|晚饭|晚餐)/.test(line)) {
      // 但排除"XX与YY"这种情况（如"前额叶过载与糖分代偿"不是时间开头）
      const firstKw = line.match(/^(凌晨|清晨|晨起|早上|上午|中午|午后|下午|傍晚|晚上|夜间|深夜|半夜|晨读|午饭|晚饭|晚餐)/);
      if (firstKw) {
        const rest = line.substring(firstKw[0].length);
        // 如果后面跟着的是正常的事件描述（不是"与/和"等连接词），才算新事件
        if (!/^[与和及跟]/.test(rest)) {
          isNewEvent = true;
        }
      }
    }

    if (isNewEvent) {
      if (currentEvent) events.push(currentEvent);

      // 提取标题
      let titleText = line;
      let tl = timeLabel;
      if (!tl && timeVal !== null) tl = extractTimeLabel(line);

      // 移除时间前缀
      if (tl) {
        const idx = titleText.indexOf(tl);
        if (idx === 0) {
          titleText = titleText.substring(tl.length).replace(/^[｜|\s,，.。、]+/, '');
        }
      }

      // 移除开头的emoji
      if (emoji && titleText.startsWith(emoji)) {
        titleText = titleText.substring(emoji.length).replace(/^[｜|\s,，.。、]+/, '');
      }

      // 标题太短的话用整行
      if (titleText.length < 2) {
        titleText = line;
      }

      currentEvent = {
        timeLabel: tl || '',
        timeValue: timeVal,
        emoji: emoji,
        title: titleText.trim(),
        content: '',
        sectionTitle: sectionTitle,
      };
    } else if (currentEvent) {
      // 追加到当前事件内容
      let cleanLine = line.replace(/^[-*·•◦]\s+/, '');
      // 跳过纯列表符号行
      if (cleanLine.length > 0) {
        currentEvent.content += (currentEvent.content ? '\n' : '') + cleanLine;
      }
    } else {
      // section 开头的散文字
      if (!events.length) {
        currentEvent = {
          timeLabel: '',
          timeValue: null,
          emoji: null,
          title: line,
          content: '',
          sectionTitle: sectionTitle,
        };
      }
    }
  }

  if (currentEvent) events.push(currentEvent);

  // 过滤掉太短或太空的事件
  return events.filter(e =>
    (e.title && e.title.length > 1) ||
    (e.content && e.content.length > 5)
  );
}

// ============== 从观察 section 中提取观察条目 ==============
function extractObservationsFromSection(sectionContent, sectionTitle) {
  const observations = [];
  const lines = sectionContent.split('\n');

  let currentObs = null;

  for (let rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const isListItem = /^[·•\-\*◦]/.test(line);
    const hasEmoji = extractEmoji(line);
    const hasColon = line.includes('：');
    const colonIdx = line.indexOf('：');

    // 判断是否是新观察条目
    let isNewObs = false;

    // 条件1：列表项开头
    if (isListItem) {
      isNewObs = true;
    }

    // 条件2：行首有emoji
    if (!isNewObs && hasEmoji && line.indexOf(hasEmoji) < 5) {
      isNewObs = true;
    }

    // 条件3："标题：内容"格式（标题短，冒号在前30字内）
    if (!isNewObs && hasColon && colonIdx > 0 && colonIdx < 30) {
      const beforeColon = line.substring(0, colonIdx);
      // 标题中不能有逗号、句号等（说明是句子中间的冒号）
      if (!/[，。；,.;]/.test(beforeColon) && beforeColon.length > 1) {
        isNewObs = true;
      }
    }

    if (isNewObs) {
      if (currentObs) observations.push(currentObs);

      let titleText = line.replace(/^[·•\-\*◦]\s*/, '');
      const emoji = extractEmoji(titleText);

      let title = titleText;
      let content = '';

      // 从冒号处拆分标题和内容
      if (hasColon) {
        const cIdx = titleText.indexOf('：');
        if (cIdx > 0 && cIdx < 50) {
          const before = titleText.substring(0, cIdx);
          if (!/[，。；,.;]/.test(before)) {
            title = before.trim();
            content = titleText.substring(cIdx + 1).trim();
          }
        }
      }

      // 移除开头的emoji
      if (emoji && title.startsWith(emoji)) {
        title = title.substring(emoji.length).trim();
      }

      currentObs = {
        emoji: emoji,
        title: title,
        content: content,
        sectionTitle: sectionTitle,
      };
    } else if (currentObs) {
      let cleanLine = line.replace(/^[-*·•◦]\s+/, '');
      if (cleanLine.length > 0) {
        currentObs.content += (currentObs.content ? '\n' : '') + cleanLine;
      }
    } else {
      // 开头散文字
      if (!observations.length) {
        currentObs = {
          emoji: null,
          title: '',
          content: line,
          sectionTitle: sectionTitle,
        };
      }
    }
  }

  if (currentObs) observations.push(currentObs);
  return observations.filter(o =>
    (o.title && o.title.length > 1) ||
    (o.content && o.content.length > 10)
  );
}

// ============== 主重组函数 ==============
function restructureDiary(entry) {
  const sections = parseSections(entry.content);

  const eventItems = [];
  const observationItems = [];
  const goldenItems = [];
  const appendixItems = [];
  const noteItems = [];
  const otherItems = [];

  for (const section of sections) {
    if (section.type === 'event') {
      const events = extractEventsFromSection(section.content, section.title);
      for (const ev of events) eventItems.push(ev);
    } else if (section.type === 'observation') {
      const obs = extractObservationsFromSection(section.content, section.title);
      for (const o of obs) observationItems.push(o);
    } else if (section.type === 'golden') {
      const lines = section.content.split('\n')
        .filter(l => l.trim() && !l.includes('plain text') && !/^text\s*$/.test(l.trim()))
        .map(l => l.trim().replace(/^[-·•]\s*/, ''));
      for (const line of lines) {
        if (line.length > 5 && line.length < 200) goldenItems.push(line);
      }
    } else if (section.type === 'nightAddon') {
      const events = extractEventsFromSection(section.content, section.title);
      if (events.length > 0) {
        for (const ev of events) {
          if (ev.timeValue === null) ev.timeValue = 1320;
          if (!ev.timeLabel) ev.timeLabel = '夜间';
          eventItems.push(ev);
        }
      } else {
        eventItems.push({
          timeLabel: '夜间',
          timeValue: 1320,
          emoji: '🌙',
          title: section.title,
          content: section.content,
          sectionTitle: section.title,
        });
      }
    } else if (section.type === 'note') {
      noteItems.push({
        title: section.title,
        content: section.content,
      });
    } else if (section.type === 'appendix') {
      appendixItems.push({
        title: section.title,
        content: section.content,
      });
    } else {
      // 其他 section：尝试提取事件，否则保留为其他
      const events = extractEventsFromSection(section.content, section.title);
      if (events.length > 1) {
        for (const ev of events) {
          if (ev.timeValue === null) ev.timeValue = 720;
          eventItems.push(ev);
        }
      } else if (section.content && section.content.length > 30) {
        otherItems.push({
          title: section.title,
          content: section.content,
          sectionTitle: section.title,
        });
      }
    }
  }

  // 按时间排序事件
  eventItems.sort((a, b) => {
    const wa = a.timeValue !== null ? a.timeValue : 720;
    const wb = b.timeValue !== null ? b.timeValue : 720;
    // 如果时间相同，保持原有顺序（稳定排序）
    if (wa === wb) return 0;
    return wa - wb;
  });

  // ============== 观察与事件匹配 ==============
  const matchedObs = new Set();

  // 策略1: emoji 精确匹配
  for (const event of eventItems) {
    event.observations = [];
    if (event.emoji) {
      for (let i = 0; i < observationItems.length; i++) {
        if (matchedObs.has(i)) continue;
        const obs = observationItems[i];
        if (obs.emoji === event.emoji) {
          event.observations.push(obs);
          matchedObs.add(i);
        }
      }
    }
  }

  // 策略2: 关键词重叠匹配
  for (let i = 0; i < observationItems.length; i++) {
    if (matchedObs.has(i)) continue;
    const obs = observationItems[i];
    const obsTitle = obs.title || '';
    const obsContent = obs.content || '';
    const obsFullText = obsTitle + ' ' + obsContent;

    let bestMatch = null;
    let bestScore = 0;

    for (let j = 0; j < eventItems.length; j++) {
      const event = eventItems[j];
      const evTitle = event.title || '';
      const evContent = event.content || '';
      const evFullText = evTitle + ' ' + evContent;

      let score = 0;

      // 提取关键词（2字以上的词）
      const evWords = evFullText.split(/[，。、\s：:；;,.!?！？（）()【】\[\]「」""''《》\/\\]+/).filter(w => w.length >= 2);
      const uniqueWords = [...new Set(evWords)];

      for (const w of uniqueWords) {
        if (obsFullText.includes(w)) {
          score += w.length;
        }
      }

      // 时间邻近加成（3小时内）
      if (event.timeValue !== null && obs.timeValue !== null) {
        const diff = Math.abs(event.timeValue - obs.timeValue);
        if (diff < 180) score += (180 - diff) / 5;
      }

      if (score > bestScore && score >= 4) {
        bestScore = score;
        bestMatch = event;
      }
    }

    if (bestMatch) {
      bestMatch.observations.push(obs);
      matchedObs.add(i);
    }
  }

  // 未匹配的观察
  const unmatchedObs = observationItems.filter((_, i) => !matchedObs.has(i));

  // ============== 生成最终文本 ==============
  let finalText = '';

  // 时间线事件
  if (eventItems.length > 0) {
    for (let idx = 0; idx < eventItems.length; idx++) {
      const event = eventItems[idx];

      // 跳过空条目
      if ((!event.title || event.title.length < 2) &&
          (!event.content || event.content.length < 5)) continue;

      // 标题行
      let titleLine = '';
      if (event.timeLabel) {
        titleLine += event.timeLabel;
        if (event.emoji || event.title) titleLine += ' ';
      }
      if (event.emoji) {
        titleLine += event.emoji;
        if (event.title) titleLine += ' ';
      }
      if (event.title) {
        titleLine += event.title;
      }
      titleLine = titleLine.replace(/[，,：:\s、]+$/, '').trim();

      if (titleLine) {
        finalText += (finalText ? '\n\n' : '') + titleLine;
      }

      // 事件内容
      if (event.content) {
        const indented = event.content
          .split('\n')
          .map(l => '  ' + l)
          .join('\n');
        finalText += (titleLine ? '\n' : '') + indented;
      }

      // 嵌入观察
      if (event.observations && event.observations.length > 0) {
        for (const obs of event.observations) {
          let obsTitle = (obs.title || '观察').replace(/^[·•\-\*◦]\s*/, '');
          let obsLine = '  ◦ ';
          if (obs.emoji) {
            obsLine += obs.emoji + ' ';
          }
          obsLine += obsTitle;

          finalText += '\n' + obsLine;

          if (obs.content) {
            const obsContent = obs.content
              .split('\n')
              .map(l => '    ' + l)
              .join('\n');
            finalText += '\n' + obsContent;
          }
        }
      }
    }
  }

  // 整体观察（未匹配的）
  const meaningfulUnmatched = unmatchedObs.filter(o =>
    (o.title && o.title.length > 2) || (o.content && o.content.length > 15)
  );
  if (meaningfulUnmatched.length > 0) {
    finalText += '\n\n【整体观察】';
    for (const obs of meaningfulUnmatched) {
      let obsTitle = (obs.title || '观察').replace(/^[·•\-\*◦]\s*/, '');
      let obsLine = '\n· ';
      if (obs.emoji) {
        obsLine += obs.emoji + ' ';
      }
      obsLine += obsTitle;
      finalText += obsLine;

      if (obs.content) {
        const obsContent = obs.content
          .split('\n')
          .map(l => '  ' + l)
          .join('\n');
        finalText += '\n' + obsContent;
      }
    }
  }

  // 读书笔记
  if (noteItems.length > 0) {
    for (const note of noteItems) {
      if (note.content && note.content.length > 20) {
        finalText += '\n\n【' + note.title + '】\n' + note.content;
      }
    }
  }

  // 其他内容
  if (otherItems.length > 0) {
    for (const other of otherItems) {
      if (other.content && other.content.length > 30) {
        finalText += '\n\n【' + other.title + '】\n' + other.content;
      }
    }
  }

  // 金句
  const meaningfulGolden = goldenItems.filter(g => g.length > 5 && g.length < 200);
  if (meaningfulGolden.length > 0) {
    finalText += '\n\n【今日金句】';
    for (const g of meaningfulGolden) {
      finalText += '\n· ' + g;
    }
  }

  // 附记（只列有意义的标题）
  const meaningfulAppendix = appendixItems.filter(a =>
    a.title && a.title.length > 2 && a.title.length < 30 &&
    !a.title.includes('元数据') && !a.title.includes('写法')
  );
  if (meaningfulAppendix.length > 0) {
    finalText += '\n\n【附记】';
    for (const app of meaningfulAppendix) {
      finalText += '\n· ' + app.title;
    }
  }

  // 清理多余空行
  finalText = finalText.replace(/\n{3,}/g, '\n\n').trim();

  // 生成摘要
  const excerpt = finalText.substring(0, 100).replace(/\n/g, ' ').trim();

  return {
    ...entry,
    content: finalText,
    excerpt: excerpt,
  };
}

// ============== 执行 ==============
const restructuredData = rawData.map(restructureDiary);

const outputPath = path.join(__dirname, 'notion-diaries-restructured.json');
fs.writeFileSync(outputPath, JSON.stringify(restructuredData, null, 2), 'utf-8');

// 统计
console.log('=== 重组统计 ===');
console.log('总篇数:', restructuredData.length);

let goldenCount = 0;
let totalEvents = 0;
let totalObs = 0;

for (const entry of restructuredData) {
  if (entry.content.includes('今日金句')) goldenCount++;
}

console.log('有金句的日记:', goldenCount);
console.log('输出文件:', outputPath);

// 抽样展示
const sampleDates = ['2026-04-26', '2026-04-27', '2026-05-02', '2026-05-31', '2026-06-30', '2026-07-01', '2026-07-02'];
for (const date of sampleDates) {
  const sample = restructuredData.find(e => e.date === date);
  if (sample) {
    console.log('\n=== ' + date + ' ===');
    const lines = sample.content.split('\n');
    const preview = lines.slice(0, 25).join('\n');
    console.log(preview);
    if (lines.length > 25) console.log('...');
  } else {
    console.log('\n=== ' + date + ' === (未找到)');
  }
}
