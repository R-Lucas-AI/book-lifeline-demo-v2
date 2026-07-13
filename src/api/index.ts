import { ReadingNode, EchoRelation, BookMeta, OldTrace } from '../types';
import { mockAnalyzeInput, mockFindRelations, mockOldTraces } from '../data/mockData';

const API_DELAY = 500;
const FETCH_TIMEOUT = 8000;
const DEEPSEEK_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const ZHIPU_KEY = import.meta.env.VITE_ZHIPU_API_KEY;
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;

const USE_MOCK = (!DEEPSEEK_KEY || DEEPSEEK_KEY === 'your-api-key-here')
  && (!ZHIPU_KEY || ZHIPU_KEY === 'your-api-key-here')
  && (!OPENROUTER_KEY || OPENROUTER_KEY === 'your-api-key-here');

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener('abort', () => {
        clearTimeout(timer);
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }
  });
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number; signal?: AbortSignal } = {},
): Promise<Response> {
  const { timeout = FETCH_TIMEOUT, signal: userSignal, ...fetchOptions } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  if (userSignal) {
    userSignal.addEventListener('abort', () => controller.abort());
  }

  try {
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

interface ChatProvider {
  endpoint: string;
  apiKey: string;
  buildRequest: (systemPrompt: string, userPrompt: string) => { body: Record<string, unknown> };
  parseResponse: (data: unknown) => string;
}

function createZhipuProvider(apiKey: string): ChatProvider {
  return {
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    apiKey,
    buildRequest: (systemPrompt, userPrompt) => ({
      body: {
        model: 'glm-4-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      },
    }),
    parseResponse: (data) => (data as { choices: [{ message: { content: string } }] }).choices[0].message.content,
  };
}

function createOpenRouterProvider(apiKey: string): ChatProvider {
  return {
    endpoint: 'https://openrouter.ai/api/v1/chat/completions',
    apiKey,
    buildRequest: (systemPrompt, userPrompt) => ({
      body: {
        model: 'meta-llama/llama-3.1-8b-instruct:free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
      },
    }),
    parseResponse: (data) => (data as { choices: [{ message: { content: string } }] }).choices[0].message.content,
  };
}

function createDeepseekProvider(apiKey: string): ChatProvider {
  return {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    apiKey,
    buildRequest: (systemPrompt, userPrompt) => ({
      body: {
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 2048,
      },
    }),
    parseResponse: (data) => (data as { choices: [{ message: { content: string } }] }).choices[0].message.content,
  };
}

function getActiveProvider(): ChatProvider | null {
  if (ZHIPU_KEY && ZHIPU_KEY !== 'your-api-key-here') return createZhipuProvider(ZHIPU_KEY);
  if (OPENROUTER_KEY && OPENROUTER_KEY !== 'your-api-key-here') return createOpenRouterProvider(OPENROUTER_KEY);
  if (DEEPSEEK_KEY && DEEPSEEK_KEY !== 'your-api-key-here') return createDeepseekProvider(DEEPSEEK_KEY);
  return null;
}

async function chat(systemPrompt: string, userPrompt: string, signal?: AbortSignal): Promise<string> {
  const provider = getActiveProvider();
  if (!provider) throw new Error('No provider');

  const { body } = provider.buildRequest(systemPrompt, userPrompt);
  const res = await fetchWithTimeout(provider.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify(body),
    timeout: 15000,
    signal,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`${provider.endpoint}: ${res.status} ${err}`);
  }
  const data = await res.json();
  return provider.parseResponse(data);
}

export async function analyzeInput(rawText: string): Promise<ReadingNode> {
  if (USE_MOCK) {
    await delay(API_DELAY);
    return mockAnalyzeInput(rawText);
  }

  try {
    const systemPrompt = `你是一个阅读分析助手。用户的输入是他们在读完一本书或经历某件事后的个人感受。请分析这段输入，提取以下信息并以 JSON 格式返回，不要包含任何解释：
{
  "type": "insight | question | observation | reflection",
  "tags": ["标签1", "标签2", ...最多5个"],
  "bookTitle": "如果输入中提到了书名，提取书名，否则为 null",
  "bookAuthor": "如果输入中提到了作者名，提取作者名，否则为 null"
}`;
    const response = await chat(systemPrompt, rawText);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON response');
    const result = JSON.parse(jsonMatch[0]) as {
      type?: string;
      tags?: string[];
      bookTitle?: string | null;
      bookAuthor?: string | null;
    };

    const bookMatch = rawText.match(/《(.+?)》/);
    const bookTitle = result.bookTitle ?? bookMatch?.[1] ?? undefined;

    return {
      id: `node-${Date.now()}`,
      rawText,
      type: (['insight', 'question', 'observation', 'reflection'].includes(result.type || '')
        ? result.type
        : 'insight') as ReadingNode['type'],
      tags: (result.tags && result.tags.length > 0) ? result.tags.slice(0, 5) : ['日常思考'],
      bookTitle,
      bookAuthor: result.bookAuthor ?? undefined,
      createdAt: new Date().toISOString(),
    };
  } catch {
    await delay(API_DELAY);
    return mockAnalyzeInput(rawText);
  }
}

export async function findOldTraces(node: ReadingNode, extraTraces: OldTrace[] = [] ): Promise<EchoRelation[]> {
  if (USE_MOCK) {
    await delay(API_DELAY);
    return mockFindRelations(node, extraTraces);
  }

  try {
    const allTraces = [...mockOldTraces, ...extraTraces];
    const tracesText = allTraces.map(t =>
      `[ID: ${t.id}] [来源: ${t.source}] [类型: ${t.sourceType}] ${t.bookTitle ? `《${t.bookTitle}》` : ''}\n内容: ${t.content}`
    ).join('\n\n---\n\n');

    const systemPrompt = `你是一个语义关联分析助手。用户输入了当前的感受（Reading Node），你有一组历史痕迹（Old Traces）。请分析当前感受与历史痕迹的语义关联，找出最相关的旧痕迹，并说明为什么相关。

可能的关联类型：
- echo（回响）：旧痕迹与当前感受表达了相同的深层认知
- contrast（对照）：旧痕迹与当前感受形成对比或互补
- source（溯源）：当前感受可以从旧痕迹中找到源头
- example（例证）：旧痕迹是当前感受的例证
- question（追问）：旧痕迹提出了当前感受需要回答的问题
- correction（修正）：旧痕迹修正了当前感受的某个假设

请以 JSON 数组格式返回，不要包含任何解释：
[
  {
    "oldTraceId": "traces中的id",
    "relationType": "echo|contrast|source|example|question|correction",
    "reason": "用中文说明为什么这条旧痕迹与此刻相关，要具体到文本内容，写出关键句子或短语"
  }
]
如果找不到明显相关的痕迹，返回空数组 []。`;

    const userPrompt = `当前感受：\n${node.rawText}\n\n历史痕迹：\n${tracesText}`;
    const response = await chat(systemPrompt, userPrompt);
    const jsonMatch = response.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('Invalid JSON response');
    const matched = JSON.parse(jsonMatch[0]) as Array<{
      oldTraceId: string;
      relationType: string;
      reason: string;
    }>;

    const relations: EchoRelation[] = matched
      .filter(m => allTraces.some(t => t.id === m.oldTraceId))
      .map((m, idx) => ({
        id: `relation-${Date.now()}-${idx}`,
        readingNodeId: node.id,
        oldTraceId: m.oldTraceId,
        relationType: (['echo', 'contrast', 'source', 'example', 'question', 'correction', 'encounter'].includes(m.relationType)
          ? m.relationType
          : 'echo') as EchoRelation['relationType'],
        reason: m.reason,
        confirmed: false,
      }));

    return relations;
  } catch {
    await delay(API_DELAY);
    return mockFindRelations(node, extraTraces);
  }
}

export async function confirmRelation(relationId: string): Promise<EchoRelation> {
  await delay(API_DELAY);
  const relations = await findOldTraces({} as ReadingNode);
  const relation = relations.find(r => r.id === relationId);
  if (relation) {
    return { ...relation, confirmed: true };
  }
  throw new Error('Relation not found');
}

export async function getRelationsByNode(nodeId: string): Promise<EchoRelation[]> {
  await delay(API_DELAY);
  return findOldTraces({ id: nodeId } as ReadingNode);
}

// ============== 多源封面搜索 ==============

/** CORS 代理列表，按顺序降级 */
const CORS_PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
];

/** 豆瓣搜索返回项 */
interface DoubanSuggestItem {
  id: string;
  title: string;
  url: string;
  pic: string;
  author_name: string;
  year: string;
  type: string;
}

/**
 * 将豆瓣封面小图URL转为大图URL
 */
function toLargeCover(picUrl: string): string {
  return picUrl.replace('/s/public/', '/l/public/');
}

/**
 * 从豆瓣封面 URL 中提取图片 ID（用于去重）
 * 例如 https://img9.doubanio.com/view/subject/l/public/s29142845.jpg → s29142845
 */
function getDoubanCoverId(url: string): string | null {
  const m = url.match(/\/public\/(s\d+\.jpg)/);
  return m ? m[1] : null;
}

/**
 * 通过 CORS 代理调用豆瓣搜索建议接口
 * 返回前 N 个结果的封面（多封面候选）
 */
async function searchDoubanBooks(title: string, limit = 5, signal?: AbortSignal): Promise<DoubanSuggestItem[]> {
  const targetUrl = `https://book.douban.com/j/subject_suggest?q=${encodeURIComponent(title)}`;

  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetchWithTimeout(proxy(targetUrl), {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal,
      });
      if (!res.ok) continue;
      const data = await res.json() as DoubanSuggestItem[];
      if (!Array.isArray(data) || data.length === 0) continue;
      return data.filter(item => item.type === 'b').slice(0, limit);
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      continue;
    }
  }
  return [];
}

