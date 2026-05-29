# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 铁律

1. **根因驱动**：必须定位到问题的根本原因再动手修改。禁止在未找到根因的情况下猜测性修改代码。每个修改必须能解释"为什么"。
2. **三轮止损**：同一个问题如果在三个对话轮次内仍未解决，必须停下来回到问题起点，从第一性原理重新分析，不可继续沿用之前的思路惯性。
3. **极简修改**：能少写一行代码就绝不多写。优先用最精简的方式解决问题，禁止引入不必要的抽象、额外文件或依赖。
4. **专注问题**：改问题时只改问题本身，禁止顺手重构、格式化、优化无关代码。重构需要先征得明确同意。
5. **二次确认**：当用户的选择与你推荐的选择不符时，必须先展示该选择的利弊，让用户二次确认后再执行。禁止直接按用户选择执行而不做利弊提醒。
6. **可验证优先**：每次修改后必须有可观测的验证证据（测试通过 / 运行截图 / 日志输出），禁止在无验证的情况下声称"应该没问题了""应该修好了"。

## Commands

本项目包含两个独立子项目：Next.js Web 应用（根目录）和 Chrome 扩展（`extension/` 目录）。两者的构建脚本不可混用。

```bash
npm run dev      # Web 开发服务器（热更新，不要同时跑 build）
npm run build    # Web 生产构建
npm run start    # Web 启动生产服务（需先 build）
npm run lint     # Web ESLint
```

构建和 dev 共用 `.next` 目录，同时运行会触发 webpack 缓存冲突（`Cannot find module './xxx.js'`）。改代码后靠 dev 的热更新即可，不需要反复 build。

