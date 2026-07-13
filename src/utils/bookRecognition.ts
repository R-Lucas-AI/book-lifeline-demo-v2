import { wereadBooks } from '../data/wereadNotes';

interface BookInfo {
  title: string;
  author: string;
  cover?: string;
}

export const bookDatabase: BookInfo[] = wereadBooks.map((book: { title: string; author: string; cover?: string }) => ({
  title: book.title,
  author: book.author,
  cover: book.cover,
}));

const commonBookKeywords = ['书', '小说', '读', '阅读', '作者', '主角', '主人公', '故事', '人物'];

export function extractBookInfo(input: string): { title: string | null; author: string | null; isQuestion: boolean } {
  let title: string | null = null;
  let author: string | null = null;
  let isQuestion = false;

  if (input.includes('？') || input.includes('吗') || input.includes('什么') || input.includes('是谁') || input.includes('在哪')) {
    isQuestion = true;
  }

  const bookMatch = input.match(/《(.+?)》/);
  if (bookMatch) {
    title = bookMatch[1];
  }

  if (!title) {
    for (const book of bookDatabase) {
      if (input.includes(book.title)) {
        title = book.title;
        break;
      }
    }
  }

  if (!title) {
    for (const book of bookDatabase) {
      const titleParts = book.title.split(/[《》：:·\s]/).filter(p => p.length > 2);
      for (const part of titleParts) {
        if (input.includes(part)) {
          title = book.title;
          break;
        }
      }
      if (title) break;
    }
  }

  if (title) {
    const book = bookDatabase.find(b => b.title === title);
    if (book) {
      author = book.author;
    }
  }

  if (!author) {
    for (const book of bookDatabase) {
      if (input.includes(book.author)) {
        author = book.author;
        if (!title) {
          title = book.title;
        }
        break;
      }
    }
  }

  const hasBookKeywords = commonBookKeywords.some(kw => input.includes(kw));
  const hasQuestionKeywords = ['是什么', '讲的是', '内容是', '简介', '梗概', '人物', '角色', '结局', '讲了什么'].some(kw => input.includes(kw));
  if (hasBookKeywords && hasQuestionKeywords) {
    isQuestion = true;
  }

  return { title, author, isQuestion };
}

export function isSearchOrQuestionInput(input: string): boolean {
  const searchPatterns = [
    /是什么/, /讲的是/, /内容是/, /简介/, /梗概/, /人物/, /角色/, /结局/, /讲了什么/,
    /作者是/, /谁写的/, /写的是/, /出自哪/, /来自哪/, /哪个/, /哪本/,
    /读什么/, /推荐什么/, /找本书/, /搜索/, /查/, /读一下/, /看看/,
    /谁是/, /是谁/, /怎么样/, /好不好/, /值得读吗/, /好看吗/,
    /做什么/, /为什么/, /怎么/, /如何/, /何时/, /何地/, /多少/,
  ];

  return searchPatterns.some(pattern => pattern.test(input));
}