/**
 * 调用豆瓣详情页获取内容简介
 */
async function fetchDoubanSummary(doubanId: string, signal?: AbortSignal): Promise<string | undefined> {
  const targetUrl = `https://book.douban.com/subject/${doubanId}/`;
  for (const proxy of CORS_PROXIES) {
    try {
      const res = await fetchWithTimeout(proxy(targetUrl), { signal });
      if (!res.ok) continue;
      const html = await res.text();
      const introMatch = html.match(/<div[^>]*class="intro"[^>]*>([\s\S]*?)<\/div>/);
      if (introMatch) {
        const summary = introMatch[1]
          .replace(/<[^>]+>/g, '\n')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
        if (summary) return summary;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') throw e;
      continue;
    }
  }
  return undefined;
}

/**
 * 解析豆瓣的 author 字段，分离作者和译者
 */
function parseDoubanAuthor(rawAuthor: string): { author?: string; translator?: string } {
  if (!rawAuthor) return {};
  const translatorMatch = rawAuthor.match(/\(([^)]+)\)/);
  const translator = translatorMatch?.[1]?.trim();
  const author = rawAuthor.replace(/\([^)]+\)/g, '').split('/')[0].trim();
  return { author: author || undefined, translator };
}

// ============== Google Books 数据源 ==============

