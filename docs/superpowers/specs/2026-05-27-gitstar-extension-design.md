# GitStar 浏览器扩展 — Design Spec

## Overview

将 GitStar 从 Next.js 全栈应用（部署在 Vercel）改造为浏览器扩展（Chrome / Firefox / Edge）。用户安装扩展后，通过工具栏 Popup 搜索浏览高 Star 项目，同时在 GitHub 页面右侧自动展示同类推荐。零部署、零服务端，每人用自己的 GitHub Token。

**Tech Stack:** Plasmo（浏览器扩展框架）+ React 18 + TypeScript + Tailwind CSS

---

## Motivation

- 不想部署和维护服务器
- 浏览器扩展安装即用，零运维
- 和 GitHub 浏览体验更好集成（Content Script 注入）
- 每人自己的 Token，不受共享限流影响

---

## Entry Points

插件有三个入口，对应 Plasmo 的三个模块：

| 入口 | Plasmo 模块 | 说明 |
|------|------------|------|
| 工具栏 Popup | `popup/index.tsx` | 点击工具栏图标弹出，完整的搜索/筛选/浏览/详情功能 |
| GitHub 注入面板 | `contents/github-sidebar.tsx` | 在 GitHub 页面右侧栏注入轻量推荐面板 |
| Token 配置页 | `options/index.tsx` | 右键扩展 → 选项，配置 GitHub Personal Access Token |

**路由方案：** Plasmo popup 是单页应用，不支持 Next.js 式文件系统路由。在 `popup/index.tsx` 内使用 wouter（~1.5KB gzip）做客户端 hash 路由：`/` 渲染列表视图，`/project/:owner/:repo` 渲染详情视图。Hash 模式（如 `#/project/facebook/react`）支持浏览器前进/后退，且不触发页面刷新。

---

## Architecture

### Data Flow

```
GitHub REST API (api.github.com)
  ↑ fetch + Bearer Token (从 chrome.storage.sync 读取)
lib/github.ts
  ↑ searchRepos() / getRepoDetail()
Popup (popup/index.tsx)     Content Script (contents/github-sidebar.tsx)
  ↑ React state                ↑ React state

共享存储：
  chrome.storage.sync  → GitHub Token（跨设备同步）
  chrome.storage.local → 收藏列表（本地）
```

### 和原项目的区别

| 项目 | 之前（Next.js） | 之后（Plasmo 扩展） |
|------|----------------|-------------------|
| API 调用 | 页面 → API Route → GitHub API | Popup/Content Script → GitHub API |
| Token | 服务端 `.env.local` | 用户 Options 页配置 → `chrome.storage.sync` |
| 缓存 | 服务端 Map（TTL 5min） | 不需要（每人 5000 次/小时够用） |
| 渲染 | SSG/ISR/SSR | 纯 CSR |
| API Routes | `/api/repos` | 删除 |
| 收藏 | `localStorage` | `chrome.storage.local`（Popup 和注入面板共享） |

### 请求流程（以搜索为例）

1. 用户在 Popup 搜索框输入 → `useDebounce` 300ms
2. 触发 `searchRepos({ q, sort, ... })`
3. `lib/github.ts` 从模块缓存的 `cachedToken` 读取 Token，拼接 Authorization header
4. `fetch()` 直接调用 `api.github.com/search/repositories`
5. 返回数据 → React state → UI 更新

没有 API Route 代理，没有服务端缓存，链路从 5 步缩减到 3 步。

### Token 加载策略

`chrome.storage.sync.get()` 是异步的，而当前 `lib/github.ts` 在模块顶层同步读取 `process.env.GITHUB_TOKEN`。改造方案：

