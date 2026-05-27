# GitStar 浏览器扩展 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 GitStar Next.js 应用改造为 Plasmo 浏览器扩展，三个入口（Popup / Content Script / Options），零部署。

**Architecture:** Plasmo + React 18 + TypeScript + Tailwind CSS。`lib/github.ts` 直接调 GitHub API（`atob` 替代 `Buffer`，`cachedToken` 替代 `process.env`）。Popup 用 wouter hash 路由实现列表/详情视图切换。Content Script 通过 MutationObserver 注入 GitHub 页面右侧栏。Token 和收藏通过 `chrome.storage` 管理，`chrome.storage.onChanged` 跨模块同步。

**Tech Stack:** Plasmo, React 18, TypeScript, Tailwind CSS 3, wouter, react-markdown, remark-gfm

---

### Task 1: 初始化 Plasmo 项目

**Files:**
- Create: `extension/` （整个目录由 `npm create plasmo` 生成）

- [ ] **Step 1: 用 Plasmo 脚手架初始化项目**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
mkdir extension
cd extension
npm create plasmo@latest . -- --template react-ts
```

按提示确认（Yes to all defaults）。这会在 `extension/` 下生成 `package.json`、`tsconfig.json`、`popup/index.tsx`、`options/index.tsx`、`contents/` 等基础文件。

- [ ] **Step 2: 安装依赖**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething/extension
npm install react-markdown remark-gfm wouter
npm install -D tailwindcss autoprefixer postcss @types/react @types/react-dom
npx tailwindcss init -p
```

- [ ] **Step 3: 配置 Tailwind**

编辑 `extension/tailwind.config.js`（或 .ts），设置 content 路径：

```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./popup/**/*.{ts,tsx}",
    "./contents/**/*.{ts,tsx}",
    "./options/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

创建 `extension/assets/tailwind.css`：

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

在 `extension/popup/index.tsx` 顶部添加 `import "../assets/tailwind.css";`。

- [ ] **Step 4: 验证项目能构建**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething/extension
npm run build
```

预期：构建成功，输出在 `extension/build/` 目录。

- [ ] **Step 5: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/package.json extension/package-lock.json extension/tsconfig.json \
  extension/tailwind.config.js extension/postcss.config.js extension/assets/tailwind.css \
  extension/popup/ extension/options/ extension/.gitignore
git commit -m "chore: init Plasmo extension project with Tailwind"
```

---

### Task 2: 迁移类型定义

**Files:**
- Create: `extension/lib/types.ts`

- [ ] **Step 1: 复制 types.ts（无需修改）**

`extension/lib/types.ts` 内容直接复制自 `src/lib/types.ts`，不需要任何改动（纯类型定义，无运行时依赖）：

```typescript
export interface Repo {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string | null;
  license: { name: string } | null;
  owner_avatar: string;
  topics: string[];
  updated_at: string;
}

export interface RepoDetail extends Repo {
  readme: string;
  default_branch: string;
}

export interface SearchParams {
  q?: string;
  language?: string;
  sort?: 'stars' | 'forks' | 'updated';
  order?: 'desc' | 'asc';
  page?: number;
  per_page?: number;
  created?: string;
}

export interface SearchResponse {
  items: Repo[];
  total_count: number;
}

export interface ApiError {
  status: number;
  message: string;
}
```

- [ ] **Step 2: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/lib/types.ts
git commit -m "feat: add types for extension"
```

---

### Task 3: 迁移并适配 lib/github.ts

**Files:**
- Create: `extension/lib/github.ts`
- Reference: `src/lib/github.ts`

- [ ] **Step 1: 创建浏览器兼容版 github.ts**

`extension/lib/github.ts`：