interface GoogleBooksVolumeInfo {
  title: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  imageLinks?: {
    smallThumbnail?: string;
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    extraLarge?: string;
  };
  categories?: string[];
  industryIdentifiers?: { type: string; identifier: string }[];
}

interface GoogleBooksItem {
  id: string;
  volumeInfo: GoogleBooksVolumeInfo;
}

interface GoogleBooksResponse {
  items?: GoogleBooksItem[];
}

/**
 * Google Books API 搜索（支持 CORS，无需代理）
 * 返回前 N 个结果的封面
 */
async function searchGoogleBooks(title: string, author?: string, limit = 5, signal?: AbortSignal): Promise<GoogleBooksItem[]> {
  const query = author ? `${title}+inauthor:${encodeURIComponent(author)}` : title;
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limit}&langRestrict=zh`;

  try {
    const res = await fetchWithTimeout(url, { signal });
    if (!res.ok) return [];
    const data = await res.json() as GoogleBooksResponse;
    return data.items || [];
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    return [];
  }
}

/**
 * 从 Google Books imageLinks 中取最大尺寸的封面
 */
function getGoogleLargestCover(imageLinks?: GoogleBooksVolumeInfo['imageLinks']): string | undefined {
  if (!imageLinks) return undefined;
  const sizes = ['extraLarge', 'large', 'medium', 'small', 'thumbnail', 'smallThumbnail'] as const;
  for (const size of sizes) {
    if (imageLinks[size]) {
      // Google Books 封面 URL 默认是 http，换成 https
      return imageLinks[size]!.replace('http://', 'https://');
    }
  }
  return undefined;
}

/**
 * 从 Google Books 封面 URL 中提取 ID（用于去重）
 * 例如 https://books.google.com/books/content?id=xxx&printsec=frontcover&img=1&zoom=5 → xxx
 */
function getGoogleCoverId(url: string): string | null {
  const m = url.match(/id=([^&]+)/);
  return m ? m[1] : null;
}

// ============== AI 辅助搜索词生成 ==============

/**
 * AI 生成搜索词变体
 * 当豆瓣搜不到时，让 AI 生成 2-3 个更可能搜到的搜索词
 * （例如原名、不同译名、去掉副标题、加上作者名等）
 */
async function generateSearchVariants(title: string, author?: string): Promise<string[]> {
  try {
    const systemPrompt = `你是一个书籍搜索助手。用户给你一个书名（可能带副标题或描述）和可选的作者名，请生成2-3个可能在豆瓣读书上搜到的搜索词变体。

