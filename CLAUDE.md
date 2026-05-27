# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
  ↑ searchRepos() / getRepoDetail()
Popup (popup.tsx)             Content Script (contents/github-sidebar.tsx)
  ↑ React state                  ↑ React state

chrome.storage.sync  → githubToken（跨设备同步）
chrome.storage.local → gitstar-favorites（本地收藏）
```

和原 Next.js 版的核心区别：无 API Route 代理、无服务端缓存、Token 由用户自己在 Options 页配置。

### 路由（关键约束）

Popup 使用 **wouter hash 路由**（`useHashLocation`），因为 Chrome 扩展 popup 的 URL pathname 固定为 `/popup.html`，不能用 pathname 路由。

- `#/` → 首页（搜索/筛选/列表）
- `#/project/:owner/:repo` → 详情页

**重要：不要使用 wouter 的 `<Link>` 组件。** 它在 hash 路由下生成错误 href，会导致 popup 完整跳转到不存在的扩展页面（白块）。所有项目内导航用原生 `<a href="#/...">`，hashchange 事件会触发 wouter 自动匹配路由。

**Route 必须按精确度排序**：`/project/:owner/:repo` 在前，`/` 在后。wouter 的 `path="/"` 是前缀匹配，会吃掉所有路径。

### 已知陷阱

- **`react-markdown` 不可用**：在 Plasmo/Parcel 打包下会触发 React `hasOwnProperty` 崩溃（`Cannot convert undefined or null to object`）。已替换为 `marked` + `dangerouslySetInnerHTML`。不要装回 `react-markdown`。
- **wouter `<Link>` 不可用**：见上方路由说明。
- **Plasmo 文件约定**：入口是 `popup.tsx` / `options.tsx`（根级），不是 `popup/index.tsx`。Content Script 放 `contents/` 目录。
- **Content Script 样式隔离**：用内联 style，不要 import Tailwind CSS，避免污染 GitHub 页面。

### 配色方案

| 元素 | 色值 | 用途 |
|------|------|------|
| 主蓝 | `#3b82f6` | 按钮、链接、focus ring、icon 边框 |
| 深蓝 hover | `#2563eb` | 按钮 hover |
| 浅蓝底 | `#eff6ff` | 筛选标签激活态、收藏按钮激活 |
| 琥珀 | `#f59e0b` | Star 数量 |
| 灰白 | `#f3f4f6` | 卡片边框、icon 底色 |
| 深色文字 | `#1e1b4b` | 标题 |
| 灰色文字 | `#6b7280` | 描述 |

### 图标

`extension/assets/icon.svg` → `node scripts/generate-icons.js` → 生成 16/32/48/128px PNG。依赖 `sharp`。
