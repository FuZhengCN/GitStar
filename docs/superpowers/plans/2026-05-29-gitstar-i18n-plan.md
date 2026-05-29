# GitStar 扩展国际化（i18n）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 扩展支持中英双语切换，默认跟随浏览器语言，允许 Options 页手动覆盖

**Architecture:** 极简自研 I18nProvider Context + useI18n hook + 两个 JSON 字典（zh.json / en.json），零外部依赖。三个独立 React 树（Popup/Options/Sidebar）各自包裹 Provider，通过 chrome.storage.local + onChanged 跨上下文同步语言

**Tech Stack:** React 18 + TypeScript + Plasmo v0.90.5 + chrome.storage API

**Source spec:** `docs/superpowers/specs/2026-05-29-gitstar-i18n-design.md`

---

### Task 1: 创建基础文件（类型、翻译字典、i18n 核心）

**Files:**
- Create: `extension/lib/types.ts`（追加 AppError）
- Create: `extension/locales/zh.json`
- Create: `extension/locales/en.json`
- Create: `extension/lib/i18n.ts`

- [ ] **Step 1: 在 types.ts 末尾追加 AppError 类**

编辑 `extension/lib/types.ts`，在文件末尾追加：

```ts
export class AppError extends Error {
  code: 'RATE_LIMIT' | 'REPO_NOT_FOUND' | 'NETWORK_ERROR' | 'LOAD_FAILED';
  constructor(code: 'RATE_LIMIT' | 'REPO_NOT_FOUND' | 'NETWORK_ERROR' | 'LOAD_FAILED') {
    super(code);
    this.code = code;
  }
}
```

- [ ] **Step 2: 创建中文翻译字典 `extension/locales/zh.json`**

```json
{
  "searchPlaceholder": "搜索项目...",
  "searchAriaLabel": "搜索",
  "allLanguages": "全部语言",
  "allTime": "全部时间",
  "thisWeek": "本周",
  "thisMonth": "本月",
  "thisYear": "今年",
  "sortByStars": "按 Star 排",
  "sortByForks": "按 Fork 排",
  "sortByUpdated": "最近更新",
  "noResults": "没有找到匹配的项目",
  "noResultsHint": "尝试调整筛选条件或搜索关键词",
  "noDescription": "暂无描述",
  "noReadme": "该项目没有 README 文件",
  "backToHome": "← 返回首页",
  "backToDiscover": "← 返回发现",
  "back": "← 返回",
  "myFavorites": "★ 我的收藏 ({count})",
  "noFavorites": "暂无收藏项目",
  "goDiscover": "去首页探索优质开源项目吧",
  "discoverProjects": "发现优质开源项目",
  "navFavorites": "★ 收藏",
  "navFavoritesTitle": "我的收藏",
  "favorite": "☆ 收藏",
  "favorited": "★ 已收藏",
  "openOnGitHub": "🔗 打开",
  "retry": "重试",
  "loadFailed": "加载失败",
  "errorOccurred": "出错了",
  "errorRetryMessage": "请稍后重试",
  "itemsLoadFailed": "{n} 个项目加载失败",
  "tokenNotConfigured": "未配置 Token · 限流 60 次/小时",
  "tokenConfigured": "Token 已配置",
  "tokenEmpty": "Token 不能为空",
  "tokenInvalid": "Token 无效，请检查后重试",
  "tokenSaved": "Token 验证成功，已保存",
  "tokenCleared": "Token 已清除",
  "tokenNetworkError": "网络错误，请检查网络连接",
  "configTitle": "GitStar 配置",
  "createTokenAt": "在",
  "createTokenHint": "创建，只需勾选 public_repo 权限",
  "verifying": "验证中...",
  "save": "保存",
  "clear": "清除",
  "rateLimitError": "GitHub API 限流。请前往 Options 页配置 Personal Access Token",
  "repoNotFound": "仓库不存在",
  "sidebarTitle": "GitStar · 同类热门",
  "sidebarLoading": "加载中...",
  "sidebarEmpty": "暂无推荐",
  "expandReadme": "展开全部 README（{size}KB，可能较慢）",
  "favoritesLoadFailed": "无法获取收藏项目信息",
  "languageLabel": "语言 / Language"
}
```

