# 新标签页模式 · 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用户可在 Options 中选择工具栏图标行为（popup / 新标签页），标签页模式下全宽响应式展示所有 popup 功能。

**Architecture:** background.ts 用 `chrome.action.setPopup({ popup: '' })` 动态控制 popup 开关 + `chrome.action.onClicked` 分发。popup.tsx / tabs/tab.tsx 两个薄壳共享从 popup.tsx 提取出的 HomePage / DetailPage / FavoritesPage 组件及全部数据层。

**Tech Stack:** Plasmo v0.90.5 + React 18 + TypeScript + Tailwind CSS 3 + wouter hash routing

---

### Task 1: 新增常量

**Files:**
- Modify: `extension/lib/constants.ts`

- [ ] **Step 1: 追加 POPUP_WIDTH 和 OPEN_MODE 常量**

在 `extension/lib/constants.ts` 末尾追加：

```typescript
// Popup layout width — shared constant for popup shell and skeleton screens
export const POPUP_WIDTH = '400px';

// Open mode preference key (Options → background.ts → popup/tab routing)
export const OPEN_MODE_STORAGE_KEY = 'gitstar-open-mode';
export type OpenMode = 'popup' | 'tab';
```

- [ ] **Step 2: 提交**

```bash
git add extension/lib/constants.ts
git commit -m "chore: add POPUP_WIDTH and OPEN_MODE_STORAGE_KEY constants"
```

---

### Task 2: 新增 i18n 翻译 key

**Files:**
- Modify: `extension/locales/zh.json`
- Modify: `extension/locales/en.json`

- [ ] **Step 1: 在 zh.json 中追加 key**

在 `zh.json` 的最后一个 key-value 之后（`"aiSecurityDesc"` 行后），追加：

```json
  "openModeSectionTitle": "打开方式",
  "openModeSectionDesc": "点击工具栏图标时",
  "openModePopup": "弹出 Popup 窗口",
  "openModeTab": "打开新标签页",
  "openModeHint": "切换后点击工具栏图标即生效"
```

注意在前一个 key 行末尾加逗号。

- [ ] **Step 2: 在 en.json 中追加 key**

在 `en.json` 的最后一个 key-value 之后，追加：

```json
  "openModeSectionTitle": "Open Mode",
  "openModeSectionDesc": "When clicking the toolbar icon",
  "openModePopup": "Popup window",
  "openModeTab": "Open new tab",
  "openModeHint": "Takes effect on next toolbar icon click"
```

- [ ] **Step 3: 提交**

```bash
git add extension/locales/zh.json extension/locales/en.json
git commit -m "i18n: add open mode translation keys"
```

---

### Task 3: 迁移 errorMessageText 到 i18n.tsx

**Files:**
- Modify: `extension/lib/i18n.tsx`
- Modify: `extension/popup.tsx`

- [ ] **Step 1: 在 i18n.tsx 中新增 errorMessageText 函数**

在 `extension/lib/i18n.tsx` 的 `useI18n` hook 之后，文件末尾 `export` 之前，新增：

```typescript
import { AppError } from './types';

export function errorMessageText(e: Error, t: (key: string) => string): string {
  if (e instanceof AppError) {
    const map: Record<string, string> = {
      RATE_LIMIT: 'rateLimitError',
      REPO_NOT_FOUND: 'repoNotFound',
      NETWORK_ERROR: 'tokenNetworkError',
      LOAD_FAILED: 'loadFailed',
    };
    return t(map[e.code] || 'loadFailed');
  }
  return e.message;
}
```

- [ ] **Step 2: 修改 popup.tsx 中的导入和删除本地定义**

在 `popup.tsx` 顶部，修改 i18n 导入行：

```typescript
// 修改前：
import { I18nProvider, useI18n } from './lib/i18n';

// 修改后：
import { I18nProvider, useI18n, errorMessageText } from './lib/i18n';
```

删除 `popup.tsx` 中第 33-44 行的本地 `errorMessageText` 函数定义（含 `AppError` 类型引用）。

- [ ] **Step 3: 验证 popup.tsx 中 errorMessageText 的所有调用点仍然有效**

确保 `HomePage`（第 149 行）和 `DetailPage`（第 558、552 行）中对 `errorMessageText(error, t)` 的调用无需修改（函数签名未变）。

