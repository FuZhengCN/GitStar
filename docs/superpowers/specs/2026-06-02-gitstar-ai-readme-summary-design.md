# AI README 概述 — 设计文档

**日期：** 2026-06-02
**范围：** Chrome 扩展 DetailPage 新增 AI 驱动的 README 本地语言概述功能

## 问题诊断

当前 DetailPage 进入后直接展示 README 全文，但 README 通常内容繁多（API 文档、贡献指南、安装步骤等），用户很难快速判断"这个项目是做什么的"和"我能用它来干什么"。需要一个 AI 驱动的概述功能，将 README 浓缩为 3-5 句本地语言概述，帮助用户快速筛选。

## 方案选择

选择 **方案：OpenAI 兼容 API + 智能截断 + 缓存 + 浮动按钮浮层弹窗**。

理由：
- 兼容 OpenAI 接口格式（`/v1/chat/completions`），适配 DeepSeek、通义千问、智谱等国内主流模型
- 智能截断 README（去图片/代码块/空行）提升有效信息密度，降低 token 消耗
- 缓存概述结果避免重复调用 API（省钱+秒出）
- 浮动按钮组浮层弹窗，与现有 TOC/返回顶部/收起按钮模式一致

## 设计

### 1. API 层

**接口格式：** OpenAI 兼容 `/v1/chat/completions`

**配置项：** Endpoint URL、API Key、Model 名称、概述语言（默认中文），存 `chrome.storage.local` key `gitstar-ai-config`。TypeScript 接口定义在 `extension/lib/types.ts`：

```ts
export interface AIConfig {
  endpoint: string;     // 默认 https://api.deepseek.com/v1/chat/completions
  apiKey: string;
  model: string;        // 默认 deepseek-chat
  summaryLanguage: string; // 默认 "中文"
}
```