- [ ] **Step 3: 创建英文翻译字典 `extension/locales/en.json`**

```json
{
  "searchPlaceholder": "Search projects...",
  "searchAriaLabel": "Search",
  "allLanguages": "All Languages",
  "allTime": "All Time",
  "thisWeek": "This Week",
  "thisMonth": "This Month",
  "thisYear": "This Year",
  "sortByStars": "By Stars",
  "sortByForks": "By Forks",
  "sortByUpdated": "Recently Updated",
  "noResults": "No matching projects found",
  "noResultsHint": "Try adjusting filters or search keywords",
  "noDescription": "No description",
  "noReadme": "This project has no README file",
  "backToHome": "← Back to Home",
  "backToDiscover": "← Back to Discover",
  "back": "← Back",
  "myFavorites": "★ My Favorites ({count})",
  "noFavorites": "No favorites yet",
  "goDiscover": "Go explore great open source projects",
  "discoverProjects": "Discover Great Projects",
  "navFavorites": "★ Favorites",
  "navFavoritesTitle": "My Favorites",
  "favorite": "☆ Save",
  "favorited": "★ Saved",
  "openOnGitHub": "🔗 Open",
  "retry": "Retry",
  "loadFailed": "Failed to load",
  "errorOccurred": "Something went wrong",
  "errorRetryMessage": "Please try again later",
  "itemsLoadFailed": "{n} items failed to load",
  "tokenNotConfigured": "No token · Rate limit 60/hr",
  "tokenConfigured": "Token configured",
  "tokenEmpty": "Token cannot be empty",
  "tokenInvalid": "Invalid token, please check and retry",
  "tokenSaved": "Token verified and saved",
  "tokenCleared": "Token cleared",
  "tokenNetworkError": "Network error, please check your connection",
  "configTitle": "GitStar Configuration",
  "createTokenAt": "Create at",
  "createTokenHint": ", only need to check public_repo scope",
  "verifying": "Verifying...",
  "save": "Save",
  "clear": "Clear",
  "rateLimitError": "GitHub API rate limited. Please configure a Personal Access Token in Options",
  "repoNotFound": "Repository not found",
  "sidebarTitle": "GitStar · Similar Popular",
  "sidebarLoading": "Loading...",
  "sidebarEmpty": "No recommendations",
  "expandReadme": "Expand full README ({size}KB, may be slow)",
  "favoritesLoadFailed": "Failed to load favorites",
  "languageLabel": "语言 / Language"
}
```

- [ ] **Step 4: 创建 `extension/lib/i18n.ts`**

```ts
import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import zh from '../locales/zh.json';
import en from '../locales/en.json';

type Lang = 'zh' | 'en';

const locales: Record<Lang, Record<string, string>> = { zh, en };
const STORAGE_KEY = 'gitstar-lang';

function normalizeLang(raw: string): Lang {
  if (raw.startsWith('zh')) return 'zh';
  return 'en';
}

interface I18nContextValue {
  t: (key: string) => string;
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => normalizeLang(navigator.language));

  // Async read stored preference
  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then(result => {
      if (result[STORAGE_KEY] === 'zh' || result[STORAGE_KEY] === 'en') {
        setLangState(result[STORAGE_KEY]);
      }
    }).catch(() => {});
  }, []);

  // Cross-context sync via onChanged
  useEffect(() => {
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      const v = changes[STORAGE_KEY]?.newValue;
      if (v === 'zh' || v === 'en') {
        setLangState(v);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    chrome.storage.local.set({ [STORAGE_KEY]: l }).catch(() => {});
  }, []);

  const t = useMemo(() => {
    return (key: string): string => {
      const locale = locales[lang];
      if (locale[key] !== undefined) return locale[key];
      const fallback = locales['zh'];
      if (fallback[key] !== undefined) return fallback[key];
      if (process.env.NODE_ENV === 'development') {
        console.warn(`i18n key missing: ${key}`);
      }
      return key;
    };
  }, [lang]);

  return (
    <I18nContext.Provider value={{ t, lang, setLang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
```

