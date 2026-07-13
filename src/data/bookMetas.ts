import { BookMeta } from '../types';

const STORAGE_KEY = 'booklifeline_library';
const SEED_VERSION = 'v2';

/**
 * 种子书籍元信息 — 作为初始书库
 * 首次加载时写入localStorage，之后用户新增的书通过AI生成补充
 */
const seedBookMetas: BookMeta[] = [
  {
    title: '如何阅读一本书',
    author: '莫提默·艾德勒',
    coreQuestion: '阅读的层次是什么？如何真正读懂一本书？',
    keyIdeas: [
      '阅读的四个层次：基础、检视、分析、主题',
      '主动阅读：带着问题读书',
      '不同读物的不同读法',
    ],
    category: '方法论',
    tags: ['阅读法', '学习方法', '艾德勒'],
    source: 'seed',
    doubanId: '1013208',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s1670978.jpg',
    publishDate: '2004',
  },
  {
    title: '诗经：美了千年却被淡忘',
    author: '刘冬颖',
    coreQuestion: '诗经的美学价值和文化意义是什么？',
    keyIdeas: [
      '风雅颂的分类与美学',
      '赋比兴的表现手法',
      '诗经作为中国文学的源头',
    ],
    category: '古典文学',
    tags: ['诗经', '古典', '美学'],
    source: 'seed',
  },
  {
    title: '易经的奥秘：完整版',
    author: '曾仕强',
    coreQuestion: '《易经》的智慧对当代人有何启示？',
    keyIdeas: [
      '变易、简易、不易的三重原理',
      '阴阳是动态平衡，而非对立',
    ],
    category: '哲学',
    tags: ['易经', '中国哲学', '曾仕强'],
    source: 'seed',
    doubanId: '27106310',
    coverUrl: 'https://img2.doubanio.com/view/subject/l/public/s33929231.jpg',
    publishDate: '2017',
  },
  {
    title: '传习录',
    author: '王阳明',
    coreQuestion: '心学的核心主张是什么？如何知行合一？',
    keyIdeas: [
      '心即理：真理在心中',
      '知行合一：真知必行',
      '致良知：人人皆有本心',
    ],
    category: '哲学',
    tags: ['心学', '王阳明', '知行合一'],
    source: 'seed',
  },
  {
    title: '中庸',
    author: '子思',
    coreQuestion: '中庸之道如何在日常中实践？',
    keyIdeas: [
      '中庸是恰到好处的平衡',
      '诚是中庸的基础',
      '博学之，审问之，慎思之，明辨之，笃行之',
    ],
    category: '哲学',
    tags: ['儒家', '四书', '中庸'],
    source: 'seed',
  },
  {
    title: '乡土中国（果麦经典）',
    author: '费孝通',
    coreQuestion: '中国传统社会的基层结构是什么？',
    keyIdeas: [
      '差序格局：中国社会的同心圆结构',
      '礼治秩序：不是法治，也不是人治',
      '乡土性是中国社会的底色',
    ],
    category: '社会学',
    tags: ['社会学', '中国传统', '费孝通'],
    source: 'seed',
    doubanId: '1795079',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s1762210.jpg',
    publishDate: '2006',
  },
  {
    title: '小窗幽记',
    author: '陈继儒',
    coreQuestion: '明代文人在纷乱世界中如何安顿身心？',
    keyIdeas: [
      '清言：片段化的生活智慧',
      '以幽居抵御喧嚣',
    ],
    category: '古典文学',
    tags: ['明代', '清言', '文人'],
    source: 'seed',
    doubanId: '3226602',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s3454120.jpg',
    publishDate: '2008',
  },
  {
    title: '众神的样子：希腊神话与西方艺术',
    author: '江逐浪',
    coreQuestion: '希腊神话如何通过艺术呈现？',
    keyIdeas: [
      '神话人物的艺术形象演变',
      '神话与艺术的互文关系',
    ],
    category: '艺术',
    tags: ['希腊神话', '西方艺术', '艺术史'],
    source: 'seed',
  },
  {
    title: '文化伟人代表作图释书系：工具论',
    author: '亚里士多德',
    coreQuestion: '逻辑学的基础是什么？',
    keyIdeas: [
      '三段论的逻辑结构',
      '范畴与命题的分类',
      '演绎推理的规则',
    ],
    category: '哲学',
    tags: ['逻辑学', '亚里士多德', '哲学'],
    source: 'seed',
  },
  {
    title: '论法的精神（中法双语版）',
    author: '孟德斯鸠',
    coreQuestion: '法律与社会的关系是什么？',
    keyIdeas: [
      '三权分立的构想',
      '法律与气候、土壤、政体的关系',
      '自由是做法律许可的事',
    ],
    category: '政治',
    tags: ['法学', '孟德斯鸠', '三权分立'],
    source: 'seed',
  },
  {
    title: '世界简史',
    author: '威廉·麦克尼尔',
    coreQuestion: '人类历史作为一个整体，是如何发展的？',
    keyIdeas: [
      '人类社会组织方式的不可逆变化',
      '把人类历史作为一个整体进行概览',
      '文明间的接触与传播是历史的驱动力',
    ],
    category: '历史',
    tags: ['世界史', '宏观视角', '文明'],
    source: 'seed',
    doubanId: '26657357',
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s29142845.jpg',
    publishDate: '2015',
  },
  {
    title: '枪炮、病菌与钢铁',
    author: '贾雷德·戴蒙德',
    coreQuestion: '为什么历史选择了某些文明而非其他？',
    keyIdeas: [
      '环境决定论：地理与气候塑造文明',
      '粮食生产是文明兴起的前提',
      '病菌是征服的隐形武器',
    ],
    category: '历史',
    tags: ['历史', '戴蒙德', '环境决定论'],
    source: 'seed',
    doubanId: '6126683',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s3352250.jpg',
    publishDate: '2006',
  },
  {
    title: '大历史：虚无与万物之间',
    author: '大卫·克里斯蒂安',
    coreQuestion: '从大爆炸到今天，万物如何演化？',
    keyIdeas: [
      '大历史的八大门槛',
      '复杂性的不断增加',
      '人类在宇宙中的位置',
    ],
    category: '历史',
    tags: ['大历史', '宇宙', '演化'],
    source: 'seed',
    doubanId: '26817745',
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s28786497.jpg',
    publishDate: '2016',
  },
  {
    title: '崩溃：社会如何选择成败兴亡',
    author: '贾雷德·戴蒙德',
    coreQuestion: '文明为何崩溃？人类能否避免？',
    keyIdeas: [
      '环境破坏是崩溃的主要原因',
      '资源管理与社会韧性',
      '历史教训对当代的启示',
    ],
    category: '历史',
    tags: ['历史', '戴蒙德', '文明崩溃'],
    source: 'seed',
    doubanId: '4053907',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s4219012.jpg',
    publishDate: '2008',
  },
  {
    title: '思考，快与慢',
    author: '丹尼尔·卡尼曼',
    coreQuestion: '我们的思维如何工作？如何避免认知偏差？',
    keyIdeas: [
      '系统1与系统2：直觉与理性',
      '认知偏误的根源',
      '损失厌恶与前景理论',
    ],
    category: '心理学',
    tags: ['心理学', '卡尼曼', '认知'],
    source: 'seed',
    doubanId: '7973297',
    coverUrl: 'https://img3.doubanio.com/view/subject/l/public/s28272890.jpg',
    publishDate: '2012',
  },
  {
    title: '专注的真相',
    author: '李笑来',
    coreQuestion: '为什么现代人越来越无法专注？如何重建专注力？',
    keyIdeas: [
      '专注力是免疫系统，而非单纯的能力',
      '日常的每一件小事都在保护或消耗它',
      '信息过载时代，专注是稀缺资源',
    ],
    category: '自我提升',
    tags: ['专注力', '注意力', '免疫系统隐喻'],
    source: 'seed',
    doubanId: '37244381',
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s35204735.jpg',
    publishDate: '2024',
  },
  {
    title: '从细菌到巴赫再回来',
    author: '丹尼尔·丹尼特',
    coreQuestion: '意识如何从物质中产生？',
    keyIdeas: [
      '意识是演化的产物',
      '意向性的自然化',
      '从简单到复杂的渐进过程',
    ],
    category: '哲学',
    tags: ['意识', '丹尼特', '哲学'],
    source: 'seed',
    doubanId: '27112912',
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s29662643.jpg',
    publishDate: '2017',
  },
  {
    title: '生命3.0：AI超级智能与伦理边界重构',
    author: '迈克斯·泰格马克',
    coreQuestion: 'AI时代人类的未来是什么？',
    keyIdeas: [
      '生命的三个阶段：生物、数字、意识',
      'AI的对齐问题',
      '宇宙的未来与人类的角色',
    ],
    category: '科技',
    tags: ['AI', '未来', '泰格马克'],
    source: 'seed',
    doubanId: '30171322',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s29715629.jpg',
    publishDate: '2018',
  },
  {
    title: '人生的智慧',
    author: '叔本华',
    coreQuestion: '如何获得幸福？什么是人生的智慧？',
    keyIdeas: [
      '幸福在于减少痛苦而非增加快乐',
      '内在价值高于外在价值',
      '孤独是智慧的源泉',
    ],
    category: '哲学',
    tags: ['哲学', '叔本华', '幸福'],
    source: 'seed',
    doubanId: '1009854',
    coverUrl: 'https://img3.doubanio.com/view/subject/l/public/s1428433.jpg',
    publishDate: '1987',
  },
  {
    title: '悉达多（读客三个圈经典文库）',
    author: '赫尔曼·黑塞',
    coreQuestion: '如何找到自我？悟道的路径是什么？',
    keyIdeas: [
      '自我觉醒的旅程',
      '从知识到智慧的跨越',
      '平凡生活中的悟道',
    ],
    category: '文学',
    tags: ['小说', '黑塞', '悟道'],
    source: 'seed',
  },
  {
    title: '异乡人',
    author: '加缪',
    coreQuestion: '在荒诞的世界中，人如何存在？',
    keyIdeas: [
      '荒诞感的体验',
      '拒绝虚伪的社会规范',
      '在荒诞中找到意义',
    ],
    category: '文学',
    tags: ['小说', '加缪', '荒诞'],
    source: 'seed',
    doubanId: '1008219',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s1086367.jpg',
    publishDate: '2000',
  },
  {
    title: '心安：致焦虑的时代',
    author: '丛非从',
    coreQuestion: '焦虑的本质是什么？如何在焦虑中找到安顿？',
    keyIdeas: [
      '标签与实在：语言对感知的塑造',
      '焦虑源于对不确定性的抗拒',
      '接纳而非消除是安顿的起点',
    ],
    category: '心理学',
    tags: ['焦虑', '自我接纳', '心理'],
    source: 'seed',
    doubanId: '38421285',
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s35476755.jpg',
    publishDate: '2026',
  },
  {
    title: '原则',
    author: '瑞·达利欧',
    coreQuestion: '如何用原则指导人生和工作？',
    keyIdeas: [
      '痛苦+反思=进步',
      '相信算法化的决策',
      '极度透明和极度真实',
    ],
    category: '自我提升',
    tags: ['原则', '达利欧', '工作方法'],
    source: 'seed',
    doubanId: '30253830',
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s29752022.jpg',
    publishDate: '2018',
  },
  {
    title: '谈美',
    author: '朱光潜',
    coreQuestion: '美是什么？如何培养审美能力？',
    keyIdeas: [
      '美感经验是无功利的',
      '距离产生美',
      '美感与联想的关系',
    ],
    category: '哲学',
    tags: ['美学', '朱光潜', '审美'],
    source: 'seed',
    doubanId: '1505959',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s1098467.jpg',
    publishDate: '2008',
  },
  {
    title: '艺术之美',
    author: '朱良志',
    coreQuestion: '中国艺术的审美特质是什么？',
    keyIdeas: [
      '意境：中国艺术的核心概念',
      '虚实相生的美学',
      '气韵生动的追求',
    ],
    category: '艺术',
    tags: ['中国艺术', '美学', '朱良志'],
    source: 'seed',
  },
  {
    title: '中世纪之美',
    author: '翁贝托·艾柯',
    coreQuestion: '中世纪的美是什么样的？',
    keyIdeas: [
      '中世纪美学的独特观念',
      '宗教与美的交织',
      '象征主义的视觉语言',
    ],
    category: '艺术',
    tags: ['中世纪', '美学', '艾柯'],
    source: 'seed',
    doubanId: '30171336',
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s29715633.jpg',
    publishDate: '2018',
  },
  {
    title: '论优美感和崇高感',
    author: '康德',
    coreQuestion: '优美与崇高的区别是什么？',
    keyIdeas: [
      '优美是平静的愉悦，崇高是震撼的敬畏',
      '崇高感源于理性的超越',
      '审美判断力的批判',
    ],
    category: '哲学',
    tags: ['美学', '康德', '崇高'],
    source: 'seed',
    doubanId: '30324720',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s33264095.jpg',
    publishDate: '2018',
  },
  {
    title: '演讲的力量（TED 思想的力量系列）',
    author: '克里斯·安德森',
    coreQuestion: '如何用一场演讲真正传递思想？',
    keyIdeas: [
      '演讲的核心是传递思想，而非展示自我',
      '思想的传播遵循特定结构',
      '说服的艺术',
    ],
    category: '沟通',
    tags: ['演讲', 'TED', '沟通'],
    source: 'seed',
    doubanId: '26799348',
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s28931116.jpg',
    publishDate: '2016',
  },
  {
    title: '非暴力沟通（修订版）',
    author: '马歇尔·卢森堡',
    coreQuestion: '如何进行有效的沟通？',
    keyIdeas: [
      '观察、感受、需要、请求的四步法',
      '非暴力沟通的核心是倾听',
      '表达愤怒的正确方式',
    ],
    category: '沟通',
    tags: ['沟通', '非暴力', '卢森堡'],
    source: 'seed',
    doubanId: '10875549',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s26178865.jpg',
    publishDate: '2015',
  },
  {
    title: '亲密关系（第6版）',
    author: '罗兰·米勒',
    coreQuestion: '亲密关系如何发展和维持？',
    keyIdeas: [
      '依恋类型影响关系模式',
      '公平与交换的原则',
      '冲突管理的技巧',
    ],
    category: '心理学',
    tags: ['心理学', '亲密关系', '米勒'],
    source: 'seed',
    doubanId: '26942840',
    coverUrl: 'https://img3.doubanio.com/view/subject/l/public/s28599748.jpg',
    publishDate: '2015',
  },
  {
    title: '大国大城：当代中国的统一、发展与平衡',
    author: '陆铭',
    coreQuestion: '城市化如何影响中国的发展？',
    keyIdeas: [
      '大城市化是不可逆转的趋势',
      '城乡二元结构的问题',
      '集聚效应的经济价值',
    ],
    category: '经济',
    tags: ['城市化', '经济', '陆铭'],
    source: 'seed',
    doubanId: '26695854',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s28771707.jpg',
    publishDate: '2016',
  },
  {
    title: '大仲马美食词典',
    author: '大仲马',
    coreQuestion: '美食与生活的关系是什么？',
    keyIdeas: [
      '美食是生活艺术的一部分',
      '烹饪中的文化与历史',
      '味觉的记忆与情感',
    ],
    category: '生活',
    tags: ['美食', '大仲马', '生活'],
    source: 'seed',
  },
  {
    title: '卡尔·拉格斐的世界',
    author: '卡尔·拉格斐',
    coreQuestion: '时尚如何表达自我？',
    keyIdeas: [
      '时尚是个人风格的表达',
      '简约与优雅的追求',
      '时尚与艺术的跨界',
    ],
    category: '时尚',
    tags: ['时尚', '拉格斐', '设计'],
    source: 'seed',
  },
  {
    title: '一色一生',
    author: '志村福美',
    coreQuestion: '色彩如何从自然中诞生？染织艺术家如何与材料对话？',
    keyIdeas: [
      '色彩是自然与时间的馈赠',
      '手作是与材料的持续对话',
    ],
    category: '设计',
    tags: ['染织', '色彩', '手作'],
    source: 'seed',
    doubanId: '35166573',
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s33744946.jpg',
    publishDate: '2021',
  },
  {
    title: '夏日走过山间（果麦经典）',
    author: '约翰·缪尔',
    coreQuestion: '自然如何治愈人？如何在荒野中找到神圣？',
    keyIdeas: [
      '自然不是资源，而是灵性源泉',
      '山间漫步是一种冥想',
    ],
    category: '自然文学',
    tags: ['自然', '荒野', '缪尔'],
    source: 'seed',
    doubanId: '30172061',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s34477248.jpg',
    publishDate: '2018',
  },
  {
    title: '巨流河（纪念版）',
    author: '齐邦媛',
    coreQuestion: '一个知识分子如何在战乱中守住精神的根？',
    keyIdeas: [
      '战争与流离中的文化坚守',
      '文学作为救赎',
    ],
    category: '传记',
    tags: ['回忆录', '抗战', '知识分子'],
    source: 'seed',
    doubanId: '4842446',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s4494379.jpg',
    publishDate: '2010',
  },
  {
    title: '草叶集（译文名著精选）',
    author: '惠特曼',
    coreQuestion: '民主个体如何通过诗歌被礼赞？',
    keyIdeas: [
      '万物平等的诗学',
      '身体与灵魂的统一',
    ],
    category: '诗歌',
    tags: ['诗歌', '民主', '美国'],
    source: 'seed',
    doubanId: '36104313',
    coverUrl: 'https://img9.doubanio.com/view/subject/l/public/s34315714.jpg',
    publishDate: '2022',
  },
  {
    title: '物种起源',
    author: '达尔文',
    coreQuestion: '生命如何演化？自然选择的机制是什么？',
    keyIdeas: [
      '自然选择：适者生存',
      '物种渐变的证据',
      '共同祖先的概念',
    ],
    category: '科普',
    tags: ['演化', '达尔文', '自然选择'],
    source: 'seed',
    doubanId: '1008230',
    coverUrl: 'https://img1.doubanio.com/view/subject/l/public/s1415460.jpg',
    publishDate: '2012',
  },
  {
    title: '时间简史（第一推动丛书·宇宙系列）',
    author: '史蒂芬·霍金',
    coreQuestion: '宇宙的起源和命运是什么？',
    keyIdeas: [
      '大爆炸理论',
      '黑洞与时间弯曲',
      '宇宙的终极命运',
    ],
    category: '科普',
    tags: ['宇宙', '霍金', '物理学'],
    source: 'seed',
    doubanId: '1015904',
    coverUrl: 'https://img3.doubanio.com/view/subject/l/public/s2723878.jpg',
    publishDate: '2010',
  },
];

