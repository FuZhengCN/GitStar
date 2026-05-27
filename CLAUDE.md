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

- 设计文档：`docs/superpowers/specs/2026-05-27-gitstar-design.md`
- 实现计划：`docs/superpowers/plans/2026-05-27-gitstar-plan.md`

## Non-Goals

无用户系统、无数据库、无 star 趋势图、无 i18n、无个性化推荐。