- [ ] **Step 5: 验证构建通过**

```bash
cd extension && npm run build
```
预期：构建成功，无类型错误。

- [ ] **Step 6: Commit**

```bash
git add extension/lib/types.ts extension/locales/zh.json extension/locales/en.json extension/lib/i18n.ts
git commit -m "feat: i18n 基础设施 — AppError 类型、中英文字典、I18nProvider hook"
```

---

### Task 2: 在三个入口包裹 I18nProvider

**Files:**
- Modify: `extension/popup.tsx`
- Modify: `extension/options.tsx`
- Modify: `extension/contents/github-sidebar.tsx`

- [ ] **Step 1: popup.tsx — 在 PopupIndex 返回的 ErrorBoundary 内部包裹 I18nProvider**

编辑 `extension/popup.tsx`，在 import 区域新增：

```ts
import { I18nProvider } from './lib/i18n';
```

在 `PopupIndex` 的 return 中，将 `<Router>` 及其兄弟节点用 `<I18nProvider>` 包裹。具体：找到 `<div style={{ width: POPUP_WIDTH, minHeight: '720px' }} className="bg-white flex flex-col">`（tokenReady 为 false 和 true 两处），在每个 `div` 内部的 `<Router>` 外层套 `<I18nProvider>`。

更精确的做法：直接在 `ErrorBoundary` 内部、内容 `div` 外层套 `<I18nProvider>`：

```tsx
// tokenReady 为 true 时的 return：
return (
  <ErrorBoundary>
    <I18nProvider>
      <div style={{ width: POPUP_WIDTH, minHeight: '720px' }} className="bg-white flex flex-col">
        {/* ... 顶栏不变 ... */}
        <div className="p-4 flex-1">
          <Router hook={useHashLocation}>
            {/* ... 路由不变 ... */}
          </Router>
        </div>
      </div>
    </I18nProvider>
  </ErrorBoundary>
);
```

tokenReady 为 false 时的骨架屏 return 也包裹 `<I18nProvider>`：

```tsx
return (
  <I18nProvider>
    <div style={{ width: POPUP_WIDTH }} className="min-h-[720px] bg-white flex flex-col">
      {/* ... skeleton unchanged for now ... */}
    </div>
  </I18nProvider>
);
```

- [ ] **Step 2: options.tsx — 包裹 I18nProvider**

编辑 `extension/options.tsx`，新增 import：

```ts
import { I18nProvider } from './lib/i18n';
```

在 `OptionsIndex` 的 return 最外层包裹：

```tsx
export default function OptionsIndex() {
  // ... existing code ...

  return (
    <I18nProvider>
      <div className="max-w-lg mx-auto p-6">
        {/* ... 现有内容不变 ... */}
      </div>
    </I18nProvider>
  );
}
```

- [ ] **Step 3: github-sidebar.tsx — 在 mountPanel 中包裹 I18nProvider**

编辑 `extension/contents/github-sidebar.tsx`，新增 import：

```ts
import { I18nProvider } from '../lib/i18n';
```

在 `mountPanel` 函数中，所有 `reactRoot.render(...)` 调用处，将 `<SidebarPanel />` 包裹为 `<I18nProvider><SidebarPanel /></I18nProvider>`。共 2 处（正常挂载和超时浮动回退）：

```tsx
reactRoot.render(<I18nProvider><SidebarPanel /></I18nProvider>);
```

第 1 处在 `tryMount()` 内（约第 316 行），第 2 处在超时回退逻辑内（约第 342 行）。

- [ ] **Step 4: 验证构建通过**

```bash
cd extension && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add extension/popup.tsx extension/options.tsx extension/contents/github-sidebar.tsx
git commit -m "feat: 三个入口包裹 I18nProvider — popup/options/sidebar"
```

---

### Task 3: 迁移 FilterBar 组件

**Files:**
- Modify: `extension/components/FilterBar.tsx`

- [ ] **Step 1: 替换硬编码中文字符串为 t() 调用**

编辑 `extension/components/FilterBar.tsx`：

