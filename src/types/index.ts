export interface ReadingNode {
  id: string;
  rawText: string;
  type: 'insight' | 'question' | 'observation' | 'reflection';
  tags: string[];
  bookTitle?: string;
  bookAuthor?: string;
  bookTranslator?: string;
  bookCover?: string;
  doubanId?: string;
  createdAt: string;
}

export interface OldTrace {
  id: string;
  content: string;
  originalText?: string;
  chapter?: string;
  location?: string;
  source: 'wechat_reading' | 'notion' | 'booklifeline';
  sourceType: 'bookmark' | 'thought' | 'diary' | 'booklifeline_input';
  bookTitle?: string;
  bookAuthor?: string;
  bookTranslator?: string;
  createdAt: string;
}

export interface EchoRelation {
  id: string;
  readingNodeId: string;
  oldTraceId: string;
  relationType: 'echo' | 'contrast' | 'source' | 'example' | 'question' | 'correction' | 'encounter';
  reason: string;
  confirmed: boolean;
}

export interface Lifeline {
  id: string;
  readingNode: ReadingNode;
  relations: EchoRelation[];
  createdAt: string;
}

export type RelationType = EchoRelation['relationType'];

export const relationTypeMap: Record<RelationType, string> = {
  echo: '回响',
  contrast: '对照',
  source: '溯源',
  example: '例证',
  question: '追问',
  correction: '修正',
  encounter: '邂逅',
};

export const relationTypeColors: Record<RelationType, string> = {
  echo: 'var(--green)',
  contrast: 'var(--orange)',
  source: 'var(--purple)',
  example: 'var(--blue)',
  question: 'var(--green)',
  correction: 'var(--orange)',
  encounter: 'var(--blue)',
};

// ============== 日记系统类型 ==============

/** 日记来源：Notion 同步 / 书脉原生输入 */
export type DiarySource = 'notion_sync' | 'booklifeline_native';

/** 书摘来源：微信读书同步 / 书脉感受输入 */
export type ExcerptSource = 'wechat_reading' | 'booklifeline_input';

/** 日记事件（每个时间节点单独成行） */
export interface DiaryEvent {
  id: string;
  timeLabel: string;        // 例如 "上午 10:30"、"约 15:00"
  timeValue: number | null; // 从午夜开始的分钟数，用于排序
  content: string;          // 事件内容
  emoji?: string;
}

/** AI 观察 */
export interface AIObservation {
  id: string;
  title: string;
  content: string;
  emoji?: string;
  /** true = Notion 旧版 AI 观察；false = 书脉当前绑定的 AI 观察 */
  isLegacy: boolean;
}

/** 日记条目 */
export interface DiaryEntry {
  id: string;
  date: string;             // YYYY-MM-DD
  source: DiarySource;
  events: DiaryEvent[];
  observations: AIObservation[];
  goldenQuote?: string;     // 今日金句
  relatedBooks?: string[];
  createdAt: string;
  rawContent?: string;      // 清洗前原始内容
  fragments?: DiaryFragment[]; // 识别后的片段
}

// ============== 日记识别层类型 ==============

/**
 * 日记片段内容类型
 * A. LifeEpisode - 生活片段：去哪里、看见什么、遇到谁
 * B. FeltSense - 感受片段：当时的感受、心理活动
 * C. BookMention - 书籍提及：出现书名、作者、出版物、书架
 * D. ReadingAction - 读书行为：找到书、翻阅、看目录、查资料
 * E. ReadingReflection - 读书感悟：书里的内容与用户思考发生意义反应
 * F. ProductThought - 产品思考：Book Lifeline 的产品工作内容
 * G. AICollaboration - AI工作片段：和AI一起讨论、反推、校验
 * H. MetaReflection - 元反思：方法论层面的思考
 */
export type DiaryFragmentType = 
  | 'LifeEpisode' 
  | 'FeltSense' 
  | 'BookMention' 
  | 'ReadingAction' 
  | 'ReadingReflection' 
  | 'ProductThought' 
  | 'AICollaboration' 
  | 'MetaReflection';

/**
 * 日记片段 - 从日记中识别出的可连接单元
 */
