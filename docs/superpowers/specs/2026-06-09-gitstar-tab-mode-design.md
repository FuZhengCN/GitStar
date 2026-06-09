# GitStar 新标签页模式 · 设计文档

**日期：** 2026-06-09
**状态：** 已确认
**目标：** 用户可在 Options 中选择点击工具栏图标时打开新标签页（全宽常驻），替代 popup 小窗（400px × 600px 硬限）

## 动机

Chrome 扩展 popup 存在两个固有限制：
- 宽度固定 400px（`POPUP_WIDTH`）
- macOS 上内容视口硬限 600px（`window.innerHeight`），CSS 高度链无法突破

用户在深度浏览 README / 对比多个项目时需要更大的阅读空间。不部署服务端的前提下，通过扩展内置 HTML 页面在新标签页中展示相同内容。

## 方案：Background Service Worker 动态分发

### 核心思路

用 `chrome.action.setPopup({ popup: '' })` 动态开关 popup 行为。`background.ts` 作为 Service Worker，根据 `chrome.storage.local` 中的 `gitstar-open-mode` 决定点击图标后弹出 popup 还是打开新标签页。两种模式共享同一套页面组件和全部数据层，仅布局外壳不同。

### 架构图

```
chrome.action.onClicked (用户点击工具栏图标)
  ↓
background.ts (Service Worker)
  ├─ 读 chrome.storage.local → gitstar-open-mode
  ├─ "popup" → 正常弹出 popup (setPopup 已设置 popup.html)
  └─ "tab"  → chrome.tabs.create({ url: 'tab.html' })
                ↓ 如已有 tab 页面打开 → 聚焦而非重复创建
tab.html / popup.html (两个独立 Plasmo 入口)
  ↓ 共享组件
components/HomePage.tsx / DetailPage.tsx / FavoritesPage.tsx
  ↓ 共享数据层（零改动）
lib/github.ts / cache.ts / ai-summary.ts / hooks/...
```

### 文件变更

**新增：**

| 文件 | 用途 |
|------|------|
| `extension/background.ts` | Service Worker，处理图标点击分发 |
| `extension/tab.tsx` | 新标签页入口，全宽响应式布局壳 |
| `extension/components/HomePage.tsx` | 从 popup.tsx 提取的首页组件 |
| `extension/components/DetailPage.tsx` | 从 popup.tsx 提取的详情页组件 |
| `extension/components/FavoritesPage.tsx` | 从 popup.tsx 提取的收藏页组件 |

**修改：**

| 文件 | 变更 |
|------|------|
| `extension/popup.tsx` | 删除三大页面组件定义（移入 components/），仅保留 PopupIndex 路由壳 + 400px 布局 |
| `extension/options.tsx` | 新增第五张卡片"打开方式"，popup / tab 二选一 |
| `extension/lib/constants.ts` | 新增 `OPEN_MODE_STORAGE_KEY` 常量 |
| `extension/CLAUDE.md` | 同步新增内容（入口文件、已知陷阱等） |

**不变：** 所有 `lib/`、`hooks/`、现有 `components/`（SearchBar / FilterBar / RepoCard / RepoList / Pagination / RepoHeader / ReadmeViewer / MiniBar / TocOverlay / ErrorState / LoadingBar 等）零改动。

### background.ts 设计

```typescript
// 职责：根据用户偏好决定点击图标后弹出 popup 或打开新标签页

const STORAGE_KEY = 'gitstar-open-mode'; // 'popup' | 'tab'
const POPUP_PATH = 'popup.html';
const TAB_PATH = 'tab.html';

// 同步 popup 行为到 chrome.action
async function syncActionBehavior() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const mode = result[STORAGE_KEY] || 'popup';
  await chrome.action.setPopup({ popup: mode === 'popup' ? POPUP_PATH : '' });
}

// 监听 Options 页的实时切换
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) syncActionBehavior();
});

chrome.runtime.onInstalled.addListener(syncActionBehavior);
syncActionBehavior(); // Service Worker 每次唤醒时重新同步

// tab 模式下的点击处理
chrome.action.onClicked.addListener(async () => {
  const tabs = await chrome.tabs.query({ url: chrome.runtime.getURL(TAB_PATH) });
  if (tabs.length > 0) {
    await chrome.tabs.update(tabs[0].id!, { active: true });
  } else {
    await chrome.tabs.create({ url: TAB_PATH });
  }
});
```

**要点：**
- `chrome.action.setPopup({ popup: '' })` 传空串禁用 popup，使 `onClicked` 生效
- 标签页去重：已有 tab 页面打开时直接聚焦，不重复创建
- `onInstalled` + 启动时同步 + `onChanged` 三重保障，确保行为与存储一致