```tsx
import { useI18n } from '../lib/i18n';

const LANGUAGES = [
  { value: '', labelKey: 'allLanguages' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'Python', label: 'Python' },
  { value: 'Go', label: 'Go' },
  { value: 'Rust', label: 'Rust' },
  { value: 'Java', label: 'Java' },
  { value: 'C++', label: 'C++' },
  { value: 'C', label: 'C' },
  { value: 'Ruby', label: 'Ruby' },
];

function getTimeRanges(t: (key: string) => string) {
  const now = new Date();
  const week = new Date(now); week.setDate(week.getDate() - 7);
  const month = new Date(now); month.setMonth(month.getMonth() - 1);
  const year = new Date(now); year.setFullYear(year.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return [
    { value: '', label: t('allTime') },
    { value: `>${fmt(week)}`, label: t('thisWeek') },
    { value: `>${fmt(month)}`, label: t('thisMonth') },
    { value: `>${fmt(year)}`, label: t('thisYear') },
  ];
}

const SORTS = [
  { value: 'stars', labelKey: 'sortByStars' },
  { value: 'forks', labelKey: 'sortByForks' },
  { value: 'updated', labelKey: 'sortByUpdated' },
];

// ... Props interface 不变 ...

export default function FilterBar({ language, onLanguageChange, timeRange, onTimeRangeChange, sort, onSortChange }: Props) {
  const { t } = useI18n();
  const timeRanges = getTimeRanges(t);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <select value={language} onChange={e => onLanguageChange(e.target.value)} className={selectClass}>
          {LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.labelKey ? t(l.labelKey) : l.label}</option>
          ))}
        </select>
        <Chevron />
      </div>
      <div className="relative flex-1">
        <select value={timeRange} onChange={e => onTimeRangeChange(e.target.value)} className={selectClass}>
          {timeRanges.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <Chevron />
      </div>
      <div className="relative flex-1">
        <select value={sort} onChange={e => onSortChange(e.target.value)} className={selectClass}>
          {SORTS.map(s => (
            <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
          ))}
        </select>
        <Chevron />
      </div>
    </div>
  );
}
```

改动说明：`LANGUAGES` 中 `'全部语言'` 改为 `labelKey: 'allLanguages'`，`SORTS` 中三处改为 `labelKey: 'sortByStars'` 等。`getTimeRanges` 改为接收 `t` 函数参数，因为不能在该函数体内调用 hook。

- [ ] **Step 2: 构建验证**

```bash
cd extension && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add extension/components/FilterBar.tsx
git commit -m "feat: FilterBar i18n 迁移"
```

---

### Task 4: 迁移 SearchBar、EmptyState、ErrorState 组件

**Files:**
- Modify: `extension/components/SearchBar.tsx`
- Modify: `extension/components/EmptyState.tsx`
- Modify: `extension/components/ErrorState.tsx`

- [ ] **Step 1: SearchBar.tsx — 替换 placeholder 和 aria-label**

编辑 `extension/components/SearchBar.tsx`，新增：

```ts
import { useI18n } from '../lib/i18n';
```

在 `SearchBar` 函数组件开头调用：

```tsx
const { t } = useI18n();
```

替换：
- `placeholder="搜索项目..."` → `placeholder={t('searchPlaceholder')}`
- `aria-label="搜索"` → `aria-label={t('searchAriaLabel')}`

- [ ] **Step 2: EmptyState.tsx — 替换硬编码文本**

编辑 `extension/components/EmptyState.tsx`，新增：

```ts
import { useI18n } from '../lib/i18n';
```

在 `EmptyState` 函数组件开头调用 `const { t } = useI18n();`

替换：
- `没有找到匹配的项目` → `{t('noResults')}`
- `尝试调整筛选条件或搜索关键词` → `{t('noResultsHint')}`

- [ ] **Step 3: ErrorState.tsx — 替换硬编码文本，改为调用方传入翻译后文本 OR 内部使用 hook**

ErrorState 有默认值 `title = '出错了'` 和 `message = '请稍后重试'`，以及 `'重试'` 和 `'← 返回首页'` 按钮文本。

