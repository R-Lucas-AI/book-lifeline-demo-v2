/**
 * 日记重组脚本 v2 - 时间线优化版
 *
 * 目标：将分散的"事件链 / 观察链 / 金句 / 证据槽"等多块结构，
 *      重组为按时间顺序排列的统一时间线，观察嵌入对应事件后。
 *
 * v2 改进：
 * - 更精确的时间解析（支持多种格式：HH:MM、HH点、上午/中午/下午等）
 * - 从"时间线 + 资产"等section中按时间行拆分独立事件
 * - 观察与事件匹配：emoji锚点 + 关键词邻近匹配
 * - 统一输出格式：时间｜事件标题 + 缩进内容 + 嵌入观察
 * - 跨午夜处理：24:00+ 归入当天夜间，00:00-06:00 归入当天凌晨
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
  '时间线+资产', '时间线与资产',
];

const OBSERVATION_KEYWORDS = [
  '观察链', '格物时刻', 'AI观察', 'L2', 'L3', 'L4', 'L5', 'L6',
  '感受', '需求', '模式', '规律', '心智模型', '观察',
  '猜想', '对照推论', '新增截面', '用户视角', '今日总结',
  '可抽象方法', '可复用', '经验', '夜间推演', '深层影响',
  '观察者视角', '观察者视角：',
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
  '元规律（今日）',
];

const NIGHT_ADDON_KEYWORDS = [
  '夜间补记', '晚间补记', '夜间阅读', '深夜读书', '深夜补记',
  '夜半收口', '夜间增补', '晚间自我观测', '睡前回响',
  '晚间延伸', '晚间星际旅行', '夜｜美学漫游',
  '午后补记',
];

function classifySection(title) {
  const t = title;
  for (const kw of GOLDEN_KEYWORDS) if (t.includes(kw)) return 'golden';
  for (const kw of NIGHT_ADDON_KEYWORDS) if (t.includes(kw)) return 'nightAddon';
  for (const kw of EVENT_KEYWORDS) if (t.includes(kw)) return 'event';
  for (const kw of OBSERVATION_KEYWORDS) if (t.includes(kw)) return 'observation';
  for (const kw of APPENDIX_KEYWORDS) if (t.includes(kw)) return 'appendix';
  return 'other';
}

// ============== 时间解析 ==============
/**
 * 从文本中提取时间，返回分钟数（0-1440）用于排序
 * 特殊情况：24:00+ 算 1440+（当天深夜），凌晨 0-6 点算当天凌晨
 */
