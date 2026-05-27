# GitStar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a tool website for discovering high-star GitHub projects with filtering, search, detail pages with README preview, and local-storage favorites.

**Architecture:** Next.js App Router with SSG + ISR for the homepage, on-demand ISR for detail pages, and API Routes proxying the GitHub API with server-side caching. Filters live in URL search params; favorites in localStorage.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, react-markdown, remark-gfm

---

## File Structure

```
src/
├── app/
│   ├── globals.css
│   ├── layout.tsx                        # Root layout + Header
│   ├── page.tsx                          # Homepage (SSG + ISR)
│   ├── project/[owner]/[repo]/page.tsx   # Detail page (on-demand ISR)
│   └── api/repos/
│       ├── route.ts                      # Search API proxy
│       └── [owner]/[repo]/route.ts       # Detail API proxy
├── components/
│   ├── Header.tsx
│   ├── SearchBar.tsx
│   ├── FilterBar.tsx
│   ├── RepoCard.tsx
│   ├── RepoList.tsx
│   ├── Pagination.tsx
│   ├── EmptyState.tsx
│   ├── RepoHeader.tsx
│   ├── ReadmeViewer.tsx
│   └── ErrorState.tsx
├── hooks/
│   ├── useFavorites.ts
│   └── useDebounce.ts
└── lib/
    ├── types.ts
    └── github.ts
```

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `next.config.js`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `.env.local`, `.gitignore`, `src/app/globals.css`

- [ ] **Step 1: Create Next.js project with TypeScript and Tailwind**

Run: `npx create-next-app@14 . --typescript --tailwind --eslint --app --src-dir --no-import-alias`
Expected: Project scaffolded in current directory

- [ ] **Step 2: Install additional dependencies**

Run: `npm install react-markdown remark-gfm`
Expected: Packages added to package.json

- [ ] **Step 3: Create .env.local**

```bash
echo "GITHUB_TOKEN=your_github_personal_access_token_here" > .env.local
```

- [ ] **Step 4: Add .env.local and .superpowers to .gitignore**

Ensure `.gitignore` includes:
```
.env.local
.superpowers/
```

- [ ] **Step 5: Replace src/app/globals.css with Tailwind base + custom scrollbar**

Write `src/app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

body {
  @apply bg-gray-50 text-gray-900 antialiased;
}
```

- [ ] **Step 6: Verify scaffold**

Run: `npm run dev`
Expected: Dev server starts on localhost:3000, shows default Next.js page

---

### Task 2: Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Write types file**

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
  created?: string; // e.g. ">2024-01-01"
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

---

### Task 3: GitHub API Client

**Files:**
- Create: `src/lib/github.ts`

- [ ] **Step 1: Write GitHub API client with caching and validation**

```typescript
import { Repo, RepoDetail, SearchParams, SearchResponse } from './types';

const GITHUB_API = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN;

// Best-effort in-memory cache (resets on cold start in serverless)
const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (TOKEN) {
    h.Authorization = `Bearer ${TOKEN}`;
  }
  return h;
}

const VALID_OWNER_REPO = /^[a-zA-Z0-9._-]+$/;

function buildSearchQuery(params: SearchParams): string {
  const parts: string[] = [];
  if (params.q) parts.push(params.q);
  if (params.language) parts.push(`language:${params.language}`);
  if (params.created) parts.push(`created:${params.created}`);
  parts.push('stars:>100'); // high-star baseline
  return parts.join(' ');
}

export async function searchRepos(params: SearchParams): Promise<SearchResponse> {
  const query = buildSearchQuery(params);
  const sort = params.sort || 'stars';
  const order = params.order || 'desc';
  const per_page = Math.min(params.per_page || 30, 50);
  const page = Math.min(params.page || 1, 34); // GitHub limit: 1000 results

  const qs = new URLSearchParams({ q: query, sort, order, per_page: String(per_page), page: String(page) });
  const cacheKey = `search:${qs.toString()}`;

  const cached = getCached<SearchResponse>(cacheKey);
  if (cached) return cached;

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

  const result: SearchResponse = { items, total_count: raw.total_count as number };
  setCache(cacheKey, result);
  return result;
}

export async function getRepoDetail(owner: string, repo: string): Promise<RepoDetail> {
  if (!VALID_OWNER_REPO.test(owner) || !VALID_OWNER_REPO.test(repo)) {
    throw Object.assign(new Error('Invalid owner or repo name'), { status: 400 });
  }

  const cacheKey = `repo:${owner}/${repo}`;
  const cached = getCached<RepoDetail>(cacheKey);
  if (cached) return cached;

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
    readme = Buffer.from(readmeRaw.content as string, 'base64').toString('utf-8');
  }

  const result: RepoDetail = {
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

  setCache(cacheKey, result);
  return result;
}
```

