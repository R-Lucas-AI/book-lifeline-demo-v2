# Book Lifeline v3 设计改造记录

## 一、设计理念来源

v3 的设计改造基于四本书的核心思想，它们共同塑造了"安静、留白、以你为中心"的体验方向。

- **原研哉《白》/《空》**："空"不是简约，而是容器。留白即信息。Exformation（隐性信息）：将已知转为未知，让用户主动填补意义。
- **宇治智子《AISUS》**：五个设计评价维度——Accessibility（3秒理解）、Impression、Sincerity、Uniqueness、Share。核心原则"别贪心"（Ch.3）：减少元素，不增加。
- **Niedderer《Mindful Design》**："轻中断"——placeholder 作为自我追问触发器，不是功能提示。认知路径：disruption -> awareness -> conscious choice。
- **郭伟《视觉隐喻》**："图式不一致"驱动意义推断。鱼影效果：通过结构相似 + 图式不一致让用户自己推断"这里连接着我的过去"。

---

## 二、v3 设计原则清单（每个页面都必须满足）

1. **定位语替代功能标题**：回答"你在哪里"（locative），不是"这是什么功能"（functional）
2. **第二人称语言**：全文"你"，不使用第三人称
3. **回声/书脉视觉语言**：彩色时间轴（紫=溯源、橙=对照、绿=回响）、圆点连线、涟漪动画
4. **"别贪心"减法**：去掉 tags、去掉"已保留"、去掉装饰性图标、去掉多余解释
5. **"空"容器感**：首页留白即信息，locator 是设计本身
6. **跨页一致性**：CSS 变量统一、Tab bar 统一、body 背景统一

---

## 三、逐页改造详情

### 输入页 v3

- **移除**：标题区（h2 + subtitle）、功能提示文字（"读书感受 · AI协作思考 · 生活感悟"）、示例区（"不知道写什么？"）、语音推荐提示、pool status bar
- **新增**：定位语"记录此刻的感受"（13px, text-quinary）、正念 placeholder"你刚刚感受到了什么？"
- **新增交互**：鱼影效果（textarea 聚焦 600ms 后显示随机旧痕迹）、回声涟漪（CTA 点击 3 个扩散圆环）、固定底部"你在这里留下了312条痕迹"
- **布局**：垂直居中（flex justify-content: center），max-width 640px

### 节点确认页 v3

- **移除**："AI已将你的想法整理如下" -> "确认你的感受"、SVG 箭头连接符 -> 4px 圆点连接器、"关联书籍" -> "相关书籍"、副标签和功能提示
- **新增**：fadeInUp 交错动画（0s ~ 0.3s）
- **保留**：摘录展开/收起 JS 交互

### AI分析中页 v3

- **移除**：英文"整理ReadingNode" -> "整理节点"
- **文案改造**：Step 2 "提取书名、摘录、标签" -> "提取书名、摘录与核心语义"
- **文案改造**：Step 1 结果"已识别主题：文明模式、时间尺度、集体记忆" -> "感受到你的关注点：文明是如何被连接的"
- **文案改造**："预计还需要5-10秒" -> "正在向你的过去发送回声"
- **新增**：echo ripple 动画（pool-ripple-dot + pool-ripple-ring）
- **设计理念**：等待体验与品牌叙事对齐——"Align loading animations with your brand narrative"

### 旧回声推荐页 v3

- **新增**：左侧时间轴（2px 垂直线, left: 8px）、彩色圆点（12px + 20px ::after 光晕环）
- **改造**：conn-type 彩色徽章（inline-block）、一行 conn-desc（约40字符）、trace-quote（2px 左边框）
- **改造**："你在旧痕迹中找到了3条连接"（第二人称 header）
- **动画**：translateX(-8px) 交错入场

### 书脉回看页 v3

- **移除**：绿色对勾成功指示器、"新ReadingNode"英文标签、所有 tags、"NEW"徽章、"insight" mono pill、"已保留"状态、"4/4"步骤指示器、"分享这条书脉片段"链接
- **新增**：定位语"你的书脉在这一刻延伸"（13px, text-quinary）、上下文条（"你刚刚记录的"）、4节彩色时间轴（此刻/溯源/对照/回响）、书脉洞察（星标 + 第二人称叙述）
- **时间轴视觉**：与旧回声推荐页完全一致——lifeline-list::before 2px 垂直线、彩色圆点、卡片分支向右

