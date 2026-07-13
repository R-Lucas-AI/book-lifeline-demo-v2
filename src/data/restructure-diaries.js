/**
 * 日记重组脚本 v2
 *
 * 目标：将分散的"事件链 / 观察链 / 金句 / 证据槽"等多块结构，
 *      重组为按时间顺序排列的统一时间线，观察嵌入对应事件后。
 *
 * 分类规则（基于 section 标题）：
 * - 事件类：事件链、时间线、行动轨迹、行程、现实事件、L1 事件
 * - 观察类：观察链、格物时刻、AI观察、L2感受/L3需求/L4模式/L5规律/L6心智模型
 * - 金句类：今日金句、今日一句话、一句话收束
 * - 附记类：证据槽、待补、待回钉、留白、未结案、明日提醒、元数据
 *
 * 匹配策略：
 * - 事件有 emoji 锚点 + 观察有相同 emoji → 精确匹配
 * - 事件无 emoji 但观察是整体感受 → 追加到时间线末尾
 * - 夜间补记 / 晚间补记 → 作为晚间事件加入时间线
 */

const fs = require('fs');
const path = require('path');

const rawData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'notion-diaries-cleaned.json'), 'utf-8')
);

// Section 分类关键词
const EVENT_KEYWORDS = [
  '事件链', '时间线', '行动轨迹', '行程', '现实事件', 'L1 事件',
  '事实轨迹', '时间线与事件', '行动轨迹留痕', '输入',
];

const OBSERVATION_KEYWORDS = [
  '观察链', '格物时刻', 'AI观察', 'L2', 'L3', 'L4', 'L5', 'L6',
  '感受', '需求', '模式', '规律', '心智模型', '观察',
  '猜想', '对照推论', '新增截面', '用户视角', '今日总结',
  '可抽象方法', '可复用', '经验', '夜间推演', '深层影响',
];

const GOLDEN_KEYWORDS = [
  '今日金句', '今日一句话', '一句话收束', '一句话',
];

const APPENDIX_KEYWORDS = [
  '证据槽', '待补', '待回钉', '留白', '未结案', '明日提醒',
  '元数据', '待办', ' Parking Lot', '待补充', '未验证',
  '种子', '问题', '备注', '索引', '落库索引', '今日落库',
  '已挂接', '自检', '写法纪律', '写法校验', '今日校正',
  '开卷时刻', '原文摘录', '我原话', '证据', '提示原文',
  '推荐阅读顺序', '今夜落库说明', '分身命名', '跨环境迁移',
  '系统摩擦力', 'Event 的生活层', '今日餐桌', '最小留痕',
  '触发点原话', '讨论为什么', '道法相遇时刻', '观察链（今日产出',
  '身体指标', '睡眠/恢复', '全天产出', '产品 / 系统回写',
  '今日沉淀页', '后续待办', '可复用', '待观察', '初步判断',
  '元判断升级', '元规律', '教训', '待决定',
  '降温与私心披露', '猫之代码', '清晨收束', '架构灰度盲测',
  '绝妙时刻重命名', '§ 语言讨论', '观察者视角', '我的现实事件切片',
];