### tab.tsx 布局设计

全宽响应式，与 popup 的紧凑固定宽度形成对比：

```
┌──────────────────────────────────────────────────┐
│  Header (sticky top-0 z-30, w-full)              │
│  Logo + 品牌名  ·  发现模式切换  ·  ★ 收藏(N)    │
│  [深蓝渐变背景，全宽，内部 max-w-5xl mx-auto]      │
├──────────────────────────────────────────────────┤
│                                                  │
│  内容区 (max-w-5xl mx-auto, px-6)                 │
│  SearchBar + FilterBar 水平并排（宽屏下）          │
│  RepoList 可双列网格（≥1024px）                    │
│  Pagination 流式居中，非 fixed                     │
│                                                  │
├──────────────────────────────────────────────────┤
│  Footer (居中，max-w-5xl mx-auto)                 │
│  版本号 + 链接                                    │
└──────────────────────────────────────────────────┘
```

### popup 与 tab 布局差异对照

| 元素 | Popup | Tab |
|------|-------|-----|
| 容器宽度 | `400px` 固定 | 全宽，内容 `max-w-5xl mx-auto` |
| 顶栏定位 | `fixed top-0, w-[400px]` | `sticky top-0, w-full`，导航内容 `max-w-5xl mx-auto` |
| 底栏分页 | `fixed bottom-0` + `pb-14` 留空 | 流式布局，无 fixed |
| 搜索 + 筛选 | 垂直堆叠（宽不够） | 水平并排 |
| 项目卡片 | 单列 | 双列网格（≥1024px），单列（<1024px） |
| LoadingBar | fixed 顶栏下方 | sticky 顶栏下方 |
| README 展开 | 浮动返回顶部/TOC 按钮（fixed） | TOC 可改为侧边栏 |

### Options 页新增卡片

第五张卡片「打开方式」，插入在现有卡片之后：

- 标题：「🔧 打开方式」
- 描述：「点击工具栏图标时」
- 两个 Radio 选项：弹出 Popup 窗口（默认）/ 打开新标签页
- 存储 key `gitstar-open-mode`，值 `'popup'` | `'tab'`
- 写入 `chrome.storage.local`，`background.ts` 通过 `onChanged` 实时感知
- 默认 `'popup'`，保持现有用户习惯不变

### 组件提取说明

从 `popup.tsx`（当前 ~1175 行）提取到 `extension/components/` 的内容：

1. **HomePage.tsx** — `HomePage` 函数组件（第 67-160 行），含搜索/筛选/列表/分页逻辑
2. **DetailPage.tsx** — `DetailPage` 函数组件（第 219-827 行），含 README 展开/AI 概述/Star 操作
3. **FavoritesPage.tsx** — `FavoritesPage` 函数组件（第 840-1032 行），含分批加载/缓存复用/分页

提取后的 `popup.tsx` 只保留：
- `PopupIndex` → `PopupIndexInner` 壳（I18nProvider 包裹 + Token 加载 + 模式管理 + wouter 路由）
- `parseAiSections`（非 UI，可留在 popup.tsx 或移到 lib，按需决定）
- `ErrorBoundary` 类组件
- `errorMessageText` 工具函数

`tab.tsx` 类似结构，但使用全宽布局壳替代 400px 固定宽度。

### 路由与导航

tab.tsx 使用相同的 wouter hash 路由，页面组件通过 `<a href="#/...">` 导航，无需改动任何路由逻辑或组件内部的导航代码。

### 布局壳的 Props 接口

提取后的页面组件接收一个 `layout` prop 标记当前上下文，用于组件内部的条件渲染：

```typescript
type PageLayout = 'popup' | 'tab';

// HomePage 示例
function HomePage({ hasToken, mode, flashMode, layout }: {
  hasToken: boolean;
  mode: DiscoveryMode;
  flashMode: DiscoveryMode | null;
  layout: PageLayout;
}) { ... }
```

组件内部根据 `layout` 决定：
- 底部分页栏是否为 `fixed`（popup → fixed，tab → 流式）
- 列表卡片布局（popup → 单列，tab → 响应式双列）

### 不涉及的范围

- 不新增后端或部署步骤，标签页 HTML 来自扩展内置页面
- 不改动 Web 应用（Next.js），本次仅 extension 范围
- 不改动 i18n 字典结构，Options 新模式文案走正常 i18n 流程
- 不改动 `host_permissions` 或 `permissions`
- 不新增 `newtab.tsx`（不覆盖 Chrome 新标签页）