规则：
- 如果书名包含副标题或描述性文字，尝试只保留主书名
- 如果有作者名，生成一个"书名+作者"的组合
- 如果是翻译作品，尝试原名或其他常见译名（如果你知道的话）
- 只返回搜索词，不要解释
- 以 JSON 数组格式返回：["变体1", "变体2", "变体3"]`;

    const userPrompt = `书名：${title}${author ? `\n作者：${author}` : ''}`;
    const response = await chat(systemPrompt, userPrompt);
    const jsonMatch = response.match(/\[.*?\]/s);
    if (jsonMatch) {
      const variants = JSON.parse(jsonMatch[0]) as string[];
      return variants.filter(v => v && v !== title).slice(0, 3);
    }
  } catch {
    // 失败就不生成变体
  }
  return [];
}

// ============== 封面去重与合并 ==============

interface CoverCandidate {
  url: string;
  source: 'douban' | 'google_books';
  id?: string;  // 用于去重的标识
}

/**
 * 合并多源封面，按来源排序，去重
 * 去重规则：同来源按 id 去重，跨源保留各自
 * 排序：豆瓣优先（中文封面更准确），Google Books 补充
 */
function mergeCovers(doubanItems: DoubanSuggestItem[], googleItems: GoogleBooksItem[]): string[] {
  const candidates: CoverCandidate[] = [];
  const seenDoubanIds = new Set<string>();
  const seenGoogleIds = new Set<string>();

  // 豆瓣封面（优先）
  for (const item of doubanItems) {
    if (!item.pic) continue;
    const largeUrl = toLargeCover(item.pic);
    const id = getDoubanCoverId(largeUrl);
    if (id && seenDoubanIds.has(id)) continue;
    if (id) seenDoubanIds.add(id);
    candidates.push({ url: largeUrl, source: 'douban', id: id || undefined });
  }

  // Google Books 封面（补充）
  for (const item of googleItems) {
    const coverUrl = getGoogleLargestCover(item.volumeInfo.imageLinks);
    if (!coverUrl) continue;
    const id = getGoogleCoverId(coverUrl);
    if (id && seenGoogleIds.has(id)) continue;
    if (id) seenGoogleIds.add(id);
    candidates.push({ url: coverUrl, source: 'google_books', id: id || undefined });
  }

  return candidates.map(c => c.url);
}

// ============== 书籍版本搜索（供用户选择） ==============

export interface BookVersion {
  id: string;
  title: string;
  author: string;
  year: string;
  coverUrl: string;
  source: 'douban' | 'google_books';
  doubanId?: string;
}

export async function searchBookVersions(
  title: string,
  author?: string,
  signal?: AbortSignal,
): Promise<BookVersion[]> {
  if (USE_MOCK) {
    await delay(300, signal);
    return [];
  }

  const versions: BookVersion[] = [];

  const doubanPromise = searchDoubanBooks(title, 10, signal).catch(() => []);
  const googlePromise = searchGoogleBooks(title, author, 5, signal).catch(() => []);

  try {
    const [doubanItems, googleItems] = await Promise.all([doubanPromise, googlePromise]);

    for (const item of doubanItems) {
      versions.push({
        id: `douban_${item.id}`,
        title: item.title,
        author: item.author_name,
        year: item.year,
        coverUrl: toLargeCover(item.pic),
        source: 'douban',
        doubanId: item.id,
      });
    }

    for (const item of googleItems) {
      const coverUrl = getGoogleLargestCover(item.volumeInfo.imageLinks);
      if (!coverUrl) continue;
      versions.push({
        id: `google_${item.id}`,
        title: item.volumeInfo.title,
        author: (item.volumeInfo.authors || []).join(' / '),
        year: item.volumeInfo.publishedDate || '',
        coverUrl,
        source: 'google_books',
      });
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
  }

  return versions;
}

// ============== 轻量级封面搜索（批量重搜用） ==============

/**
 * 只搜索封面（豆瓣 + Google Books），不调用 AI，不生成元信息
 * 用于批量重搜封面场景，速度快
 */
export async function searchBookCovers(
  title: string,
  author?: string,
  signal?: AbortSignal,
): Promise<{ coverUrl?: string; coverOptions?: string[] }> {
  if (USE_MOCK) {
    await delay(300, signal);
    return {};
  }

  let doubanItems: DoubanSuggestItem[] = [];
  let googleItems: GoogleBooksItem[] = [];

  // 并发搜索豆瓣和 Google Books，速度更快
  const doubanPromise = searchDoubanBooks(title, 5, signal).catch(() => []);
  const googlePromise = searchGoogleBooks(title, author, 5, signal).catch(() => []);

  try {
    const [doubanResult, googleResult] = await Promise.all([doubanPromise, googlePromise]);
    doubanItems = doubanResult;
    googleItems = googleResult;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
  }

  const coverOptions = mergeCovers(doubanItems, googleItems);
  const coverUrl = coverOptions.length > 0 ? coverOptions[0] : undefined;

  return {
    coverUrl,
    coverOptions: coverOptions.length > 0 ? coverOptions : undefined,
  };
}

// ============== 主函数：生成书籍元信息 ==============

/**
 * 生成书籍元信息 — 多源数据 + AI增强
 *
 * 流程：
 * 1. 豆瓣搜索（直接搜 → AI生成变体重试）
 * 2. Google Books 搜索（补充封面和简介）
 * 3. 多封面去重合并
 * 4. 基于简介（豆瓣优先，否则 Google Books）调用 AI 生成 coreQuestion/keyIdeas
 * 5. 都不可用 → 纯 AI 生成
 */
export async function generateBookMeta(title: string, author?: string): Promise<BookMeta> {
  if (USE_MOCK) {
    await delay(API_DELAY);
    return {
      title,
      author,
      source: 'ai_generated',
      updatedAt: new Date().toISOString(),
    };
  }

  // 1. 多源搜索封面和基础数据
  let doubanItems: DoubanSuggestItem[] = [];
  let googleItems: GoogleBooksItem[] = [];
  let bestDoubanItem: DoubanSuggestItem | null = null;
  let doubanSummary: string | undefined;
  let bestGoogleItem: GoogleBooksItem | null = null;

  try {
    // 1a. 豆瓣搜索（直接搜）
    doubanItems = await searchDoubanBooks(title, 5);

    // 1b. 如果豆瓣搜不到 → AI生成搜索词变体重试
    if (doubanItems.length === 0) {
      const variants = await generateSearchVariants(title, author);
      for (const variant of variants) {
        const variantResults = await searchDoubanBooks(variant, 5);
        if (variantResults.length > 0) {
          doubanItems = variantResults;
          break;
        }
      }
    }

    // 1c. 取豆瓣最佳匹配（第一个）并获取简介
    if (doubanItems.length > 0) {
      bestDoubanItem = doubanItems[0];
      doubanSummary = await fetchDoubanSummary(bestDoubanItem.id);
    }

    // 1d. Google Books 补充搜索（无论豆瓣有没有都搜，补充封面候选）
    googleItems = await searchGoogleBooks(title, author, 5);
    if (googleItems.length > 0) {
      bestGoogleItem = googleItems[0];
    }
  } catch {
    // 搜索失败，继续降级
  }

  // 2. 合并封面
  const coverOptions = mergeCovers(doubanItems, googleItems);
  const coverUrl = coverOptions.length > 0 ? coverOptions[0] : undefined;

  // 3. 整理基础信息
  const baseInfo: Partial<BookMeta> = {};

  if (bestDoubanItem) {
    const { author: parsedAuthor, translator: parsedTranslator } = parseDoubanAuthor(bestDoubanItem.author_name);
    baseInfo.doubanId = bestDoubanItem.id;
    baseInfo.publishDate = bestDoubanItem.year || undefined;
    baseInfo.author = parsedAuthor || author;
    baseInfo.translator = parsedTranslator;
    baseInfo.summary = doubanSummary;
  } else if (bestGoogleItem) {
    const info = bestGoogleItem.volumeInfo;
    baseInfo.author = info.authors?.[0] || author;
    baseInfo.publisher = info.publisher;
    baseInfo.publishDate = info.publishedDate;
    baseInfo.summary = info.description;
    const isbn = info.industryIdentifiers?.find(i => i.type === 'ISBN_13' || i.type === 'ISBN_10');
    baseInfo.isbn = isbn?.identifier;
    if (info.categories && info.categories.length > 0) {
      baseInfo.category = info.categories[0];
    }
  } else {
    baseInfo.author = author;
  }

  // 4. AI 增强：基于简介生成 coreQuestion / keyIdeas
  const hasSummary = !!(doubanSummary || bestGoogleItem?.volumeInfo.description);
  const sourceSummary = doubanSummary || bestGoogleItem?.volumeInfo.description;

  try {
    let systemPrompt: string;
    let userPrompt: string;

    if (hasSummary && sourceSummary) {
      // 有可信简介 — 基于简介提炼，禁止编造
      systemPrompt = `你是一个书籍信息助手。我会给你一本书的内容简介（可信来源）和书名作者信息。请基于简介内容提炼以下信息。