最简方案：ErrorState 内部使用 `useI18n`，保持原有接口不变（调用方不需要改）：

```tsx
import { useI18n } from '../lib/i18n';

interface Props {
  title?: string;
  message?: string;
  onBack?: () => void;
  onRetry?: () => void;
}

export default function ErrorState({
  title,
  message,
  onBack,
  onRetry,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">{title || t('errorOccurred')}</p>
      <p className="text-gray-300 text-sm mb-4">{message || t('errorRetryMessage')}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-[#3b82f6] hover:underline mr-3">
          {t('retry')}
        </button>
      )}
      {onBack && (
        <button onClick={onBack} className="text-sm text-[#3b82f6] hover:underline">
          {t('backToHome')}
        </button>
      )}
    </div>
  );
}
```

注意：调用方 `DetailPage` 中 `<ErrorState title="出错了" message={error} .../>` — 现在 `title` 传了硬编码中文，这个需要在 Task 7 中一并改为翻译后的值，或者直接移除参数让 ErrorState 用默认值。当前 step 先改 ErrorState 内部使用 `t()` 和 `||` 逻辑，调用方的硬编码可以后续处理。

- [ ] **Step 4: 构建验证**

```bash
cd extension && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add extension/components/SearchBar.tsx extension/components/EmptyState.tsx extension/components/ErrorState.tsx
git commit -m "feat: SearchBar/EmptyState/ErrorState i18n 迁移"
```

---

### Task 5: 迁移 RepoCard、RepoHeader、ReadmeViewer 组件

**Files:**
- Modify: `extension/components/RepoCard.tsx`
- Modify: `extension/components/RepoHeader.tsx`
- Modify: `extension/components/ReadmeViewer.tsx`

- [ ] **Step 1: RepoCard.tsx — 替换文本**

编辑 `extension/components/RepoCard.tsx`，新增：

```ts
import { useI18n } from '../lib/i18n';
```

在 `RepoCard` 开头调用 `const { t } = useI18n();`

替换：
- `{repo.description || '暂无描述'}` → `{repo.description || t('noDescription')}`
- `'★ 已收藏'` → `t('favorited')`
- `'☆ 收藏'` → `t('favorite')`

- [ ] **Step 2: RepoHeader.tsx — 替换文本**

编辑 `extension/components/RepoHeader.tsx`，新增：

```ts
import { useI18n } from '../lib/i18n';
```

在 `RepoHeader` 开头调用 `const { t } = useI18n();`

替换：
- `← 返回` → `{t('back')}`
- `🔗 打开` → `{t('openOnGitHub')}`
- `'★ 已收藏'` → `t('favorited')`
- `'☆ 收藏'` → `t('favorite')`
- `{repo.description || '暂无描述'}` → `{repo.description || t('noDescription')}`

- [ ] **Step 3: ReadmeViewer.tsx — 替换按钮文本**

编辑 `extension/components/ReadmeViewer.tsx`，新增：

```ts
import { useI18n } from '../lib/i18n';
```

在 `ReadmeViewer` 开头调用 `const { t } = useI18n();`

替换按钮文本：
```tsx
// 之前
展开全部 README（{Math.round(content.length / 1024)}KB，可能较慢）

// 之后
{t('expandReadme').replace('{size}', String(Math.round(content.length / 1024)))}
```

- [ ] **Step 4: 构建验证**

```bash
cd extension && npm run build
```

- [ ] **Step 5: Commit**

```bash
git add extension/components/RepoCard.tsx extension/components/RepoHeader.tsx extension/components/ReadmeViewer.tsx
git commit -m "feat: RepoCard/RepoHeader/ReadmeViewer i18n 迁移"
```

---

### Task 6: 重构错误处理链路（AppError + useStaleCache + popup.tsx）

**Files:**
- Modify: `extension/hooks/useStaleCache.ts`
- Modify: `extension/popup.tsx`

- [ ] **Step 1: useStaleCache.ts — 移除硬编码错误默认值，保留原始错误对象**

编辑 `extension/hooks/useStaleCache.ts`，将 `error` 类型从 `string | null` 改为 `Error | null`：

