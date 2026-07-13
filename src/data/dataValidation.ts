/**
 * 日记数据校验与清理脚本
 * PDCA循环：Plan-Do-Check-Act
 * 验证日记数据与书籍关系的完整性
 */

const DIARY_EDITS_STORAGE_KEY = 'booklifeline_diary_edits';
const RELATIONS_STORAGE_KEY = 'booklifeline_relations';
const CANDIDATE_RELATIONS_KEY = 'booklifeline_candidate_relations';

/**
 * Plan: 列出所有需要校验的项目
 */
function getChecklist() {
  return [
    { id: '1', name: '检查日记条目是否包含完整的书籍相关内容', type: 'content' },
    { id: '2', name: '检查 relatedBooks 字段是否完整', type: 'metadata' },
    { id: '3', name: '检查候选关系生成是否正确', type: 'relation' },
    { id: '4', name: '检查旧数据是否需要清理', type: 'cleanup' },
    { id: '5', name: '检查书籍名称一致性', type: 'consistency' },
  ];
}

/**
 * Do: 执行校验
 */
export function runValidation(diaries: any[]): ValidationResult {
  const result: ValidationResult = {
    passed: [],
    failed: [],
    warnings: [],
    stats: {
      totalDiaries: diaries.length,
      diariesWithBooks: 0,
      totalBooks: 0,
      uniqueBooks: new Set<string>(),
      diariesWithEmptyContent: 0,
    },
  };

  diaries.forEach((diary) => {
    const relatedBooks = diary.relatedBooks || [];
    
    // 检查是否包含书籍信息
    if (relatedBooks.length > 0) {
      result.stats.diariesWithBooks++;
      relatedBooks.forEach((book: string) => {
        result.stats.uniqueBooks.add(book);
        result.stats.totalBooks++;
      });
    }

    // 检查内容是否为空
    if (!diary.content || diary.content.trim() === '') {
      result.stats.diariesWithEmptyContent++;
      result.failed.push({
        checklistId: '1',
        message: `日记 ${diary.id} (${diary.date}) 内容为空`,
        diaryId: diary.id,
      });
    }

    // 检查内容是否包含书籍引用
    if (relatedBooks.length > 0) {
      let hasBookReference = false;
      relatedBooks.forEach((book: string) => {
        if (diary.content && (diary.content.includes(`《${book}》`) || diary.content.includes(book))) {
          hasBookReference = true;
        }
      });
      
      if (!hasBookReference && diary.content) {
        result.warnings.push({
          checklistId: '1',
          message: `日记 ${diary.id} 的内容不包含相关书籍名称的引用`,
          diaryId: diary.id,
          relatedBooks,
        });
      }
    }

    // 检查书籍名称是否一致（去除版本信息）
    relatedBooks.forEach((book: string) => {
      const cleaned = cleanBookName(book);
      if (cleaned !== book) {
        result.warnings.push({
          checklistId: '5',
          message: `书籍名称 "${book}" 可简化为 "${cleaned}"`,
          diaryId: diary.id,
        });
      }
    });
  });

  result.stats.uniqueBooks = new Set(result.stats.uniqueBooks);

  // 生成校验报告
  if (result.stats.diariesWithBooks === result.stats.totalDiaries) {
    result.passed.push({
      checklistId: '2',
      message: `所有日记都包含书籍信息 (${result.stats.diariesWithBooks}/${result.stats.totalDiaries})`,
    });
  } else {
    result.failed.push({
      checklistId: '2',
      message: `部分日记缺少书籍信息 (${result.stats.totalDiaries - result.stats.diariesWithBooks} 篇)`,
    });
  }

  if (result.stats.diariesWithEmptyContent === 0) {
    result.passed.push({
      checklistId: '1',
      message: '所有日记都有内容',
    });
  }

  return result;
}

/**
 * Check: 输出校验结果
 */
export function printValidationResult(result: ValidationResult): string {
  const lines: string[] = [];
  
  lines.push('=== 日记数据校验报告 ===');
  lines.push('');
  lines.push('【统计数据】');
  lines.push(`  总日记数: ${result.stats.totalDiaries}`);
  lines.push(`  包含书籍的日记数: ${result.stats.diariesWithBooks}`);
  lines.push(`  书籍总提及次数: ${result.stats.totalBooks}`);
  lines.push(`  唯一书籍数: ${result.stats.uniqueBooks}`);
  lines.push(`  空内容日记数: ${result.stats.diariesWithEmptyContent}`);
  lines.push('');

  if (result.passed.length > 0) {
    lines.push('【通过项】');
    result.passed.forEach(item => {
      lines.push(`  ✓ ${item.message}`);
    });
    lines.push('');
  }

  if (result.warnings.length > 0) {
    lines.push('【警告项】');
    result.warnings.forEach(item => {
      lines.push(`  ⚠ ${item.message}`);
    });
    lines.push('');
  }

  if (result.failed.length > 0) {
    lines.push('【失败项】');
    result.failed.forEach(item => {
      lines.push(`  ✗ ${item.message}`);
    });
    lines.push('');
  }

  const allPassed = result.failed.length === 0;
  lines.push(allPassed ? '✓ 校验通过！' : '✗ 校验失败，请修复上述问题');

  return lines.join('\n');
}

/**
 * Act: 清理旧数据
 */
export function cleanupOldData(): CleanupResult {
  const result: CleanupResult = {
    removedKeys: [],
    keptKeys: [],
    backupData: {},
  };

  const keysToCheck = [
    DIARY_EDITS_STORAGE_KEY,
    RELATIONS_STORAGE_KEY,
    CANDIDATE_RELATIONS_KEY,
  ];

  keysToCheck.forEach(key => {
    const data = localStorage.getItem(key);
    if (data) {
      result.backupData[key] = data;
      localStorage.removeItem(key);
      result.removedKeys.push(key);
    } else {
      result.keptKeys.push(key);
    }
  });

  return result;
}

/**
 * 清理书籍名称（去除版本信息）
 */
function cleanBookName(bookName: string): string {
  // 去除副标题
  const withoutSubtitle = bookName.split('：')[0].split(':')[0].trim();
  // 去除版本信息
  const versionPatterns = ['（中文版）', '(中文版)', '（修订版）', '(修订版)', '（精装版）', '(精装版)'];
  let cleaned = withoutSubtitle;
  versionPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '').trim();
  });
  return cleaned;
}

// 类型定义
export interface ValidationResult {
  passed: ValidationItem[];
  failed: ValidationItem[];
  warnings: ValidationItem[];
  stats: {
    totalDiaries: number;
    diariesWithBooks: number;
    totalBooks: number;
    uniqueBooks: Set<string>;
    diariesWithEmptyContent: number;
  };
}

export interface ValidationItem {
  checklistId: string;
  message: string;
  diaryId?: string;
  relatedBooks?: string[];
}

export interface CleanupResult {
  removedKeys: string[];
  keptKeys: string[];
  backupData: Record<string, string>;
}

export { getChecklist, cleanBookName };