import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { ReadingNode, EchoRelation, OldTrace, DiaryEntry, BookExcerpt, BookMeta } from '../types';
import { loadBookLibrary, findBookMetaInLibrary, updateBookInLibrary } from '../data/bookMetas';
import { generateBookMeta } from '../api';
import { mockAnalyzeInput, mockFindRelations } from '../data/mockData';
import { allDiaryCandidateRelations } from '../data/notionDiaries';

const STORAGE_KEY = 'booklifeline_state';
const STATE_VERSION = 'v3'; // 数据清理后升级版本

interface DiaryCandidateRelation {
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

interface PersistedState {
  confirmedRelations: EchoRelation[];
  booklifelineInputs: ReadingNode[];
  firstEncounterBooks: FirstEncounterBook[];
  diaryEntries: DiaryEntry[];
  bookExcerpts: BookExcerpt[];
  diaryCandidateRelations: DiaryCandidateRelation[];
}

interface FirstEncounterBook {
  bookTitle: string;
  bookAuthor?: string;
  bookTranslator?: string;
  readingNodeId: string;
  createdAt: string;
}

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { confirmedRelations: [], booklifelineInputs: [], firstEncounterBooks: [], diaryEntries: [], bookExcerpts: [], diaryCandidateRelations: [] };
    const wrapper = JSON.parse(raw) as { version?: string; data?: Partial<PersistedState> } | Partial<PersistedState>;
    // 版本检查：版本不匹配时清空旧数据
    if ('version' in wrapper && wrapper.version !== STATE_VERSION) {
      localStorage.removeItem(STORAGE_KEY);
      return { confirmedRelations: [], booklifelineInputs: [], firstEncounterBooks: [], diaryEntries: [], bookExcerpts: [], diaryCandidateRelations: [] };
    }
    const parsed = ('data' in wrapper && wrapper.data) ? wrapper.data : wrapper as Partial<PersistedState>;
    return {
      confirmedRelations: parsed.confirmedRelations || [],
      booklifelineInputs: parsed.booklifelineInputs || [],
      firstEncounterBooks: parsed.firstEncounterBooks || [],
      diaryEntries: parsed.diaryEntries || [],
      bookExcerpts: parsed.bookExcerpts || [],
      diaryCandidateRelations: parsed.diaryCandidateRelations || [],
    };
  } catch {
    return { confirmedRelations: [], booklifelineInputs: [], firstEncounterBooks: [], diaryEntries: [], bookExcerpts: [], diaryCandidateRelations: [] };
  }
}

function savePersistedState(state: PersistedState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STATE_VERSION, data: state }));
}