```ts
import { useState, useEffect } from 'react';
import { getCache, setCache, isFresh } from '../lib/cache';

export function useStaleCache<T>(
  cacheKey: string | null,
  fetcher: () => Promise<T>,
  ttlMs: number,
): { data: T | null; loading: boolean; error: Error | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!cacheKey) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const key = cacheKey;

    async function run() {
      const cached = await getCache<T>(key);
      if (cancelled) return;

      if (cached) {
        setData(cached.data);
        setLoading(false);
        if (isFresh(cached, ttlMs)) return;
      } else {
        setLoading(true);
      }

      try {
        const fresh = await fetcher();
        if (cancelled) return;
        setData(fresh);
        setError(null);
        setCache(key, fresh).catch(() => {});
      } catch (err: unknown) {
        if (cancelled) return;
        if (!cached) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => { cancelled = true; };
  }, [cacheKey, fetcher, ttlMs]);

  return { data, loading, error };
}
```

关键变化：
- `error: string | null` → `error: Error | null`
- `setError(e.message || '加载失败')` → `setError(err instanceof Error ? err : new Error(String(err)))`

- [ ] **Step 2: popup.tsx — 更新错误展示逻辑**

编辑 `extension/popup.tsx`，新增 import：

```ts
import { useI18n } from './lib/i18n';
import { AppError } from './lib/types';
```

**HomePage 错误展示**：将 `{error}` 改为基于 AppError code 翻译：

在 HomePage 中，`const { t } = useI18n();` 然后在错误展示处：

```tsx
{error && (
  <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
    {error instanceof AppError ? t(error.code.toLowerCase()) : error.message}
  </div>
)}
```

注意：`AppError` 的 code 是 `'RATE_LIMIT'`，需要用 `.toLowerCase()` 变为 `'rate_limit'`。但 JSON key 是 `rateLimitError`（camelCase）。需要建立映射或直接用 switch。为简化，直接在 popup.tsx 中写一个内联映射函数：

```tsx
function errorMessage(e: Error, t: (key: string) => string): string {
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

错误展示处改为 `{errorMessage(error, t)}`。

**DetailPage 错误展示**：`DetailPage` 中的 `error` 现在是 `Error | null`（之前是 `string | null`），修改：

```tsx
if (error) {
  return (
    <ErrorState title={t('errorOccurred')} message={errorMessage(error, t)} onBack={() => window.history.back()} />
  );
}
```

`readmeError` 展示也要关联翻译。但 README 错误通常是网络/API 错误，不是 AppError，直接用 `error.message` 即可：

```tsx
{readmeError ? <p className="text-red-500 text-center py-8 text-sm">{readmeError.message}</p> : ...}
```

- [ ] **Step 3: 构建验证**

```bash
cd extension && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add extension/hooks/useStaleCache.ts extension/popup.tsx
git commit -m "feat: 错误处理链路 i18n — AppError 错误码 + useStaleCache 保留 Error 对象"
```

---

### Task 7: 迁移 popup.tsx 中剩余硬编码中文字符串

**Files:**
- Modify: `extension/popup.tsx`

- [ ] **Step 1: HomePage 内文本替换**

在 `HomePage` 前面加 `const { t } = useI18n();`（如果 Task 6 还没加则在此加入）。

替换：
- `{hasToken ? <span className="text-[#16a34a]">Token 已配置</span> : '未配置 Token · 限流 60 次/小时'}` →
  `{hasToken ? <span className="text-[#16a34a]">{t('tokenConfigured')}</span> : t('tokenNotConfigured')}`

- [ ] **Step 2: DetailPage 内文本替换**

在 `DetailPage` 中，`const { t } = useI18n();`

替换：
- `该项目没有 README 文件` → `{t('noReadme')}`

- [ ] **Step 3: FavoritesPage 内文本替换**

在 `FavoritesPage` 中，`const { t } = useI18n();`

替换：
- `暂无收藏项目` → `{t('noFavorites')}`
- `去首页探索优质开源项目吧` → `{t('goDiscover')}`
- `← 返回发现` (空状态中的) → `{t('backToDiscover')}`
- `← 返回发现` (面包屑中的) → `{t('backToDiscover')}`
- `★ 我的收藏 ({favorites.length})` → `{t('myFavorites').replace('{count}', String(favorites.length))}`
- `{failedCount} 个项目加载失败` → `{t('itemsLoadFailed').replace('{n}', String(failedCount))}`
- `重试` (按钮) → `{t('retry')}`

错误状态中 `ErrorState` 的 props：
- `title="加载失败"` → `title={t('loadFailed')}`
- `message="无法获取收藏项目信息"` → `message={t('favoritesLoadFailed')}`

（`favoritesLoadFailed` 已在 Task 1 的 JSON 中定义。）

- [ ] **Step 4: PopupIndex 骨架屏和顶栏文本替换**

在 `PopupIndex` 中，`const { t } = useI18n();`

**tokenReady=false 的骨架屏：**
- `发现优质开源项目` → `{t('discoverProjects')}`
- `★ 收藏` → `{t('navFavorites')}`

**tokenReady=true 的顶栏：**
- `发现优质开源项目` → `{t('discoverProjects')}`
- `★ 收藏` → `{t('navFavorites')}`
- `title="我的收藏"` → `title={t('navFavoritesTitle')}`

- [ ] **Step 5: 构建验证**

```bash
cd extension && npm run build
```

- [ ] **Step 6: Commit**

```bash
git add extension/popup.tsx extension/locales/zh.json extension/locales/en.json
git commit -m "feat: popup.tsx 全量 i18n 迁移"
```

---

### Task 8: 迁移 options.tsx + 语言选择器

**Files:**
- Modify: `extension/options.tsx`

- [ ] **Step 1: 替换所有硬编码文本 + 添加语言选择器**

完整替换后的 `extension/options.tsx`：

```tsx
import { useState, useEffect } from 'react';
import { I18nProvider, useI18n } from './lib/i18n';
import './assets/tailwind.css';

