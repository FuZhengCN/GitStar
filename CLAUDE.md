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

```bash
npm run dev      # 开发服务器（热更新，不要同时跑 build）
npm run build    # 生产构建
npm run start    # 启动生产服务（需先 build）
npm run lint     # ESLint
```

构建和 dev 共用 `.next` 目录，同时运行会触发 webpack 缓存冲突（`Cannot find module './xxx.js'`）。改代码后靠 dev 的热更新即可，不需要反复 build。

## Architecture

Next.js 14 App Router + TypeScript + Tailwind CSS。展示 GitHub 高 Star 项目的工具站。

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
- **收藏**：`useFavorites` hook，存 `localStorage`，key 为 `gitstar-favorites`。SSR 安全：`loaded` 为 false 前不写 localStorage。
- **搜索防抖**：`useDebounce` hook，300ms。
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

## Non-Goals

无用户系统、无数据库、无 star 趋势图、无 i18n、无个性化推荐。

## Extension

浏览器扩展项目位于 `extension/` 目录，基于 Plasmo v0.90.5 + React 18 + TypeScript + Tailwind CSS 3。和原 Next.js 项目共用 git 仓库，`src/` 不动。

```bash
cd extension
npm run dev      # 开发（热更新，需手动刷新扩展）
npm run build    # 生产构建
node scripts/generate-icons.js  # 重新生成图标 PNG（修改 icon.svg 后）
```

构建产物在 `extension/build/chrome-mv3-prod/`，Chrome `chrome://extensions/` → "加载已解压的扩展程序" 指向该目录。

### 文件结构（Plasmo 扁平约定）

Plasmo v0.90.5 使用根级入口文件，不是目录结构：

| 入口 | 文件 | 说明 |
|------|------|------|
| Popup | `extension/popup.tsx` | 工具栏弹窗，wouter hash 路由 |
| Content Script | `extension/contents/github-sidebar.tsx` | GitHub 页面注入推荐面板 |
| Options | `extension/options.tsx` | Token 配置页 |

### Data Flow

```
GitHub REST API (api.github.com)
  ↑ fetch + Bearer Token
extension/lib/github.ts       ← 直接调 API（atob 解码 README，无缓存）
  ↑ searchRepos() / getRepoInfo() / getRepoReadme()
extension/lib/markdown.ts     ← Worker 通信封装（<10KB 主线程解析，≥10KB Worker 解析）
  ↑ parseMarkdown()
extension/workers/markdown-worker.ts  ← Worker 线程执行 marked.parse()
Popup (popup.tsx)             Content Script (contents/github-sidebar.tsx)
  ↑ React state                  ↑ React state

chrome.storage.sync  → githubToken（跨设备同步）
chrome.storage.local → gitstar-favorites（本地收藏）
```

和原 Next.js 版的核心区别：无 API Route 代理、无服务端缓存、Token 由用户自己在 Options 页配置。

**DetailPage 加载流程（双阶段）：**

1. `getRepoInfo()` → RepoHeader 立即渲染（不等 README）
2. `getRepoReadme()` → `parseMarkdown()` 在 Worker 后台解析 → `ReadmeViewer` 接收预解析 HTML 直接渲染

Worker 创建失败或文件 < 10KB 时，自动回退主线程解析。

### 路由（关键约束）

Popup 使用 **wouter hash 路由**（`useHashLocation`），因为 Chrome 扩展 popup 的 URL pathname 固定为 `/popup.html`，不能用 pathname 路由。

- `#/` → 首页（搜索/筛选/列表）
- `#/project/:owner/:repo` → 详情页

**重要：不要使用 wouter 的 `<Link>` 组件。** 它在 hash 路由下生成错误 href，会导致 popup 完整跳转到不存在的扩展页面（白块）。所有项目内导航用原生 `<a href="#/...">`，hashchange 事件会触发 wouter 自动匹配路由。

**Route 必须按精确度排序**：`/project/:owner/:repo` 在前，`/` 在后。wouter 的 `path="/"` 是前缀匹配，会吃掉所有路径。

### Popup UI 布局

Popindex 最外层渲染共享的**蓝底顶栏**（`bg-[#3b82f6] px-4 py-3 shadow-md`），白字标题 "⭐ GitStar" + 右副标题 "发现优质开源项目"。`HomePage` 和 `DetailPage` 页面内不再各自重复标题。

