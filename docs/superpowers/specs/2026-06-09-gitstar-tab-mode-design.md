# GitStar 新标签页模式 · 设计文档

**日期：** 2026-06-09
**状态：** 已确认（v1.2 → v1.3，经 code-review 审查修订）
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
  └─ "tab"  → chrome.tabs.create({ url: 'tabs/tab.html' })
                ↓ 如已有 tab 页面打开 → 聚焦窗口并激活标签页
tabs/tab.html / popup.html (两个独立 Plasmo 入口)
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
| `extension/tabs/tab.tsx` | 新标签页入口，全宽响应式布局壳（Plasmo 要求放在 `tabs/` 目录下才会构建为独立页面） |
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
const TAB_PATH = 'tabs/tab.html';

// 同步 popup 行为到 chrome.action
async function syncActionBehavior() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const mode = result[STORAGE_KEY] || 'popup';
    await chrome.action.setPopup({ popup: mode === 'popup' ? POPUP_PATH : '' });
  } catch {
    // SW 被提前终止时静默降级，下次唤醒会重新执行
  }
}

// 监听 Options 页的实时切换
chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) syncActionBehavior();
});

chrome.runtime.onInstalled.addListener(syncActionBehavior);
syncActionBehavior(); // Service Worker 每次唤醒时重新同步

// tab 模式下的点击处理
chrome.action.onClicked.addListener(async () => {
  // 二次确认：防止 SW 唤醒时 setPopup 未完成导致的误触发
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY] !== 'tab') return;

  const url = chrome.runtime.getURL(TAB_PATH);
  // URL 加 * 通配符：实际 URL 带 hash（如 #/project/vue/core），不加通配符可能匹配不到
  const tabs = await chrome.tabs.query({ url: url + '*' });
  if (tabs.length > 0) {
    const tab = tabs[0];
    // 先聚焦窗口（处理标签页在后台窗口的情况），再激活标签页
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id!, { active: true });
  } else {
    await chrome.tabs.create({ url: TAB_PATH });
  }
});
```

**要点：**
- `chrome.action.setPopup({ popup: '' })` 传空串禁用 popup，使 `onClicked` 生效。`setPopup` 是持久化的（跨 SW 生命周期），不会因 SW 终止而回退到 manifest default_popup
- `syncActionBehavior` 加 try/catch 处理 SW 提前终止的边缘情况
- `onClicked` 内二次检查存储值，作为 SW 唤醒竞态的安全网
- URL 匹配加 `*` 通配符，覆盖带 hash 路由的标签页 URL（如 `#/project/vue/core`）
- 标签页去重 + 窗口聚焦：先 `windows.update(focused)` 再 `tabs.update(active)`，处理标签页在后台窗口的情况
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
| AI 概述弹窗 | 固定 310px 宽度浮层 | 增大至 `max-w-md`（约 448px），利用宽屏空间 |
| sessionStorage | popup 关闭即清除（JS 上下文销毁） | 标签页关闭时才清除，重新打开标签页可能看到旧搜索状态 |

### POPUP_WIDTH 常量处理

`POPUP_WIDTH = '400px'` 从 popup.tsx 移至 `extension/lib/constants.ts`。popup 外壳通过 `w-[400px]` 引用，tab 外壳使用 `w-full`，共享页面组件不直接引用该常量，改为通过 `layout` prop 判断：

```typescript
// 共享组件内部条件渲染示例
const isPopup = layout === 'popup';
// 底栏：popup → fixed bottom-0，tab → 流式
// 卡片：popup → 单列，tab → 响应式双列
```

### AI 概述弹窗适配

AI 摘要弹窗当前硬编码宽度 310px。在 tab 全宽模式下弹窗显得异常窄。tab 模式下将弹窗宽度增大至 `max-w-md`（约 448px），内部三色卡片可水平排列以利用宽屏。popup 模式保持原尺寸不变。

### Options 页引导文案

模式切换 Radio 下方增加一行引导文字（走 i18n）：

> 「切换后点击工具栏图标即生效」

避免用户切换后不知道下一步该做什么。

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
- `useCurrentHash` hook（收藏页路由判断用）

以下函数/组件从 popup.tsx 移走，避免 popup 导入共享组件时产生循环依赖：

| 符号 | 迁移目标 | 原因 |
|------|---------|------|
| `parseAiSections` | `extension/lib/ai-summary.ts` | 与 AI 摘要逻辑强相关，被 DetailPage 调用 |
| `escapeHtml` | `extension/lib/ai-summary.ts` | 仅被 parseAiSections 间接使用，同上 |
| `errorMessageText` | `extension/lib/i18n.tsx` | 本质是 i18n 映射工具，被 HomePage 和 DetailPage 共用 |
| `ErrorBoundary` | `extension/components/ErrorBoundary.tsx` | 纯 UI 类组件，popup 和 tab 外壳都需引用 |

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

### 权限变更

`manifest.permissions` 新增 `"tabs"`：

- `chrome.tabs.query({ url })` 需要 `"tabs"` 权限才能匹配标签页 URL 做去重
- `chrome.windows.update(windowId, { focused: true })` 依赖同一权限
- `"tabs"` 权限在 Google Web Store 审核中接受度高（远优于 `host_permissions`），可以加上合理说明

### 不涉及的范围

- 不新增后端或部署步骤，标签页 HTML 来自扩展内置页面
- 不改动 Web 应用（Next.js），本次仅 extension 范围
- 不改动 i18n 字典结构，Options 新模式文案走正常 i18n 流程
- 不改动 `host_permissions`
- 不新增 `newtab.tsx`（不覆盖 Chrome 新标签页）
- 不改动现有 popup 的任何行为或样式

### 冒烟测试计划

本功能涉及 Service Worker + Plasmo 构建 + Chrome Action API 的联动，需要以下手动验证：

| # | 场景 | 预期结果 |
|---|------|---------|
| 1 | Options 切换为"打开新标签页"模式，点击工具栏图标 | 打开新标签页，URL 为 `chrome-extension://<id>/tabs/tab.html`，全宽布局 |
| 2 | 已有一个 tab 页面打开（带 hash 路由如 `#/project/vue/core`），再次点击图标 | 聚焦已有标签页所在窗口，激活该标签页，不重复创建 |
| 3 | Options 切换回"弹出 Popup 窗口"模式，点击工具栏图标 | 弹出 400px 宽 popup，行为与现有完全一致 |
| 4 | tab 模式下重启 Chrome 后点击图标 | SW 重新初始化，行为与设置一致（`syncActionBehavior` 启动时重同步） |
| 5 | tab 模式下的搜索/筛选/翻页/收藏/详情页/README 展开/AI 概述 | 所有功能正常工作，无布局异常 |
| 6 | `npm run build` 构建产物 | `build/chrome-mv3-prod/tabs/tab.html` 文件存在且可访问 |