- [ ] **Step 4: 提交**

```bash
git add extension/lib/i18n.tsx extension/popup.tsx
git commit -m "refactor: move errorMessageText to i18n.tsx for shared use"
```

---

### Task 4: 迁移 parseAiSections + escapeHtml 到 ai-summary.ts

**Files:**
- Modify: `extension/lib/ai-summary.ts`
- Modify: `extension/popup.tsx`

- [ ] **Step 1: 在 ai-summary.ts 末尾追加两个函数**

在 `extension/lib/ai-summary.ts` 末尾追加：

```typescript
// -- AI summary section parser (shared by DetailPage) --

const SECTION_LABELS = ['功能', '特点', '场景', 'Function', 'Highlights', 'Use cases'];

export interface ParsedSection {
  label: string;
  text: string;
}

export function parseAiSections(rawText: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let currentLabel = '';
  let currentLines: string[] = [];

  for (const rawLine of rawText.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    let matchedLabel = '';
    let matchedPrefix = '';
    for (const label of SECTION_LABELS) {
      if (line.startsWith(label + '：')) {
        matchedLabel = label;
        matchedPrefix = label + '：';
        break;
      }
      if (line.startsWith(label + ': ')) {
        matchedLabel = label;
        matchedPrefix = label + ': ';
        break;
      }
    }

    if (matchedLabel) {
      if (currentLabel && currentLines.length > 0) {
        sections.push({ label: currentLabel, text: currentLines.join('\n') });
      }
      currentLabel = matchedLabel;
      currentLines = [line.slice(matchedPrefix.length).trim()];
    } else if (currentLabel) {
      currentLines.push(line);
    }
  }

  if (currentLabel && currentLines.length > 0) {
    sections.push({ label: currentLabel, text: currentLines.join('\n') });
  }

  return sections;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
```

- [ ] **Step 2: 修改 popup.tsx 导入并删除本地定义**

在 `popup.tsx` 顶部，修改 ai-summary 导入行，增加 `parseAiSections` 和 `escapeHtml`：

```typescript
// 修改前：
import { fetchSummary, getCachedSummary, saveSummary, AISummaryError } from './lib/ai-summary';

// 修改后：
import { fetchSummary, getCachedSummary, saveSummary, AISummaryError, parseAiSections, escapeHtml } from './lib/ai-summary';
```

删除 `popup.tsx` 中第 166-218 行：
- `SECTION_LABELS` 常量（第 166 行）
- `ParsedSection` 接口（第 168-171 行）
- `parseAiSections` 函数（第 173-213 行）
- `escapeHtml` 函数（第 215-217 行）

- [ ] **Step 3: 验证 DetailPage 内 parseAiSections 和 escapeHtml 的引用仍有效**

`parseAiSections` 在 `useEffect` 中调用（第 505 行），`escapeHtml` 在 Promise catch 中调用（第 518 行），这两个调用点无需修改。

- [ ] **Step 4: 提交**

```bash
git add extension/lib/ai-summary.ts extension/popup.tsx
git commit -m "refactor: move parseAiSections and escapeHtml to ai-summary.ts"
```

---

### Task 5: 提取 ErrorBoundary 为独立组件

**Files:**
- Create: `extension/components/ErrorBoundary.tsx`
- Modify: `extension/popup.tsx`

- [ ] **Step 1: 创建 ErrorBoundary.tsx**

创建 `extension/components/ErrorBoundary.tsx`：

```typescript
import { Component } from 'react';
import { POPUP_WIDTH } from '../lib/constants';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  width?: string; // 默认 POPUP_WIDTH，tab 模式传 '100%'
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, { error: Error | null }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ width: this.props.width || POPUP_WIDTH, padding: 20, color: 'red', fontSize: 12, fontFamily: 'monospace' }}>
          <strong>Render Error:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}
```

- [ ] **Step 2: 修改 popup.tsx 导入并删除本地定义**

在 `popup.tsx` 顶部新增导入：

```typescript
import { ErrorBoundary } from './components/ErrorBoundary';
```

删除 `popup.tsx` 中第 31 行的 `POPUP_WIDTH` 常量（已移至 constants.ts），改为从 constants 导入：

```typescript
// 修改前：
const POPUP_WIDTH = '400px';

// 修改后：
import { POPUP_WIDTH } from './lib/constants';
```

