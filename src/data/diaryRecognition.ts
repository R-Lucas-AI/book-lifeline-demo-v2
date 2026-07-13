import { DiaryEntry, DiaryFragment, DiaryFragmentType, EventSegment, BookThread, CandidateRelation, DiaryEvent } from '../types';

export interface DiaryCandidateRelation {
  id: string;
  fragmentId: string;
  diaryEntryId: string;
  bookTitle: string;
  bookAuthor?: string;
  relationType: 'echo' | 'source' | 'encounter' | 'reading_reflection' | 'contrast' | 'question' | 'example' | 'correction';
  reason: string;
  fragmentContent: string;
  diaryDate: string;
  createdAt: string;
  status: 'pending' | 'confirmed' | 'rejected';
}

export function generateDiaryCandidateRelations(entry: DiaryEntry): DiaryCandidateRelation[] {
  const candidates: DiaryCandidateRelation[] = [];

  const CONTRAST_KEYWORDS = [
    '对比', '对照', '相反', '不同', '差异', '区别', '比较', '相对',
    '但是', '然而', '反而', '却', '不像', '不同于',
  ];

  const QUESTION_KEYWORDS = [
    '问题', '疑问', '为什么', '如何', '怎样', '什么', '怎么',
    '能否', '是否', '吗', '呢', '难道', '究竟',
  ];

  const EXAMPLE_KEYWORDS = [
    '例子', '比如', '例如', '举例', '如', '比如', '譬如',
    '例如说', '比如说', '举例来说',
  ];

  const CORRECTION_KEYWORDS = [
    '不对', '错误', '纠正', '修正', '更正', '不是', '并非',
    '其实', '实际上', '应该是', '正确的是',
  ];

  entry.fragments?.forEach(fragment => {
    if (!fragment.relatedBooks || fragment.relatedBooks.length === 0) return;

    fragment.relatedBooks.forEach((bookTitle, bookIndex) => {
      let relationType: DiaryCandidateRelation['relationType'] = 'echo';
      let reason = '';

      if (CONTRAST_KEYWORDS.some(kw => fragment.rawQuote.includes(kw))) {
        relationType = 'contrast';
        reason = `日记中对《${bookTitle}》的观点进行了对照或对比分析。`;
      } else if (QUESTION_KEYWORDS.some(kw => fragment.rawQuote.includes(kw))) {
        relationType = 'question';
        reason = `日记中对《${bookTitle}》提出了问题或追问。`;
      } else if (EXAMPLE_KEYWORDS.some(kw => fragment.rawQuote.includes(kw))) {
        relationType = 'example';
        reason = `日记中以《${bookTitle}》为例进行了阐述或论证。`;
      } else if (CORRECTION_KEYWORDS.some(kw => fragment.rawQuote.includes(kw))) {
        relationType = 'correction';
        reason = `日记中对《${bookTitle}》的观点进行了修正或补充。`;
      } else if (fragment.type.includes('ReadingReflection')) {
        relationType = 'reading_reflection';
        reason = `日记中关于《${bookTitle}》的读书感悟，可能是一次书脉回响。`;
      } else if (fragment.type.includes('ReadingAction')) {
        relationType = 'encounter';
        reason = `日记中记录了与《${bookTitle}》的相遇。`;
      } else if (fragment.type.includes('BookMention')) {
        relationType = 'source';
        reason = `日记中提到了《${bookTitle}》。`;
      } else {
        relationType = 'echo';
        reason = `日记片段与《${bookTitle}》相关，可能是一次潜在的书脉回响。`;
      }

      candidates.push({
        id: `candidate-${entry.id}-${fragment.fragmentId}-${bookIndex}`,
        fragmentId: fragment.fragmentId,
        diaryEntryId: entry.id,
        bookTitle,
        bookAuthor: fragment.relatedAuthors?.[0],
        relationType,
        reason,
        fragmentContent: fragment.rawQuote,
        diaryDate: entry.date,
        createdAt: new Date().toISOString(),
        status: 'pending',
      });
    });
  });

  return candidates;
}

const BOOK_TITLE_PATTERN = /《([^》]+)》/g;
const AUTHOR_PATTERN = /([\u4e00-\u9fa5]{2,4})\s*《/g;

