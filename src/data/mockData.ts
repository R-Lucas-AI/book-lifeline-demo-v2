import { OldTrace, ReadingNode, EchoRelation } from '../types';
import { notionDiaryEntries } from './notionDiaries';
import { wereadTraces, wereadBooks } from './wereadNotes';
import { extractBookInfo, isSearchOrQuestionInput } from '../utils/bookRecognition';

export { wereadBooks };
export { notionDiaryEntries };

/**
 * 微信读书全量数据（从 weread-notes.json 导入）
 */
export const wechatReadingTraces: OldTrace[] = wereadTraces;

/**
 * 旧痕迹数据 = 微信读书书摘
 * Notion 日记已转为 DiaryEntry 格式，通过 notionDiaryEntries 单独导出
 */
export const mockOldTraces: OldTrace[] = [
  ...wechatReadingTraces,
];

export const exampleInputs = [
  '刚读完《世界简史》，麦克尼尔说"把人类历史作为一个整体来进行一番概览"，这句话本身平淡，但实际指向的，可能是人类社会组织方式的一次此后难以逆转的结构性变化。',
  '今天在想，专注力可能不是一种能力，而是一种免疫系统——你平时做的每一件小事都在保护或消耗它。',
  '《我的策展之道》里奥布里斯特说策展就是"做连接"，这不就是 Book Lifeline 在做的事吗？在书摘与书摘、书摘与感受之间建立连接。',
];

export function mockAnalyzeInput(rawText: string): ReadingNode {
  const { title, author } = extractBookInfo(rawText);

  let type: ReadingNode['type'] = 'insight';
  const tags: string[] = [];

  if (isSearchOrQuestionInput(rawText)) {
    type = 'question';
  } else if (rawText.includes('思考') || rawText.includes('想')) {
    type = 'reflection';
  } else if (rawText.includes('看到') || rawText.includes('观察')) {
    type = 'observation';
  } else if (rawText.includes('？') || rawText.includes('吗')) {
    type = 'question';
  }

  if (rawText.includes('连接') || rawText.includes('系统')) {
    tags.push('连接');
    tags.push('系统');
  }
  if (rawText.includes('专注') || rawText.includes('免疫')) {
    tags.push('专注力');
    tags.push('免疫系统');
  }
  if (rawText.includes('标签') || rawText.includes('实在')) {
    tags.push('标签');
    tags.push('工作反思');
  }
  if (rawText.includes('策展') || rawText.includes('展览')) {
    tags.push('策展');
    tags.push('连接');
  }
  if (rawText.includes('关系') || rawText.includes('伦理')) {
    tags.push('关系');
    tags.push('伦理本位');
  }
  if (tags.length === 0) {
    tags.push('日常思考');
  }

  return {
    id: `node-${Date.now()}`,
    rawText,
    type,
    tags,
    bookTitle: title ?? undefined,
    bookAuthor: author ?? undefined,
    createdAt: new Date().toISOString(),
  };
}

/**
 * 关键词权重表：用于语义匹配
 * 按书名和关键词查找真实痕迹
 */