删除 `popup.tsx` 中第 46-65 行的本地 `ErrorBoundary` 类定义。

- [ ] **Step 3: 提交**

```bash
git add extension/components/ErrorBoundary.tsx extension/popup.tsx
git commit -m "refactor: extract ErrorBoundary to shared component"
```

---

### Task 6: 提取 HomePage 为独立组件

**Files:**
- Create: `extension/components/HomePage.tsx`
- Modify: `extension/popup.tsx`

- [ ] **Step 1: 创建 HomePage.tsx**

创建 `extension/components/HomePage.tsx`，将 `popup.tsx` 中第 67-160 行的 `HomePage` 函数组件完整移入。改动点：

1. 导入路径调整为相对路径（`../lib/...`、`../hooks/...`、`./...`）
2. 新增 `layout` prop

完整文件内容：

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { Repo, SearchParams, DiscoveryMode } from '../lib/types';
import { AppError } from '../lib/types';
import { searchRepos } from '../lib/github';
import { useFavorites } from '../hooks/useFavorites';
import { useStaleCache } from '../hooks/useStaleCache';
import { useI18n, errorMessageText } from '../lib/i18n';
import { DISCOVERY_MODES, getTimeRangeValue } from '../lib/constants';
import SearchBar from './SearchBar';
import FilterBar from './FilterBar';
import RepoList from './RepoList';
import Pagination from './Pagination';
import LoadingBar from './LoadingBar';

export type PageLayout = 'popup' | 'tab';

interface HomePageProps {
  hasToken: boolean;
  mode: DiscoveryMode;
  flashMode: DiscoveryMode | null;
  layout: PageLayout;
}