const LIFE_EPISODE_KEYWORDS = [
  '去', '到', '走', '看见', '遇到', '吃', '喝', '逛', '散步', '骑车',
  '地铁', '公交', '打车', '回家', '出门', '路过', '参观', '逛',
  '保安', '问路', '找', '遇见', '发现', '看到', '听见',
];

const FELT_SENSE_KEYWORDS = [
  '感受', '感觉', '觉得', '想', '犹豫', '震动', '美', '震撼',
  '怕', '忍', '触动', '感动', '心动', '舒服', '难受',
  '焦虑', '平静', '安心', '烦躁', '喜悦', '悲伤', '兴奋',
];

const BOOK_MENTION_KEYWORDS = [
  '书', '读', '看', '翻', '目录', '书架', '图书馆', '出版',
  '作者', '译者', '出版社', 'ISBN', '豆瓣',
];

const READING_ACTION_KEYWORDS = [
  '找到', '翻阅', '查看', '阅读', '浏览', '书签', '划线',
  '笔记', '摘录', '查资料', '搜索', '检索',
];

const READING_REFLECTION_KEYWORDS = [
  '对应', '触发', '启发', '感悟', '联想', '体会', '理解',
  '思考', '反思', '发现', '意识到', '明白', '领悟',
];

const PRODUCT_THOUGHT_KEYWORDS = [
  '产品', '设计', '首屏', '功能', '交互', '界面', '用户',
  '体验', '需求', '原型', '开发', '代码', '架构',
  'Book Lifeline', '书脉', '生命线',
];

const AI_COLLABORATION_KEYWORDS = [
  'AI', 'Agent', '助手', '生成', '总结', '讨论', '对话',
  '协作', '反推', '校验', '查', '搜索', '分析',
];

const META_REFLECTION_KEYWORDS = [
  '日记', '写作', '记录', '方法', '反思', '思考', '总结',
  '原则', '规则', '系统', '模式', '方法论', '框架',
];

function extractBookTitles(text: string): string[] {
  const matches = text.match(BOOK_TITLE_PATTERN);
  return (matches || []).map(m => m.replace(/《|》/g, ''));
}

function extractAuthors(text: string): string[] {
  const matches = text.match(AUTHOR_PATTERN);
  return (matches || []).map(m => m.replace('《', '').trim());
}

function detectFragmentTypes(text: string): DiaryFragmentType[] {
  const types: DiaryFragmentType[] = [];

  if (LIFE_EPISODE_KEYWORDS.some(kw => text.includes(kw)) && 
      !text.includes('书') && !text.includes('读')) {
    types.push('LifeEpisode');
  }

  if (FELT_SENSE_KEYWORDS.some(kw => text.includes(kw))) {
    types.push('FeltSense');
  }

  if (BOOK_TITLE_PATTERN.test(text) || BOOK_MENTION_KEYWORDS.some(kw => text.includes(kw))) {
    types.push('BookMention');
  }

  if (READING_ACTION_KEYWORDS.some(kw => text.includes(kw)) && 
      (BOOK_TITLE_PATTERN.test(text) || text.includes('书'))) {
    types.push('ReadingAction');
  }

  if (READING_REFLECTION_KEYWORDS.some(kw => text.includes(kw)) && 
      BOOK_TITLE_PATTERN.test(text)) {
    types.push('ReadingReflection');
  }

  if (PRODUCT_THOUGHT_KEYWORDS.some(kw => text.includes(kw))) {
    types.push('ProductThought');
  }

  if (AI_COLLABORATION_KEYWORDS.some(kw => text.includes(kw))) {
    types.push('AICollaboration');
  }

  if (META_REFLECTION_KEYWORDS.some(kw => text.includes(kw)) && 
      text.includes('日记') && !text.includes('书')) {
    types.push('MetaReflection');
  }

  if (types.length === 0) {
    types.push('LifeEpisode');
  }

  return types;
}

function calculateConfidence(types: DiaryFragmentType[], text: string): number {
  let confidence = 0.5;

  if (types.includes('BookMention') && BOOK_TITLE_PATTERN.test(text)) {
    confidence += 0.2;
  }

  if (types.includes('ReadingReflection') && READING_REFLECTION_KEYWORDS.some(kw => text.includes(kw))) {
    confidence += 0.2;
  }

  if (types.includes('ProductThought') && PRODUCT_THOUGHT_KEYWORDS.some(kw => text.includes(kw))) {
    confidence += 0.1;
  }

  if (types.length > 2) {
    confidence += 0.1;
  }

  return Math.min(confidence, 0.95);
}