重要原则：
- 严格基于提供的简介内容提炼，不要编造书中没有的概念
- 核心问题：用一句话概括这本书试图回答的核心问题（基于简介推断）
- 关键理念：2-3条，每条一句话，必须是简介中明确提到的概念
- 如果简介信息不足以提炼某项，该项返回 null
- 标签：3-5个关键词，基于简介内容

请以严格的JSON格式返回，不要包含任何解释：
{
  "coreQuestion": "核心问题，一句话，不确定则为null",
  "keyIdeas": ["理念1", "理念2", ...最多3条],
  "tags": ["标签1", "标签2", ...最多5个]
}`;
      userPrompt = `书名：《${title}》${baseInfo.author ? `\n作者：${baseInfo.author}` : ''}\n\n内容简介：\n${sourceSummary}`;
    } else {
      // 无简介 — 降级到纯AI方案
      systemPrompt = `你是一个书籍信息助手。用户会给你书名和可能的作者名，请生成这本书的元信息。

重要原则：
- 只返回你确定知道的信息，不确定的就留空（null 或 空数组）
- 绝对不要编造书名、作者名或内容
- 如果完全没听说过这本书，返回只有title的对象
- 核心问题用一句话概括这本书试图回答的核心问题
- 关键理念2-3条，每条一句话
- 领域分类从以下选择：历史/哲学/文学/艺术/设计/科普/心理学/社会学/商业/科技/自我提升/方法论/诗歌/传记/自然文学/古典文学/沟通/文化/杂志
- 标签3-5个，用关键词形式