const NIGHT_ADDON_KEYWORDS = [
  '夜间补记', '晚间补记', '夜间阅读', '深夜读书', '深夜补记',
  '夜半收口', '夜间增补', '晚间自我观测', '睡前回响',
  '晚间延伸', '晚间星际旅行', '夜｜美学漫游',
  '午后补记', '午后补记',
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

// 从 section 内容中提取带 emoji/时间锚的条目
function extractItems(content, sectionTitle) {
  const lines = content.split('\n').filter(l => l.trim());
  const items = [];
  let currentItem = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // 判断是否是新条目的开头
    // 模式1：时间 + emoji + ｜ （事件链）
    // 模式2：· emoji + 标题 （观察链）
    // 模式3：数字开头 （L系列）
    const isEventStart = /^[\d\u4e00-\u9fa5][^\n｜]*[｜|]/.test(trimmed) && !trimmed.startsWith('·');
    const isObsStart = trimmed.startsWith('· ') && /[^\u4e00-\u9fa5a-zA-Z0-9\s]/.test(trimmed.substring(2, 4));
    const isSubItem = /^\s+[-–]\s/.test(line) || /^\s+-\s+/.test(line);
    const isIndented = /^\s+/.test(line);

    if (isEventStart || isObsStart) {
      if (currentItem) items.push(currentItem);
      currentItem = {
        title: trimmed,
        content: '',
        emoji: extractEmoji(trimmed),
        timeAnchor: extractTimeAnchor(trimmed),
      };
    } else if (currentItem) {
      if (isSubItem || isIndented) {
        currentItem.content += (currentItem.content ? '\n' : '') + trimmed;
      } else {
        currentItem.content += (currentItem.content ? '\n' : '') + trimmed;
      }
    } else {
      // section 开头的散文字，作为整体背景
      if (!items.length) {
        currentItem = {
          title: '',
          content: trimmed,
          emoji: null,
          timeAnchor: null,
        };
      }
    }
  }
  if (currentItem) items.push(currentItem);
  return items;
}

function extractEmoji(text) {
  // 提取 emoji（在事件链中通常在 ｜ 前后，在观察链中在 · 之后）
  const emojiMatch = text.match(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{27BF}\u{1F000}-\u{1F02F}]/u);
  return emojiMatch ? emojiMatch[0] : null;
}

function extractTimeAnchor(text) {
  // 提取时间锚点文字（｜之前的部分）
  const match = text.match(/^(.+?)[｜|]/);
  return match ? match[1].trim() : null;
}

// 时间排序权重（模糊排序）
const TIME_ORDER = [
  '凌晨', '清晨', '晨起', '早起', '06', '07', '08', '09',
  '上午', '早上', '午前', '10', '11',
  '中午', '午间', '午饭', '12',
  '午后', '下午', '13', '14', '15', '16', '17',
  '傍晚', '黄昏', '日落', '18', '晚饭', '晚餐',
  '晚间', '晚上', '入夜', '19', '20', '21',
  '深夜', '夜间', '半夜', '22', '23', '00', '01', '02', '03', '04', '05',
];

function getTimeWeight(timeStr) {
  if (!timeStr) return 50;
  for (let i = 0; i < TIME_ORDER.length; i++) {
    if (timeStr.includes(TIME_ORDER[i])) return i;
  }
  return 50;
}

// 将 section 标题解析为结构化数据
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

  // 如果没有找到任何 section 标题，把整个内容作为一个事件 section
  if (sections.length === 0) {
    sections.push({
      title: '今日记录',
      content: content.trim(),
      type: 'event',
    });
  }

  return sections;
}

