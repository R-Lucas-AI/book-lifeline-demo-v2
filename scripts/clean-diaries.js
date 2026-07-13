const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, '../src/data/notion-diaries-restructured.json');
const outputPath = path.join(__dirname, '../src/data/notion-diaries-restructured-cleaned.json');

const rawData = fs.readFileSync(inputPath, 'utf-8');
const diaries = JSON.parse(rawData);

console.log(`总日记数: ${diaries.length}`);

const issues = [];

const cleanDiaries = diaries.map((diary, index) => {
  const diaryIssues = {
    id: diary.id,
    date: diary.date,
    problems: []
  };

  let cleanedContent = diary.content || '';

  if (cleanedContent.includes('[已过]')) {
    diaryIssues.problems.push('包含 [已过] 隐私标记');
    cleanedContent = cleanedContent.replace(/\[已过\]/g, '[已处理]');
  }

  if (cleanedContent.includes('[...（三圈网络]')) {
    diaryIssues.problems.push('包含三圈网络隐私标记');
    cleanedContent = cleanedContent.replace(/\[\.\.\.（三圈网络\]/g, '[网络]');
  }

  if (cleanedContent.includes('身份证')) {
    diaryIssues.problems.push('包含身份证敏感词');
    cleanedContent = cleanedContent.replace(/身份证/g, '证件');
  }

  if (cleanedContent.includes('账号')) {
    diaryIssues.problems.push('包含账号敏感词');
    cleanedContent = cleanedContent.replace(/账号/g, '账户');
  }

  if (cleanedContent.includes('密码')) {
    diaryIssues.problems.push('包含密码敏感词');
    cleanedContent = cleanedContent.replace(/密码/g, '密钥');
  }

  const lines = cleanedContent.split('\n');
  lines.forEach((line, lineIndex) => {
    if (line.length > 200) {
      diaryIssues.problems.push(`第 ${lineIndex + 1} 行过长 (${line.length} 字符)`);
    }
  });

  cleanedContent = cleanedContent.replace(/——/g, '—');
  cleanedContent = cleanedContent.replace(/———/g, '—');
  cleanedContent = cleanedContent.replace(/……/g, '…');
  cleanedContent = cleanedContent.replace(/“”/g, '"');
  cleanedContent = cleanedContent.replace(/‘’/g, "'");

  cleanedContent = cleanedContent.replace(/\|\|\|/g, '||');
  cleanedContent = cleanedContent.replace(/\|\|\|\|/g, '||');

  cleanedContent = cleanedContent.replace(/([a-zA-Z0-9])——([a-zA-Z0-9])/g, '$1—$2');

  if (diary.excerpt) {
    let cleanedExcerpt = diary.excerpt;
    cleanedExcerpt = cleanedExcerpt.replace(/\[已过\]/g, '[已处理]');
    cleanedExcerpt = cleanedExcerpt.replace(/\[\.\.\.（三圈网络\]/g, '[网络]');
    cleanedExcerpt = cleanedExcerpt.replace(/身份证/g, '证件');
    cleanedExcerpt = cleanedExcerpt.replace(/账号/g, '账户');
    cleanedExcerpt = cleanedExcerpt.replace(/密码/g, '密钥');
    diary.excerpt = cleanedExcerpt;
  }

  if (diary.observations) {
    let cleanedObservations = diary.observations;
    cleanedObservations = cleanedObservations.replace(/\[已过\]/g, '[已处理]');
    cleanedObservations = cleanedObservations.replace(/\[\.\.\.（三圈网络\]/g, '[网络]');
    cleanedObservations = cleanedObservations.replace(/身份证/g, '证件');
    cleanedObservations = cleanedObservations.replace(/账号/g, '账户');
    cleanedObservations = cleanedObservations.replace(/密码/g, '密钥');
    diary.observations = cleanedObservations;
  }

  if (diaryIssues.problems.length > 0) {
    issues.push(diaryIssues);
  }

  return {
    ...diary,
    content: cleanedContent
  };
});

console.log('\n发现问题的日记:');
issues.forEach(issue => {
  console.log(`\n${issue.date} (${issue.id}):`);
  issue.problems.forEach(problem => {
    console.log(`  - ${problem}`);
  });
});

console.log(`\n共发现 ${issues.length} 篇日记存在问题`);

fs.writeFileSync(outputPath, JSON.stringify(cleanDiaries, null, 2), 'utf-8');
console.log(`\n清理后的数据已保存到: ${outputPath}`);

const diffCount = diaries.length - issues.length;
console.log(`清理完成，${diffCount} 篇日记无需修改，${issues.length} 篇日记已清理`);