请以严格的JSON格式返回，不要包含任何解释：
{
  "title": "书名",
  "author": "作者名，不确定则为null",
  "translator": "译者名，不确定则为null",
  "coreQuestion": "核心问题，一句话，不确定则为null",
  "keyIdeas": ["理念1", "理念2", ...最多3条],
  "category": "领域分类，不确定则为null",
  "tags": ["标签1", "标签2", ...最多5个]
}`;
      userPrompt = `书名：《${title}》${author ? `\n作者：${author}` : ''}`;
    }

    const response = await chat(systemPrompt, userPrompt);
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('Invalid JSON response');

    const result = JSON.parse(jsonMatch[0]) as Partial<BookMeta> & { keyIdeas?: string[] | null; tags?: string[] | null };

    return {
      title: result.title || title,
      author: baseInfo.author || result.author || author || undefined,
      translator: baseInfo.translator || result.translator || undefined,
      coreQuestion: result.coreQuestion || undefined,
      keyIdeas: (result.keyIdeas && result.keyIdeas.length > 0) ? result.keyIdeas.slice(0, 3) : undefined,
      category: baseInfo.category || result.category || undefined,
      tags: (result.tags && result.tags.length > 0) ? result.tags.slice(0, 5) : undefined,
      // 豆瓣/Google 字段
      doubanId: baseInfo.doubanId,
      isbn: baseInfo.isbn,
      publisher: baseInfo.publisher,
      publishDate: baseInfo.publishDate,
      coverUrl,
      coverOptions: coverOptions.length > 0 ? coverOptions : undefined,
      summary: baseInfo.summary,
      doubanTags: baseInfo.doubanTags,
      source: bestDoubanItem ? 'douban_enhanced' : 'ai_generated',
      updatedAt: new Date().toISOString(),
    };
  } catch {
    // AI 失败 — 返回基础信息
    await delay(API_DELAY);
    return {
      title,
      ...baseInfo,
      coverUrl,
      coverOptions: coverOptions.length > 0 ? coverOptions : undefined,
      source: bestDoubanItem ? 'douban_enhanced' : 'ai_generated',
      updatedAt: new Date().toISOString(),
    } as BookMeta;
  }
}