- 应用启动时（Popup/Content Script/Options 各自的入口组件 mount 时）调用 `chrome.storage.sync.get('token')` 获取 Token，缓存到模块作用域变量 `let cachedToken: string | null = null`
- `searchRepos()` / `getRepoDetail()` 从 `cachedToken` 读取，若为 null 则以未认证模式请求（60 次/小时），弹出速率警告
- Options 页保存 Token 后写入 `chrome.storage.sync`。其他模块通过 `chrome.storage.onChanged` 监听 Token 变更，自动刷新 `cachedToken`
- Popup 每次打开重新加载 Token（Popup 关闭即卸载，不存在持久内存）。不需要 `sendMessage`，不需要 background service worker

### lib/github.ts 浏览器兼容性改造

`Buffer.from(content, 'base64').toString('utf-8')` 在浏览器不可用，改为 `atob(content)`。

其他改造点：
- `process.env.GITHUB_TOKEN` → 从 `cachedToken`（模块变量）读取
- 删除服务端内存缓存 `Map`（不再需要）
- 保留参数校验逻辑（`VALID_OWNER_REPO`、`buildSearchQuery`）

---

## Pages & UI

### Popup 首页（`popup/index.tsx`）

搜索 + 筛选 + 项目列表 + 分页。UI 沿用当前 HomePageClient 的设计：

- 搜索框（300ms 防抖）
- 筛选栏：语言、时间范围、排序
- 项目卡片列表：头像、名称、描述、Star 数、语言、License
- 收藏切换
- 分页
- 空状态 / 错误状态 / LoadingBar

**尺寸适配：** Chrome popup 最大 800×600px，推荐 400×600px。现有 UI 设计用于全宽视口，实施时需审核 FilterBar（可能需要改为纵向堆叠或折叠式）、RepoCard（当前 320px 最小宽度适配良好）、Pagination（当前已支持紧凑模式）在 400px 宽度下的表现。必要时将 FilterBar 改为下拉式或可折叠面板。

### Popup 详情页

通过 wouter hash 路由 `#/project/:owner/:repo` 渲染，在 `popup/index.tsx` 内条件切换：

- 仓库信息头部（头像、owner、描述、stats）
- 操作按钮：Star（用 `<a>` 跳 GitHub，不用 `next/link`）、Favorite
- README 渲染（react-markdown + remark-gfm，关闭 raw HTML）
- 返回按钮（回到列表视图）
- 错误状态

### GitHub 注入面板（`contents/github-sidebar.tsx`）

在 GitHub 页面右侧栏顶部注入轻量面板：

- **激活页面：** `github.com/:owner/:repo`、`github.com/search?q=*`、`github.com/explore`
- **注入方式：** DOM 插入 → React 渲染到目标容器。优先在 GitHub 右侧栏（`<aside>` 或 `.Layout-sidebar` 区域）顶部插入 `<div id="gitstar-root">`。若目标容器不存在（GitHub 可能改版），回退为 `position: fixed; right: 16px; top: 80px` 的浮动面板。
- **加载时机：** 用 `MutationObserver` 监听目标 DOM 出现后再挂载（不用固定 `setTimeout`）。超时 10 秒未找到则走浮动面板回退。
- **推荐策略：** 从 `window.location.pathname` 解析 owner/repo → 调用 `getRepoDetail(owner, repo)` 获取仓库的语言和 topics → 用 `searchRepos({ q: <主要语言>, sort: "stars", per_page: 5 })` 搜索同语言高 Star 项目 → 过滤掉当前仓库 → 展示前 5 个。
  - 搜索结果页（`/search?q=...`）：直接用搜索关键词调 `searchRepos()` 展示相关项目。
  - Explore 页：展示全局最高 Star 项目（`searchRepos({ sort: "stars" })`）。
- **面板内容：** 3-5 个推荐项目，点击直接跳 GitHub（`window.location.href`）
- 底部 "在 Popup 中打开" 链接
- **可折叠：** 状态存 `localStorage`（key: `gitstar-sidebar-collapsed`）
- **深色模式：** 读取 GitHub 的 `<html data-color-mode="dark">` 属性，匹配对应主题样式