// 主重组函数
function restructureDiary(entry) {
  const sections = parseSections(entry.content);

  const eventItems = [];
  const observationItems = [];
  const goldenItems = [];
  const appendixItems = [];
  const otherItems = [];

  for (const section of sections) {
    const items = extractItems(section.content, section.title);

    if (section.type === 'event') {
      for (const item of items) {
        eventItems.push({ ...item, sectionTitle: section.title });
      }
    } else if (section.type === 'observation') {
      for (const item of items) {
        observationItems.push({ ...item, sectionTitle: section.title });
      }
    } else if (section.type === 'golden') {
      // 金句直接提取文字行
      const lines = section.content.split('\n')
        .filter(l => l.trim() && !l.includes('plain text') && !/^text\s*$/.test(l.trim()))
        .map(l => l.trim());
      for (const line of lines) {
        if (line.length > 3) goldenItems.push(line);
      }
    } else if (section.type === 'nightAddon') {
      // 夜间补记作为晚间事件加入
      eventItems.push({
        title: `夜间｜${section.title.replace(/^[\d｜\s]+/, '')}`,
        content: section.content,
        emoji: '🌙',
        timeAnchor: '夜间',
        sectionTitle: section.title,
      });
    } else if (section.type === 'appendix') {
      appendixItems.push({
        title: section.title,
        content: section.content,
      });
    } else {
      // 其他 section：尝试提取项目，失败则整块保留
      if (items.length > 1) {
        for (const item of items) {
          otherItems.push({ ...item, sectionTitle: section.title });
        }
      } else {
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
    const wa = getTimeWeight(a.timeAnchor);
    const wb = getTimeWeight(b.timeAnchor);
    return wa - wb;
  });

  // 将观察匹配到对应事件（通过 emoji 锚点）
  const matchedObs = new Set();
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

  // 未匹配的观察追加为整体观察
  const unmatchedObs = observationItems.filter((_, i) => !matchedObs.has(i));

  // 生成最终文本
  let finalText = '';

  // 时间线事件
  if (eventItems.length > 0) {
    for (const event of eventItems) {
      const titleLine = event.title || event.sectionTitle || '';
      if (titleLine) {
        finalText += (finalText ? '\n\n' : '') + titleLine;
      }
      if (event.content) {
        const indented = event.content.split('\n').map(l => '  ' + l).join('\n');
        finalText += (titleLine ? '\n' : '') + indented;
      }
      // 嵌入观察
      if (event.observations && event.observations.length > 0) {
        for (const obs of event.observations) {
          const obsTitle = obs.title.replace(/^·\s*/, '');
          finalText += '\n  ◦ ' + obsTitle;
          if (obs.content) {
            const obsContent = obs.content.split('\n').map(l => '    ' + l).join('\n');
            finalText += '\n' + obsContent;
          }
        }
      }
    }
  }

  // 未匹配的观察（整体观察）
  if (unmatchedObs.length > 0) {
    finalText += '\n\n【整体观察】';
    for (const obs of unmatchedObs) {
      const obsTitle = obs.title.replace(/^·\s*/, '');
      finalText += '\n· ' + obsTitle;
      if (obs.content) {
        const obsContent = obs.content.split('\n').map(l => '  ' + l).join('\n');
        finalText += '\n' + obsContent;
      }
    }
  }

  // 其他内容（如读书笔记、摘录等独立块）
  if (otherItems.length > 0) {
    for (const other of otherItems) {
      if (other.content && other.content.length > 10) {
        finalText += '\n\n【' + other.title + '】\n' + other.content;
      }
    }
  }

  // 金句
  if (goldenItems.length > 0) {
    finalText += '\n\n【今日金句】';
    for (const g of goldenItems) {
      finalText += '\n· ' + g;
    }
  }

  // 附记
  const meaningfulAppendix = appendixItems.filter(a =>
    a.content && a.content.length > 5 && a.content.length < 500
  );
  if (meaningfulAppendix.length > 0) {
    finalText += '\n\n【附记】';
    for (const app of meaningfulAppendix) {
      finalText += '\n· ' + app.title;
    }
  }

  // 清理多余空行
  finalText = finalText.replace(/\n{3,}/g, '\n\n').trim();

  return {
    ...entry,
    content: finalText,
    excerpt: finalText.substring(0, 80).replace(/\n/g, ' ').trim(),
  };
}

// 执行重组
const restructuredData = rawData.map(restructureDiary);

// 输出结果
const outputPath = path.join(__dirname, 'notion-diaries-restructured.json');
fs.writeFileSync(outputPath, JSON.stringify(restructuredData, null, 2), 'utf-8');

// 统计
console.log('=== 重组统计 ===');
console.log('总篇数:', restructuredData.length);

let totalEvents = 0;
let totalObs = 0;
let matchedObs = 0;
let goldenCount = 0;

restructuredData.forEach(entry => {
  const sections = parseSections(entry.content);
  const events = sections.filter(s => s.type === 'event').length;
  totalEvents += events;
  if (entry.content.includes('今日金句')) goldenCount++;
});

console.log('有金句的日记:', goldenCount);
console.log('输出文件:', outputPath);

// 抽样展示
console.log('\n=== 抽样：2026-06-29 ===');
const sample = restructuredData.find(e => e.date === '2026-06-29');
console.log(sample.content.substring(0, 800));
console.log('\n...\n');

console.log('=== 抽样：2026-05-15 ===');
const sample2 = restructuredData.find(e => e.date === '2026-05-15');
console.log(sample2.content.substring(0, 800));
console.log('\n...\n');