interface AppContextType {
  currentNode: ReadingNode | null;
  setCurrentNode: (node: ReadingNode | null) => void;
  relations: EchoRelation[];
  setRelations: (relations: EchoRelation[]) => void;
  traces: OldTrace[];
  setTraces: (traces: OldTrace[]) => void;
  confirmedRelations: EchoRelation[];
  addConfirmedRelation: (relation: EchoRelation) => void;
  removeConfirmedRelation: (relationId: string) => void;
  booklifelineInputs: ReadingNode[];
  addBooklifelineInput: (node: ReadingNode) => void;
  removeBooklifelineInput: (nodeId: string) => void;
  firstEncounterBooks: FirstEncounterBook[];
  addFirstEncounterBook: (book: FirstEncounterBook) => void;
  removeFirstEncounterBook: (bookTitle: string) => void;
  diaryEntries: DiaryEntry[];
  addDiaryEntry: (entry: DiaryEntry) => void;
  removeDiaryEntry: (entryId: string) => void;
  bookExcerpts: BookExcerpt[];
  addBookExcerpt: (excerpt: BookExcerpt) => void;
  removeBookExcerpt: (excerptId: string) => void;
  diaryCandidateRelations: DiaryCandidateRelation[];
  addDiaryCandidateRelation: (relation: DiaryCandidateRelation) => void;
  confirmDiaryCandidateRelation: (relationId: string) => void;
  rejectDiaryCandidateRelation: (relationId: string) => void;
  bookLibrary: Record<string, BookMeta>;
  getBookMeta: (title: string) => BookMeta | undefined;
  fetchBookMeta: (title: string, author?: string, forceRefresh?: boolean) => Promise<BookMeta | undefined>;
  saveBookMeta: (meta: BookMeta) => void;
  injectDemoData: () => Promise<void>;
  resetAllData: () => void;
  isDemoDataInjected: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [currentNode, setCurrentNode] = useState<ReadingNode | null>(null);
  const [relations, setRelations] = useState<EchoRelation[]>([]);
  const [traces, setTraces] = useState<OldTrace[]>([]);
  const [confirmedRelations, setConfirmedRelations] = useState<EchoRelation[]>(() => loadPersistedState().confirmedRelations);
  const [booklifelineInputs, setBooklifelineInputs] = useState<ReadingNode[]>(() => loadPersistedState().booklifelineInputs);
  const [firstEncounterBooks, setFirstEncounterBooks] = useState<FirstEncounterBook[]>(() => loadPersistedState().firstEncounterBooks);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(() => loadPersistedState().diaryEntries);
  const [bookExcerpts, setBookExcerpts] = useState<BookExcerpt[]>(() => loadPersistedState().bookExcerpts);
  const [diaryCandidateRelations, setDiaryCandidateRelations] = useState<DiaryCandidateRelation[]>(() => loadPersistedState().diaryCandidateRelations);
  const [bookLibrary, setBookLibrary] = useState<Record<string, BookMeta>>(() => loadBookLibrary());
  const [isDemoDataInjected, setIsDemoDataInjected] = useState<boolean>(false);
  const fetchingRef = useRef<Record<string, Promise<BookMeta | undefined>>>({});

  useEffect(() => {
    savePersistedState({ confirmedRelations, booklifelineInputs, firstEncounterBooks, diaryEntries, bookExcerpts, diaryCandidateRelations });
  }, [confirmedRelations, booklifelineInputs, firstEncounterBooks, diaryEntries, bookExcerpts, diaryCandidateRelations]);

  const addConfirmedRelation = useCallback((relation: EchoRelation) => {
    setConfirmedRelations(prev => {
      if (prev.some(r => r.id === relation.id)) return prev;
      return [...prev, { ...relation, confirmed: true }];
    });
  }, []);

  const removeConfirmedRelation = useCallback((relationId: string) => {
    setConfirmedRelations(prev => prev.filter(r => r.id !== relationId));
  }, []);

  const addBooklifelineInput = useCallback((node: ReadingNode) => {
    setBooklifelineInputs(prev => {
      const existing = prev.some(n => n.id === node.id);
      if (existing) {
        return prev.map(n => n.id === node.id ? node : n);
      }
      if (prev.some(n => n.rawText === node.rawText)) return prev;
      return [...prev, node];
    });
  }, []);

  const removeBooklifelineInput = useCallback((nodeId: string) => {
    setBooklifelineInputs(prev => prev.filter(n => n.id !== nodeId));
    setConfirmedRelations(prev => prev.filter(r => r.readingNodeId !== nodeId));
    setFirstEncounterBooks(prev => prev.filter(b => b.readingNodeId !== nodeId));
  }, []);

  const addFirstEncounterBook = useCallback((book: FirstEncounterBook) => {
    setFirstEncounterBooks(prev => {
      if (prev.some(b => b.bookTitle === book.bookTitle)) return prev;
      return [...prev, book];
    });
  }, []);

  const removeFirstEncounterBook = useCallback((bookTitle: string) => {
    setFirstEncounterBooks(prev => prev.filter(b => b.bookTitle !== bookTitle));
  }, []);

  const addDiaryEntry = useCallback((entry: DiaryEntry) => {
    setDiaryEntries(prev => {
      const existing = prev.some(e => e.id === entry.id);
      if (existing) {
        return prev.map(e => e.id === entry.id ? entry : e);
      }
      return [...prev, entry];
    });
  }, []);

  const removeDiaryEntry = useCallback((entryId: string) => {
    setDiaryEntries(prev => prev.filter(e => e.id !== entryId));
  }, []);