筛选栏（`FilterBar`）已改为**三个并排下拉选择器**（语言 / 时间 / 排序），替代原来的 pill 按钮。下拉框 `appearance-none` + 自定义 chevron SVG，`flex-1` 等分 400px 宽度。

分页（`Pagination`）使用简化箭头 `←` / `→`（无文字），页码范围为当前页 ±1，避免 400px 宽度溢出。

### Sidebar 面板

`contents/github-sidebar.tsx` 注入 GitHub 页面右侧栏，推荐同语言高 Star 项目：

- **可拖拽**：标题栏 `onMouseDown` 启动拖拽，首次拖动后切为 `position: fixed`，跟随鼠标。折叠按钮 `data-action="collapse"` 忽略拖拽。
- **限高滚动**：`maxHeight: calc(100vh - 100px)` + `overflow-y: auto`，标题栏 `flexShrink: 0` 固定顶部。
- **深色模式**：读取 `data-color-mode` 属性切换配色。
- **挂载回退**：优先注入 `.Layout-sidebar`，10 秒超时后回退为 `position: fixed` 浮动面板。

### 已知陷阱

- **`react-markdown` 不可用**：在 Plasmo/Parcel 打包下会触发 React `hasOwnProperty` 崩溃（`Cannot convert undefined or null to object`）。已替换为 `marked` + `dangerouslySetInnerHTML`。不要装回 `react-markdown`。
- **wouter `<Link>` 不可用**：见上方路由说明。
- **Plasmo 文件约定**：入口是 `popup.tsx` / `options.tsx`（根级），不是 `popup/index.tsx`。Content Script 放 `contents/` 目录。
- **Content Script 样式隔离**：用内联 style，不要 import Tailwind CSS，避免污染 GitHub 页面。
- **大型 README 卡顿**：已通过双管齐下解决——① `Promise.all` 拆分为 `getRepoInfo` + `getRepoReadme`，RepoHeader 不等 README 立即渲染；② `marked.parse()` 移入 Web Worker 后台线程（`extension/workers/markdown-worker.ts`），避免阻塞主线程。Worker 创建失败自动回退主线程解析。`ReadmeViewer` 已简化为纯渲染组件，接收预解析 HTML。
- **Plasmo 图标生成**：构建时 Plasmo 从 `icon.svg` 渲染 `.plasmo.` 前缀图标。**Plasmo 内部 SVG 渲染器不支持 `<radialGradient>`、`<linearGradient>`，甚至路径上的纯色填充也会产生色偏（金色→灰色）。** `generate-icons.js` 用 sharp 生成的正确 PNG 被 Plasmo 忽略——manifest 始终引用 Plasmo 自己渲染的 `.plasmo.` 版本。根因是 Plasmo 渲染管线缺陷，绕过方案是让 Plasmo 直接使用预生成 PNG（需调整文件名约定或构建流程）。

### 配色方案

| 元素 | 色值 | 用途 |
|------|------|------|
| 主蓝 | `#3b82f6` | 按钮、链接、focus ring、popup 顶栏背景 |
| 深蓝 hover | `#2563eb` | 按钮 hover |
| 浅蓝底 | `#eff6ff` | 筛选标签激活态、收藏按钮激活 |
| 琥珀 | `#f59e0b` | Star 数量、图标星标 |
| 灰白 | `#f3f4f6` | 卡片边框、icon 底色 |
| 深色文字 | `#1e1b4b` | 标题 |
| 灰色文字 | `#6b7280` | 描述 |

### 图标

`extension/assets/icon.svg` → `node scripts/generate-icons.js` → 生成 16/32/48/128px PNG。依赖 `sharp`。

**已知问题**：Plasmo 构建时不使用预生成的 `assets/icon*.png`，而是从 `icon.svg` 重新渲染自己的 `.plasmo.` 前缀图标。Plasmo 内部 SVG 渲染器不支持渐变（`<radialGradient>` / `<linearGradient>`），且纯色填充在路径元素上也会出现色偏。结果：金色星标被渲染为灰色。删除 `.plasmo/gen-assets/` 缓存后重建可复现。
