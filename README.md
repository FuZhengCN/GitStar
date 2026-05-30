# GitStar

GitHub 高星项目发现与浏览工具，包含 Web 应用和 Chrome 浏览器扩展两种形态。

## Web 应用

Next.js 14 App Router + TypeScript + Tailwind CSS 构建的站点，通过 GitHub Search API 代理浏览高星项目（>100 stars）。

- **首页**：搜索、按语言/时间范围/排序筛选，分页浏览，SSG + ISR 每小时刷新
- **详情页**：仓库信息 + README 渲染（react-markdown + remark-gfm），ISR on-demand 缓存
- **API Routes**：代理 GitHub API，服务端内存缓存（TTL 5 分钟），HTTP `Cache-Control` 头
- **收藏**：localStorage 本地收藏

### 开发

```bash
npm install
npm run dev      # 开发服务器 http://localhost:3000
npm run build    # 生产构建
npm run start    # 生产服务（需先 build）
```

`.env.local` 中配置 `GITHUB_TOKEN` 可将 API 限额从 60 提升到 5000 次/小时。

## Chrome 扩展

基于 Plasmo v0.90.5 + React 18 + TypeScript + Tailwind CSS 3，从 popup 弹窗快速发现和管理 GitHub 项目。

### 功能

- **三种发现模式**：热门（经典高星）、新星（近期创建 + 涨星速度，显示 ★/天 badge）、活跃（近期频繁更新）
- **项目发现**：搜索、筛选、分页浏览高星项目，stale-while-revalidate 缓存策略
- **项目详情**：仓库信息 + README 查看（大文件分段加载，Web Worker 后台解析 marked + DOMPurify 净化）
- **GitHub Star**：直接在详情页 Star/Unstar 仓库（需配置 Token）
- **本地收藏**：独立于 GitHub Star 的本地收藏，`chrome.storage.local` 存储
- **侧边栏推荐**：在 GitHub 仓库页面注入推荐面板，基于 topic 相似度匹配同类热门项目，支持拖拽/折叠/深色模式
- **选项页**：Token 配置与验证、中/英文切换
- **模式持久化**：发现模式偏好自动保存，下次打开 popup 恢复

### 开发

```bash
cd extension
npm install
npm run dev      # 开发模式（chrome://extensions → 加载 build/chrome-mv3-dev/）
npm run build    # 生产构建（加载 build/chrome-mv3-prod/）
npm run package  # 打包 .zip 用于发布
```

详见 [`extension/README.md`](extension/README.md)。

## 项目结构

```
├── src/                      # Next.js Web 应用
│   ├── app/                  # App Router 页面 + API Routes
│   ├── components/           # UI 组件
│   ├── hooks/                # useFavorites / useDebounce
│   └── lib/                  # github.ts（API + 内存缓存）/ types.ts
├── extension/                # Chrome 扩展（Plasmo）
│   ├── popup.tsx             # Popup 入口
│   ├── options.tsx           # 选项页入口
│   ├── contents/             # Content Script（GitHub 侧边栏推荐）
│   ├── components/           # 共享 UI 组件
│   ├── hooks/                # useFavorites / useStaleCache / useDebounce
│   ├── lib/                  # github.ts / cache.ts / markdown.ts / i18n.tsx / types.ts
│   ├── workers/              # Web Worker（markdown 后台解析）
│   ├── locales/              # 中/英文翻译字典
│   └── assets/               # 图标 + Tailwind CSS
└── docs/                     # 设计文档与开发计划
```

## 技术栈

| 层 | Web | 扩展 |
|---|-----|------|
| 框架 | Next.js 14 (App Router) | Plasmo v0.90.5 |
| UI | React 18 + Tailwind CSS 3 | React 18 + Tailwind CSS 3 |
| 路由 | 文件系统路由 | wouter (hash 路由) |
| Markdown | react-markdown + remark-gfm | marked + DOMPurify + Web Worker |
| 缓存 | 服务端 Map (TTL 5min) + HTTP Cache-Control | chrome.storage.local (SWR, TTL 2-10min) |
| API | API Routes 代理 | 直接调用 GitHub REST API |
| i18n | — | Context + JSON 字典 (zh/en) |

## License

MIT