### Options 配置页（`options/index.tsx`）

- GitHub Personal Access Token 输入框
- 创建 Token 的指引链接（github.com/settings/tokens，勾选 `public_repo`）
- 保存时调 `GET /user` 验证 Token 有效性
- 验证成功 → 写 `chrome.storage.sync`，其他模块通过 `chrome.storage.onChanged` 自动感知变更
- 验证失败 → 显示错误信息，不保存

---

## Component Migration

### 来源组件及改造清单

| 组件 | 来源 | 去向 | 改造 |
|------|------|------|------|
| SearchBar | `src/components/SearchBar.tsx` | Popup 首页 | 移除 `'use client'`，检查 import 路径 |
| FilterBar | `src/components/FilterBar.tsx` | Popup 首页 | 同上，可能需要折叠式适配 400px 宽度 |
| RepoList | `src/components/RepoList.tsx` | Popup 首页 | 同上 |
| RepoCard | `src/components/RepoCard.tsx` | Popup 首页 | **替换 `next/link` → `<a>` 标签**，移除 `'use client'` |
| Pagination | `src/components/Pagination.tsx` | Popup 首页 | 移除 `'use client'`，可能需替换 `next/navigation` |
| RepoHeader | `src/components/RepoHeader.tsx` | Popup 详情页 | 替换 `next/link`，移除 `'use client'` |
| ReadmeViewer | `src/components/ReadmeViewer.tsx` | Popup 详情页 | 移除 `'use client'` |
| LoadingBar | `src/components/LoadingBar.tsx` | Popup 首页/详情页 | 无需改动 |
| EmptyState | `src/components/EmptyState.tsx` | Popup 首页 | 无需改动 |
| ErrorState | `src/components/ErrorState.tsx` | Popup 首页/详情页 | 无需改动 |
| useDebounce | `src/hooks/useDebounce.ts` | Popup | 无需改动 |
| useFavorites | `src/hooks/useFavorites.ts` | Popup + Content Script | **改为异步接口**（见下方） |

### 通用改造规则

1. 移除所有 `'use client'` 指令（Next.js 专有，Plasmo 不需要）
2. 替换 `next/link` 的 `<Link>` → 普通 `<a>` 标签（或 wouter 的 `<Link>`）
3. 替换 `next/navigation` 的 `useRouter` / `useSearchParams` → wouter 的对应 API
4. 替换 `next/image` 的 `<Image>` → 普通 `<img>` 标签
5. 替换 `@/` 路径别名 → 相对路径（或在 Plasmo 项目中配置对应的 tsconfig paths）
6. Plasmo 项目需独立配置 Tailwind：`postcss.config.js` + `tailwind.config.ts` + CSS 入口文件 import

### useFavorites 异步改造

当前 hook 同步读取 `localStorage.getItem('gitstar-favorites')`。改为 `chrome.storage.local` 后接口变异步：

```typescript
// 新接口
function useFavorites(): {
  favorites: string[] | null;  // null = 尚未从 storage 加载完成
  loaded: boolean;              // true = storage 读取完成
  toggle: (fullName: string) => Promise<void>;
  isFavorite: (fullName: string) => boolean;
}
```

调用者在 `loaded === false` 期间显示占位/空状态，避免收藏状态闪烁。

---

## Token Management

### 安全策略

| 维度 | 策略 |
|------|------|
| 存储 | `chrome.storage.sync`，Chrome 自动加密 |
| 权限 | 仅需 `public_repo`（只读公共仓库），最小权限 |
| 传输 | HTTPS only，Bearer header，Token 不出浏览器 |
| 校验 | 保存时调 GitHub API `/user` 验证有效性 |
| 首次体验 | 未配置时弹警告（限流 60 次/小时 ≈ 1次搜索 + ~50个详情查看，重度使用不够），可跳过 |

### 流程