const keywordGroups: { keywords: string[]; bookTitles: string[]; relationType: EchoRelation['relationType']; reason: string }[] = [
  {
    keywords: ['连接', '系统', '策展', '展览'],
    bookTitles: ['世界简史', '我的策展之道'],
    relationType: 'source',
    reason: '你此刻提到的"连接"与这条旧痕迹指向同一个结构——把分散的元素组合成一个有意义的整体。',
  },
  {
    keywords: ['专注', '免疫', '重复'],
    bookTitles: ['专注的真相'],
    relationType: 'source',
    reason: '你此刻关于专注力的感受，与这条《专注的真相》划线形成溯源关系。',
  },
  {
    keywords: ['标签', '实在', '玫瑰', '词'],
    bookTitles: ['心安：致焦虑的时代', '心安'],
    relationType: 'echo',
    reason: '你此刻关于"标签与实在"的感受，与你之前在《心安》中记录的感悟形成回响。',
  },
  {
    keywords: ['关系', '伦理', '梁漱溟', '本位'],
    bookTitles: ['脉动中国'],
    relationType: 'source',
    reason: '你此刻关于"关系"的思考，追溯到许纪霖《脉动中国》中对梁漱溟"伦理本位"的阐述。',
  },
  {
    keywords: ['策展', '奇珍柜', 'wunderkammer', '分类'],
    bookTitles: ['我的策展之道'],
    relationType: 'source',
    reason: '你此刻关于策展与分类的思考，追溯到奥布里斯特在《我的策展之道》中对奇珍柜与现代博物馆的对比。',
  },
  {
    keywords: ['设计', '关系', '物质', '内田繁'],
    bookTitles: ['日本设计60年'],
    relationType: 'source',
    reason: '你此刻关于"关系逻辑"的感受，追溯到内田繁《日本设计60年》中"从物质逻辑到关系逻辑"的论述。',
  },
  {
    keywords: ['睡眠', '腺苷', '视交叉上核', 'S过程', 'C过程'],
    bookTitles: ['睡眠的科学'],
    relationType: 'source',
    reason: '你此刻关于睡眠与身体修复的感受，追溯到《睡眠的科学》中S过程与C过程的理论框架。',
  },
  {
    keywords: ['古琴', '浑厚', '清', '选琴'],
    bookTitles: ['古琴之道'],
    relationType: 'source',
    reason: '你此刻关于古琴审美的感受，追溯到《古琴之道》中的选琴标准。',
  },
  {
    keywords: ['迦太基', '海洋帝国', '商业帝国'],
    bookTitles: ['迦太基启示录：海洋帝国的崛起与覆亡'],
    relationType: 'source',
    reason: '你此刻关于海洋文明与商业帝国的思考，追溯到《迦太基启示录》中的历史样本。',
  },
  {
    keywords: ['说文解字', '字源', '部首'],
    bookTitles: ['说文解字'],
    relationType: 'source',
    reason: '你此刻关于汉字本义的思考，追溯到许慎《说文解字》的字源体系。',
  },
  {
    keywords: ['庄子', '逍遥', '齐物', '真人之息'],
    bookTitles: ['庄子'],
    relationType: 'source',
    reason: '你此刻关于自由与呼吸的感受，追溯到《庄子》的逍遥游与真人之息以踵。',
  },
  {
    keywords: ['道德经', '道法自然', '无为', '上善若水'],
    bookTitles: ['道德经'],
    relationType: 'source',
    reason: '你此刻关于道与自然的思考，追溯到老子《道德经》的核心观念。',
  },
  {
    keywords: ['海洋', '港口', '航路'],
    bookTitles: ['海洋与文明'],
    relationType: 'source',
    reason: '你此刻关于海洋与文明的感受，追溯到《海洋与文明》中的海路通道视角。',
  },
  {
    keywords: ['自由', '火种', ' liberty'],
    bookTitles: ['普罗米修斯的火种'],
    relationType: 'source',
    reason: '你此刻关于自由的思考，追溯到《普罗米修斯的火种》中的自由观念史。',
  },
  {
    keywords: ['仿生', '自然启发', '生物灵感'],
    bookTitles: ['当自然赋予科技灵感'],
    relationType: 'source',
    reason: '你此刻关于自然与科技的思考，追溯到《当自然赋予科技灵感》中的仿生学案例。',
  },
  {
    keywords: ['闲暇', '无聊', '罗素'],
    bookTitles: ['无聊与闲暇'],
    relationType: 'source',
    reason: '你此刻关于闲暇与无聊的思考，追溯到罗素《无聊与闲暇》中的哲学论述。',
  },
  {
    keywords: ['书写', '疗愈', '表达性书写'],
    bookTitles: ['书写自愈力'],
    relationType: 'source',
    reason: '你此刻关于书写与心理疗愈的感受，追溯到《书写自愈力》中的表达性书写方法。',
  },
];

