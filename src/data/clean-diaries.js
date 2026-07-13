/**
 * 日记数据清洗脚本
 *
 * 清洗规则（按日记题材特殊性归纳）：
 *
 * 1. 移除 Notion 导出伪影
 *    - YAML frontmatter ([...]---\ntitle: ... \n---)
 *    - <mention-page url="..."/>  → 移除
 *    - 水平分割线 ---  → 移除
 *
 * 2. Markdown 结构转纯文本
 *    - ## / ### 标题  → 换行 + 【标题】+ 换行（保留结构感，去掉 # 符号）
 *    - 代码块 ```plain text ... ```  → 提取内容
 *    - 列表符号 - / *  → 移除（保留文字）
 *
 * 3. 移除元信息噪声
 *    - "写法纪律：..."  → 移除（这是写作提示，不是日记内容）
 *    - "v0.x.x" 版本号  → 移除
 *
 * 4. 标点规范化
 *    - 全角竖线 ｜ 统一保留（日记中的时间分隔符，是有意为之的风格）
 *    - 弯引号 "" → 直引号 "（保持一致）
 *    - 多余空行压缩为最多2个换行
 *
 * 5. 保留日记特色
 *    - Emoji 时间锚标记（📖🥣🎮🌙）保留——它们是日记的时间结构标记
 *    - 时间戳格式（08:30、上午、晚间等）保留
 *    - 作者的个人写作风格和用词保留
 */

const fs = require('fs');
const path = require('path');

const rawData = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'notion-diaries-full.json'), 'utf-8')
);