function parseTime(text) {
  if (!text) return null;

  // 模式1: HH:MM 或 HH.MM 或 HH点MM分
  let match = text.match(/(\d{1,2})[:：.点](\d{1,2})/);
  if (match) {
    let hour = parseInt(match[1], 10);
    let minute = parseInt(match[2], 10);
    // 24:00+ 处理：24点算当天深夜（1440），25点+加小时
    if (hour >= 24) {
      return hour * 60 + minute; // 保持原样用于排序（24*60=1440）
    }
    return hour * 60 + minute;
  }

  // 模式2: HH点（单独的小时）
  match = text.match(/(\d{1,2})点/);
  if (match) {
    const hour = parseInt(match[1], 10);
    return hour * 60;
  }

  // 模式3: 时间段 HH:MM - HH:MM，取开始时间
  match = text.match(/(\d{1,2})[:：](\d{1,2})\s*[-~～]\s*(\d{1,2})[:：](\d{1,2})/);
  if (match) {
    const hour = parseInt(match[1], 10);
    const minute = parseInt(match[2], 10);
    return hour * 60 + minute;
  }

  // 模式4: 模糊时间词
  const fuzzyTimes = [
    { kw: '凌晨', val: 180 },    // 03:00
    { kw: '清晨', val: 360 },    // 06:00
    { kw: '晨起', val: 420 },    // 07:00
    { kw: '早起', val: 420 },    // 07:00
    { kw: '晨读', val: 480 },    // 08:00
    { kw: '早上', val: 480 },    // 08:00
    { kw: '上午', val: 540 },    // 09:00
    { kw: '午前', val: 660 },    // 11:00
    { kw: '中午', val: 720 },    // 12:00
    { kw: '午间', val: 720 },    // 12:00
    { kw: '午饭', val: 720 },    // 12:00
    { kw: '午后', val: 780 },    // 13:00
    { kw: '下午', val: 900 },    // 15:00
    { kw: '傍晚', val: 1080 },   // 18:00
    { kw: '黄昏', val: 1080 },   // 18:00
    { kw: '日落', val: 1080 },   // 18:00
    { kw: '晚饭', val: 1140 },   // 19:00
    { kw: '晚餐', val: 1140 },   // 19:00
    { kw: '晚间', val: 1200 },   // 20:00
    { kw: '晚上', val: 1200 },   // 20:00
    { kw: '入夜', val: 1260 },   // 21:00
    { kw: '深夜', val: 1320 },   // 22:00
    { kw: '夜间', val: 1320 },   // 22:00
    { kw: '半夜', val: 1380 },   // 23:00
    { kw: '午夜', val: 1440 },   // 24:00
    { kw: '约', val: 0 },        // 忽略，需要结合上下文
  ];

  for (const ft of fuzzyTimes) {
    if (text.includes(ft.kw)) {
      return ft.val;
    }
  }

  return null;
}

/**
 * 从一行文字中提取时间显示文本（用于输出）
 */