export function mockFindRelations(node: ReadingNode, extraTraces: OldTrace[] = [] ): EchoRelation[] {
  const relations: EchoRelation[] = [];
  const text = node.rawText.toLowerCase();
  const matchedIds = new Set<string>();

  const allOldTraces = [...mockOldTraces, ...extraTraces];

  // 1. 基于书名匹配（保底规则，每本书最多取2条，优先想法）
  if (node.bookTitle) {
    const bookMatches = allOldTraces
      .filter(t => t.bookTitle === node.bookTitle && !matchedIds.has(t.id) && t.id !== node.id)
      .sort((a, b) => {
        if (a.sourceType === 'thought' && b.sourceType !== 'thought') return -1;
        if (a.sourceType !== 'thought' && b.sourceType === 'thought') return 1;
        return b.createdAt.localeCompare(a.createdAt);
      })
      .slice(0, 2);

    bookMatches.forEach(trace => {
      matchedIds.add(trace.id);
      const isFromExtra = extraTraces.some(t => t.id === trace.id);
      relations.push({
        id: `relation-${Date.now()}-${trace.id}`,
        readingNodeId: node.id,
        oldTraceId: trace.id,
        relationType: 'echo',
        reason: isFromExtra
          ? `这是你之前记录的一条感受，同样来自《${trace.bookTitle}》。不同时间读同一本书，想法却在呼应——这就是书脉的意义。`
          : `这条痕迹来自你之前读过的《${trace.bookTitle}》，与你此刻记录的是同一本书。你当时${trace.sourceType === 'bookmark' ? '划线标记了' : trace.sourceType === 'thought' ? '写下了想法' : '在日记中记下了'}："${trace.content.substring(0, 40)}..."，这与你的当前感受形成了跨时间的呼应。`,
        confirmed: false,
      });
    });
  }

  // 2. 基于关键词语义匹配（按书名查找真实痕迹）
  keywordGroups.forEach(group => {
    const hasKeyword = group.keywords.some(kw => text.includes(kw));
    if (hasKeyword) {
      const candidates = allOldTraces.filter(
        t => group.bookTitles.includes(t.bookTitle || '') && !matchedIds.has(t.id) && t.id !== node.id
      );
      const sorted = [...candidates].sort((a, b) => {
        if (a.sourceType === 'thought' && b.sourceType !== 'thought') return -1;
        if (a.sourceType !== 'thought' && b.sourceType === 'thought') return 1;
        return b.createdAt.localeCompare(a.createdAt);
      });
      const trace = sorted[0];
      if (trace) {
        matchedIds.add(trace.id);
        const isFromExtra = extraTraces.some(t => t.id === trace.id);
        relations.push({
          id: `relation-${Date.now()}-${trace.id}`,
          readingNodeId: node.id,
          oldTraceId: trace.id,
          relationType: group.relationType,
          reason: isFromExtra
            ? `你此刻关于"${group.keywords[0]}"的感受，与之前记录的一条想法形成了${group.relationType === 'echo' ? '回响' : group.relationType === 'source' ? '溯源' : '关联'}关系——同一个主题在不同时间出现了。`
            : group.reason,
          confirmed: false,
        });
      }
    }
  });

  // 3. 额外痕迹内容关键词匹配（用户之前的输入）
  if (extraTraces.length > 0 && relations.length < 3) {
    const inputKeywords = extractKeywords(node.rawText);
    const extraMatches: { trace: OldTrace; score: number }[] = [];

    extraTraces.forEach(trace => {
      if (matchedIds.has(trace.id) || trace.id === node.id) return;
      const traceKeywords = extractKeywords(trace.content);
      const overlap = inputKeywords.filter(k => traceKeywords.includes(k));
      if (overlap.length >= 2) {
        extraMatches.push({ trace, score: overlap.length });
      }
    });

    extraMatches
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .forEach(({ trace }) => {
        matchedIds.add(trace.id);
        relations.push({
          id: `relation-${Date.now()}-${trace.id}`,
          readingNodeId: node.id,
          oldTraceId: trace.id,
          relationType: 'echo',
          reason: `你此刻的感受与之前记录的一条想法形成了回响——你们在不同时间触碰了相似的主题。`,
          confirmed: false,
        });
      });
  }

  // 3. 日记关键词交叉匹配（从 Notion 日记中找内容关键词重叠）
  if (relations.length < 3) {
    const inputKeywords = extractKeywords(node.rawText);
    const diaryMatches: { entry: typeof notionDiaryEntries[0]; score: number }[] = [];

    notionDiaryEntries
      .forEach(entry => {
        const searchText = entry.events.map(e => e.content).join(' ') +
          ' ' + entry.observations.map(o => o.title + ' ' + o.content).join(' ') +
          ' ' + (entry.relatedBooks?.join(' ') || '');
        const traceKeywords = extractKeywords(searchText);
        const overlap = inputKeywords.filter(k => traceKeywords.includes(k));
        if (overlap.length >= 2) {
          diaryMatches.push({ entry, score: overlap.length });
        }
      });

    diaryMatches
      .sort((a, b) => b.score - a.score)
      .slice(0, 3 - relations.length)
      .forEach(({ entry }) => {
        matchedIds.add(entry.id);
        relations.push({
          id: `relation-${Date.now()}-${entry.id}`,
          readingNodeId: node.id,
          oldTraceId: entry.id,
          relationType: 'echo',
          reason: `你此刻的感受与 ${entry.date} 的日记存在语义关联——它们可能在不同时间触碰过相似的主题。`,
          confirmed: false,
        });
      });
  }

  // 最多返回3条
  return relations.slice(0, 3);
}