export interface DiaryFragment {
  fragmentId: string;
  sourceDiaryId: string;
  sourceDiaryDate: string;
  eventSegmentId?: string;
  type: DiaryFragmentType[];
  rawQuote: string;
  normalizedTitle: string;
  lifeContext?: string;
  relatedBooks?: string[];
  relatedAuthors?: string[];
  userThought?: string;
  confidence: number;
  needsUserReview: boolean;
  position?: {
    startLine: number;
    endLine: number;
  };
  timeLabel?: string;
  timeValue?: number | null;
}

/**
 * 事件分段 - 按时间/事件切开的日记片段
 */
export interface EventSegment {
  segmentId: string;
  diaryId: string;
  diaryDate: string;
  order: number;
  timeLabel: string;
  timeValue: number | null;
  title: string;
  summary: string;
  rawContent: string;
  location?: string;
  people?: string[];
  tools?: string[];
  fragments?: DiaryFragment[];
}

/**
 * 书籍上下文线 - 同一本书在日记中的相关片段串
 */
export interface BookThread {
  threadId: string;
  bookTitle: string;
  bookAuthor?: string;
  fragments: DiaryFragment[];
  contextSummary: string;
}

/**
 * 候选关系 - 识别出的待确认关系
 */
export interface CandidateRelation {
  id: string;
  fragmentId: string;
  bookTitle?: string;
  bookAuthor?: string;
  relationType: RelationType;
  reason: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'rejected' | 'modified';
  createdAt: string;
}

/** 片段类型标签映射 */
export const fragmentTypeMap: Record<DiaryFragmentType, string> = {
  LifeEpisode: '生活片段',
  FeltSense: '感受片段',
  BookMention: '书籍提及',
  ReadingAction: '读书行为',
  ReadingReflection: '读书感悟',
  ProductThought: '产品思考',
  AICollaboration: 'AI协作',
  MetaReflection: '元反思',
};

/** 片段类型颜色映射 */
export const fragmentTypeColors: Record<DiaryFragmentType, string> = {
  LifeEpisode: 'var(--green)',
  FeltSense: 'var(--pink)',
  BookMention: 'var(--blue)',
  ReadingAction: 'var(--cyan)',
  ReadingReflection: 'var(--purple)',
  ProductThought: 'var(--orange)',
  AICollaboration: 'var(--yellow)',
  MetaReflection: 'var(--gray)',
};

/** 书摘（区分来源） */
export interface BookExcerpt {
  id: string;
  bookTitle: string;
  bookAuthor?: string;
  content: string;
  source: ExcerptSource;
  note?: string;            // 用户对书摘的批注
  chapter?: string;
  createdAt: string;
}

/** 日记来源标签映射 */
export const diarySourceMap: Record<DiarySource, string> = {
  notion_sync: 'Notion 同步',
  booklifeline_native: '书脉原生',
};

/** 书摘来源标签映射 */
export const excerptSourceMap: Record<ExcerptSource, string> = {
  wechat_reading: '微信读书',
  booklifeline_input: '书脉输入',
};

// ============== 书籍元信息 ==============

/**
 * 书籍元信息 — 一本书的核心信息概要
 * 这是一本书的"身份证"，与用户的阅读数据无关
 */
export interface BookMeta {
  /** 书名（与微信读书/书脉输入中的 bookTitle 对应） */
  title: string;
  /** 作者 */
  author?: string;
  /** 译者 */
  translator?: string;
  /** 核心问题：这本书想回答什么问题？ */
  coreQuestion?: string;
  /** 关键理念：这本书的核心概念（1-3条） */
  keyIdeas?: string[];
  /** 领域标签（如：历史/设计/哲学/科普） */
  category?: string;
  /** 关键词标签 */
  tags?: string[];
  /** 信息来源 */
  source?: 'seed' | 'ai_generated' | 'user_input' | 'douban_enhanced';
  /** 最后更新时间 */
  updatedAt?: string;
  /** ===== 豆瓣增强字段 ===== */
  /** 豆瓣书籍ID */
  doubanId?: string;
  /** ISBN */
  isbn?: string;
  /** 出版社 */
  publisher?: string;
  /** 出版日期 */
  publishDate?: string;
  /** 封面图URL（当前选中的封面） */
  coverUrl?: string;
  /** 所有封面候选URL（去重后），用户可切换选择 */
  coverOptions?: string[];
  /** 内容简介（豆瓣原始简介，作为AI提炼的依据） */
  summary?: string;
  /** 豆瓣标签 */
  doubanTags?: string[];
}