/**
 * 从localStorage加载书库
 * 如果是首次加载，写入种子数据
 */
export function loadBookLibrary(): Record<string, BookMeta> {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as { version: string; library: Record<string, BookMeta> };
      if (data.version === SEED_VERSION && data.library) {
        return data.library;
      }
    }
  } catch {
    // ignore
  }

  // 首次加载：写入种子数据
  const library: Record<string, BookMeta> = {};
  for (const meta of seedBookMetas) {
    library[meta.title] = meta;
  }
  saveBookLibrary(library);
  return library;
}

/**
 * 保存书库到localStorage
 */
export function saveBookLibrary(library: Record<string, BookMeta>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      version: SEED_VERSION,
      library,
    }));
  } catch {
    // ignore
  }
}

/**
 * 清理书名用于匹配
 */
function cleanTitle(title: string): string {
  return title
    .replace(/[（(].*[）)]/g, '')
    .replace(/[：:].*$/g, '')
    .trim();
}

/**
 * 在书库中查找书籍元信息
 * 支持模糊匹配（去除副标题、括号等）
 */
export function findBookMetaInLibrary(
  library: Record<string, BookMeta>,
  title: string,
): BookMeta | undefined {
  // 精确匹配
  if (library[title]) return library[title];

  // 模糊匹配
  const cleanQuery = cleanTitle(title);
  if (!cleanQuery) return undefined;

  for (const key of Object.keys(library)) {
    const cleanKey = cleanTitle(key);
    if (cleanKey === cleanQuery || cleanKey === title || key === cleanQuery) {
      return library[key];
    }
  }
  return undefined;
}

/**
 * 更新或新增一本书到书库
 */
export function updateBookInLibrary(
  library: Record<string, BookMeta>,
  meta: BookMeta,
): Record<string, BookMeta> {
  const newLibrary = { ...library };
  const existing = findBookMetaInLibrary(library, meta.title);
  const key = existing ? existing.title : meta.title;
  newLibrary[key] = {
    ...existing,
    ...meta,
    updatedAt: new Date().toISOString(),
  };
  saveBookLibrary(newLibrary);
  return newLibrary;
}