1. 首次安装 → 点击图标 → 显示"未配置 Token"提示
2. 点击 "配置" → 打开 Options 页 → 输入 Token → 保存
3. 保存时调 `/user` 验证 → 成功/失败反馈
4. 其他模块通过 `chrome.storage.onChanged` 感知 Token 变更，自动刷新缓存
5. Popup 底部显示当前 Token 状态（已配置/未配置/无效）

---

## Favorites

- 存储从 `localStorage`（key: `gitstar-favorites`）迁移到 `chrome.storage.local`
- Popup 和 Content Script 共享同一份收藏数据
- `useFavorites` hook 改为读写 `chrome.storage.local`，接口变为异步（见上方 Component Migration 章节）
- 不需要 SSR hydration guard（纯客户端）
- Content Script 和 Popup 之间的收藏变更通过 `chrome.storage.onChanged` 监听同步

---

## Error Handling

| 场景 | 处理 |
|------|------|
| GitHub 403（Rate Limit） | 提示用户配置 Token 或等待重置（显示 reset 时间） |
| GitHub 404 | "仓库不存在"错误页面 |
| GitHub 5xx | "GitHub 服务异常，稍后重试" |
| 网络错误 | "网络连接失败，检查网络" |
| Token 无效 | Options 页保存时提示"Token 无效" |
| 无搜索结果 | 空状态：修改筛选条件 |
| Token 未加载完成 | 显示 LoadingBar，不发起请求 |

---

## Permissions

```json
{
  "host_permissions": ["https://api.github.com/*"],
  "permissions": ["storage"],
  "content_scripts": [{
    "matches": ["https://github.com/*"],
    "run_at": "document_idle"
  }]
}
```

**不需要 `activeTab`：** Token 变更和收藏同步都通过 `chrome.storage.onChanged` 实现，不需要跨模块消息通信。不需要 background service worker。

---

## Non-Goals

- 不新增后端服务
- 不实现 OAuth 登录
- 不替换现有的收藏到云端
- 不实现 Firefox / Edge 独立构建（Plasmo 一次构建多平台通用）
- 不保留 Next.js 版本（扩展是独立项目，但要保留当前代码不动）

---

## Project Layout

扩展代码放在 `extension/` 目录，和原 Next.js 项目并列，共用 git 历史。

```
doSomething/
├── src/              ← 原 Next.js 项目（不动）
├── extension/        ← 新：Plasmo 扩展项目（用 `npm create plasmo` 初始化）
│   ├── popup/
│   │   └── index.tsx    ← 列表 + 详情（wouter hash 路由条件渲染）
│   ├── contents/
│   │   └── github-sidebar.tsx
│   ├── options/
│   │   └── index.tsx
│   ├── components/      ← 从 src/components 迁移
│   ├── hooks/           ← 从 src/hooks 迁移
│   ├── lib/             ← github.ts（浏览器兼容）+ types.ts
│   ├── assets/          ← 扩展图标（16/32/48/128px）
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── postcss.config.js
├── package.json      ← 原 Next.js（不动）
└── CLAUDE.md
```

**初始化：** `npm create plasmo` 在 `extension/` 目录引导项目，生成 `package.json`、`tsconfig.json`、Plasmo 配置文件。

**发布策略：** 先通过开发者模式加载到 Chrome 本地使用。功能稳定后发布到 Chrome Web Store，同时在 Firefox 和 Edge 上做开发者模式验证（Plasmo 构建产物多平台通用，但需实际验证）。

---

## Open Risks

- **GitHub DOM 变化：** Content Script 注入依赖 GitHub 页面 DOM 结构。设计了浮动面板回退方案以应对。长期需关注 GitHub 前端改版。
- **400px 宽度适配：** FilterBar 水平展开可能需要改为折叠式。实施前先做原型验证。
- **未认证限流：** 未配 Token 时 60 次/小时对于重度使用是不够的。UI 会在接近限额时明确提示用户配置 Token。