---

### Task 4: API Routes

**Files:**
- Create: `src/app/api/repos/route.ts`, `src/app/api/repos/[owner]/[repo]/route.ts`

- [ ] **Step 1: Write search API proxy**

Write `src/app/api/repos/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { searchRepos } from '@/lib/github';
import { SearchParams } from '@/lib/types';

const ALLOWED = ['q', 'language', 'sort', 'order', 'page', 'per_page', 'created'];

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const params: SearchParams = {};

  for (const [key, value] of Object.entries(raw)) {
    if (!ALLOWED.includes(key)) continue;
    if (key === 'page' || key === 'per_page') {
      (params as Record<string, number>)[key] = parseInt(value, 10);
    } else if (key === 'sort') {
      const v = value as string;
      if (['stars', 'forks', 'updated'].includes(v)) params.sort = v as SearchParams['sort'];
    } else if (key === 'order') {
      const v = value as string;
      if (['desc', 'asc'].includes(v)) params.order = v as SearchParams['order'];
    } else {
      (params as Record<string, string>)[key] = value;
    }
  }

  try {
    const data = await searchRepos(params);
    const res = NextResponse.json(data);
    res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res;
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const status = e.status || 500;
    return NextResponse.json({ status, message: e.message || 'Internal error' }, { status });
  }
}
```

- [ ] **Step 2: Write detail API proxy**

Write `src/app/api/repos/[owner]/[repo]/route.ts`:
```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getRepoDetail } from '@/lib/github';

export async function GET(
  _req: NextRequest,
  { params }: { params: { owner: string; repo: string } }
) {
  try {
    const data = await getRepoDetail(params.owner, params.repo);
    const res = NextResponse.json(data);
    res.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res;
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    const status = e.status || 500;
    return NextResponse.json({ status, message: e.message || 'Internal error' }, { status });
  }
}
```

---

### Task 5: Custom Hooks

**Files:**
- Create: `src/hooks/useDebounce.ts`, `src/hooks/useFavorites.ts`

- [ ] **Step 1: Write useDebounce hook**

Write `src/hooks/useDebounce.ts`:
```typescript
'use client';
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

- [ ] **Step 2: Write useFavorites hook with SSR hydration guard**

Write `src/hooks/useFavorites.ts`:
```typescript
'use client';
import { useState, useEffect, useCallback } from 'react';

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('gitstar-favorites');
      if (stored) setFavorites(JSON.parse(stored));
    } catch { /* corrupted data, start fresh */ }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem('gitstar-favorites', JSON.stringify(favorites));
    }
  }, [favorites, loaded]);

  const toggle = useCallback((fullName: string) => {
    setFavorites(prev =>
      prev.includes(fullName) ? prev.filter(f => f !== fullName) : [...prev, fullName]
    );
  }, []);

  const isFavorite = useCallback((fullName: string) => favorites.includes(fullName), [favorites]);

  return { favorites, toggle, isFavorite, loaded };
}
```

---

### Task 6: Layout + Header

**Files:**
- Create: `src/components/Header.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write Header component**

Write `src/components/Header.tsx`:
```typescript
import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
          GitStar
        </Link>
        <span className="text-sm text-gray-500">发现优质开源项目</span>
      </div>
    </header>
  );
}
```

- [ ] **Step 2: Write root layout**

Write `src/app/layout.tsx`:
```typescript
import type { Metadata } from 'next';
import Header from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'GitStar - 发现优质开源项目',
  description: '浏览 GitHub 上最受欢迎的开源项目，按语言、时间筛选，查看项目详情',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
```

---

### Task 7: Homepage Components (Client-Side)

**Files:**
- Create: `src/components/SearchBar.tsx`, `src/components/FilterBar.tsx`, `src/components/RepoCard.tsx`, `src/components/RepoList.tsx`, `src/components/Pagination.tsx`, `src/components/EmptyState.tsx`

- [ ] **Step 1: Write SearchBar**

Write `src/components/SearchBar.tsx`:
```typescript
'use client';
import { useState, useEffect } from 'react';
import { useDebounce } from '@/hooks/useDebounce';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  const [input, setInput] = useState(value);
  const debounced = useDebounce(input, 300);

  useEffect(() => {
    onChange(debounced);
  }, [debounced]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative">
      <input
        type="search"
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="搜索项目名称、描述..."
        className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
      />
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Write FilterBar with selects**

Write `src/components/FilterBar.tsx`:
```typescript
'use client';