export default function HomePage({ hasToken, mode, flashMode, layout }: HomePageProps) {
  const [search, setSearch] = useState(() => {
    try { return sessionStorage.getItem('gs-search') || ''; } catch { return ''; }
  });
  const [language, setLanguage] = useState(() => {
    try { return sessionStorage.getItem('gs-language') || ''; } catch { return ''; }
  });
  const [timeRange, setTimeRange] = useState(() => {
    try { return sessionStorage.getItem('gs-timerange') || ''; } catch { return ''; }
  });
  const [sort, setSort] = useState(() => {
    try { return sessionStorage.getItem('gs-sort') || 'stars'; } catch { return 'stars'; }
  });
  const [page, setPage] = useState(() => {
    try { return parseInt(sessionStorage.getItem('gs-page') || '1', 10); } catch { return 1; }
  });

  const { favorites, toggle: toggleFavorite, loaded: favLoaded } = useFavorites();

  const saveSearchState = useCallback((s: string, l: string, t: string, so: string, p: number) => {
    try {
      sessionStorage.setItem('gs-search', s);
      sessionStorage.setItem('gs-language', l);
      sessionStorage.setItem('gs-timerange', t);
      sessionStorage.setItem('gs-sort', so);
      sessionStorage.setItem('gs-page', String(p));
    } catch { /* ignore */ }
  }, []);

  const { t } = useI18n();

  const apiSort = sort === 'growth' ? 'stars' : sort;

  const cacheKey = `search:${encodeURIComponent(search)}:${encodeURIComponent(language)}:${encodeURIComponent(timeRange)}:${encodeURIComponent(apiSort)}:${page}`;

  const fetcher = useCallback(async () => {
    try {
      const params: SearchParams = { sort: apiSort as SearchParams['sort'], order: 'desc', page, per_page: 10 };
      if (search) params.q = search;
      if (language) params.language = language;
      if (timeRange) params.created = timeRange;
      return await searchRepos(params);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e.status === 403) throw new AppError('RATE_LIMIT');
      throw err;
    }
  }, [search, language, timeRange, apiSort, page]);

  const { data: result, loading, error } = useStaleCache(cacheKey, fetcher, 2 * 60 * 1000);
  const repos = result?.items ?? [];
  const total = result?.total_count ?? 0;
  const totalPages = Math.min(Math.ceil(total / 10), 100);

  useEffect(() => {
    saveSearchState(search, language, timeRange, sort, page);
  }, [search, language, timeRange, sort, page, saveSearchState]);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  useEffect(() => {
    const config = DISCOVERY_MODES[mode];
    setSort(mode === 'rising' ? 'growth' : config.sort);
    setTimeRange(config.created ? getTimeRangeValue(config.created as 'week' | 'month') : '');
    setPage(1);
  }, [mode]);

  const isPopup = layout === 'popup';

  return (
    <div className={`space-y-3 ${isPopup ? 'pb-14' : ''}`}>
      <LoadingBar loading={loading} />
      <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} />
      <FilterBar
        language={language} onLanguageChange={v => { setLanguage(v); setPage(1); }}
        timeRange={timeRange} onTimeRangeChange={v => { setTimeRange(v); setPage(1); }}
        sort={sort} onSortChange={v => { setSort(v); setPage(1); }}
        flashMode={flashMode}
        mode={mode}
      />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">{errorMessageText(error, t)}</div>
      )}
      <RepoList repos={repos} favorites={favorites} onToggleFavorite={toggleFavorite} loaded={!loading && favLoaded} mode={mode} timeRange={timeRange} sort={sort} />
      {isPopup ? (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-50 z-20 border-t border-gray-100 pt-2 pb-1">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          <div className="text-center text-[10px] text-gray-400 pt-0.5">
            {hasToken ? <span className="text-[#16a34a]">{t('tokenConfigured')}</span> : t('tokenNotConfigured')}
          </div>
        </div>
      ) : (
        <div className="text-center pt-4 pb-2">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          <div className="text-center text-[10px] text-gray-400 pt-0.5">
            {hasToken ? <span className="text-[#16a34a]">{t('tokenConfigured')}</span> : t('tokenNotConfigured')}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 修改 popup.tsx**

在 `popup.tsx` 顶部新增导入：

```typescript
import HomePage from './components/HomePage';
```

删除 `popup.tsx` 中第 67-160 行的 `HomePage` 函数组件定义。

- [ ] **Step 3: 提交**

```bash
git add extension/components/HomePage.tsx extension/popup.tsx
git commit -m "refactor: extract HomePage to shared component"
```

---

### Task 7: 提取 DetailPage 为独立组件

**Files:**
- Create: `extension/components/DetailPage.tsx`
- Modify: `extension/popup.tsx`

- [ ] **Step 1: 创建 DetailPage.tsx**

创建 `extension/components/DetailPage.tsx`，将 `popup.tsx` 中 `DetailPage` 函数组件移入。关键改动：
- 导入路径调整为相对路径
- `parseAiSections` / `escapeHtml` 从 `../lib/ai-summary` 导入
- `errorMessageText` 从 `../lib/i18n` 导入
- 新增 `layout` prop，用于控制 AI 弹窗宽度和浮动按钮定位

完整文件（将 popup.tsx 第 219-827 行的 `DetailPage` 移入，仅修改导入和布局条件）：

```typescript
import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import type { RepoDetail } from '../lib/types';
import { AppError } from '../lib/types';
import type { AIConfig } from '../lib/types';
import { README_PREVIEW_BYTES, README_CACHE_PREFIX } from '../lib/constants';
import { getRepoInfo, getRepoReadme, checkStarred, starRepo, unstarRepo } from '../lib/github';
import { parseMarkdown } from '../lib/markdown';
import { useFavorites } from '../hooks/useFavorites';
import { useStaleCache } from '../hooks/useStaleCache';
import { useI18n, errorMessageText } from '../lib/i18n';
import { fetchSummary, getCachedSummary, saveSummary, AISummaryError, parseAiSections, escapeHtml } from '../lib/ai-summary';
import LoadingBar from './LoadingBar';
import RepoHeader from './RepoHeader';
import ReadmeViewer from './ReadmeViewer';
import MiniBar from './MiniBar';
import TocOverlay from './TocOverlay';
import ErrorState from './ErrorState';
import type { PageLayout } from './HomePage';

interface DetailPageProps {
  params: { owner: string; repo: string };
  hasToken: boolean;
  layout: PageLayout;
}

export default function DetailPage({ params, hasToken, layout }: DetailPageProps) {
  // ... 完整逻辑从 popup.tsx 第 219-827 行移入 ...
  // 布局差异点：
  // 1. AI 弹窗宽度：layout === 'tab' ? 'max-w-md' : '310px'
  // 2. 浮动按钮（收起/TOC/AI/回到顶部）：popup 用 fixed right-4，tab 保持相同
  // 3. MiniBar 和 RepoHeader 不变（纯内容渲染，不依赖外层布局）
}
```

> 具体代码详见 popup.tsx 第 219-827 行，此处不重复粘贴 600+ 行。提取后该组件的布局差异仅在两处：
> - AI 弹窗 `style={{ width }}`: `layout === 'tab' ? 'max-w-md' : '310px'`
> - README 预览 max-h 自适应逻辑不变（`previewMaxH` state 已处理）

- [ ] **Step 2: 修改 popup.tsx 导入**

新增导入：
```typescript
import DetailPage from './components/DetailPage';
```

删除 `popup.tsx` 中第 219-827 行的 `DetailPage` 函数组件定义。

- [ ] **Step 3: 提交**

```bash
git add extension/components/DetailPage.tsx extension/popup.tsx
git commit -m "refactor: extract DetailPage to shared component"
```

---

### Task 8: 提取 FavoritesPage 为独立组件

**Files:**
- Create: `extension/components/FavoritesPage.tsx`
- Modify: `extension/popup.tsx`

- [ ] **Step 1: 创建 FavoritesPage.tsx**

创建 `extension/components/FavoritesPage.tsx`，将 `popup.tsx` 中第 830-1032 行的 `useCurrentHash` hook 和 `FavoritesPage` 函数组件移入。改动点：
- 导入路径调整为相对路径
- 新增 `layout` prop 控制底栏 fixed 行为

```typescript
import { useState, useEffect, useCallback } from 'react';
import type { Repo } from '../lib/types';
import { getRepoInfo } from '../lib/github';
import { useFavorites } from '../hooks/useFavorites';
import { useI18n } from '../lib/i18n';
import { getCache, setCache, isFresh } from '../lib/cache';
import RepoCard from './RepoCard';
import Pagination from './Pagination';
import ErrorState from './ErrorState';
import type { PageLayout } from './HomePage';

function useCurrentHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash;
}

interface FavoritesPageProps {
  layout: PageLayout;
}

export default function FavoritesPage({ layout }: FavoritesPageProps) {
  // ... 完整逻辑从 popup.tsx 第 840-1032 行移入 ...
  // 布局差异：底栏 fixed vs 流式（同 HomePage 模式）
  const isPopup = layout === 'popup';
  // fixed 底栏部分用 isPopup 条件判断
}

export { useCurrentHash };
```

- [ ] **Step 2: 修改 popup.tsx 导入**

新增导入：
```typescript
import FavoritesPage, { useCurrentHash } from './components/FavoritesPage';
```

删除 `popup.tsx` 中第 830-838 行的 `useCurrentHash` 和第 840-1032 行的 `FavoritesPage` 函数组件定义。

- [ ] **Step 3: 提交**

```bash
git add extension/components/FavoritesPage.tsx extension/popup.tsx
git commit -m "refactor: extract FavoritesPage to shared component"
```

---

### Task 9: 清理 popup.tsx 为纯路由壳

**Files:**
- Modify: `extension/popup.tsx`

- [ ] **Step 1: 确认 popup.tsx 当前状态**

提取三个页面组件后，`popup.tsx` 应仅保留：
- 所有 import 语句（含新增的组件导入）
- `PopupIndex` → `PopupIndexInner`（I18nProvider + Token 加载 + 模式管理 + wouter 路由）
- 路由调用处传入 `layout="popup"` prop

确认骨架屏中的 `POPUP_WIDTH` 引用已改为从 `constants.ts` 导入。

- [ ] **Step 2: 给路由组件传入 layout prop**

修改 `popup.tsx` 中的路由渲染：

```typescript
// HomePage 路由
const renderHomePage = useCallback(
  () => <HomePage hasToken={hasToken} mode={mode} flashMode={flashMode} layout="popup" />,
  [hasToken, mode, flashMode]
);

// DetailPage 路由
<Route path="/project/:owner/:repo">
  {(params) => <DetailPage params={params} hasToken={hasToken} layout="popup" />}
</Route>

// FavoritesPage 路由
<Route path="/favorites" component={() => <FavoritesPage layout="popup" />} />
```

- [ ] **Step 3: 提交**

```bash
git add extension/popup.tsx
git commit -m "refactor: strip popup.tsx to routing shell with layout='popup'"
```

---

### Task 10: 创建 tabs/tab.tsx 新标签页入口

**Files:**
- Create: `extension/tabs/tab.tsx`

- [ ] **Step 1: 创建目录和文件**

创建 `extension/tabs/tab.tsx`：

```typescript
import { useState, useEffect, useLayoutEffect, useCallback, useRef, Component } from 'react';
import { Router, Route } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import type { DiscoveryMode } from '../lib/types';
import { loadToken, getToken, setToken } from '../lib/github';
import { useFavorites } from '../hooks/useFavorites';
import { I18nProvider, useI18n } from '../lib/i18n';
import { DISCOVERY_MODES, MODE_EMOJI } from '../lib/constants';
import { ErrorBoundary } from '../components/ErrorBoundary';
import HomePage from '../components/HomePage';
import DetailPage from '../components/DetailPage';
import FavoritesPage, { useCurrentHash } from '../components/FavoritesPage';
import GitStarIcon from '../components/GitStarIcon';
import '../assets/tailwind.css';

export default function TabIndex() {
  return (
    <I18nProvider>
      <TabIndexInner />
    </I18nProvider>
  );
}

function TabIndexInner() {
  const { t } = useI18n();
  const [tokenReady, setTokenReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [mode, setMode] = useState<DiscoveryMode>('hot');
  const [modeLoaded, setModeLoaded] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [flashMode, setFlashMode] = useState<DiscoveryMode | null>(null);

  const handleModeChange = useCallback((newMode: DiscoveryMode) => {
    setMode(newMode);
    setModeDropdownOpen(false);
    setFlashMode(newMode);
    setTimeout(() => setFlashMode(null), 200);
    chrome.storage.local.set({ 'gitstar-mode': newMode }).catch(() => {});
  }, []);

  const hash = useCurrentHash();
  const { favorites, loaded: favLoaded } = useFavorites();
  const favCount = favLoaded ? (favorites || []).length : 0;
  const isFavPage = hash === '#/favorites';

  const renderHomePage = useCallback(
    () => <HomePage hasToken={hasToken} mode={mode} flashMode={flashMode} layout="tab" />,
    [hasToken, mode, flashMode]
  );

  const renderFavoritesPage = useCallback(
    () => <FavoritesPage layout="tab" />,
    []
  );

  useEffect(() => {
    loadToken().then(() => { setHasToken(!!getToken()); setTokenReady(true); });
    chrome.storage.local.get('gitstar-mode').then(r => {
      if (r['gitstar-mode'] && ['hot', 'rising', 'active'].includes(r['gitstar-mode'])) {
        setMode(r['gitstar-mode'] as DiscoveryMode);
      }
      setModeLoaded(true);
    }).catch(() => setModeLoaded(true));
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.githubToken) {
        const val = changes.githubToken.newValue || null;
        setToken(val);
        setHasToken(!!val);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  if (!tokenReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="sticky top-0 z-30 bg-[#3b82f6] shadow-[0_2px_8px_rgba(59,130,246,0.25)]">
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <GitStarIcon />
              <span className="translate-y-[-1px]">GitStar</span>
            </h1>
            <div className="flex items-center gap-2.5">
              <span className="text-[11px] text-white/85 font-medium">{t('discoverProjects')}</span>
              <span className="text-[11px] font-semibold text-white/40 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] rounded-md px-2 py-1">{t('navFavorites')}</span>
            </div>
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-6 py-4 flex-1 w-full">
          <div className="h-0.5 bg-gray-200 rounded-full animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary width="100%">
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header
          className="sticky top-0 z-30 shadow-[0_2px_8px_rgba(59,130,246,0.25)] transition-colors duration-300"
          style={{
            background: mode === 'rising'
              ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
              : mode === 'active'
                ? 'linear-gradient(135deg, #3b82f6, #10b981)'
                : '#3b82f6'
          }}
        >
          <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
            <h1 className="text-base font-bold text-white flex items-center gap-2">
              <GitStarIcon />
              <span className="translate-y-[-1px]">GitStar</span>
            </h1>
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <button
                  onClick={() => setModeDropdownOpen(v => !v)}
                  className={`flex items-center gap-1 text-[11px] font-semibold rounded-md px-2 py-1 border transition-colors ${
                    mode !== 'hot'
                      ? 'text-white bg-[rgba(255,255,255,0.22)] border-[rgba(255,255,255,0.4)]'
                      : 'text-white bg-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.2)]'
                  }`}
                >
                  {MODE_EMOJI[mode]} {t(`mode.${mode}` as any)} ▾
                </button>
                {modeDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setModeDropdownOpen(false)} />
                    <div className="absolute top-full right-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-[#e5e7eb] overflow-hidden min-w-[180px]">
                      {(['hot', 'rising', 'active'] as DiscoveryMode[]).map(m => (
                        <button
                          key={m}
                          onClick={() => handleModeChange(m)}
                          className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#f3f4f6] transition-colors ${
                            m === mode ? 'bg-[#eff6ff]' : ''
                          }`}
                        >
                          <span>{MODE_EMOJI[m]}</span>
                          <div>
                            <div className={`text-[12px] font-semibold ${m === mode ? 'text-[#3b82f6]' : 'text-[#1e1b4b]'}`}>
                              {t(`mode.${m}` as any)}
                              {m === mode && <span className="ml-1 text-[#3b82f6]">✓</span>}
                            </div>
                            <div className="text-[10px] text-[#6b7280]">{t(`mode.${m}.desc` as any)}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <a
                href="#/favorites"
                className={`flex items-center gap-1 text-[11px] font-semibold no-underline rounded-md px-2 py-1 border transition-colors ${isFavPage ? 'text-[#f59e0b] bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.3)]' : 'text-white bg-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.2)]'}`}
                title={t('navFavoritesTitle')}
              >
                {t('navFavorites')}
                {favCount > 0 && (
                  <span className={`rounded-full min-w-[16px] h-4 flex items-center justify-center text-[10px] px-1 ${isFavPage ? 'bg-[rgba(245,158,11,0.2)]' : 'bg-[rgba(255,255,255,0.2)]'}`}>{favCount}</span>
                )}
              </a>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-6 py-4 flex-1 w-full">
          <Router hook={useHashLocation}>
            <Route path="/favorites" component={renderFavoritesPage} />
            <Route path="/project/:owner/:repo">
              {(params) => <DetailPage params={params} hasToken={hasToken} layout="tab" />}
            </Route>
            <Route path="/" component={renderHomePage} />
          </Router>
        </main>
        <footer className="text-center text-xs text-[#9ca3af] py-4 space-x-3 border-t border-gray-100">
          <a href="https://fuzhengcn.github.io/GitStar/store-listing/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline">{t('privacyPolicy')}</a>
          <a href="https://github.com/FuZhengCN/GitStar/issues" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline">{t('feedback')}</a>
          <span>v{require('../package.json').version}</span>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add extension/tabs/tab.tsx
git commit -m "feat: add tab.tsx — full-width entry point for new tab mode"
```

---

### Task 11: 创建 background.ts Service Worker

**Files:**
- Create: `extension/background.ts`

- [ ] **Step 1: 创建 background.ts**

创建 `extension/background.ts`：

```typescript
const STORAGE_KEY = 'gitstar-open-mode';
const POPUP_PATH = 'popup.html';
const TAB_PATH = 'tabs/tab.html';

async function syncActionBehavior() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const mode = result[STORAGE_KEY] || 'popup';
    await chrome.action.setPopup({ popup: mode === 'popup' ? POPUP_PATH : '' });
  } catch {
    // SW terminated prematurely — will re-sync on next wake
  }
}