```typescript
import { Repo, RepoDetail, SearchParams, SearchResponse } from './types';

const GITHUB_API = 'https://api.github.com';

let cachedToken: string | null = null;

export function setToken(token: string | null): void {
  cachedToken = token;
}

export function getToken(): string | null {
  return cachedToken;
}

// 初始化时从 chrome.storage.sync 加载 token
export async function loadToken(): Promise<void> {
  try {
    const result = await chrome.storage.sync.get('githubToken');
    cachedToken = result.githubToken || null;
  } catch {
    cachedToken = null;
  }
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (cachedToken) {
    h.Authorization = `Bearer ${cachedToken}`;
  }
  return h;
}

const VALID_OWNER_REPO = /^[a-zA-Z0-9._-]+$/;

function buildSearchQuery(params: SearchParams): string {
  const parts: string[] = [];
  if (params.q) parts.push(params.q);
  if (params.language) parts.push(`language:"${params.language}"`);
  if (params.created && /^>\d{4}-\d{2}-\d{2}$/.test(params.created)) parts.push(`created:${params.created}`);
  parts.push('stars:>100');
  return parts.join(' ');
}

export async function searchRepos(params: SearchParams): Promise<SearchResponse> {
  const query = buildSearchQuery(params);
  const sort = params.sort || 'stars';
  const order = params.order || 'desc';
  const per_page = Math.min(params.per_page || 30, 50);
  const page = Math.min(params.page || 1, 34);

  const qs = new URLSearchParams({ q: query, sort, order, per_page: String(per_page), page: String(page) });

  const res = await fetch(`${GITHUB_API}/search/repositories?${qs}`, { headers: headers() });

  if (!res.ok) {
    if (res.status === 403) throw Object.assign(new Error('Rate limited by GitHub'), { status: 403 });
    if (res.status === 422) throw Object.assign(new Error('Invalid search query'), { status: 422 });
    throw Object.assign(new Error('GitHub API error'), { status: res.status });
  }

  const raw = await res.json();
  const items: Repo[] = raw.items.map((item: Record<string, unknown>) => ({
    id: item.id as number,
    owner: (item.owner as Record<string, string>).login,
    name: item.name as string,
    full_name: item.full_name as string,
    description: item.description as string | null,
    html_url: item.html_url as string,
    stargazers_count: item.stargazers_count as number,
    forks_count: item.forks_count as number,
    watchers_count: item.watchers_count as number,
    language: item.language as string | null,
    license: item.license as { name: string } | null,
    owner_avatar: (item.owner as Record<string, string>).avatar_url,
    topics: item.topics as string[],
    updated_at: item.updated_at as string,
  }));

  return { items, total_count: raw.total_count as number };
}

export async function getRepoDetail(owner: string, repo: string): Promise<RepoDetail> {
  if (!VALID_OWNER_REPO.test(owner) || !VALID_OWNER_REPO.test(repo)) {
    throw Object.assign(new Error('Invalid owner or repo name'), { status: 400 });
  }

  const [repoRes, readmeRes] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: headers() }),
    fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, { headers: headers() }),
  ]);

  if (!repoRes.ok) {
    if (repoRes.status === 404) throw Object.assign(new Error('Repository not found'), { status: 404 });
    throw Object.assign(new Error('GitHub API error'), { status: repoRes.status });
  }

  const raw = await repoRes.json() as Record<string, unknown>;
  let readme = '';
  if (readmeRes.ok) {
    const readmeRaw = await readmeRes.json() as Record<string, unknown>;
    readme = atob(readmeRaw.content as string);
  }

  return {
    id: raw.id as number,
    owner: (raw.owner as Record<string, string>).login,
    name: raw.name as string,
    full_name: raw.full_name as string,
    description: raw.description as string | null,
    html_url: raw.html_url as string,
    stargazers_count: raw.stargazers_count as number,
    forks_count: raw.forks_count as number,
    watchers_count: raw.watchers_count as number,
    language: raw.language as string | null,
    license: raw.license as { name: string } | null,
    owner_avatar: (raw.owner as Record<string, string>).avatar_url,
    topics: raw.topics as string[],
    updated_at: raw.updated_at as string,
    readme,
    default_branch: raw.default_branch as string,
  };
}
```

关键改动 vs 原版：
- `process.env.GITHUB_TOKEN` → 模块变量 `cachedToken` + `loadToken()` / `setToken()`
- `Buffer.from(content, 'base64').toString('utf-8')` → `atob(content)`
- 删除服务端内存 `Map` 缓存
- 新增 `loadToken()` 从 `chrome.storage.sync` 初始化