  const addBookExcerpt = useCallback((excerpt: BookExcerpt) => {
    setBookExcerpts(prev => {
      const existing = prev.some(e => e.id === excerpt.id);
      if (existing) {
        return prev.map(e => e.id === excerpt.id ? excerpt : e);
      }
      // 按书名+内容去重
      if (prev.some(e => e.bookTitle === excerpt.bookTitle && e.content === excerpt.content)) return prev;
      return [...prev, excerpt];
    });
  }, []);

  const removeBookExcerpt = useCallback((excerptId: string) => {
    setBookExcerpts(prev => prev.filter(e => e.id !== excerptId));
  }, []);

  const addDiaryCandidateRelation = useCallback((relation: DiaryCandidateRelation) => {
    setDiaryCandidateRelations(prev => {
      if (prev.some(r => r.id === relation.id)) return prev;
      return [...prev, relation];
    });
  }, []);

  const confirmDiaryCandidateRelation = useCallback((relationId: string) => {
    const candidate = diaryCandidateRelations.find(r => r.id === relationId);
    if (!candidate) return;

    setDiaryCandidateRelations(prev =>
      prev.map(r => r.id === relationId ? { ...r, status: 'confirmed' } : r)
    );

    const newNode: ReadingNode = {
      id: `diary-node-${candidate.id}`,
      rawText: candidate.fragmentContent,
      type: 'reflection',
      tags: ['日记来源'],
      bookTitle: candidate.bookTitle,
      bookAuthor: candidate.bookAuthor,
      createdAt: candidate.diaryDate,
    };

    setBooklifelineInputs(prev => {
      if (prev.some(n => n.id === newNode.id)) return prev;
      return [...prev, newNode];
    });

    const relationTypeMap: Record<string, EchoRelation['relationType']> = {
      reading_reflection: 'echo',
      source: 'source',
      encounter: 'encounter',
      echo: 'echo',
      contrast: 'contrast',
      question: 'question',
      example: 'example',
      correction: 'correction',
    };

    const mappedRelationType = relationTypeMap[candidate.relationType] || 'echo';

    const echoRelation: EchoRelation = {
      id: `diary-echo-${candidate.id}`,
      readingNodeId: newNode.id,
      oldTraceId: candidate.fragmentId,
      relationType: mappedRelationType,
      reason: candidate.reason,
      confirmed: true,
    };

    setConfirmedRelations(prev => {
      if (prev.some(r => r.id === echoRelation.id)) return prev;
      return [...prev, echoRelation];
    });
  }, [diaryCandidateRelations]);

  const rejectDiaryCandidateRelation = useCallback((relationId: string) => {
    setDiaryCandidateRelations(prev =>
      prev.map(r => r.id === relationId ? { ...r, status: 'rejected' } : r)
    );
  }, []);

  const getBookMeta = useCallback((title: string): BookMeta | undefined => {
    return findBookMetaInLibrary(bookLibrary, title);
  }, [bookLibrary]);

  const saveBookMeta = useCallback((meta: BookMeta) => {
    setBookLibrary(prev => updateBookInLibrary(prev, meta));
  }, []);

  const fetchBookMeta = useCallback(async (title: string, author?: string, forceRefresh = false): Promise<BookMeta | undefined> => {
    // 先查缓存
    const cached = findBookMetaInLibrary(bookLibrary, title);
    if (!forceRefresh && cached && cached.coreQuestion) return cached;

    // 防止重复请求
    const cacheKey = `${title}__${author || ''}`;
    if (cacheKey in fetchingRef.current) {
      return fetchingRef.current[cacheKey];
    }

    const promise = (async () => {
      try {
        const result = await generateBookMeta(title, author);
        // 保护现有数据：如果新搜索失败，保留旧的封面信息
        const finalResult = { ...result };
        if (!finalResult.coverUrl && cached?.coverUrl) {
          finalResult.coverUrl = cached.coverUrl;
        }
        if ((!finalResult.coverOptions || finalResult.coverOptions.length === 0) && cached?.coverOptions && cached.coverOptions.length > 0) {
          finalResult.coverOptions = cached.coverOptions;
        }
        setBookLibrary(prev => updateBookInLibrary(prev, finalResult as BookMeta));
        return finalResult;
      } catch {
        return cached;
      } finally {
        delete fetchingRef.current[cacheKey];
      }
    })();

    fetchingRef.current[cacheKey] = promise;
    return promise;
  }, [bookLibrary]);

