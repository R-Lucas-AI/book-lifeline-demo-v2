/**
 * 日记内容持久化存储服务
 * 处理日记片段内容的修改保存到 localStorage
 */

const DIARY_EDITS_STORAGE_KEY = 'booklifeline_diary_edits';
const DIARY_EDITS_VERSION = 'v1';

interface DiaryEdit {
  fragmentId: string;
  diaryId: string;
  field: 'rawQuote' | 'userThought';
  newValue: string;
  updatedAt: string;
}

interface DiaryEditsStorage {
  version: string;
  edits: DiaryEdit[];
}

/**
 * 加载所有日记编辑记录
 */
export function loadDiaryEdits(): DiaryEdit[] {
  try {
    const raw = localStorage.getItem(DIARY_EDITS_STORAGE_KEY);
    if (!raw) return [];
    
    const storage = JSON.parse(raw) as DiaryEditsStorage | DiaryEdit[];
    
    // 处理旧版本数据
    if (Array.isArray(storage)) {
      return storage;
    }
    
    if (storage.version !== DIARY_EDITS_VERSION) {
      localStorage.removeItem(DIARY_EDITS_STORAGE_KEY);
      return [];
    }
    
    return storage.edits || [];
  } catch {
    return [];
  }
}

/**
 * 保存日记编辑记录
 */
export function saveDiaryEdit(
  fragmentId: string,
  diaryId: string,
  field: 'rawQuote' | 'userThought',
  newValue: string
): void {
  const edits = loadDiaryEdits();
  
  // 查找是否已有相同记录
  const existingIndex = edits.findIndex(
    e => e.fragmentId === fragmentId && e.field === field
  );
  
  const edit: DiaryEdit = {
    fragmentId,
    diaryId,
    field,
    newValue,
    updatedAt: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    edits[existingIndex] = edit;
  } else {
    edits.push(edit);
  }
  
  const storage: DiaryEditsStorage = {
    version: DIARY_EDITS_VERSION,
    edits,
  };
  
  localStorage.setItem(DIARY_EDITS_STORAGE_KEY, JSON.stringify(storage));
}

/**
 * 获取指定片段的编辑内容
 */
export function getDiaryEdit(
  fragmentId: string,
  field: 'rawQuote' | 'userThought'
): string | null {
  const edits = loadDiaryEdits();
  const edit = edits.find(e => e.fragmentId === fragmentId && e.field === field);
  return edit ? edit.newValue : null;
}

/**
 * 应用编辑到日记片段数组
 * 返回合并后的片段数据
 */
export function applyEditsToFragments(
  diaryId: string,
  fragments: any[]
): any[] {
  const edits = loadDiaryEdits();
  const diaryEdits = edits.filter(e => e.diaryId === diaryId);
  
  if (diaryEdits.length === 0) return fragments;
  
  return fragments.map(fragment => {
    const quoteEdit = diaryEdits.find(
      e => e.fragmentId === fragment.fragmentId && e.field === 'rawQuote'
    );
    const thoughtEdit = diaryEdits.find(
      e => e.fragmentId === fragment.fragmentId && e.field === 'userThought'
    );
    
    return {
      ...fragment,
      rawQuote: quoteEdit ? quoteEdit.newValue : fragment.rawQuote,
      userThought: thoughtEdit ? thoughtEdit.newValue : fragment.userThought,
    };
  });
}

/**
 * 清空所有日记编辑记录
 */
export function clearAllDiaryEdits(): void {
  localStorage.removeItem(DIARY_EDITS_STORAGE_KEY);
}

/**
 * 获取编辑统计信息
 */
export function getDiaryEditsStats(): {
  totalEdits: number;
  uniqueDiaries: number;
  uniqueFragments: number;
  lastEditTime: string | null;
} {
  const edits = loadDiaryEdits();
  
  return {
    totalEdits: edits.length,
    uniqueDiaries: new Set(edits.map(e => e.diaryId)).size,
    uniqueFragments: new Set(edits.map(e => e.fragmentId)).size,
    lastEditTime: edits.length > 0 
      ? edits.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0].updatedAt
      : null,
  };
}