**Prompt 策略：**
- 对 README markdown 源码做智能截断：去掉图片语法 `![...](...)` 和 HTML `<img>` → 去掉 ``` 代码围栏块内容 → 合并多余空行 → 取前 8KB
- 系统 Prompt 根据配置的概述语言本地化（不硬编码中文）：

| 语言配置 | System Prompt |
|----------|-------------|
| 中文 | 你是一个技术文档概述助手。用简洁的中文总结以下README文档，包括：(1)项目的主要功能 (2)适用场景。控制在3-5句话以内。 |
| English | You are a technical documentation summarizer. Summarize the following README in concise English, including: (1) what the project does, (2) applicable use cases. Keep it to 3-5 sentences. |

- 其他语言项在实现时按需扩展映射表
- 发送截断后的 markdown 原文（非 HTML），LLM 天然理解 markdown

**错误处理：** 网络问题 / Key 错误 / 配额不足均在弹窗内静默显示错误信息（红字 + 错误图标），不干扰页面。在 `ai-summary.ts` 中将 API 错误按 HTTP 状态码和网络异常分别映射为用户可读的 i18n key。

**请求去重：** 使用 `useRef` 维护 `isSummarizingRef` 标记，请求进行中时忽略新的点击，防止双击重复调用 API 浪费配额。

### 2. UI 交互

**浮动按钮组新增按钮：**
- 按钮顺序（从上到下）：📋 目录 → ↑ 返回顶部 → 🤖 AI 概述 → ✕ 收起
- 样式与其他按钮一致：`w-7 h-7 rounded-full` 白底灰边框（`bg-white border-[#e5e7eb]`）
- icon：`🤖`
- `aria-label="AI 概述"`

**浮层弹窗：**
- 点击按钮后，在按钮左侧弹出卡片浮层（`position: fixed`）
- **尺寸与定位：** 最大宽度 `max-w-[260px]`，设定合适的 `right` 值确保不超出 400px popup 左边界。当 `window.innerWidth < 400` 时回退为右对齐（按钮正上方弹出）
- **与 TOC 弹窗冲突处理：** AI 弹窗打开时自动关闭 TOC 弹窗（`setTocVisible(false)`），避免两个浮层重叠
- 三种状态：
  - **加载中：** 骨架屏动画（3 行脉冲） + "正在生成概述..."
  - **失败：** 红色错误图标 + 错误原因文字
  - **成功（首次）：** 概述文本（中文/配置语言） + 底部刷新按钮 🔄
  - **成功（缓存命中）：** 概述文本 + 底部刷新按钮 🔄 + 缓存时间标记（如"已缓存 · 2分钟前"）
- **导航重置：** DetailPage 的 `useLayoutEffect` 中在 `owner/repo` 变化时，同步重置 `setAiSummaryState(null)` 和 `setAiSummaryVisible(false)`，防止从仓库 A 跳到 B 时短暂显示旧概述
- 关闭方式：✕ 关闭按钮 / 点击弹窗外部区域

**首次配置引导：**
- 未配置 API 信息时点击按钮 → 弹窗内显示引导提示 + "前往配置"链接（`<a href="#/options">` 或无 history 导航）

### 3. 缓存策略

- **缓存 key：** `gitstar-ai:summary:<owner>/<repo>`，使用独立前缀 `gitstar-ai:` 而非 `gitstar-cache:`，存入 `chrome.storage.local`
- **为什么独立前缀：** 现有 `cache.ts` 使用全局 30 条目 LRU 淘汰（`evictOldest()`），不区分缓存类型。摘要缓存若混入 `gitstar-cache:` 池，会被搜索/仓库缓存的频繁写入挤出。独立前缀避免此竞争
- **自身淘汰：** `ai-summary.ts` 中 `saveSummary()` 写入后自管理淘汰，保持最多 50 条摘要条目（`gitstar-ai:summary:*` 前缀过滤 + 按时间戳删最旧）
- **无 TTL：** 直接 `chrome.storage.local.get(key)` 读取，不经过 `isFresh()` 判断。README 更新频率低（通常以月/年计），手动刷新已足够覆盖更新场景
- 流程：先 `chrome.storage.local.get` → 命中直接展示（不检查 TTL）→ miss 或手动刷新时调 API → `chrome.storage.local.set` 写入
- 弹窗内提供 🔄 刷新按钮，用户手动触发重新生成（调 API + 覆盖缓存）

### 4. 配置入口

**Options 页新增「AI 概述」配置区：**
- Endpoint URL（默认 `https://api.deepseek.com/v1/chat/completions`，便于用户替换）
- API Key（`type="password"`，安全遮蔽）
- Model 名称（placeholder: `deepseek-chat`）
- 概述语言（下拉选择：中文 / English / 日本語 等，默认中文）

**首次使用引导：**
- 点击 AI 概述按钮 → 检测配置是否完整（至少 API Key 不为空）
- 未配置：弹窗内显示"尚未配置 AI 服务，请先前往 Options 页配置" + "前往配置"链接
- 已配置：正常调用 API

### 5. 数据流

```
README markdown content (extension/lib/github.ts: getRepoReadme())
  ↓ content 传入
智能截断 (新 lib/ai-summary.ts: truncateReadme(content, maxBytes=8192))
  ↓
加载配置 (chrome.storage.local: gitstar-ai-config)
  ↓
查缓存 (chrome.storage.local: gitstar-ai:summary:<owner>/<repo>，不经过 isFresh)
  ↓ miss
POST /v1/chat/completions (fetch with Bearer API Key, isLoadingRef 防重)
  ↓
解析 response.choices[0].message.content
  ↓
写缓存（带自身淘汰 ≤50 条） + 展示弹窗
```

## 涉及文件

| 文件 | 变更 |
|------|------|
| `extension/popup.tsx` (DetailPage) | 浮动按钮组新增 AI 概述按钮 + 浮层弹窗组件状态管理 + 导航时重置 |
| `extension/lib/ai-summary.ts` | **新增**：`AIConfig` 类型、智能截断函数 `truncateReadme()`、API 调用 `fetchSummary()`（含 `isLoadingRef` 防重）、缓存读写 `getCachedSummary()`/`saveSummary()`（独立前缀 + 自身淘汰 ≤50 条） |
| `extension/lib/types.ts` | **新增** `AIConfig` 接口（endpoint、apiKey、model、summaryLanguage） |
| `extension/options.tsx` | Options 页新增「AI 概述」配置区（Endpoint/API Key/Model/语言） |
| `extension/lib/constants.ts` | 新增默认值常量（`DEFAULT_AI_ENDPOINT`、`DEFAULT_AI_MODEL`、`MAX_SUMMARY_CACHE_ENTRIES=50`、`README_TRUNCATE_BYTES=8192`） |
| `extension/locales/zh.json` | 新增 AI 概述相关 i18n key（见下方 i18n 清单） |
| `extension/locales/en.json` | 同上，英文翻译 |

**新增 i18n key 清单：**

| Key (zh) | 中文 | English |
|----------|------|---------|
| `aiSummaryButtonLabel` | AI 概述 | AI Summary |
| `aiSummaryLoading` | 正在生成概述... | Generating summary... |
| `aiSummaryCached` | 已缓存 · {n}分钟前 | Cached · {n} min ago |
| `aiSummaryCachedJustNow` | 已缓存 · 刚刚 | Cached · just now |
| `aiSummaryRefresh` | 刷新 | Refresh |
| `aiSummaryNotConfigured` | 尚未配置 AI 服务 | AI service not configured |
| `aiSummaryGoConfig` | 前往配置 | Configure |
| `aiSummaryErrorNetwork` | 网络连接失败，请检查网络 | Network error, check connection |
| `aiSummaryErrorAuth` | API Key 无效，请检查配置 | Invalid API Key, check settings |
| `aiSummaryErrorQuota` | API 配额不足 | API quota exceeded |
| `aiSummaryErrorUnknown` | 请求失败，请稍后重试 | Request failed, please retry |
| `aiOptionSectionTitle` | AI 概述 | AI Summary |
| `aiOptionEndpoint` | API 地址 | API Endpoint |
| `aiOptionApiKey` | API Key | API Key |
| `aiOptionModel` | 模型 | Model |
| `aiOptionLanguage` | 概述语言 | Summary Language |

## Non-Goals

- 不改变现有浮动按钮的行为（TOC/返回顶部/收起）
- 不改变 README 正文展示
- 不提供对话/追问功能（只做一次概述，不做 Chat）
- 不自动触发概述（用户主动点击才调用 API）
- 不影响 Sidebar 面板