function extractTimeLabel(text) {
  if (!text) return '';

  // 尝试提取 HH:MM 格式
  let match = text.match(/(\d{1,2}[:：]\d{1,2}(?:\s*[-~～]\s*\d{1,2}[:：]\d{1,2})?)/);
  if (match) return match[1].replace(/：/g, ':');

  // 尝试提取 HH点 或 HH点MM分
  match = text.match(/(\d{1,2}点(?:\d{1,2}分)?)/);
  if (match) return match[1];

  // 尝试提取 24:00+ 类似
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
  const lines = sectionContent.split('\n').map(l => l.trim()).filter(l => l);

  let currentEvent = null;

  for (const line of lines) {
    // 判断是否是新事件的开头：行首有时间标识
    const timeLabel = extractTimeLabel(line);
    const timeVal = parseTime(line);
    const hasTimePrefix = timeLabel && (
      line.startsWith(timeLabel) ||
      line.startsWith(timeLabel + ' ') ||
      line.startsWith(timeLabel + '｜') ||
      line.startsWith(timeLabel + '|')
    );

    // 也识别：emoji + 时间 或 时间 + emoji 的模式
    const emoji = extractEmoji(line);
    const emojiPos = emoji ? line.indexOf(emoji) : -1;

    const isNewEvent = hasTimePrefix ||
      (timeVal !== null && (emojiPos >= 0 && emojiPos < 10)) ||
      line.match(/^[\d]{1,2}[点:：]/) ||
      line.match(/^(凌晨|清晨|晨起|早上|上午|中午|午后|下午|傍晚|晚上|夜间|深夜|半夜)/);

    if (isNewEvent) {
      if (currentEvent) events.push(currentEvent);

      // 提取标题行（去掉时间和emoji后的剩余文字）
      let titleText = line;
      let tl = timeLabel;
      if (!tl && timeVal !== null) tl = extractTimeLabel(line);

      // 移除时间前缀
      if (tl) {
        const idx = titleText.indexOf(tl);
        if (idx === 0) {
          titleText = titleText.substring(tl.length).replace(/^[｜|\s,，.。]+/, '');
        }
      }

      // 移除开头的emoji
      if (emoji && titleText.startsWith(emoji)) {
        titleText = titleText.substring(emoji.length).replace(/^[｜|\s,，.。]+/, '');
      }

      // 如果标题太短或为空，用整行
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
      // 跳过列表符号前缀
      let cleanLine = line.replace(/^[-*·•◦]\s*/, '');
      currentEvent.content += (currentEvent.content ? '\n' : '') + cleanLine;
    } else {
      // section 开头的散文字，创建一个无时间事件
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
  return events;
}

// ============== 从观察 section 中提取观察条目 ==============
function extractObservationsFromSection(sectionContent, sectionTitle) {
  const observations = [];
  const lines = sectionContent.split('\n').map(l => l.trim()).filter(l => l);

  let currentObs = null;

  for (const line of lines) {
    // 观察条目的开头：· emoji + 标题 或 标题：内容
    const isListItem = line.match(/^[·•\-\*◦]\s+/);
    const hasEmoji = extractEmoji(line);
    const hasColon = line.includes('：') && line.indexOf('：') < 30;

    const isNewObs = isListItem ||
      (hasEmoji && line.indexOf(hasEmoji) < 5) ||
      (hasColon && line.length > 10 && !line.startsWith('\t') && !line.startsWith(' '));

    if (isNewObs) {
      if (currentObs) observations.push(currentObs);

      let titleText = line.replace(/^[·•\-\*◦]\s+/, '');
      const emoji = extractEmoji(titleText);

      // 提取标题（到冒号或前30字）
      let title = titleText;
      let content = '';
      if (hasColon && titleText.indexOf('：') < 50) {
        const colonIdx = titleText.indexOf('：');
        title = titleText.substring(0, colonIdx).trim();
        content = titleText.substring(colonIdx + 1).trim();
      }

      currentObs = {
        emoji: emoji,
        title: title,
        content: content,
        sectionTitle: sectionTitle,
      };
    } else if (currentObs) {
      let cleanLine = line.replace(/^[-*·•◦]\s*/, '');
      currentObs.content += (currentObs.content ? '\n' : '') + cleanLine;
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
  return observations.filter(o => o.title || o.content);
}

// ============== 主重组函数 ==============
function restructureDiary(entry) {
  const sections = parseSections(entry.content);

  const eventItems = [];
  const observationItems = [];
  const goldenItems = [];
  const appendixItems = [];
  const otherItems = [];

  for (const section of sections) {
    if (section.type === 'event') {
      const events = extractEventsFromSection(section.content, section.title);
      for (const ev of events) {
        eventItems.push(ev);
      }
    } else if (section.type === 'observation') {
      const obs = extractObservationsFromSection(section.content, section.title);
      for (const o of obs) {
        observationItems.push(o);
      }
    } else if (section.type === 'golden') {
      const lines = section.content.split('\n')
        .filter(l => l.trim() && !l.includes('plain text') && !/^text\s*$/.test(l.trim()))
        .map(l => l.trim());
      for (const line of lines) {
        if (line.length > 3) goldenItems.push(line.replace(/^[-·•]\s*/, ''));
      }
    } else if (section.type === 'nightAddon') {
      // 夜间补记：尝试提取事件，或整块作为夜间事件
      const events = extractEventsFromSection(section.content, section.title);
      if (events.length > 0) {
        for (const ev of events) {
          if (ev.timeValue === null) ev.timeValue = 1320; // 默认22点
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
    } else if (section.type === 'appendix') {
      appendixItems.push({
        title: section.title,
        content: section.content,
      });
    } else {
      // 其他 section：尝试作为事件处理，否则保留为其他
      const events = extractEventsFromSection(section.content, section.title);
      if (events.length > 1) {
        for (const ev of events) {
          if (ev.timeValue === null) ev.timeValue = 720; // 默认中午
          eventItems.push(ev);
        }
      } else if (section.content && section.content.length > 20) {
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
    return wa - wb;
  });

  // 将观察匹配到对应事件
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

  // 策略2: 关键词匹配（观察标题包含事件标题关键词，或反之）
  for (let i = 0; i < observationItems.length; i++) {
    if (matchedObs.has(i)) continue;
    const obs = observationItems[i];
    const obsTitle = obs.title || '';
    const obsContent = obs.content || '';

    let bestMatch = null;
    let bestScore = 0;

    for (const event of eventItems) {
      const evTitle = event.title || '';
      const evContent = event.content || '';

      let score = 0;
      // 检查标题中的关键词重叠
      const evWords = evTitle.split(/[，。、\s：:]+/).filter(w => w.length >= 2);
      for (const w of evWords) {
        if (obsTitle.includes(w) || obsContent.includes(w)) {
          score += w.length;
        }
      }

      // 时间邻近加成（时间越近分越高，但时间差必须小于3小时=180分钟）
      if (event.timeValue !== null && obs.timeValue !== null) {
        const diff = Math.abs(event.timeValue - obs.timeValue);
        if (diff < 180) score += (180 - diff) / 10;
      }

      if (score > bestScore && score >= 3) {
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
    for (const event of eventItems) {
      // 跳过内容太短且标题也短的空条目
      if ((!event.title || event.title.length < 2) &&
          (!event.content || event.content.length < 5)) continue;

      // 标题行：时间 + emoji + 标题
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

      // 去掉结尾的标点
      titleLine = titleLine.replace(/[，,：:\s]+$/, '');

      if (titleLine) {
        finalText += (finalText ? '\n\n' : '') + titleLine;
      }

      // 事件内容（缩进）
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
          let obsTitle = obs.title ? obs.title.replace(/^[·•\-\*◦]\s*/, '') : '';
          let obsLine = '  ◦ ';
          if (obs.emoji) {
            obsLine += obs.emoji + ' ';
          }
          obsLine += obsTitle || '观察';

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

  // 未匹配的观察（整体观察）
  const meaningfulUnmatched = unmatchedObs.filter(o =>
    (o.title && o.title.length > 2) || (o.content && o.content.length > 10)
  );
  if (meaningfulUnmatched.length > 0) {
    finalText += '\n\n【整体观察】';
    for (const obs of meaningfulUnmatched) {
      let obsTitle = obs.title ? obs.title.replace(/^[·•\-\*◦]\s*/, '') : '';
      let obsLine = '\n· ';
      if (obs.emoji) {
        obsLine += obs.emoji + ' ';
      }
      obsLine += obsTitle || '观察';
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

  // 其他内容
  if (otherItems.length > 0) {
    for (const other of otherItems) {
      if (other.content && other.content.length > 20) {
        finalText += '\n\n【' + other.title + '】\n' + other.content;
      }
    }
  }

  // 金句
  const meaningfulGolden = goldenItems.filter(g => g.length > 5 && g.length < 100);
  if (meaningfulGolden.length > 0) {
    finalText += '\n\n【今日金句】';
    for (const g of meaningfulGolden) {
      finalText += '\n· ' + g;
    }
  }

  // 附记（只列标题，内容太多）
  const meaningfulAppendix = appendixItems.filter(a =>
    a.title && a.title.length > 2 && a.title.length < 30
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

let totalEvents = 0;
let totalObs = 0;
let matchedObsCount = 0;
let goldenCount = 0;

for (const entry of restructuredData) {
  const eventCount = (entry.content.match(/\n\n/g) || []).length + 1;
  if (entry.content.includes('今日金句')) goldenCount++;
}

console.log('有金句的日记:', goldenCount);
console.log('输出文件:', outputPath);

// 抽样展示
const sampleDates = ['2026-04-26', '2026-04-27', '2026-05-02', '2026-05-31', '2026-06-30'];
for (const date of sampleDates) {
  const sample = restructuredData.find(e => e.date === date);
  if (sample) {
    console.log('\n=== ' + date + ' ===');
    console.log(sample.content.substring(0, 500));
    console.log('...');
  }
}
