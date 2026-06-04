# GitStar

GitHub 高星项目发现与管理的 Chrome 浏览器扩展。

## 功能

### Popup 弹窗

- **项目发现**：搜索、按语言/时间范围/排序方式筛选 GitHub 高星项目（>100 stars），支持分页浏览
- **三种发现模式**：热门（经典高星）、新星（近期创建高星，显示 ★/天 增长速率）、活跃（近期频繁更新），一键切换视角
- **项目详情**：查看仓库信息、README 文档，支持大文件分段加载（超过 60KB 可手动展开）
- **Star 操作**：直接在详情页 Star/Unstar GitHub 仓库（需配置 Token）
- **本地收藏**：收藏感兴趣的项目，与 GitHub Star 独立，数据存于浏览器本地
- **搜索状态恢复**：从详情页返回时自动恢复搜索结果
- **模式持久化**：发现模式偏好自动保存，下次打开 popup 恢复上次选择

### 选项页

- 配置 GitHub Personal Access Token（提升 API 限额从 60 次/小时 到 5000 次/小时）
- Token 有效性即时验证
- 中/英文语言切换

### 缓存策略

采用 **stale-while-revalidate** 策略，`chrome.storage.local` 存储，自动淘汰最旧条目（上限 30 条）：

| 数据类型 | TTL | 说明 |
|---------|-----|------|
| 搜索结果 | 2 分钟 | 缓存命中秒出，后台刷新 |
| 仓库信息 | 5 分钟 | 收藏页可复用详情页缓存 |
| README | 10 分钟 | 仓库信息就绪后才触发加载 |

### 国际化

支持简体中文和英文，自动跟随浏览器语言，可在选项页手动切换。

## 技术栈

- [Plasmo](https://docs.plasmo.com/) v0.90.5 — 浏览器扩展框架
- React 18 + TypeScript
- Tailwind CSS 3
- [wouter](https://github.com/molefrog/wouter) — 轻量 hash 路由
- [marked](https://marked.js.org/) + [DOMPurify](https://github.com/cure53/DOMPurify) — Markdown 解析与安全净化
- Web Worker — 后台线程解析大型 README，避免阻塞 UI
- OpenAI 兼容 API — AI 概述（可配 DeepSeek / OpenAI / 任意端点）
- GitHub REST API v3

## 项目结构

```
extension/
├── popup.tsx                  # Popup 入口（wouter hash 路由）
├── options.tsx                # 选项页入口（Token + 语言配置）
├── components/
│   ├── RepoCard.tsx           # 仓库卡片
│   ├── RepoList.tsx           # 仓库列表
│   ├── RepoHeader.tsx         # 仓库详情头部
│   ├── ReadmeViewer.tsx       # README 渲染
│   ├── SearchBar.tsx          # 搜索栏
│   ├── FilterBar.tsx          # 筛选栏（语言/时间/排序）
│   ├── Pagination.tsx         # 分页
│   ├── LoadingBar.tsx         # 加载进度条
│   ├── ErrorState.tsx         # 错误状态
│   ├── EmptyState.tsx         # 空状态
│   └── GitStarIcon.tsx        # 图标组件
├── hooks/
│   ├── useFavorites.ts        # 收藏管理（chrome.storage.local）
│   ├── useStaleCache.ts       # SWR 缓存 hook
│   └── useDebounce.ts         # 输入防抖
├── lib/
│   ├── github.ts              # GitHub API 封装
│   ├── cache.ts               # chrome.storage.local 缓存层
│   ├── markdown.ts            # Markdown 解析（Worker 通信 + DOMPurify）
│   ├── i18n.tsx               # 国际化（Context + useI18n hook）
│   ├── types.ts               # TypeScript 类型定义
│   └── constants.ts           # 共享常量
├── workers/
│   └── markdown-worker.ts     # Web Worker（marked.parse 后台解析）
├── locales/
│   ├── zh.json                # 中文翻译
│   └── en.json                # 英文翻译
└── assets/
    ├── icon.svg               # 扩展图标源文件
    └── tailwind.css           # Tailwind 基础样式 + 自定义动画
```

## 开发

```bash
cd extension

# 安装依赖
npm install

# 开发模式（热更新，需手动刷新扩展）
npm run dev

# 生产构建
npm run build

# 打包为 .zip（用于 Chrome Web Store 发布）
npm run package
```

开发时在 Chrome `chrome://extensions/` 中加载 `build/chrome-mv3-dev/` 目录，生产构建加载 `build/chrome-mv3-prod/`。

## 权限说明

| 权限 | 用途 |
|------|------|
| `https://api.github.com/*` | 调用 GitHub REST API（搜索、仓库信息、README、Star 操作） |
| `storage` | 存储 Token（chrome.storage.sync）、缓存和收藏（chrome.storage.local） |

## 配色方案

| 元素 | 色值 | 用途 |
|------|------|------|
| 主蓝 | `#3b82f6` | 按钮、链接、顶栏背景 |
| 深蓝 hover | `#2563eb` | 按钮 hover |
| 琥珀 | `#f59e0b` | Star 数量、收藏激活态 |
| 绿 | `#16a34a` | Starred 状态、Token 已配置 |
| 深色文字 | `#1e1b4b` | 标题 |
| 灰色文字 | `#6b7280` | 描述 |
| 浅灰边框 | `#e5e7eb` | 输入框、按钮边框 |

## License

MIT