export function segmentEvents(events: DiaryEvent[], diaryId: string, diaryDate: string): EventSegment[] {
  return events.map((event, index) => {
    const authors = extractAuthors(event.content);
    
    return {
      segmentId: `seg-${diaryId}-${index}`,
      diaryId,
      diaryDate,
      order: index,
      timeLabel: event.timeLabel,
      timeValue: event.timeValue,
      title: event.content.substring(0, 50) + (event.content.length > 50 ? '...' : ''),
      summary: event.content.substring(0, 100) + (event.content.length > 100 ? '...' : ''),
      rawContent: event.content,
      people: authors.length > 0 ? authors : undefined,
      fragments: [],
    };
  });
}

export function recognizeFragments(entry: DiaryEntry): DiaryFragment[] {
  const tempFragments: DiaryFragment[] = [];

  entry.events.forEach((event, eventIndex) => {
    let text = event.content;
    
    text = text.replace(/^[：:]\s*/, '');
    text = text.replace(/：\s*$/g, '');
    text = text.replace(/\s+/g, ' ').trim();
    
    if (text.length < 3) return;

    const bookTitles = extractBookTitles(text);
    const authors = extractAuthors(text);
    const types = detectFragmentTypes(text);
    const confidence = calculateConfidence(types, text);

    let title = text;
    const colonMatch = text.match(/^[^：:]+[：:]\s*(.+)$/);
    if (colonMatch) {
      title = colonMatch[1];
    }
    if (title.length > 50) {
      title = title.substring(0, 50) + '...';
    }

    tempFragments.push({
      fragmentId: `frag-${entry.id}-${eventIndex}`,
      sourceDiaryId: entry.id,
      sourceDiaryDate: entry.date,
      eventSegmentId: `seg-${entry.id}-${eventIndex}`,
      type: types,
      rawQuote: text,
      normalizedTitle: title,
      lifeContext: types.includes('LifeEpisode') ? text.substring(0, 50) : undefined,
      relatedBooks: bookTitles.length > 0 ? bookTitles : undefined,
      relatedAuthors: authors.length > 0 ? authors : undefined,
      userThought: types.includes('ReadingReflection') ? text : undefined,
      confidence,
      needsUserReview: confidence < 0.7,
      position: {
        startLine: eventIndex * 2,
        endLine: eventIndex * 2 + 1,
      },
      timeLabel: event.timeLabel,
      timeValue: event.timeValue,
    });
  });

  const mergedFragments: DiaryFragment[] = [];
  tempFragments.forEach((frag, index) => {
    if (frag.rawQuote.length < 15 && index > 0) {
      const prev = mergedFragments[mergedFragments.length - 1];
      if (prev) {
        prev.rawQuote += ` ${frag.rawQuote}`;
        if (prev.relatedBooks && frag.relatedBooks) {
          prev.relatedBooks = [...new Set([...prev.relatedBooks, ...frag.relatedBooks])];
        } else if (frag.relatedBooks) {
          prev.relatedBooks = frag.relatedBooks;
        }
        prev.type = [...new Set([...prev.type, ...frag.type])];
      }
    } else {
      mergedFragments.push(frag);
    }
  });

  return mergedFragments;
}

export function buildBookThreads(fragments: DiaryFragment[]): BookThread[] {
  const bookMap = new Map<string, DiaryFragment[]>();

  fragments.forEach(fragment => {
    fragment.relatedBooks?.forEach(bookTitle => {
      const existing = bookMap.get(bookTitle) || [];
      existing.push(fragment);
      bookMap.set(bookTitle, existing);
    });
  });

  const threads: BookThread[] = [];

  bookMap.forEach((fragments, bookTitle) => {
    const contextSummary = fragments
      .map(f => f.lifeContext || f.normalizedTitle)
      .join('; ')
      .substring(0, 200);

    threads.push({
      threadId: `thread-${bookTitle.replace(/《|》/g, '')}`,
      bookTitle,
      fragments,
      contextSummary: contextSummary + (contextSummary.length >= 200 ? '...' : ''),
    });
  });

  return threads;
}