  const injectDemoData = useCallback(async () => {
    const demoInputs = [
      '刚读完《世界简史》，麦克尼尔说"把人类历史作为一个整体来进行一番概览"，这句话本身平淡，但实际指向的，可能是人类社会组织方式的一次此后难以逆转的结构性变化。',
      '今天在想，专注力可能不是一种能力，而是一种免疫系统——你平时做的每一件小事都在保护或消耗它。',
      '《我的策展之道》里奥布里斯特说策展就是"做连接"，这不就是 Book Lifeline 在做的事吗？在书摘与书摘、书摘与感受之间建立连接。',
    ];

    const inputNodes: ReadingNode[] = demoInputs.map((text, i) => {
      const node = mockAnalyzeInput(text);
      node.id = `demo-input-${i}`;
      node.createdAt = new Date(Date.now() - (demoInputs.length - i) * 86400000).toISOString();
      return node;
    });

    const allRelations: EchoRelation[] = [];
    inputNodes.forEach(node => {
      const rels = mockFindRelations(node);
      rels.forEach(r => {
        r.id = `demo-rel-${node.id}-${r.oldTraceId}`;
        r.confirmed = true;
        allRelations.push(r);
      });
    });

    // 微信读书数据已通过 mockOldTraces 直接加载到页面，不需要再放入 bookExcerpts
    // bookExcerpts 仅用于书脉原生输入的书摘（source: 'booklifeline_input'）

    const demoFirstEncounterBooks: FirstEncounterBook[] = inputNodes
      .filter(n => n.bookTitle)
      .map((n, i) => ({
        bookTitle: n.bookTitle!,
        bookAuthor: n.bookAuthor,
        bookTranslator: n.bookTranslator,
        readingNodeId: n.id,
        createdAt: new Date(Date.now() - (inputNodes.length - i) * 86400000).toISOString(),
      }));

    setBooklifelineInputs(inputNodes);
    setConfirmedRelations(allRelations);
    setDiaryEntries([]); // Notion日记已通过 notionDiaryEntries 静态导入加载，不重复放入state
    setBookExcerpts([]); // 微信读书数据已通过 mockOldTraces 静态加载，不重复放入state
    setFirstEncounterBooks(demoFirstEncounterBooks);
    setDiaryCandidateRelations(allDiaryCandidateRelations);
    setIsDemoDataInjected(true);
  }, []);

  const resetAllData = useCallback(() => {
    setConfirmedRelations([]);
    setBooklifelineInputs([]);
    setFirstEncounterBooks([]);
    setDiaryEntries([]);
    setBookExcerpts([]);
    setDiaryCandidateRelations([]);
    setCurrentNode(null);
    setRelations([]);
    setTraces([]);
    setIsDemoDataInjected(false);
    setBookLibrary({});
    localStorage.removeItem('booklifeline_state');
    localStorage.removeItem('booklifeline_library');
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentNode,
        setCurrentNode,
        relations,
        setRelations,
        traces,
        setTraces,
        confirmedRelations,
        addConfirmedRelation,
        removeConfirmedRelation,
        booklifelineInputs,
        addBooklifelineInput,
        removeBooklifelineInput,
        firstEncounterBooks,
        addFirstEncounterBook,
        removeFirstEncounterBook,
        diaryEntries,
        addDiaryEntry,
        removeDiaryEntry,
        bookExcerpts,
        addBookExcerpt,
        removeBookExcerpt,
        diaryCandidateRelations,
        addDiaryCandidateRelation,
        confirmDiaryCandidateRelation,
        rejectDiaryCandidateRelation,
        bookLibrary,
        getBookMeta,
        fetchBookMeta,
        saveBookMeta,
        injectDemoData,
        resetAllData,
        isDemoDataInjected,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