const LANGUAGES = [
  { value: '', label: '全部语言' },
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

const TIME_RANGES = [
  { value: '', label: '全部时间' },
  { value: '>2026-05-20', label: '本周' },
  { value: '>2026-04-27', label: '本月' },
  { value: '>2025-05-27', label: '今年' },
];

const SORTS = [
  { value: 'stars', label: 'Star 数' },
  { value: 'forks', label: 'Fork 数' },
  { value: 'updated', label: '最近更新' },
];

function Select({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        className="appearance-none px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

interface Props {
  language: string;
  onLanguageChange: (v: string) => void;
  timeRange: string;
  onTimeRangeChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
}

export default function FilterBar({ language, onLanguageChange, timeRange, onTimeRangeChange, sort, onSortChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={language} onChange={onLanguageChange} options={LANGUAGES} label="语言筛选" />
      <Select value={timeRange} onChange={onTimeRangeChange} options={TIME_RANGES} label="时间范围" />
      <Select value={sort} onChange={onSortChange} options={SORTS} label="排序方式" />
    </div>
  );
}
```

- [ ] **Step 3: Write RepoCard with FavoriteButton inline**

Write `src/components/RepoCard.tsx`:
```typescript
'use client';
import Link from 'next/link';
import { Repo } from '@/lib/types';

interface Props {
  repo: Repo;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
}

export default function RepoCard({ repo, isFavorite, onToggleFavorite }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white hover:shadow-md transition-shadow flex gap-3 items-start">
      <img src={repo.owner_avatar} alt={repo.owner} className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <Link
          href={`/project/${repo.full_name}`}
          className="text-sm font-semibold text-blue-700 hover:underline"
        >
          {repo.full_name}
        </Link>
        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{repo.description || '暂无描述'}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-gray-400">
          <span>⭐ {repo.stargazers_count.toLocaleString()}</span>
          {repo.language && <span>🔤 {repo.language}</span>}
          {repo.license && <span>📄 {repo.license.name}</span>}
        </div>
      </div>
      <button
        onClick={() => onToggleFavorite(repo.full_name)}
        className={`flex-shrink-0 text-lg leading-none mt-0.5 transition-colors ${isFavorite ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'}`}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Write RepoList**

Write `src/components/RepoList.tsx`:
```typescript
'use client';
import { Repo } from '@/lib/types';
import RepoCard from './RepoCard';
import EmptyState from './EmptyState';

interface Props {
  repos: Repo[];
  favorites: string[];
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
          isFavorite={favorites.includes(repo.full_name)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write Pagination**

Write `src/components/Pagination.tsx`:
```typescript
'use client';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1 mt-6">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
      >
        ← 上一页
      </button>
      {pages[0] > 1 && (
        <>
          <button onClick={() => onChange(1)} className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100">1</button>
          {pages[0] > 2 && <span className="px-1 text-gray-400">...</span>}
        </>
      )}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${p === page ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-100'}`}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
          <button onClick={() => onChange(totalPages)} className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-3 py-1.5 text-sm border rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
      >
        下一页 →
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Write EmptyState**

Write `src/components/EmptyState.tsx`:
```typescript
export default function EmptyState() {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">没有找到匹配的项目</p>
      <p className="text-gray-300 text-sm">尝试调整筛选条件或搜索关键词</p>
    </div>
  );
}
```

---

### Task 8: Homepage Page

**Files:**
- Create: `src/app/page.tsx`

- [ ] **Step 1: Write homepage with SSG + ISR, client-side filter state**

Write `src/app/page.tsx`:
```typescript
import { searchRepos } from '@/lib/github';
import { Repo, SearchParams } from '@/lib/types';
import HomePageClient from './HomePageClient';

export const revalidate = 3600; // ISR every hour

export default async function HomePage() {
  let initialRepos: Repo[] = [];
  let totalCount = 0;
  let error: string | null = null;

  try {
    const data = await searchRepos({ sort: 'stars', order: 'desc', per_page: 30, page: 1 });
    initialRepos = data.items;
    totalCount = data.total_count;
  } catch (err: unknown) {
    error = (err as { message?: string }).message || 'Failed to load repositories';
  }

  return <HomePageClient initialRepos={initialRepos} totalCount={totalCount} error={error} />;
}
```

- [ ] **Step 2: Write the client homepage component**

Write `src/app/HomePageClient.tsx`:
```typescript
'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Repo } from '@/lib/types';
import { useFavorites } from '@/hooks/useFavorites';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import RepoList from '@/components/RepoList';
import Pagination from '@/components/Pagination';

interface Props {
  initialRepos: Repo[];
  totalCount: number;
  error: string | null;
}

export default function HomePageClient({ initialRepos, totalCount, error: serverError }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [search, setSearch] = useState(sp.get('q') || '');
  const [language, setLanguage] = useState(sp.get('language') || '');
  const [timeRange, setTimeRange] = useState(sp.get('created') || '');
  const [sort, setSort] = useState(sp.get('sort') || 'stars');
  const [page, setPage] = useState(parseInt(sp.get('page') || '1', 10));

  const [repos, setRepos] = useState<Repo[]>(initialRepos);
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(serverError);

  const { favorites, toggle: toggleFavorite, loaded: favLoaded } = useFavorites();

  const totalPages = Math.min(Math.ceil(total / 30), 34);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort, order: 'desc', page: String(page), per_page: '30' });
      if (search) params.set('q', search);
      if (language) params.set('language', language);
      if (timeRange) params.set('created', timeRange);

      const res = await fetch(`/api/repos?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to fetch');
      }
      const data = await res.json();
      setRepos(data.items);
      setTotal(data.total_count);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }, [search, language, timeRange, sort, page]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (language) params.set('language', language);
    if (timeRange) params.set('created', timeRange);
    if (sort !== 'stars') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  }, [search, language, timeRange, sort, page, router]);

  // Fetch when filters change (skip initial load since server already fetched)
  const isInitial = useMemo(() => {
    return !search && !language && !timeRange && sort === 'stars' && page === 1;
  }, [search, language, timeRange, sort, page]);

  useEffect(() => {
    if (!isInitial) fetchRepos();
  }, [isInitial, fetchRepos]);

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const handleLanguage = useCallback((v: string) => { setLanguage(v); setPage(1); }, []);
  const handleTimeRange = useCallback((v: string) => { setTimeRange(v); setPage(1); }, []);
  const handleSort = useCallback((v: string) => { setSort(v); setPage(1); }, []);

  return (
    <div className="space-y-4">
      <SearchBar value={search} onChange={handleSearch} />
      <FilterBar
        language={language} onLanguageChange={handleLanguage}
        timeRange={timeRange} onTimeRangeChange={handleTimeRange}
        sort={sort} onSortChange={handleSort}
      />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}
      {loading ? (
        <RepoList repos={[]} favorites={favorites} onToggleFavorite={toggleFavorite} loaded={false} />
      ) : (
        <RepoList repos={repos} favorites={favorites} onToggleFavorite={toggleFavorite} loaded={favLoaded} />
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
```

---

### Task 9: Detail Page Components

**Files:**
- Create: `src/components/RepoHeader.tsx`, `src/components/ReadmeViewer.tsx`, `src/components/ErrorState.tsx`

- [ ] **Step 1: Write RepoHeader**

Write `src/components/RepoHeader.tsx`:
```typescript
'use client';
import Link from 'next/link';
import { RepoDetail } from '@/lib/types';

interface Props {
  repo: RepoDetail;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
}

export default function RepoHeader({ repo, isFavorite, onToggleFavorite }: Props) {
  return (
    <div>
      <Link href="/" className="text-sm text-blue-600 hover:underline mb-4 inline-block">← 返回</Link>
      <div className="flex gap-4 items-start">
        <img src={repo.owner_avatar} alt={repo.owner} className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{repo.full_name}</h1>
          <p className="text-sm text-gray-500 mt-1">{repo.description || '暂无描述'}</p>
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
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition-colors"
            >
              ⭐ Star
            </a>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              🔗 打开 GitHub
            </a>
            <button
              onClick={() => onToggleFavorite(repo.full_name)}
              className={`inline-flex items-center gap-1 px-4 py-1.5 border text-sm rounded-lg transition-colors ${isFavorite ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-300 hover:bg-gray-50'}`}
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

- [ ] **Step 2: Write ReadmeViewer**

Write `src/components/ReadmeViewer.tsx`:
```typescript
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

export default function ReadmeViewer({ content }: Props) {
  return (
    <div className="border border-gray-200 rounded-lg bg-white">
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <h2 className="text-sm font-semibold text-gray-700">📖 README.md</h2>
      </div>
      <div className="px-6 py-4 prose prose-sm max-w-none prose-headings:border-b prose-headings:pb-1 prose-headings:mt-6 prose-headings:mb-3 prose-img:max-w-full prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:code:bg-transparent prose-pre:code:px-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Write ErrorState**

Write `src/components/ErrorState.tsx`:
```typescript
import Link from 'next/link';

interface Props {
  title?: string;
  message?: string;
}

export default function ErrorState({
  title = '出错了',
  message = '请稍后重试',
}: Props) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">{title}</p>
      <p className="text-gray-300 text-sm mb-4">{message}</p>
      <Link href="/" className="text-sm text-blue-600 hover:underline">← 返回首页</Link>
    </div>
  );
}
```

---

### Task 10: Detail Page

**Files:**
- Create: `src/app/project/[owner]/[repo]/page.tsx`

- [ ] **Step 1: Write detail page with ISR**

Write `src/app/project/[owner]/[repo]/page.tsx`:
```typescript
import { Metadata } from 'next';
import { getRepoDetail } from '@/lib/github';
import { RepoDetail } from '@/lib/types';
import DetailPageClient from './DetailPageClient';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { owner: string; repo: string } }): Promise<Metadata> {
  try {
    const repo = await getRepoDetail(params.owner, params.repo);
    const desc = repo.description || `${repo.full_name} - GitHub 高星项目`;
    return {
      title: `${repo.full_name} - GitStar`,
      description: desc,
      openGraph: {
        title: repo.full_name,
        description: desc,
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: repo.full_name,
        description: desc,
      },
    };
  } catch {
    return { title: '项目未找到 - GitStar' };
  }
}

export default async function DetailPage({ params }: { params: { owner: string; repo: string } }) {
  let repo: RepoDetail | null = null;
  let error: { title: string; message: string } | null = null;

  try {
    repo = await getRepoDetail(params.owner, params.repo);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 404) {
      error = { title: '项目未找到', message: `仓库 ${params.owner}/${params.repo} 不存在` };
    } else if (e.status === 403) {
      error = { title: 'API 限流', message: 'GitHub API 请求次数已达上限，请稍后再来' };
    } else {
      error = { title: '加载失败', message: e.message || '请稍后重试' };
    }
  }

  return <DetailPageClient repo={repo} error={error} />;
}
```

- [ ] **Step 2: Write the client detail page component**

Write `src/app/project/[owner]/[repo]/DetailPageClient.tsx`:
```typescript
'use client';
import { RepoDetail } from '@/lib/types';
import { useFavorites } from '@/hooks/useFavorites';
import RepoHeader from '@/components/RepoHeader';
import ReadmeViewer from '@/components/ReadmeViewer';
import ErrorState from '@/components/ErrorState';