扩展命令见下方 [Extension](#extension) 章节。

## Architecture

Next.js 14 App Router + TypeScript + Tailwind CSS。展示 GitHub 高 Star 项目的工具站。导入路径别名 `@/*` → `./src/*`（`tsconfig.json` paths）。

### Rendering Strategy

| 路由 | 渲染 | 说明 |
|------|------|------|
| `/` | SSG + ISR (1h) | 首次静态生成，之后每小时刷新 |
| `/project/[owner]/[repo]` | ISR on-demand (1h) | 首次访问时 SSR，之后缓存 |
| `/api/repos` | Dynamic | 代理 GitHub Search API |
| `/api/repos/[owner]/[repo]` | Dynamic | 代理 GitHub Repo + README API |

### Data Flow

```
GitHub API (api.github.com)
  ↑ fetch with Bearer token
lib/github.ts          ← 服务端缓存（Map，TTL 5min）+ 参数校验
  ↑ searchRepos() / getRepoDetail()
API Routes             ← HTTP Cache-Control: max-age=300
  ↑ fetch('/api/repos?...')
Pages (SSG/ISR/SSR)   ← 服务端
  ↑ props
Client Components      ← useFavorites (localStorage), useDebounce (300ms)
```

`lib/github.ts` 的两层函数 `searchRepos` / `getRepoDetail` 被 API Routes 和 Server Components 直接调用。API Routes 做参数白名单过滤后再调这些函数。

### Server/Client Component Split

Server Components（默认）：`page.tsx`、`layout.tsx`、`loading.tsx` — 可直接 async 调 `lib/github.ts`

Client Components（`'use client'`）：`HomePageClient.tsx`、`DetailPageClient.tsx`、`components/*` — 通过 `fetch('/api/repos?...')` 获取数据

### State Management

- **筛选状态**：存在 URL search params（`q`, `language`, `created`, `sort`, `page`），支持分享链接。`HomePageClient` 初始从 URL 读取，变化时写回。
- **收藏**：`useFavorites` hook（`src/hooks/useFavorites.ts`），存 `localStorage`，key 为 `gitstar-favorites`。SSR 安全：`loaded` 为 false 前不写 localStorage。注意和扩展的 `useFavorites` 不同（扩展用 `chrome.storage.local`）。
- **搜索防抖**：`useDebounce` hook（`src/hooks/useDebounce.ts`），300ms。
- **加载状态**：`HomePageClient` 内 `loading` state 控制 `LoadingBar`（顶部蓝色细条）+ 骨架屏；详情页 `loading.tsx` 自带 `LoadingBar`。

### 关键约束

- `useSearchParams()` 必须包裹在 `<Suspense>` 中（`page.tsx` 已处理）
- `.env.local` 中 `GITHUB_TOKEN` 无 Token 时限流 60 次/小时，有 Token 5000 次/小时
- 开发时端口被占需手动 `taskkill //F //IM node.exe` 清理僵尸进程
- `npm run build` 的输出中包含 SSG/ISR 标注（○ Static / ƒ Dynamic），可确认渲染策略正确

## Design Spec & Plan

- Web 设计文档：`docs/superpowers/specs/2026-05-27-gitstar-design.md`
- Web 实现计划：`docs/superpowers/plans/2026-05-27-gitstar-plan.md`
- 扩展设计文档：`docs/superpowers/specs/2026-05-27-gitstar-extension-design.md`
- 扩展实现计划：`docs/superpowers/plans/2026-05-27-gitstar-extension-plan.md`
- 图标设计文档：`docs/superpowers/specs/2026-05-28-gitstar-icon-design.md`
- 缓存优化设计：`docs/superpowers/specs/2026-05-28-gitstar-popup-cache-design.md`
- 缓存优化计划：`docs/superpowers/plans/2026-05-28-gitstar-popup-cache-plan.md`
- 收藏页设计：`docs/superpowers/specs/2026-05-29-gitstar-favorites-page-design.md`
- 收藏页计划：`docs/superpowers/plans/2026-05-29-gitstar-favorites-page-plan.md`
- i18n 设计：`docs/superpowers/specs/2026-05-29-gitstar-i18n-design.md`
- i18n 计划：`docs/superpowers/plans/2026-05-29-gitstar-i18n-plan.md`

## Non-Goals

无用户系统、无数据库、无 star 趋势图、无个性化推荐。

## Extension

浏览器扩展项目位于 `extension/` 目录，基于 Plasmo v0.90.5 + React 18 + TypeScript + Tailwind CSS 3。和原 Next.js 项目共用 git 仓库，`src/` 不动。

```bash
cd extension
npm run dev      # 开发（热更新，需手动刷新扩展；图标有色偏，验证功能用）
npm run build    # 生产构建（图标颜色正确，验证图标和最终效果用）
npm run package  # 打包为 .zip（用于 Chrome Web Store 发布）
node scripts/generate-icons.js  # 从 icon.svg 生成各尺寸 PNG（依赖 sharp）
```

构建产物在 `extension/build/chrome-mv3-prod/`，Chrome `chrome://extensions/` → "加载已解压的扩展程序" 指向该目录。

### 文件结构（Plasmo 扁平约定）

Plasmo v0.90.5 使用根级入口文件，不是目录结构：

| 入口 | 文件 | 说明 |
|------|------|------|
| Popup | `extension/popup.tsx` | 工具栏弹窗，wouter hash 路由 |
| Content Script | `extension/contents/github-sidebar.tsx` | GitHub 页面注入推荐面板 |
| Options | `extension/options.tsx` | Token + 语言配置页（`OptionsIndex` 外层 Provider + `OptionsForm` 内层） |

`extension/components/`（含 `ErrorState.tsx`、`GitStarIcon.tsx` 等）和 `extension/hooks/` 存放 UI 组件和 hooks。类型定义在 `extension/lib/types.ts`，共享常量在 `extension/lib/constants.ts`，缓存层在 `extension/lib/cache.ts`，SWR hook 在 `extension/hooks/useStaleCache.ts`，i18n 在 `extension/lib/i18n.tsx`（翻译字典在 `extension/locales/`），Worker 在 `extension/workers/markdown-worker.ts`。

### Data Flow

```
GitHub REST API (api.github.com)
  ↑ fetch + Bearer Token
extension/lib/github.ts       ← 直接调 API（atob 解码 README），不掺和缓存
  ↑ searchRepos() / getRepoInfo() / getRepoReadme()
  ↑ checkStarred() / starRepo() / unstarRepo()  ← GitHub Star API（需 Token scope）
extension/lib/cache.ts        ← chrome.storage.local 缓存读写，MAX_ENTRIES=30 自动淘汰最旧条目
  ↑
extension/hooks/useStaleCache.ts  ← SWR hook：缓存秒出 → 后台刷新 → 错误保留旧数据
  ↑ useStaleCache(cacheKey, fetcher, ttlMs)
extension/lib/markdown.ts     ← Worker 通信 + DOMPurify 净化（<10KB 主线程解析，≥10KB Worker 解析）
  ↑ parseMarkdown()
extension/workers/markdown-worker.ts  ← Worker 线程执行 marked.parse()（不做净化，无 DOM）
extension/lib/i18n.tsx      ← I18nProvider Context + useI18n hook（零依赖，JSON 字典导入）
  ↑ t('key') 查 locales/{lang}.json
Popup (popup.tsx)             Content Script (contents/github-sidebar.tsx)
  ↑ React state + useI18n()      ↑ React state + useI18n()

chrome.storage.sync  → githubToken（跨设备同步）
chrome.storage.local → gitstar-favorites（本地收藏）+ gitstar-cache:*（API 数据缓存）+ gitstar-lang（语言偏好，设备级）
sessionStorage        → 搜索参数（同一 popup 会话内导航恢复，关闭即清除）
```

**搜索状态持久化：** HomePage 的搜索/筛选/分页参数在 `useState` 初始化时从 `sessionStorage` 读取，变化时写回。用户从详情页返回时自动恢复搜索结果（缓存命中秒出）。popup 关闭后 sessionStorage 清除，下次打开是干净首页。

Star API（`PUT/DELETE /user/starred/:owner/:repo`）需要用户 Token 有 `public_repo` 或 `star` scope，否则返回 403/404。

和原 Next.js 版的核心区别：无 API Route 代理、无服务端缓存、Token 由用户自己在 Options 页配置。

**host_permissions 说明：** 当前仅 `https://api.github.com/*` 一条，用于 `github.ts` 中所有 `fetch()` 调用。`<img>` 标签跨域加载图片（如 `avatars.githubusercontent.com` 头像）不需要 `host_permissions`，控制台中 Private Network Access 告警是 Chrome 的已知行为，不影响功能，无需处理。Google Web Store 审核对 `host_permissions` 严格，每一条都必须能说明必要性，不要让告警驱动权限膨胀。

**DetailPage 加载流程（双阶段 + 缓存）：**

1. `useStaleCache(repo:${owner}/${repo}, ...)` → 缓存命中秒出 RepoHeader，否则调 `getRepoInfo()`
2. RepoHeader 渲染后 `readmeCacheKey` 从 null 变为有效值，触发 README `useStaleCache`
3. `getRepoReadme()` → `parseMarkdown()` 在 Worker 后台解析 → `ReadmeViewer` 接收预解析 HTML

Worker 创建失败或文件 < 10KB 时，自动回退主线程解析。

**FavoritesPage 加载流程（缓存优先 + 分批请求）：**

1. `useFavorites()` → 读取 `chrome.storage.local` 中的 `gitstar-favorites`（`owner/repo` 字符串数组）
2. 缓存优先：对每个 `owner/repo` 先查 `repo:*` 缓存（`getCache` + `isFresh`，TTL 5min），命中直接使用
3. 缓存 miss 的项目分批并发：每批 5 个 `getRepoInfo()`，批次间隔 200ms，避免 GitHub secondary rate limit
4. 请求成功写 `setCache`，请求失败跳过（`Promise.allSettled`）
5. 详情页的 `useStaleCache` 写入的 `repo:*` 缓存可直接复用，从详情页返回收藏页秒出
6. 分页：每页 10 条，复用 `Pagination` 组件，`favorites` 变化时重置到第 1 页
7. `cancelled` 标记在 `useEffect` cleanup 中阻止卸载后 setState；`retryKey` state 控制重试

**缓存策略（stale-while-revalidate）：**

| 数据 | 缓存键 | TTL | 行为 |
|------|--------|-----|------|
| 搜索列表 | `search:<encodeURI(q)>:<encodeURI(lang)>:<encodeURI(timeRange)>:<encodeURI(sort)>:<page>` | 2min | 缓存命中秒出，后台刷新；未过期跳过请求 |
| 仓库信息 | `repo:<owner>/<repo>` | 5min | 同上 |
| README | `readme:<owner>/<repo>` | 10min | 同上，cacheKey 为 null 直到 repo info 就绪 |

缓存存储在 `chrome.storage.local`，key 前缀 `gitstar-cache:`。所有 chrome.storage 调用包裹 try/catch，缓存失败静默降级（不影响功能）。`useStaleCache` 内部用 `cancelled` 标记防止组件卸载后 setState。缓存键中所有用户输入参数（`q`、`language`、`timeRange`、`sort`）用 `encodeURIComponent` 编码，避免参数字符（如 `:`、`>`）导致键冲突。

### 路由（关键约束）

Popup 使用 **wouter hash 路由**（`useHashLocation`），因为 Chrome 扩展 popup 的 URL pathname 固定为 `/popup.html`，不能用 pathname 路由。

- `#/favorites` → 收藏列表
- `#/project/:owner/:repo` → 详情页
- `#/` → 首页（搜索/筛选/列表）

**重要：不要使用 wouter 的 `<Link>` 组件。** 它在 hash 路由下生成错误 href，会导致 popup 完整跳转到不存在的扩展页面（白块）。所有项目内导航用原生 `<a href="#/...">`，hashchange 事件会触发 wouter 自动匹配路由。

**Route 必须按精确度排序**：`/favorites` → `/project/:owner/:repo` → `/`。wouter 的 `path="/"` 是前缀匹配，会吃掉所有路径。`/favorites` 必须排在 `/` 前面。

**wouter Route component prop 陷阱：** `<Route path="/" component={() => <HomePage />} />` 中内联箭头函数每次渲染都生成新引用，wouter 判定为新组件 → 卸载旧组件 → 重新挂载（状态和滚动位置丢失）。必须用 `useCallback` 稳定化：`const renderHomePage = useCallback(() => <HomePage .../>, [hasToken])` → `<Route path="/" component={renderHomePage} />`。

### Popup UI 布局

Popup 宽度固定 400px（`POPUP_WIDTH`），外层 `min-h-[720px]` + `flex flex-col`，内容区 `flex-1` 撑满可用高度。Chrome 自动限制 popup 不超出屏幕。

**启动流程：** `PopupIndex` 在最外层包裹 `<I18nProvider>`，内部 `PopupIndexInner` 实际执行逻辑。先骨架屏等待 `loadToken()` 读取 Token（`tokenReady`），然后渲染路由。`ErrorBoundary` 类组件在 `I18nProvider` 内部，捕获子组件渲染崩溃。

**共享结构：** 蓝底顶栏（`bg-[#3b82f6] px-4 py-3`）+ 统一 16px 内边距内容区（`p-4`）。`HomePage` 和 `DetailPage` 各自渲染内容，不重复顶栏和 padding。

**首页：** 每页 10 条（`per_page: 10`），翻页自动 `scrollTo(0, 0)`。搜索按钮为图标（34×34px），输入框 + 下拉筛选框统一样式（`rounded-md`、`border-[#e5e7eb]`）。

**详情页（方案 C 布局）：**
- 标题行：仓库名 + 右上"打开"/"收藏"小按钮（`text-[11px] px-2 py-0.5`）
- Star 块（`bg-[#f9fafb] rounded-lg`）：左侧大 Star 按钮 + 右侧双行统计（stars / forks·watchers·language）
- Star 按钮调用 `starRepo()`/`unstarRepo()`，页面加载时 `checkStarred()` 检测状态
- Starred 状态：绿底 `#f0fdf4` + 绿字 `#16a34a`；未 Star：蓝底白字

**LoadingBar：** 蓝底顶栏下方 2px 高度，始终占位，loading 时显示左→右滑动动画（`@keyframes loadingBar` 定义在 `assets/tailwind.css`），颜色 `#3b82f6`。

筛选栏（`FilterBar`）已改为**三个并排下拉选择器**（语言 / 时间 / 排序），替代原来的 pill 按钮。下拉框 `appearance-none` + 自定义 chevron SVG，`flex-1` 等分 400px 宽度。

分页（`Pagination`）使用简化箭头 `←` / `→`（无文字），页码范围为当前页 ±1，避免 400px 宽度溢出。

**收藏页：** 面包屑「← 返回发现」+ 标题「★ 我的收藏 (N)」+ RepoCard 列表（每页 10 条）+ Pagination。RepoCard 上收藏按钮为「★ 已收藏」（金色边框），点击取消收藏后从列表乐观移除。无收藏时显示空状态引导回首页。

**顶栏收藏入口：** 右侧文字按钮「★ 收藏 (N)」，白色半透明胶囊 + 数量徽标。在收藏页时按钮变为金色。收藏数量通过 `useFavorites()` 读取，这导致 `PopupIndex` 在收藏操作时重渲染（须注意 wouter component 内联函数问题）。

### Sidebar 面板

Content Script 文件 `extension/contents/github-sidebar.tsx`。使用 `PlasmoCSConfig` + 手动 `createRoot` 挂载到 GitHub 侧边栏位置（`#repo-details-container` / `.Layout-sidebar` / `aside[aria-label="Repository details"]`）。

原功能：注入 GitHub 页面右侧栏，推荐基于当前仓库 topic 相似度的高 Star 项目（commit `7f979a7` 由语言匹配改为 topic 相似度匹配）：

- **可拖拽**：标题栏 `onMouseDown` 启动拖拽，首次拖动后切为 `position: fixed`，跟随鼠标。折叠按钮 `data-action="collapse"` 忽略拖拽。
- **限高滚动**：`maxHeight: calc(100vh - 100px)` + `overflow-y: auto`，标题栏 `flexShrink: 0` 固定顶部。
- **深色模式**：读取 `data-color-mode` 属性切换配色。
- **手动挂载 + SPA 适配**：Content Script 不依赖 Plasmo 自动注入，而是 `mountPanel()` 手动挂载。必须提供 `export default`（返回 null）避免 Plasmo 自动渲染报 Error #130（见已知陷阱）。通过 `setInterval` 500ms 轮询 `location.href` 检测 GitHub SPA 导航（`document.hidden` 时跳过），自动 `cleanup()` → 重新挂载。优先查 `#repo-details-container` → `.Layout-sidebar` → `aside`，未找到时用 `MutationObserver` 等待 DOM 出现，10 秒超时后回退为 `position: fixed` 浮动面板。
- **推荐缓存**：推荐结果按 `owner/repo` 做 60 秒内存缓存（`recsCache` Map），同一仓库内快速切换不会重复请求 API。

### 已知陷阱

- **Markdown 解析方案不同**：Web 应用使用 `react-markdown` + `remark-gfm`（`src/components/ReadmeViewer.tsx`），扩展使用 `marked` + `dangerouslySetInnerHTML`。原因是 `react-markdown` 在 Plasmo/Parcel 打包下会触发 React `hasOwnProperty` 崩溃。两个项目的 ReadmeViewer 实现不同，不要互相移植。
- **wouter `<Link>` 不可用**：见上方路由说明。
- **Plasmo 文件约定**：入口是 `popup.tsx` / `options.tsx`（根级），不是 `popup/index.tsx`。Content Script 放 `contents/` 目录。
- **Plasmo Content Script 必须 export default**：即使使用手动 DOM 挂载（不依赖 Plasmo 自动渲染），也**必须**提供一个 `export default`。Plasmo v0.90.5 在注入内容脚本时自动创建 React root 并渲染 `c.default`，如果模块无默认导出，`c.default` 为 `undefined`，触发 React Error #130（Element type is invalid）。解决方案：`export default function PlasmoOverride() { return null; }`，实际 UI 由手动 `mountPanel()` 负责。
- **大型 README 卡顿**：已通过双管齐下解决——① `Promise.all` 拆分为 `getRepoInfo` + `getRepoReadme`，RepoHeader 不等 README 立即渲染；② `marked.parse()` 移入 Web Worker 后台线程（`extension/workers/markdown-worker.ts`），避免阻塞主线程。Worker 创建失败自动回退主线程解析。`ReadmeViewer` 已简化为纯渲染组件，接收预解析 HTML。
- **Plasmo 图标渲染**：Plasmo dev 模式的 gen-assets 管线存在色偏问题——同一份 `icon.svg` 在 `npm run build` 下颜色正确（`#3b82f6`），在 `npm run dev` 下被渲染为灰色（`#8b8b8b`）。根因在 dev 的 gen-assets 中间文件生成阶段，与 prod 的直接渲染路径不同。**验证图标变更只用 prod 构建**（`npm run build`），Chrome 加载 `build/chrome-mv3-prod/`。
- **Popup JS 上下文生命周期**：popup 每次打开是全新的 JS 上下文，关闭即销毁。所有 React state 丢失，不能依赖内存跨打开持久化。数据持久化只能用 `chrome.storage`。
- **缓存键编码**：缓存键中所有用户输入参数（`search`、`language`、`timeRange`、`sort`）用 `encodeURIComponent` 编码。参数值可能含 `:`（如 `org:vue`）或 `>`（如时间范围 `>2026-05-22`），直接用 `:` 拼接会导致键冲突。
- **chrome.storage.local 异步**：所有读写是 async，在 React 中必须用 `cancelled` 标记或 AbortController 防止组件卸载后 setState。
- **缓存静默降级**：cache.ts 所有 chrome.storage 调用包裹 try/catch，失败只打 `console.debug`，不影响功能。不要依赖缓存一定可用。
- **`@keyframes loadingBar`**：动画定义在 `extension/assets/tailwind.css`，不在 Tailwind config 中。LoadingBar 使用 `animate-[loadingBar_1s_ease-in-out_infinite]` 引用。如果只改组件不改 CSS，动画不会生效。
- **骨架屏样式一致性**：popup.tsx 中的加载骨架屏（标题字号、头像尺寸、内边距）必须和实际渲染组件保持一致，否则 `loading → loaded` 切换时会产生视觉跳变。修改组件样式时同步检查对应的骨架屏。
- **配色严格遵循方案**：所有硬编码色值（`bg-[#...]`、`text-[#...]`、`border-[#...]` 等）必须来自上方配色方案表。常见违规：indigo（`#6366f1`/`#4f46e5`）应为主蓝（`#3b82f6`/`#2563eb`），`#22c55e` 应为 `#16a34a`。新增 UI 时对照配色表检查，不要用 Tailwind 默认色系。
- **GitHub Star API scope**：`PUT/DELETE /user/starred/:owner/:repo` 需要 Token 有 `public_repo`（经典）或 `star`（细粒度）scope。只读 Token 会返回 403/404，`checkStarred()` 会静默失败（catch 空函数）。
- **DOMPurify 净化**：`markdown.ts` 中 `parseMarkdown()` 使用 DOMPurify 净化 marked 输出（`ADD_ATTR: ['class']` 保留代码高亮）。Worker 线程不做净化（无 DOM），HTML 回到主线程后统一净化。不要移除净化步骤或用其他库替换而不评估安全性。
- **缓存淘汰**：`cache.ts` 中 `setCache()` 写入后触发 `evictOldest()`（fire-and-forget），超过 30 条时按时间戳删除最旧条目。`evictOldest` 失败静默降级，不影响写入。修改缓存逻辑时保持淘汰机制有效。
- **wouter Route component 内联函数**：`<Route path="/" component={() => <HomePage />} />` 中的内联箭头每次父组件渲染都生成新引用，wouter 会判定为新组件 → 卸载旧组件 → 丢失滚动位置和状态。必须用 `useCallback` 稳定化。
- **详情页面包屑不要硬编码回首页**：`RepoHeader` 的面包屑使用 `window.history.back()` 而非 `<a href="#/">`，确保从收藏页进入详情页时能正确返回收藏页。
- **收藏按钮与 GitHub Star 分离**：`useFavorites` hook 的收藏/取消收藏只操作 `chrome.storage.local`，不调 GitHub API。详情页的 Star 按钮才调 `starRepo()`/`unstarRepo()`。两者是完全独立的功能。
- **FavoritesPage 骨架屏一致性**：FavoritesPage 中有两处骨架屏——`favorites === null`（storage 未就绪，3 个占位）和 `loading`（repo 数据加载中，5 个占位）。修改 RepoCard 样式时必须同步更新这两处骨架屏。
- **Popup 视口是所有路由共享的**：Chrome popup 是单一可滚动视口，不同 wouter 路由页面共享同一个滚动位置。导航到新页面时如果不显式 `window.scrollTo(0, 0)`，视口会停留在上一页的滚动位置。用 `useLayoutEffect` 而非 `useEffect`，确保在浏览器绘制前同步执行，避免视觉闪烁。
- **搜索状态用 sessionStorage 持久化**：HomePage 的搜索参数（`search`、`language`、`timeRange`、`sort`、`page`）在 `useState` 初始化时从 `sessionStorage` 读取，参数变化时写回。这样用户从详情页返回时搜索结果自动恢复，而 popup 关闭后 `sessionStorage` 自动清除，下次打开是全新状态。
- **i18n — I18nProvider 必须在三个入口分别包裹**：Popup/Options/Sidebar 是三个独立 React 树（不同 `createRoot`），每个都需要自己的 `<I18nProvider>`。Provider 通过 `chrome.storage.onChanged` 监听 `gitstar-lang` 键实现跨上下文语言同步，Options 切换语言后其他入口会即时响应。
- **i18n — AppError 错误码模式**：错误消息国际化通过 `AppError`（`lib/types.ts`）实现。fetcher 函数 `throw new AppError('RATE_LIMIT')`（错误码而非用户可见文本），组件用 `errorMessageText(error, t)` 映射 code → i18n key → 翻译文本。不要在 catch 块中 `throw new Error('中文消息')`。
- **i18n — 翻译字典 key 必须一致**：`zh.json` 和 `en.json` 的顶层 key 必须相同。新增翻译时在两个文件中都添加，缺失 key 会触发 fallback（en → zh → 返回 key 本身 + dev 模式 `console.warn`）。
- **i18n — 模板变量仅数字**：带变量的文本用 `t('key').replace('{n}', String(number))` 模式。变量仅限数字类型（计数、文件大小），禁止将未净化的用户输入作为模板参数。
- **i18n — 语言切换在 Options 页**：不在 popup 顶栏放置语言切换按钮。语言偏好存 `chrome.storage.local`（非 sync，设备级设置），默认跟随 `navigator.language`。`PopupIndex` 拆为外层 `<I18nProvider>` + 内层 `PopupIndexInner`，避免重复包裹 Provider。
- **i18n — useStaleCache error 类型变更**：`error` 从 `string | null` 改为 `Error | null`。消费方需处理 `Error` 对象（`.message` 或 `errorMessageText()`），不能直接 `{error}` 渲染。
- **i18n — `lib/i18n.ts` 是 `.tsx`**：文件含 JSX（`<I18nContext.Provider>`），必须是 `.tsx` 扩展名。如果在 `.ts` 文件中写 JSX 会编译失败。
- **头像 PNA 控制台告警无害**：`<img src="https://avatars.githubusercontent.com/...">` 在 popup 中会触发 Chrome Private Network Access 告警（"Request had a target IP address space of `unknown` yet the resource is in address space `public`"）。这是 Chrome 对 `chrome-extension://` 来源的已知行为，**图片正常加载，不影响功能**。不要为了消除告警而引入额外的 `host_permissions` 或改用 `fetch()` 加载头像，Google 审核不会接受无实际用途的权限声明。

### 配色方案

| 元素 | 色值 | 用途 |
|------|------|------|
| 主蓝 | `#3b82f6` | 按钮、链接、focus ring、popup 顶栏背景 |
| 深蓝 hover | `#2563eb` | 按钮 hover |
| 浅蓝底 | `#eff6ff` | 筛选标签激活态、收藏按钮激活 |
| 琥珀 | `#f59e0b` | Star 数量、图标星标、收藏星标激活态 |
| 绿 | `#16a34a` | Starred 按钮文字、Token 已配置状态 |
| 浅绿底 | `#f0fdf4` | Starred 按钮背景 |
| 灰白 | `#f3f4f6` | 卡片边框、icon 底色 |
| 浅灰底 | `#f9fafb` | README 标题栏、Star 信息块背景 |
| 深色文字 | `#1e1b4b` | 标题 |
| 灰色文字 | `#6b7280` | 描述 |
| 浅灰边框 | `#e5e7eb` | 输入框、下拉框、按钮边框 |

### 图标

源文件 `extension/assets/icon.svg`（蓝底 `#3b82f6` + 白色粗体 G + 右上金色星标 `#f59e0b`），纯色设计。Plasmo 标准方式直接使用 `icon.svg`。`node scripts/generate-icons.js` → 生成 16/32/48/64/128px PNG 备用。设计文档：`docs/superpowers/specs/2026-05-28-gitstar-icon-design.md`

**注意：** 图标颜色验证只用 prod 构建（`npm run build`），dev 模式有 gen-assets 色偏问题（见已知陷阱）。