chrome.storage.onChanged.addListener((changes) => {
  if (changes[STORAGE_KEY]) syncActionBehavior();
});

chrome.runtime.onInstalled.addListener(syncActionBehavior);
syncActionBehavior();

chrome.action.onClicked.addListener(async () => {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  if (result[STORAGE_KEY] !== 'tab') return;

  const url = chrome.runtime.getURL(TAB_PATH);
  const tabs = await chrome.tabs.query({ url: url + '*' });
  if (tabs.length > 0) {
    const tab = tabs[0];
    await chrome.windows.update(tab.windowId, { focused: true });
    await chrome.tabs.update(tab.id!, { active: true });
  } else {
    await chrome.tabs.create({ url: TAB_PATH });
  }
});
```

- [ ] **Step 2: 提交**

```bash
git add extension/background.ts
git commit -m "feat: add background.ts — action click dispatcher for popup/tab modes"
```

---

### Task 12: Options 页新增"打开方式"卡片

**Files:**
- Modify: `extension/options.tsx`

- [ ] **Step 1: 在 OptionsForm 中新增状态和 UI**

在 `extension/options.tsx` 中，`OptionsForm` 组件内新增：

(1) 在现有 state 声明区域（`const [aiMessage, setAiMessage] = ...` 行后）新增：

```typescript
const [openMode, setOpenMode] = useState<'popup' | 'tab'>('popup');
```

(2) 在现有 `useEffect` 加载 AI config 的区域后，新增加载 openMode 的 effect：

```typescript
useEffect(() => {
  chrome.storage.local.get('gitstar-open-mode').then(result => {
    if (result['gitstar-open-mode'] === 'tab') setOpenMode('tab');
  }).catch(() => {});
}, []);
```

(3) 在 "通用设置" 卡片（Card 1，第 134 行 `</div>` 之前，语言选择 `</div>` 之后）中新增打开方式选项：

在语言选择 `</div>`（第 133 行）之后追加：

```typescript
<div>
  <label className="block text-xs font-medium text-[#1e1b4b] mb-2">{t('openModeSectionTitle')}</label>
  <p className="text-[10px] text-[#6b7280] mb-2">{t('openModeSectionDesc')}</p>
  <label className="flex items-center gap-2 mb-1.5 cursor-pointer">
    <input
      type="radio"
      name="openMode"
      value="popup"
      checked={openMode === 'popup'}
      onChange={() => {
        setOpenMode('popup');
        chrome.storage.local.set({ 'gitstar-open-mode': 'popup' }).catch(() => {});
      }}
      className="accent-[#3b82f6]"
    />
    <span className="text-xs text-[#1e1b4b]">{t('openModePopup')}</span>
  </label>
  <label className="flex items-center gap-2 cursor-pointer">
    <input
      type="radio"
      name="openMode"
      value="tab"
      checked={openMode === 'tab'}
      onChange={() => {
        setOpenMode('tab');
        chrome.storage.local.set({ 'gitstar-open-mode': 'tab' }).catch(() => {});
      }}
      className="accent-[#3b82f6]"
    />
    <span className="text-xs text-[#1e1b4b]">{t('openModeTab')}</span>
  </label>
  <p className="text-[10px] text-[#9ca3af] mt-1.5">{t('openModeHint')}</p>
