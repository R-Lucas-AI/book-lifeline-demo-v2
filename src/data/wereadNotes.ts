import { OldTrace } from '../types';
import wereadData from './weread-notes.json';

interface WereadBookmark {
  bookmarkId: string;
  markText: string;
  chapterUid: number;
  createTime: number;
  colorStyle: number;
}

interface WereadReview {
  reviewId: string;
  content: string;
  abstract: string;
  range: string;
  chapterIdx: number;
  chapterName: string;
  createTime: number;
  star: number;
}

interface WereadBook {
  bookId: string;
  title: string;
  author: string;
  cover: string;
  reviewCount: number;
  noteCount: number;
  bookmarkCount: number;
  readingProgress: number;
  markedStatus: number;
  bookmarks: WereadBookmark[];
  reviews: WereadReview[];
}

const typedWereadData = wereadData as unknown as { totalBooks: number; books: WereadBook[] };

const targetBookTitles = [
  '如何阅读一本书',
  '诗经：美了千年却被淡忘',
  '易经的奥秘：完整版',
  '传习录',
  '中庸',
  '乡土中国（果麦经典）',
  '小窗幽记',
  '众神的样子：希腊神话与西方艺术',
  '文化伟人代表作图释书系：工具论',
  '论法的精神（中法双语版）',
  '世界简史',
  '枪炮、病菌与钢铁',
  '大历史：虚无与万物之间',
  '崩溃：社会如何选择成败兴亡',
  '思考，快与慢',
  '专注的真相',
  '从细菌到巴赫再回来',
  '生命3.0：AI超级智能与伦理边界重构',
  '人生的智慧',
  '悉达多（读客三个圈经典文库）',
  '异乡人',
  '心安：致焦虑的时代',
  '原则',
  '谈美',
  '艺术之美',
  '中世纪之美',
  '论优美感和崇高感',
  '演讲的力量（TED 思想的力量系列）',
  '非暴力沟通（修订版）',
  '亲密关系（第6版）',
  '大国大城：当代中国的统一、发展与平衡',
  '大仲马美食词典（壹力文库）',
  '卡尔·拉格斐的世界',
  '一色一生',
  '夏日走过山间（果麦经典）',
  '巨流河（纪念版）',
  '草叶集（译文名著精选）',
  '物种起源',
  '时间简史（第一推动丛书·宇宙系列）',
];

const filteredBooks = typedWereadData.books.filter(book => 
  targetBookTitles.includes(book.title)
);

const existingBookTitles = new Set(filteredBooks.map(book => book.title));

const missingBooks: WereadBook[] = targetBookTitles
  .filter(title => !existingBookTitles.has(title))
  .map(title => ({
    bookId: `missing-${title}`,
    title,
    author: '',
    cover: '',
    reviewCount: 0,
    noteCount: 0,
    bookmarkCount: 0,
    readingProgress: 0,
    markedStatus: 0,
    bookmarks: [],
    reviews: [],
  }));

const allTargetBooks = [...filteredBooks, ...missingBooks];

const tsToDate = (ts: number): string => new Date(ts * 1000).toISOString().split('T')[0];

/**
 * 将微信读书数据转为 OldTrace 格式（仅目标书单）
 * 划线 → bookmark 类型
 * 书评（想法）→ thought 类型
 * 没有数据的书籍生成一个虚拟 trace，确保在书列表中显示
 */
export const wereadTraces: OldTrace[] = allTargetBooks.flatMap(book => {
  const bookmarks = (book.bookmarks || []).map(bm => ({
    id: bm.bookmarkId,
    content: bm.markText,
    chapter: book.title,
    source: 'wechat_reading' as const,
    sourceType: 'bookmark' as const,
    bookTitle: book.title,
    bookAuthor: book.author || undefined,
    createdAt: tsToDate(bm.createTime),
  }));
  
  const reviews = (book.reviews || []).map(rv => ({
    id: rv.reviewId,
    content: rv.content,
    originalText: rv.abstract,
    chapter: rv.chapterName || book.title,
    location: rv.range,
    source: 'wechat_reading' as const,
    sourceType: 'thought' as const,
    bookTitle: book.title,
    bookAuthor: book.author || undefined,
    createdAt: tsToDate(rv.createTime),
  }));
  
  if (bookmarks.length === 0 && reviews.length === 0) {
    return [{
      id: `placeholder-${book.bookId}`,
      content: '',
      chapter: book.title,
      source: 'wechat_reading' as const,
      sourceType: 'bookmark' as const,
      bookTitle: book.title,
      bookAuthor: book.author || undefined,
      createdAt: '2026-01-01',
    }];
  }
  
  return [...bookmarks, ...reviews];
});

/**
 * 按书籍分组的微信读书数据（仅目标书单）
 */
export const wereadBooks = allTargetBooks.map(book => ({
  bookId: book.bookId,
  title: book.title,
  author: book.author,
  cover: book.cover,
  bookmarkCount: (book.bookmarks || []).length,
  reviewCount: (book.reviews || []).length,
  readingProgress: book.readingProgress,
}));