function cleanContent(content) {
  let text = content;

  // 1. 移除开头的 [...] 标记
  text = text.replace(/^\[\.\.\.\]\n*/, '');

  // 2. 移除 YAML frontmatter
  text = text.replace(/^---\n[\s\S]*?\ntitle:[^\n]*\n---\n/, '');
  text = text.replace(/^---\n[\s\S]*?---\n/, '');

  // 3. 移除残留的 title: 行
  text = text.replace(/^title:\s.*$/gm, '');

  // 4. 移除 <mention-page .../> 和 </mention-page> 标签
  text = text.replace(/<mention-page[^>]*>/g, '');
  text = text.replace(/<\/mention-page>/g, '');

  // 5. 移除水平分割线
  text = text.replace(/\n---\n/g, '\n');
  text = text.replace(/^---\n/gm, '');
  text = text.replace(/^---$/gm, '');

  // 6. 移除"写法纪律"元信息行
  text = text.replace(/^写法纪律：.*$/gm, '');

  // 7. Markdown 标题转纯文本
  text = text.replace(/^###\s+(.+)$/gm, '· $1');
  text = text.replace(/^##\s+(.+)$/gm, '\n【$1】\n');
  text = text.replace(/^#\s+(.+)$/gm, '\n【$1】\n');

  // 7.5 移除 Markdown 引用 >（保留内容）
  text = text.replace(/^>\s?/gm, '');

  // 8. 代码块处理
  text = text.replace(/```[\w]*\n([\s\S]*?)```/g, '$1');
  text = text.replace(/```[\w]*/g, '');

  // 9. 移除列表符号
  text = text.replace(/^[-*]\s+/gm, '');

  // 9.5 Markdown 链接 [文字](URL) → 只保留文字
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 9.6 移除 Markdown 加粗 **文字** → 文字
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  // 移除斜体 *文字* → 文字（但避免误伤列表符号后的 *）
  text = text.replace(/(?<!\s)\*([^*\n]+)\*(?!\s)/g, '$1');
  // 移除孤立的 ** 标记（配对被截断的情况）
  text = text.replace(/\*\*/g, '');

  // 9.7 移除 mention 残留后的空链接箭头：→  / 或 → /
  text = text.replace(/→\s*\/\s*$/gm, '');
  text = text.replace(/→\s*$/gm, '');

  // 9.8 移除元数据块（父页、创建时间、触发、关联等）
  text = text.replace(/^父页：.*$/gm, '');
  text = text.replace(/^创建时间：.*$/gm, '');
  text = text.replace(/^关联：.*$/gm, '');
  text = text.replace(/^触发：.*$/gm, '');

  // 9.9 移除 Notion callout 标记 !文字 → 文字
  text = text.replace(/^!([^\n]+)$/gm, '$1');

  // 10. 弯引号转直引号
  text = text.replace(/[""]/g, '"');
  text = text.replace(/['']/g, "'");

  // 11. 修复断句
  text = text.replace(/：。/g, '：');
  text = text.replace(/：\s*。/g, '：');

  // 12. 压缩多余空行
  text = text.replace(/\n{3,}/g, '\n\n');

  // 13. 移除行尾多余空格
  text = text.replace(/[ \t]+$/gm, '');

  // 14. 移除首尾空白
  text = text.trim();

  return text;
}

function cleanExcerpt(excerpt, cleanedContent) {
  if (!excerpt || excerpt.trim().length === 0) {
    return cleanedContent.substring(0, 80).replace(/\n/g, ' ').trim();
  }
  let cleaned = excerpt;
  // 移除 mention 标签
  cleaned = cleaned.replace(/<mention-page[^>]*>/g, '');
  cleaned = cleaned.replace(/<\/mention-page>/g, '');
  // 移除加粗
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*\*/g, '');
  // 移除空链接箭头
  cleaned = cleaned.replace(/→\s*\/?\s*$/g, '');
  // 清洗标点
  cleaned = cleaned.replace(/[""]/g, '"').replace(/['']/g, "'");
  // 修复断句
  cleaned = cleaned.replace(/：。/g, '：');
  cleaned = cleaned.replace(/：\s*。/g, '：');
  // 移除多余的空格
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
}

// 执行清洗
const cleanedData = rawData.map(entry => {
  const cleanedContent = cleanContent(entry.content);
  const cleanedExcerpt = cleanExcerpt(entry.excerpt, cleanedContent);

  return {
    ...entry,
    content: cleanedContent,
    excerpt: cleanedExcerpt,
    // 保留原始内容以备对比
    _originalContentLength: entry.content.length,
    _cleanedContentLength: cleanedContent.length,
  };
});

// 统计清洗效果
let totalOriginal = 0;
let totalCleaned = 0;
let maxReduction = 0;
let maxReductionTitle = '';

cleanedData.forEach(entry => {
  totalOriginal += entry._originalContentLength;
  totalCleaned += entry._cleanedContentLength;
  const reduction = entry._originalContentLength - entry._cleanedContentLength;
  if (reduction > maxReduction) {
    maxReduction = reduction;
    maxReductionTitle = entry.title;
  }
});

console.log('=== 清洗统计 ===');
console.log(`原始总字符数: ${totalOriginal}`);
console.log(`清洗后总字符数: ${totalCleaned}`);
console.log(`减少: ${totalOriginal - totalCleaned} 字符 (${Math.round((1 - totalCleaned/totalOriginal) * 100)}%)`);
console.log(`单条最大减少: ${maxReduction} 字符 — ${maxReductionTitle}`);

// 移除统计字段，输出最终数据
const finalData = cleanedData.map(({ _originalContentLength, _cleanedContentLength, ...rest }) => rest);

// 输出清洗后的 JSON
const outputPath = path.join(__dirname, 'notion-diaries-cleaned.json');
fs.writeFileSync(outputPath, JSON.stringify(finalData, null, 2), 'utf-8');
console.log(`\n清洗后的数据已写入: ${outputPath}`);

// 输出前3条对比预览
console.log('\n=== 前3条清洗后预览 ===');
finalData.slice(0, 3).forEach((entry, i) => {
  console.log(`\n--- #${i + 1} [${entry.date}] ${entry.title} ---`);
  console.log('excerpt:', entry.excerpt.substring(0, 100));
  console.log('content (前300字):');
  console.log(entry.content.substring(0, 300));
  console.log('...');
});