interface Props {
  repo: RepoDetail | null;
  error: { title: string; message: string } | null;
}

export default function DetailPageClient({ repo, error }: Props) {
  const { favorites, toggle: toggleFavorite, loaded } = useFavorites();

  if (error) {
    return <ErrorState title={error.title} message={error.message} />;
  }

  if (!repo) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full mb-1" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RepoHeader
        repo={repo}
        isFavorite={loaded && favorites.includes(repo.full_name)}
        onToggleFavorite={toggleFavorite}
      />
      {repo.readme ? (
        <ReadmeViewer content={repo.readme} />
      ) : (
        <p className="text-gray-400 text-center py-8">该项目没有 README 文件</p>
      )}
    </div>
  );
}
```

---

### Task 11: Verify and Polish

- [ ] **Step 1: Set GITHUB_TOKEN**

Create a GitHub personal access token (no scopes needed for public repos) at https://github.com/settings/tokens and add it to `.env.local`:
```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

- [ ] **Step 2: Run dev server and verify**

Run: `npm run dev`

Verify these flows in the browser:
- Homepage loads with repo cards → http://localhost:3000
- Language filter works (select "TypeScript" → cards update)
- Search works (type "react" → debounced fetch → cards update)
- Pagination works (click next page)
- Favorite toggle works (click star → yellow; refresh → still yellow)
- Detail page loads → click on a repo card
- README renders → detailed repo page
- Back button works
- Error state for bad URL → http://localhost:3000/project/foo/bar
- Mobile layout looks correct at 320px width

- [ ] **Step 3: Run build to verify SSG/ISR**

Run: `npm run build`

Expected: Build succeeds with no errors. Output shows:
- `/` is statically generated (SSG)
- `/project/[owner]/[repo]` uses ISR
- API routes are registered

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: implement GitStar - GitHub high-star project discovery tool"
```