function OptionsForm() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const { t, lang, setLang } = useI18n();

  useEffect(() => {
    chrome.storage.sync.get('githubToken').then(result => {
      if (result.githubToken) {
        setToken(result.githubToken);
        setStatus('success');
      }
    });
  }, []);

  async function handleSave() {
    if (!token.trim()) {
      setStatus('error');
      setMessage(t('tokenEmpty'));
      return;
    }

    setStatus('saving');
    setMessage('');

    try {
      const res = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token.trim()}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) {
        setStatus('error');
        setMessage(t('tokenInvalid'));
        return;
      }

      await chrome.storage.sync.set({ githubToken: token.trim() });
      setStatus('success');
      setMessage(t('tokenSaved'));
    } catch {
      setStatus('error');
      setMessage(t('tokenNetworkError'));
    }
  }

  async function handleClear() {
    await chrome.storage.sync.remove('githubToken');
    setToken('');
    setStatus('idle');
    setMessage(t('tokenCleared'));
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-bold text-[#1e1b4b] mb-6">{t('configTitle')}</h1>

      {/* 语言选择器 */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('languageLabel')}
        </label>
        <select
          value={lang}
          onChange={e => setLang(e.target.value as 'zh' | 'en')}
          className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-1">
            GitHub Personal Access Token
          </label>
          <input
            id="token"
            type="password"
            value={token}
            onChange={e => { setToken(e.target.value); setStatus('idle'); setMessage(''); }}
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
            className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            {t('createTokenAt')}{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#3b82f6] hover:underline"
            >
              github.com/settings/tokens
            </a>{' '}
            {t('createTokenHint')}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="px-4 py-2 bg-[#3b82f6] text-white text-sm rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50"
          >
            {status === 'saving' ? t('verifying') : t('save')}
          </button>
          {token && (
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-[#e5e7eb] text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              {t('clear')}
            </button>
          )}
        </div>

        {message && (
          <div
            className={`text-sm p-3 rounded-lg ${
              status === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
              status === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
              'bg-gray-50 text-gray-600'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

export default function OptionsIndex() {
  return (
    <I18nProvider>
      <OptionsForm />
    </I18nProvider>
  );
}
```

关键重构：把 options 组件拆为 `OptionsForm`（内部使用 hook）+ `OptionsIndex`（包裹 Provider）。原 `OptionsIndex` 直接使用 hook 但是本身不被 Provider 包裹，会报错。拆分为两层解决。

- [ ] **Step 2: 构建验证**

```bash
cd extension && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add extension/options.tsx
git commit -m "feat: options.tsx i18n 迁移 + 语言选择器"
```

---

### Task 9: 迁移 github-sidebar.tsx 中硬编码中文字符串

**Files:**
- Modify: `extension/contents/github-sidebar.tsx`

- [ ] **Step 1: SidebarPanel 中使用 useI18n 替换文本**

编辑 `extension/contents/github-sidebar.tsx`，新增 import：

```ts
import { useI18n } from '../lib/i18n';
```

在 `SidebarPanel` 函数开头调用 `const { t } = useI18n();`

替换：
- `GitStar · 同类热门` → `{t('sidebarTitle')}`
- `加载中...` → `{t('sidebarLoading')}`
- `暂无推荐` → `{t('sidebarEmpty')}`
- `{repo.description || '暂无描述'}` → `{repo.description || t('noDescription')}`

- [ ] **Step 2: 构建验证**

```bash
cd extension && npm run build
```

- [ ] **Step 3: Commit**

```bash
git add extension/contents/github-sidebar.tsx
git commit -m "feat: github-sidebar i18n 迁移"
```

---

### Task 10: 构建验证 + 手工测试

**Files:** 无新建/修改

- [ ] **Step 1: 生产构建，确认无类型错误和打包错误**

```bash
cd extension && npm run build
```

预期：构建成功，输出在 `build/chrome-mv3-prod/`，无 TypeScript 错误，无 Parcel 打包错误。

- [ ] **Step 2: 加载扩展到 Chrome 并测试**

1. Chrome 打开 `chrome://extensions/` → 加载 `extension/build/chrome-mv3-prod/`
2. 测试 popup：打开 popup → 确认默认中文显示正常 → 展开筛选/搜索/翻页 → 进入详情 → 进入收藏
3. 测试 Options：打开 Options 页 → 切换语言到 English → 所有文本变英文
4. 测试语言同步：Options 切换语言后 → 重新打开 popup → 确认语言与 Options 一致
5. 测试 Sidebar：打开 GitHub 仓库页 → 确认 Sidebar 语言与 popup 一致
6. 测试 fallback：切换回中文 → 所有文本恢复正常

- [ ] **Step 3: Commit（如有遗漏修复）**

```bash
git add -A
git commit -m "chore: i18n 构建验证通过"
```

---

### 文件改动总览

| 文件 | 操作 | 说明 |
|------|------|------|
| `extension/locales/zh.json` | **Create** | 中文翻译字典 |
| `extension/locales/en.json` | **Create** | 英文翻译字典 |
| `extension/lib/i18n.ts` | **Create** | I18nProvider + useI18n hook |
| `extension/lib/types.ts` | Modify | 追加 AppError 类 |
| `extension/popup.tsx` | Modify | 包裹 Provider + 替换 20 处文本 + 错误码映射 |
| `extension/options.tsx` | Modify | 包裹 Provider + 语言选择器 + 拆分为两层 + 替换 10 处文本 |
| `extension/contents/github-sidebar.tsx` | Modify | 包裹 Provider + 替换 4 处文本 |
| `extension/components/FilterBar.tsx` | Modify | 替换 9 处文本 |
| `extension/components/SearchBar.tsx` | Modify | 替换 2 处文本 |
| `extension/components/EmptyState.tsx` | Modify | 替换 2 处文本 |
| `extension/components/ErrorState.tsx` | Modify | 替换 4 处文本 |
| `extension/components/RepoCard.tsx` | Modify | 替换 3 处文本 |
| `extension/components/RepoHeader.tsx` | Modify | 替换 5 处文本 |
| `extension/components/ReadmeViewer.tsx` | Modify | 替换 1 处文本 |
| `extension/hooks/useStaleCache.ts` | Modify | error 类型改为 `Error \| null` |