### 新节点确认页 v3

- **移除**：48px 装饰性绿色对勾、tags、3段式"关于这次结果"解释、功能提示（"这条书脉输入可以在来源页的'书脉输入'区域中查看"）、"你的新感悟已保存为书脉输入"功能标题
- **新增**：定位语"你在这里留下了新的痕迹"（15px, text-secondary）、安静反思"这是一条全新的痕迹。未来某天，它可能成为其他感悟的旧回声。"
- **设计**：大量留白，真正的"空"容器感。蓝色主按钮指向"进入书脉"（更流畅的下一步）
- **类型标签**："书脉输入" -> "读后感"（更有人味）

### 书脉总览页 v3

- **移除**：pool 统计仪表板（"读书摘要 · 300+条连接"、"3个ReadingNode"）、"AI模式总结"标签
- **新增**：定位语"你的阅读痕迹在这里生长"（15px, text-quinary）、"书脉洞察"（第二人称叙述，替代"AI模式总结"）
- **书架**：gap 从 24px 增至 28px、meta 文本"3条连接" -> "1条书脉节点"、架线降低至 1px + opacity 0.5
- **CTA**："输入新想法" -> "记录新的感受"

### 书籍详情页 v3

- **移除**：section-count 徽章、section-desc 描述文字、stat-pulse 蓝色高亮、复杂统计拆分
- **简化**：头部统计合并为"56条划线 · 20条想法"
- **保留**：彩色左边框连接方向语言（橙=连向生活, 紫=连向另一本书, 蓝=书脉节点）、原始痕迹折叠/展开 JS
- **标准化**：toolbar 和 tab bar 统一为 v3 样式

### 来源页 v3

- **移除**：统计概览卡片（"约10本书籍 · 300+条..."）、所有 tags（#世界简史等）、区域副标题（"来自微信读书"/"来自Notion"/"来自Book Lifeline"）、"查看全部 ->"链接、"来源：Book Lifeline"标签、书籍条数徽章和统计行
- **新增**：定位语"你读过的每一行字，都在这里"（15px, text-quinary）
- **保留**：所有实际痕迹内容（引文、日期）、日记折叠组结构 + JS、书籍双列网格、痕迹类型徽章颜色系统

---

## 四、跨页一致性修复（PDCA Cycle 1）

### CSS 变量统一

- body 背景色：旧回声推荐页/书脉回看页 `#FAFAFA`（硬编码） -> `var(--fill-secondary)`
- AI分析中页 `--fill-secondary` 值 `#F9F9FB` -> `#F2F2F7`；`--text-quinary` 值 `#C7C7CC` -> `#AEAEB2`
- 补全 AI分析中页缺失变量：`--separator-light`, `--fill-context`, `--text-placeholder`, `--orange`, `--purple`

### 布局统一

- 旧回声推荐页/书脉回看页 max-width `820px` -> `640px`
- AI分析中页 body 背景 `var(--fill-primary)`（白色） -> `var(--fill-secondary)`

### 链接统一

- 所有 9 个 v3 页面中的 href 全部指向 -v3.html 文件，0 处 v1 链接残留

---

## 五、设计原则合规验证（PDCA Cycle 2-3）

### 借鉴来源

- **"Designing Time: How Interfaces Shape Temporal Experience"** (zhenweiliu.com)
  - 核心启发："Align loading animations with your brand narrative"
  - "Use the waiting period to prepare users for what comes next"
  - "Time is the invisible material that designers shape"

### 验证结果

- `#FAFAFA` 硬编码：0 处残留
- `ReadingNode` 英文：0 处
- "标签"仅出现在用户引文内容中（"回到实在，别活在标签里"），不是系统 UI 文案
- 所有页面均使用定位语（locator）而非功能标题
- 第二人称语言贯穿全部 9 个页面
