const fs = require('fs');
const path = require('path');

const inputFile = path.join(__dirname, '../src/data/notion-diaries-restructured.json');
const outputFile = path.join(__dirname, '../src/data/notion-diaries-cleaned.json');

const rawData = fs.readFileSync(inputFile, 'utf-8');
const diaries = JSON.parse(rawData);

const bookNameMappings = {
  '心安': '心安：致焦虑的时代',
  '心安：致焦虑的时代': '心安：致焦虑的时代',
  '世界简史': '世界简史',
  '历史：地图上的世界简史': '历史：地图上的世界简史',
  '迦太基启示录': '迦太基启示录：海洋帝国的崛起与覆亡',
  '迦太基启示录：海洋帝国的崛起与覆亡': '迦太基启示录：海洋帝国的崛起与覆亡',
  '普罗米修斯的火种': '普罗米修斯的火种',
  '古琴之道': '古琴之道',
  '睡眠的科学': '睡眠的科学',
  '说文解字': '说文解字',
};

function extractBookRelatedContent(content, relatedBooks) {
  if (!relatedBooks || relatedBooks.length === 0) {
    return '';
  }

  const bookPatterns = relatedBooks.map(book => {
    const escaped = book.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`《${escaped}》|${escaped}`, 'gi');
  });

  const paragraphs = content.split(/\n\n/);
  const relatedParagraphs = [];

  paragraphs.forEach(para => {
    const isRelated = bookPatterns.some(pattern => pattern.test(para));
    if (isRelated) {
      const cleanedPara = para
        .replace(/^[^\n]+\|\s*/, '')
        .replace(/^[\d:.～\s]+/, '')
        .replace(/^[○◦·-–—*+✓❌✅❔❌\s]+/, '')
        .trim();

      if (cleanedPara && cleanedPara.length > 10) {
        relatedParagraphs.push(cleanedPara);
      }
    }
  });

  return relatedParagraphs.join('\n\n');
}

function simplifyContent(content, relatedBooks) {
  if (!content || content.trim() === '') {
    return '';
  }

  const sentences = content.split(/[。！？；;\n]+/).filter(s => s.trim().length > 5);
  const bookKeywords = relatedBooks.flatMap(book => [
    `《${book}》`,
    book,
    book.split('：')[0],
    book.split('·')[0],
    book.split('—')[0]
  ]);

  const relatedSentences = sentences.filter(sentence => {
    return bookKeywords.some(keyword => sentence.includes(keyword));
  });

  const uniqueSentences = [...new Set(relatedSentences)];
  const selectedSentences = uniqueSentences.slice(0, 3);

  return selectedSentences.join('。') + (selectedSentences.length > 0 ? '。' : '');
}

const cleanedDiaries = diaries
  .map(diary => {
    const relatedBooks = diary.relatedBooks || [];
    
    if (relatedBooks.length === 0) {
      const bookMatches = diary.content.match(/《([^》]+)》/g) || [];
      const matchedBooks = [...new Set(bookMatches.map(m => m.replace(/《|》/g, '')))];
      
      if (matchedBooks.length > 0) {
        diary.relatedBooks = matchedBooks;
      }
    }

    return diary;
  })
  .filter(diary => {
    const relatedBooks = diary.relatedBooks || [];
    return relatedBooks.length > 0;
  })
  .map(diary => {
    const relatedBooks = diary.relatedBooks || [];
    const extractedContent = extractBookRelatedContent(diary.content, relatedBooks);
    const simplifiedContent = simplifyContent(extractedContent || diary.content, relatedBooks);

    return {
      ...diary,
      content: simplifiedContent,
      observations: '',
      goldenSentences: [],
      excerpt: simplifiedContent.slice(0, 200),
    };
  });

fs.writeFileSync(outputFile, JSON.stringify(cleanedDiaries, null, 2), 'utf-8');

console.log(`清理完成！`);
console.log(`原始日记数: ${diaries.length}`);
console.log(`清理后日记数: ${cleanedDiaries.length}`);

const bookStats = {};
cleanedDiaries.forEach(diary => {
  diary.relatedBooks.forEach(book => {
    bookStats[book] = (bookStats[book] || 0) + 1;
  });
});

console.log('\n书籍分布统计:');
Object.entries(bookStats)
  .sort((a, b) => b[1] - a[1])
  .forEach(([book, count]) => {
    console.log(`  ${book}: ${count} 篇`);
  });