/**
 * 简单关键词提取：去掉常见停用词，取2字以上的词
 */
function extractKeywords(text: string): string[] {
  const stopwords = ['的', '了', '是', '在', '我', '有', '和', '就', '不', '人', '都', '一', '一个', '上', '也', '很', '到', '说', '要', '去', '你', '会', '着', '没有', '看', '好', '自己', '这', '那', '它', '他', '她', '但', '而', '与', '及', '或', '如果', '因为', '所以', '但是', '不过', '其实', '什么', '怎么', '为什么', '可以', '应该', '可能', '觉得', '感觉', '认为', '发现', '想到', '问题', '时候', '地方', '东西', '事情'];
  // 简单分词：按标点和空格切分，再取2字以上片段
  const segments = text.replace(/[^\u4e00-\u9fa5a-zA-Z]/g, ' ').split(/\s+/).filter(s => s.length >= 2);
  return segments.filter(s => !stopwords.includes(s));
}

export function getTraceById(id: string): OldTrace | undefined {
  // 先从微信读书书摘中查找
  const trace = mockOldTraces.find(t => t.id === id);
  if (trace) return trace;

  // 从 Notion 日记片段中查找
  for (const diaryEntry of notionDiaryEntries) {
    const fragment = diaryEntry.fragments?.find(f => f.fragmentId === id);
    if (fragment) {
      return {
        id: fragment.fragmentId,
        content: fragment.rawQuote,
        originalText: fragment.rawQuote,
        chapter: diaryEntry.date,
        source: 'notion',
        sourceType: 'diary',
        bookTitle: fragment.relatedBooks?.[0],
        bookAuthor: fragment.relatedAuthors?.[0],
        createdAt: diaryEntry.date,
      };
    }
  }

  // 再从 Notion 日记中查找（转为 OldTrace 兼容格式）
  const diaryEntry = notionDiaryEntries.find(e => e.id === id);
  if (diaryEntry) {
    return {
      id: diaryEntry.id,
      content: diaryEntry.events.map(e => `${e.timeLabel} ${e.content}`).join('\n'),
      originalText: diaryEntry.events[0]?.content || '',
      chapter: diaryEntry.date,
      source: 'notion',
      sourceType: 'diary',
      bookTitle: diaryEntry.relatedBooks?.[0],
      createdAt: diaryEntry.date,
    };
  }

  return undefined;
}