- [ ] **Step 2: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/lib/github.ts
git commit -m "feat: add browser-compatible github.ts for extension"
```

---

### Task 4: 迁移 hooks

**Files:**
- Create: `extension/hooks/useDebounce.ts`
- Create: `extension/hooks/useFavorites.ts`

- [ ] **Step 1: 复制 useDebounce（仅移除 `'use client'`）**

`extension/hooks/useDebounce.ts`：

```typescript
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
```

- [ ] **Step 2: 改造 useFavorites（localStorage → chrome.storage.local）**

`extension/hooks/useFavorites.ts`：

```typescript
import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'gitstar-favorites';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[] | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    chrome.storage.local.get(STORAGE_KEY).then(result => {
      setFavorites(result[STORAGE_KEY] || []);
      setLoaded(true);
    }).catch(() => {
      setFavorites([]);
      setLoaded(true);
    });

    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes[STORAGE_KEY]) {
        setFavorites(changes[STORAGE_KEY].newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  useEffect(() => {
    if (loaded && favorites !== null) {
      chrome.storage.local.set({ [STORAGE_KEY]: favorites });
    }
  }, [favorites, loaded]);

  const toggle = useCallback(async (fullName: string) => {
    setFavorites(prev =>
      (prev || []).includes(fullName)
        ? (prev || []).filter(f => f !== fullName)
        : [...(prev || []), fullName]
    );
  }, []);

  const isFavorite = useCallback(
    (fullName: string) => (favorites || []).includes(fullName),
    [favorites]
  );

  return { favorites, toggle, isFavorite, loaded };
}
```

接口变更：
- `favorites: string[] | null`（null = 尚未加载完成）
- `toggle` 返回 `Promise<void>`（为后续扩展预留，当前同步 setState）
- `loaded` 和 `favorites` 非 null 才是可用状态

- [ ] **Step 3: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/hooks/useDebounce.ts extension/hooks/useFavorites.ts
git commit -m "feat: migrate hooks to extension (chrome.storage for favorites)"
```

---

### Task 5: 迁移简单组件（LoadingBar / EmptyState / ErrorState）

**Files:**
- Create: `extension/components/LoadingBar.tsx`
- Create: `extension/components/EmptyState.tsx`
- Create: `extension/components/ErrorState.tsx`

- [ ] **Step 1: 迁移 LoadingBar（仅移除 `'use client'`）**

`extension/components/LoadingBar.tsx`：

```typescript
interface Props {
  loading: boolean;
}

export default function LoadingBar({ loading }: Props) {
  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden">
      <div className="h-full w-1/3 bg-[#6366f1] animate-[loadingBar_1.2s_ease-in-out_infinite]" />
    </div>
  );
}
```

- [ ] **Step 2: 迁移 EmptyState（无改动）**

`extension/components/EmptyState.tsx`，内容同 `src/components/EmptyState.tsx`。

- [ ] **Step 3: 迁移 ErrorState（next/link → `<a>`）**

`extension/components/ErrorState.tsx`：

```typescript
interface Props {
  title?: string;
  message?: string;
  onBack?: () => void;  // 新增：popup 内返回回调
}

export default function ErrorState({
  title = '出错了',
  message = '请稍后重试',
  onBack,
}: Props) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">{title}</p>
      <p className="text-gray-300 text-sm mb-4">{message}</p>
      {onBack && (
        <button onClick={onBack} className="text-sm text-[#4f46e5] hover:underline">
          ← 返回首页
        </button>
      )}
    </div>
  );
}
```

改动：`next/link` 的 `<Link href="/">` 替换为 `<button onClick={onBack}>`，因为 popup 内使用 wouter 路由导航。

- [ ] **Step 4: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/components/LoadingBar.tsx extension/components/EmptyState.tsx extension/components/ErrorState.tsx
git commit -m "feat: migrate simple components to extension"
```

---

### Task 6: 迁移 SearchBar / FilterBar

**Files:**
- Create: `extension/components/SearchBar.tsx`
- Create: `extension/components/FilterBar.tsx`

- [ ] **Step 1: 迁移 SearchBar**

`extension/components/SearchBar.tsx` — 从 `src/components/SearchBar.tsx` 复制，仅改动：
- 移除第 1 行 `'use client';`
- 第 3 行 `import { useDebounce } from '@/hooks/useDebounce'` → `import { useDebounce } from '../hooks/useDebounce'`

```typescript
import { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  const [input, setInput] = useState(value);
  const debounced = useDebounce(input, 300);

  useEffect(() => {
    onChange(debounced);
  }, [debounced]);

  return (
    <div className="relative">
      <input
        type="search"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="搜索项目名称、描述..."
        className="w-full px-4 py-2.5 pl-10 border border-[#e5e7eb] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent text-sm"
      />
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: 迁移 FilterBar**

`extension/components/FilterBar.tsx` — 从 `src/components/FilterBar.tsx` 复制，仅移除第 1 行 `'use client';`。无需删 `useMemo`（它是 React 标准 API）。完整内容与源文件一致。

- [ ] **Step 3: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/components/SearchBar.tsx extension/components/FilterBar.tsx
git commit -m "feat: migrate SearchBar and FilterBar to extension"
```

---

### Task 7: 迁移 RepoCard / RepoList

**Files:**
- Create: `extension/components/RepoCard.tsx`
- Create: `extension/components/RepoList.tsx`

- [ ] **Step 1: 迁移 RepoCard（next/link → wouter Link）**

`extension/components/RepoCard.tsx`：

```typescript
import { Link } from 'wouter';
import { Repo } from '../lib/types';

interface Props {
  repo: Repo;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
}

export default function RepoCard({ repo, isFavorite, onToggleFavorite }: Props) {
  return (
    <div className="border border-[#f3f4f6] rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow flex gap-3 items-start">
      <img src={repo.owner_avatar} alt={repo.owner} className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <Link
          href={`/project/${repo.full_name}`}
          className="text-sm font-semibold text-[#4f46e5] hover:underline cursor-pointer"
        >
          {repo.full_name}
        </Link>
        <p className="text-xs text-[#6b7280] mt-0.5 line-clamp-2">{repo.description || '暂无描述'}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-[#9ca3af]">
          <span>⭐ {repo.stargazers_count.toLocaleString()}</span>
          {repo.language && <span>🔤 {repo.language}</span>}
          {repo.license && <span>📄 {repo.license.name}</span>}
        </div>
      </div>
      <button
        onClick={() => onToggleFavorite(repo.full_name)}
        className={`flex-shrink-0 text-lg leading-none mt-0.5 transition-colors ${isFavorite ? 'text-[#6366f1]' : 'text-[#e5e7eb] hover:text-[#6366f1]'}`}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
  );
}
```

改动：
- `import Link from 'next/link'` → `import { Link } from 'wouter'`
- `import { Repo } from '@/lib/types'` → `import { Repo } from '../lib/types'`
- `'use client'` 移除

- [ ] **Step 2: 迁移 RepoList**

`extension/components/RepoList.tsx` — 从 `src/components/RepoList.tsx` 复制，改动 import 路径：

```typescript
import { Repo } from '../lib/types';
import RepoCard from './RepoCard';
import EmptyState from './EmptyState';

interface Props {
  repos: Repo[];
  favorites: string[] | null;  // null = 尚未加载
  onToggleFavorite: (fullName: string) => void;
  loaded: boolean;
}

export default function RepoList({ repos, favorites, onToggleFavorite, loaded }: Props) {
  if (!loaded) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white animate-pulse">
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (repos.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {repos.map(repo => (
        <RepoCard
          key={repo.id}
          repo={repo}
          isFavorite={(favorites || []).includes(repo.full_name)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/components/RepoCard.tsx extension/components/RepoList.tsx
git commit -m "feat: migrate RepoCard and RepoList to extension"
```

---

### Task 8: 迁移 RepoHeader / ReadmeViewer / Pagination

**Files:**
- Create: `extension/components/RepoHeader.tsx`
- Create: `extension/components/ReadmeViewer.tsx`
- Create: `extension/components/Pagination.tsx`

- [ ] **Step 1: 迁移 RepoHeader**

`extension/components/RepoHeader.tsx`，改动与 RepoCard 一致（`next/link` → `wouter`）：

```typescript
import { Link } from 'wouter';
import { RepoDetail } from '../lib/types';

interface Props {
  repo: RepoDetail;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
}

export default function RepoHeader({ repo, isFavorite, onToggleFavorite }: Props) {
  return (
    <div>
      <nav className="flex items-center gap-1.5 text-xs mb-4 pb-3 border-b border-[#f3f4f6]">
        <Link href="/" className="text-[#4f46e5] hover:underline cursor-pointer">← 首页</Link>
        <span className="text-[#9ca3af]">/</span>
        <span className="text-[#1e1b4b] font-semibold">{repo.owner}</span>
        <span className="text-[#9ca3af]">/</span>
        <span className="text-[#1e1b4b] font-semibold">{repo.name}</span>
      </nav>
      <div className="flex gap-4 items-start">
        <img src={repo.owner_avatar} alt={repo.owner} className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#1e1b4b]">{repo.full_name}</h1>
          <p className="text-sm text-[#6b7280] mt-1">{repo.description || '暂无描述'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
            <span>⭐ <strong>{repo.stargazers_count.toLocaleString()}</strong></span>
            <span>🍴 <strong>{repo.forks_count.toLocaleString()}</strong></span>
            <span>👀 <strong>{repo.watchers_count.toLocaleString()}</strong></span>
            {repo.language && <span>🔤 {repo.language}</span>}
            {repo.license && <span>📄 {repo.license.name}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#6366f1] text-white text-sm rounded-lg hover:bg-[#4f46e5] transition-colors"
            >
              ⭐ Star
            </a>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-1.5 border border-[#e5e7eb] text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              🔗 打开 GitHub
            </a>
            <button
              onClick={() => onToggleFavorite(repo.full_name)}
              className={`inline-flex items-center gap-1 px-4 py-1.5 border text-sm rounded-lg transition-colors ${isFavorite ? 'border-[#6366f1] bg-[#eef2ff] text-[#4338ca]' : 'border-[#e5e7eb] hover:bg-gray-50'}`}
            >
              {isFavorite ? '★ 已收藏' : '☆ 收藏'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 迁移 ReadmeViewer（无改动，仅去掉 `'use client'`）**

`extension/components/ReadmeViewer.tsx`，内容同 `src/components/ReadmeViewer.tsx`（它没有 `'use client'` 也不需要改动）。

- [ ] **Step 3: 迁移 Pagination（无改动，仅去掉 `'use client'`）**

`extension/components/Pagination.tsx`，内容同 `src/components/Pagination.tsx`。

- [ ] **Step 4: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/components/RepoHeader.tsx extension/components/ReadmeViewer.tsx extension/components/Pagination.tsx
git commit -m "feat: migrate RepoHeader, ReadmeViewer, Pagination to extension"
```

---

### Task 9: 构建 Popup — 首页（列表视图）

**Files:**
- Modify: `extension/popup/index.tsx`

- [ ] **Step 1: 实现 Popup 首页（wouter 路由 + 列表 + 详情）**

`extension/popup/index.tsx`：

```typescript
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Route, useLocation } from 'wouter';
import { Repo, SearchParams } from '../lib/types';
import { searchRepos, loadToken } from '../lib/github';
import { useFavorites } from '../hooks/useFavorites';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import RepoList from '../components/RepoList';
import Pagination from '../components/Pagination';
import LoadingBar from '../components/LoadingBar';
import '../assets/tailwind.css';

function HomePage() {
  const [, setLocation] = useLocation();

  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [sort, setSort] = useState('stars');
  const [page, setPage] = useState(1);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { favorites, toggle: toggleFavorite, loaded: favLoaded } = useFavorites();

  const totalPages = Math.min(Math.ceil(total / 30), 34);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: SearchParams = { sort: sort as SearchParams['sort'], order: 'desc', page, per_page: 30 };
      if (search) params.q = search;
      if (language) params.language = language;
      if (timeRange) params.created = timeRange;

      const data = await searchRepos(params);
      setRepos(data.items);
      setTotal(data.total_count);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e.status === 403) {
        setError('GitHub API 限流。请前往 Options 页配置 Personal Access Token');
      } else {
        setError(e.message || '加载失败');
      }
    } finally {
      setLoading(false);
    }
  }, [search, language, timeRange, sort, page]);

  useEffect(() => {
    fetchRepos();
  }, [fetchRepos]);

  return (
    <div className="w-[400px] min-h-[500px] p-4 bg-white">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-bold text-[#1e1b4b]">⭐ GitStar</h1>
        </div>
        <LoadingBar loading={loading} />
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} />
        <FilterBar
          language={language} onLanguageChange={v => { setLanguage(v); setPage(1); }}
          timeRange={timeRange} onTimeRangeChange={v => { setTimeRange(v); setPage(1); }}
          sort={sort} onSortChange={v => { setSort(v); setPage(1); }}
        />
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
            {error}
          </div>
        )}
        <RepoList repos={repos} favorites={favorites} onToggleFavorite={toggleFavorite} loaded={!loading && favLoaded} />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}

function DetailPage({ owner, repo }: { owner: string; repo: string }) {
  ... // 在 Task 10 中实现
}

export default function PopupIndex() {
  useEffect(() => {
    loadToken();
    // 监听 Token 变更
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.githubToken) {
        import('../lib/github').then(m => m.setToken(changes.githubToken.newValue || null));
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return (
    <Route path="/" component={HomePage} />
  );
}
```

- [ ] **Step 2: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/popup/index.tsx
git commit -m "feat: add popup homepage with search, filters, and repo list"
```

---

### Task 10: 构建 Popup 详情页 + 完整路由

**Files:**
- Modify: `extension/popup/index.tsx`

- [ ] **Step 1: 添加 DetailPage 组件 + 路由**

在 `extension/popup/index.tsx` 的 `DetailPage` 函数中填入实现，并在 `PopupIndex` 中添加路由：

```typescript
// 在 HomePage 之后添加 DetailPage
function DetailPage({ params }: { params: { owner: string; repo: string } }) {
  const [, setLocation] = useLocation();
  const { owner, repo } = params;
  const [detail, setDetail] = useState<import('../lib/types').RepoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { favorites, toggle: toggleFavorite, loaded } = useFavorites();

  useEffect(() => {
    import('../lib/github').then(m => {
      m.getRepoDetail(owner, repo)
        .then(data => {
          setDetail(data);
          document.title = `${data.full_name} - GitStar`;
        })
        .catch((err: { message?: string; status?: number }) => {
          if (err.status === 404) setError('仓库不存在');
          else setError(err.message || '加载失败');
        });
    });
  }, [owner, repo]);

  if (error) {
    return (
      <div className="w-[400px] min-h-[500px] p-4 bg-white">
        <ErrorState title="出错了" message={error} onBack={() => window.history.back()} />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="w-[400px] min-h-[500px] p-4 bg-white">
        <LoadingBar loading={true} />
        <div className="animate-pulse space-y-4 mt-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-[400px] min-h-[500px] p-4 bg-white">
      <RepoHeader
        repo={detail}
        isFavorite={loaded && (favorites || []).includes(detail.full_name)}
        onToggleFavorite={toggleFavorite}
      />
      <div className="mt-4">
        {detail.readme ? (
          <ReadmeViewer content={detail.readme} />
        ) : (
          <p className="text-gray-400 text-center py-8 text-sm">该项目没有 README 文件</p>
        )}
      </div>
    </div>
  );
}

// 更新 PopupIndex 添加两个路由
export default function PopupIndex() {
  useEffect(() => {
    loadToken();
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.githubToken) {
        import('../lib/github').then(m => m.setToken(changes.githubToken.newValue || null));
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return (
    <>
      <Route path="/" component={HomePage} />
      <Route path="/project/:owner/:repo">
        {(params) => <DetailPage params={params} />}
      </Route>
    </>
  );
}
```

需要在文件顶部添加 `import { RepoDetail } from '../lib/types';` 和 `import RepoHeader from '../components/RepoHeader';`、`import ReadmeViewer from '../components/ReadmeViewer';`、`import ErrorState from '../components/ErrorState';`。

完整 `PopupIndex` 整合导入已在 Task 9-10 中给出，确保所有导入完整。

- [ ] **Step 2: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/popup/index.tsx
git commit -m "feat: add popup detail page with wouter routing"
```

---

### Task 11: 构建 Options 页（Token 配置）

**Files:**
- Modify: `extension/options/index.tsx`

- [ ] **Step 1: 实现 Options 页**

`extension/options/index.tsx`：

```typescript
import { useState, useEffect } from 'react';
import '../assets/tailwind.css';

export default function OptionsIndex() {
  const [token, setToken] = useState('');
  const [status, setStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

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
      setMessage('Token 不能为空');
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
        setMessage('Token 无效，请检查后重试');
        return;
      }

      await chrome.storage.sync.set({ githubToken: token.trim() });
      setStatus('success');
      setMessage('Token 验证成功，已保存');
    } catch {
      setStatus('error');
      setMessage('网络错误，请检查网络连接');
    }
  }

  async function handleClear() {
    await chrome.storage.sync.remove('githubToken');
    setToken('');
    setStatus('idle');
    setMessage('Token 已清除');
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <h1 className="text-xl font-bold text-[#1e1b4b] mb-6">GitStar 配置</h1>

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
            className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#6366f1] focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1">
            在{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#4f46e5] hover:underline"
            >
              github.com/settings/tokens
            </a>{' '}
            创建，只需勾选 <code className="bg-gray-100 px-1 rounded">public_repo</code> 权限
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={status === 'saving'}
            className="px-4 py-2 bg-[#6366f1] text-white text-sm rounded-lg hover:bg-[#4f46e5] transition-colors disabled:opacity-50"
          >
            {status === 'saving' ? '验证中...' : '保存'}
          </button>
          {token && (
            <button
              onClick={handleClear}
              className="px-4 py-2 border border-[#e5e7eb] text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              清除
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
            {status === 'success' ? '✅ ' : status === 'error' ? '❌ ' : ''}
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/options/index.tsx
git commit -m "feat: add Token configuration options page"
```

---

### Task 12: 构建 Content Script（GitHub 注入面板）

**Files:**
- Create: `extension/contents/github-sidebar.tsx`

- [ ] **Step 1: 实现 Content Script**

`extension/contents/github-sidebar.tsx`：

```typescript
import type { PlasmoCSConfig } from 'plasmo';
import { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { searchRepos, getRepoDetail, loadToken, setToken } from '../lib/github';
import { useFavorites } from '../hooks/useFavorites';
import type { Repo } from '../lib/types';

export const config: PlasmoCSConfig = {
  matches: ['https://github.com/*'],
  run_at: 'document_idle',
};

// 监听 Token 变更
chrome.storage.onChanged.addListener((changes) => {
  if (changes.githubToken) {
    setToken(changes.githubToken.newValue || null);
  }
});

// Content Script 使用内联样式（不引入 tailwind.css，避免污染 GitHub 页面）
function SidebarPanel() {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('gitstar-sidebar-collapsed') === 'true'; }
    catch { return false; }
  });
  const { favorites, toggle: toggleFavorite, loaded: favLoaded } = useFavorites();

  useEffect(() => {
    loadToken().then(() => loadRecommendations());
  }, []);

  async function loadRecommendations() {
    setLoading(true);
    try {
      const path = window.location.pathname;
      const match = path.match(/^\/([^/]+)\/([^/]+)/);
      if (match && match[1] && match[2] && !['search', 'explore', 'settings', 'notifications'].includes(match[1])) {
        const [, owner, repo] = match;
        const detail = await getRepoDetail(owner, repo);
        const lang = detail.language;
        if (lang) {
          const result = await searchRepos({ q: lang, sort: 'stars', per_page: 6 });
          setRepos(result.items.filter(r => r.full_name !== `${owner}/${repo}`).slice(0, 5));
        } else {
          const result = await searchRepos({ sort: 'stars', per_page: 5 });
          setRepos(result.items);
        }
      } else {
        const result = await searchRepos({ sort: 'stars', per_page: 5 });
        setRepos(result.items);
      }
    } catch {
      // 静默失败，不影响 GitHub 页面
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    localStorage.setItem('gitstar-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  if (collapsed) {
    return (
      <div style={{
        position: 'fixed', right: '16px', top: '80px', zIndex: 9999,
        background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px',
        padding: '8px 12px', cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        fontSize: '12px',
      }} onClick={() => setCollapsed(false)}>
        ⭐ GitStar
      </div>
    );
  }

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '12px',
    }}>
      <div style={{
        background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px',
        overflow: 'hidden', marginBottom: '16px',
      }}>
        <div style={{
          background: '#3b82f6', color: 'white', padding: '6px 10px',
          fontWeight: 600, display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <span>⭐ GitStar · 同类热门</span>
          <span onClick={() => setCollapsed(true)} style={{ cursor: 'pointer', opacity: 0.7, fontSize: '14px' }}>−</span>
        </div>
        <div style={{ padding: '8px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '12px' }}>加载中...</div>
          ) : repos.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '12px' }}>暂无推荐</div>
          ) : (
            repos.map(repo => (
              <div
                key={repo.id}
                style={{
                  padding: '6px 8px', background: 'white', borderRadius: '4px',
                  border: '1px solid #f0f0f0', marginBottom: '6px',
                }}
              >
                <a
                  href={repo.html_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', color: 'inherit' }}
                >
                  <div style={{ fontWeight: 600, fontSize: '11px' }}>{repo.full_name}</div>
                  <div style={{ fontSize: '10px', color: '#666', margin: '2px 0' }}>
                    {repo.description || '暂无描述'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#f59e0b' }}>
                    ★ {repo.stargazers_count.toLocaleString()}
                    {favLoaded && (
                      <span
                        onClick={(e) => { e.preventDefault(); toggleFavorite(repo.full_name); }}
                        style={{ marginLeft: '8px', cursor: 'pointer', color: (favorites || []).includes(repo.full_name) ? '#6366f1' : '#e5e7eb' }}
                      >
                        {(favorites || []).includes(repo.full_name) ? '★' : '☆'}
                      </span>
                    )}
                  </div>
                </a>
              </div>
            ))
          )}
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '10px' }}>
            <span
              onClick={() => {
                try { chrome.action.openPopup(); } catch { /* fallback */ }
              }}
              style={{ color: '#3b82f6', cursor: 'pointer' }}
            >
              在 Popup 中打开 →
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// 不 export default 组件，手动管理 DOM 挂载
function mountPanel() {
  const selectors = [
    '#repo-details-container',
    '.Layout-sidebar',
    'aside[aria-label="Repository details"]',
  ];

  function tryMount(): boolean {
    for (const sel of selectors) {
      const target = document.querySelector(sel);
      if (target) {
        const existing = document.getElementById('gitstar-root');
        if (existing) return true; // 已挂载
        const root = document.createElement('div');
        root.id = 'gitstar-root';
        target.insertBefore(root, target.firstChild);
        createRoot(root).render(<SidebarPanel />);
        return true;
      }
    }
    return false;
  }

  if (tryMount()) return;

  const observer = new MutationObserver(() => {
    if (tryMount()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // 10 秒超时 → 浮动面板回退
  setTimeout(() => {
    observer.disconnect();
    if (!document.getElementById('gitstar-root')) {
      const float = document.createElement('div');
      float.id = 'gitstar-root';
      float.style.cssText = 'position:fixed;right:16px;top:80px;z-index:9999;width:220px;';
      document.body.appendChild(float);
      createRoot(float).render(<SidebarPanel />);
    }
  }, 10000);
}

mountPanel();
```

- [ ] **Step 2: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/contents/github-sidebar.tsx
git commit -m "feat: add GitHub content script injection panel"
```

---

### Task 13: 添加扩展图标 + 最终配置

**Files:**
- Create: `extension/assets/icon16.png`
- Create: `extension/assets/icon32.png`
- Create: `extension/assets/icon48.png`
- Create: `extension/assets/icon128.png`

- [ ] **Step 1: 生成占位图标**

使用 Plasmo 默认图标即可。脚手架已生成 `extension/assets/icon.png`，Plasmo 构建时会自动生成各尺寸。若需要自定义，替换该文件。

- [ ] **Step 2: 验证完整构建**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething/extension
npm run build
```

预期：构建成功，输出在 `extension/build/` 目录，包含 `chrome-mv3-prod` 或类似文件夹。

- [ ] **Step 3: 修复构建错误（如有）**

检查构建输出，修复任何缺失 import、类型错误或 Plasmo 配置问题。

- [ ] **Step 4: 本地加载测试**

```bash
# Chrome 中打开 chrome://extensions/
# 开启"开发者模式"
# 点击"加载已解压的扩展程序"
# 选择 extension/build/chrome-mv3-dev 目录
```

验证：
1. 点击工具栏图标 → Popup 弹出，显示搜索框和筛选栏
2. 搜索 "react" → 显示项目列表
3. 点击项目 → 跳转详情页，显示 README
4. 收藏/取消收藏 → 状态正确
5. 右键扩展 → 选项 → 输入 Token → 保存成功
6. 打开 github.com/facebook/react → 右侧出现 GitStar 推荐面板

- [ ] **Step 5: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add extension/assets/icon*.png extension/package.json 2>/dev/null
git add extension/
git commit -m "feat: add extension icons and final configuration"
```

---

### Task 14: 更新 CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: 在 CLAUDE.md 中添加扩展项目说明**

在现有 CLAUDE.md 末尾追加：

```markdown
## Extension

浏览器扩展项目位于 `extension/` 目录，基于 Plasmo 框架。

```bash
cd extension
npm run dev      # 开发（热更新，需手动刷新扩展）
npm run build    # 生产构建
```

构建产物在 `extension/build/`，通过 Chrome `chrome://extensions/` → "加载已解压的扩展程序" 加载。

### Extension Architecture

| 入口 | 文件 | 说明 |
|------|------|------|
| Popup | `popup/index.tsx` | wouter hash 路由，首页列表 + 详情页 |
| Content Script | `contents/github-sidebar.tsx` | GitHub 页面右侧注入推荐面板 |
| Options | `options/index.tsx` | Token 配置 |

数据流：`lib/github.ts` 直接调 GitHub API，Token 和收藏通过 `chrome.storage` 管理。
```

- [ ] **Step 2: 提交**

```bash
cd C:/Users/fuzheng/source/workspace/vibeCoding/doSomething
git add CLAUDE.md
git commit -m "docs: add extension project to CLAUDE.md"
```

---

## Plan Summary

| Task | 内容 | 文件数 |
|------|------|--------|
| 1 | 初始化 Plasmo 项目 + Tailwind | 新建扩展目录 |
| 2 | 迁移 types.ts | 1 |
| 3 | 迁移 github.ts（浏览器兼容） | 1 |
| 4 | 迁移 hooks（useDebounce + useFavorites 异步改造） | 2 |
| 5 | 迁移简单组件（LoadingBar / EmptyState / ErrorState） | 3 |
| 6 | 迁移 SearchBar / FilterBar | 2 |
| 7 | 迁移 RepoCard / RepoList | 2 |
| 8 | 迁移 RepoHeader / ReadmeViewer / Pagination | 3 |
| 9 | 构建 Popup 首页（列表视图 + wouter 路由） | 1 |
| 10 | 构建 Popup 详情页 + 完整路由 | 1（同上文件） |
| 11 | 构建 Options 页（Token 配置） | 1 |
| 12 | 构建 Content Script（GitHub 注入） | 1 |
| 13 | 图标 + 构建验证 + 本地测试 | 4 |
| 14 | 更新 CLAUDE.md | 1 |

**总计：22 个文件，14 个 Task。**