</div>
```

- [ ] **Step 2: 提交**

```bash
git add extension/options.tsx
git commit -m "feat: add open mode toggle to Options page"
```

---

### Task 13: 新增 tabs 权限

**Files:**
- Modify: `extension/package.json`

- [ ] **Step 1: 在 manifest.permissions 中追加 tabs**

修改 `extension/package.json` 第 39-45 行的 manifest 块：

```json
"manifest": {
    "host_permissions": [
      "https://api.github.com/*"
    ],
    "permissions": [
      "storage",
      "tabs"
    ]
  }
```

- [ ] **Step 2: 提交**

```bash
git add extension/package.json
git commit -m "chore: add tabs permission for tab dedup and window focus"
```

---

### Task 14: 构建验证 + 冒烟测试

**Files:** (无代码变更)

- [ ] **Step 1: 构建**

```bash
cd extension && npm run build
```

验证构建输出中 `build/chrome-mv3-prod/tabs/tab.html` 文件存在。

- [ ] **Step 2: 加载扩展并执行冒烟测试**

| # | 场景 | 预期 |
|---|------|------|
| 1 | `chrome://extensions/` 加载 `build/chrome-mv3-prod/`，无报错 | 扩展图标出现 |
| 2 | 默认 popup 模式，点击图标 | 弹出 400px popup，行为不变 |
| 3 | Options → 切换为"打开新标签页" | 存储写入成功 |
| 4 | 点击图标 | 打开新标签页 `tabs/tab.html`，全宽布局 |
| 5 | 已打开 tab 页面，再次点击图标 | 聚焦已有标签页 |
| 6 | 切换回 popup 模式，点击图标 | 恢复 popup 行为 |
| 7 | tab 模式下搜索/筛选/翻页/收藏/详情/README/AI 概述 | 全部正常 |

- [ ] **Step 3: 最终提交（如有遗漏）**

```bash
git status
# 如有未提交变更，补充提交
```