export function generateCandidateRelations(fragments: DiaryFragment[], bookThreads: BookThread[]): CandidateRelation[] {
  const relations: CandidateRelation[] = [];

  fragments.forEach(fragment => {
    if (fragment.type.includes('ReadingReflection') && fragment.relatedBooks?.length) {
      fragment.relatedBooks.forEach(bookTitle => {
        const thread = bookThreads.find(t => t.bookTitle === bookTitle);
        if (thread) {
          const relation: CandidateRelation = {
            id: `rel-${fragment.fragmentId}-${bookTitle.replace(/《|》/g, '')}`,
            fragmentId: fragment.fragmentId,
            bookTitle,
            relationType: 'echo',
            reason: `日记中提到了 ${bookTitle}，并有读书感悟：${fragment.rawQuote.substring(0, 100)}...`,
            confidence: fragment.confidence,
            status: fragment.confidence >= 0.8 ? 'pending' : 'pending',
            createdAt: fragment.sourceDiaryDate,
          };
          relations.push(relation);
        }
      });
    }

    if (fragment.type.includes('ProductThought') && fragment.relatedBooks?.length) {
      fragment.relatedBooks.forEach(bookTitle => {
        const relation: CandidateRelation = {
          id: `rel-${fragment.fragmentId}-product-${bookTitle.replace(/《|》/g, '')}`,
          fragmentId: fragment.fragmentId,
          bookTitle,
          relationType: 'encounter',
          reason: `产品思考中提及 ${bookTitle}：${fragment.rawQuote.substring(0, 100)}...`,
          confidence: fragment.confidence * 0.8,
          status: 'pending',
          createdAt: fragment.sourceDiaryDate,
        };
        relations.push(relation);
      });
    }

    if (fragment.type.includes('FeltSense') && fragment.type.includes('BookMention')) {
      fragment.relatedBooks?.forEach(bookTitle => {
        const relation: CandidateRelation = {
          id: `rel-${fragment.fragmentId}-feeling-${bookTitle.replace(/《|》/g, '')}`,
          fragmentId: fragment.fragmentId,
          bookTitle,
          relationType: 'encounter',
          reason: `感受与书籍相关：${fragment.rawQuote.substring(0, 100)}...`,
          confidence: fragment.confidence * 0.7,
          status: 'pending',
          createdAt: fragment.sourceDiaryDate,
        };
        relations.push(relation);
      });
    }
  });

  return relations;
}

export function processDiaryEntry(entry: DiaryEntry): {
  eventSegments: EventSegment[];
  fragments: DiaryFragment[];
  bookThreads: BookThread[];
  candidateRelations: CandidateRelation[];
} {
  const eventSegments = segmentEvents(entry.events, entry.id, entry.date);
  const fragments = recognizeFragments(entry);
  const bookThreads = buildBookThreads(fragments);
  const candidateRelations = generateCandidateRelations(fragments, bookThreads);

  return {
    eventSegments,
    fragments,
    bookThreads,
    candidateRelations,
  };
}

export function processAllDiaries(entries: DiaryEntry[]): {
  allSegments: EventSegment[];
  allFragments: DiaryFragment[];
  allBookThreads: BookThread[];
  allCandidateRelations: CandidateRelation[];
} {
  const allSegments: EventSegment[] = [];
  const allFragments: DiaryFragment[] = [];
  const allBookThreads: BookThread[] = [];
  const allCandidateRelations: CandidateRelation[] = [];

  entries.forEach(entry => {
    const result = processDiaryEntry(entry);
    allSegments.push(...result.eventSegments);
    allFragments.push(...result.fragments);
    allBookThreads.push(...result.bookThreads);
    allCandidateRelations.push(...result.candidateRelations);
  });

  const mergedThreads = new Map<string, BookThread>();
  allBookThreads.forEach(thread => {
    const existing = mergedThreads.get(thread.bookTitle);
    if (existing) {
      existing.fragments.push(...thread.fragments);
      existing.contextSummary = (existing.contextSummary + '; ' + thread.contextSummary).substring(0, 200);
    } else {
      mergedThreads.set(thread.bookTitle, thread);
    }
  });

  return {
    allSegments,
    allFragments,
    allBookThreads: Array.from(mergedThreads.values()),
    allCandidateRelations,
  };
}

import { fragmentTypeMap } from '../types';

export { fragmentTypeMap };