# GitStar v1.1 — 发现模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Chrome 扩展 popup Header 增加三种发现模式切换（热门/新星/活跃），新星模式下 RepoCard 显示 ★/天 增长速率 badge。

**Architecture:** 纯前端改动，不碰 API 层。`DiscoveryMode` state 在 `PopupIndexInner` 中管理，通过 props 向下传递到 Header（模式胶囊按钮 + 下拉）、FilterBar（联动时间/排序默认值）、RepoCard（条件 badge）。模式状态不持久化。

**Tech Stack:** Plasmo v0.90.5 + React 18 + TypeScript + Tailwind CSS 3

---

### Task 1: 类型定义与常量

**Files:**
- Modify: `extension/lib/types.ts`
- Modify: `extension/lib/constants.ts`

- [ ] **Step 1: 在 types.ts 中新增类型，Repo 补充 created_at**

```typescript
// extension/lib/types.ts — 在文件末尾追加

export type DiscoveryMode = 'hot' | 'rising' | 'active';

export interface ModeConfig {
  mode: DiscoveryMode;
  sort: 'stars' | 'updated';
  created: string;  // '' | 'week' | 'month'
}
```

同时修改 `Repo` 接口，在 `updated_at` 下方新增 `created_at`：

```typescript
// extension/lib/types.ts — Repo 接口中，updated_at 行下方新增
created_at: string;
```

- [ ] **Step 2: 在 constants.ts 中新增模式配置、Emoji 映射、Badge 阈值、时间计算函数**

```typescript
// extension/lib/constants.ts — 在 README_PREVIEW_BYTES 下方追加

import type { DiscoveryMode, ModeConfig } from './types';
import type { Repo } from './types';

// 发现模式配置（不含 label——label 通过 i18n t() 获取）
export const DISCOVERY_MODES: Record<DiscoveryMode, ModeConfig> = {
  hot:    { mode: 'hot',    sort: 'stars',   created: '' },
  rising: { mode: 'rising', sort: 'stars',   created: 'week' },
  active: { mode: 'active', sort: 'updated', created: 'month' },
};

// Emoji 映射（Emoji 不需要翻译，从配置中分离）
export const MODE_EMOJI: Record<DiscoveryMode, string> = {
  hot: '🔥', rising: '🚀', active: '📈',
};

// Badge 阈值
export const STAR_VELOCITY_MIN_STARS = 500;
export const STAR_VELOCITY_MIN_PER_DAY = 10;
export const STAR_VELOCITY_MAX_AGE_DAYS = 30;

// ★/天 速率计算（借鉴 github-discover 双重门槛）
export function calcStarsPerDay(repo: Repo, mode: DiscoveryMode): number | null {
  if (mode !== 'rising') return null;
  if (repo.stargazers_count < STAR_VELOCITY_MIN_STARS) return null;
  if (!repo.created_at) return null;
  const ageDays = Math.max(1, (Date.now() - new Date(repo.created_at).getTime()) / 86400000);
  if (ageDays > STAR_VELOCITY_MAX_AGE_DAYS) return null;
  const velocity = Math.floor(repo.stargazers_count / ageDays);
  if (velocity < STAR_VELOCITY_MIN_PER_DAY) return null;
  return velocity;
}

// 时间范围计算（从 FilterBar 提取，供多处复用）
export function getTimeRangeValue(period: 'week' | 'month' | 'year'): string {
  const now = new Date();
  if (period === 'week') {
    const week = new Date(now);
    week.setDate(week.getDate() - 7);
    return `>${week.toISOString().split('T')[0]}`;
  }
  if (period === 'month') {
    const month = new Date(now);
    month.setMonth(month.getMonth() - 1);
    return `>${month.toISOString().split('T')[0]}`;
  }
  if (period === 'year') {
    const year = new Date(now);
    year.setFullYear(year.getFullYear() - 1);
    return `>${year.toISOString().split('T')[0]}`;
  }
  return '';
}
```

- [ ] **Step 3: 确认 TypeScript 编译通过**

Run: `cd extension && npx tsc --noEmit`
Expected: 无新增类型错误

- [ ] **Step 4: Commit**

```bash
git add extension/lib/types.ts extension/lib/constants.ts
git commit -m "feat: add DiscoveryMode types, mode configs, badge thresholds, and getTimeRangeValue"
```

---

### Task 2: i18n 翻译 key

**Files:**
- Modify: `extension/locales/zh.json`
- Modify: `extension/locales/en.json`

- [ ] **Step 1: 在 zh.json 的 `discoverProjects` 下方新增 8 个 key**

```jsonc
// extension/locales/zh.json — 在 "discoverProjects" 行后追加
"mode.hot": "热门",
"mode.rising": "新星",
"mode.active": "活跃",
"mode.hot.desc": "按 Star 总数发现经典项目",
"mode.rising.desc": "近期高星，按增长速率排序",
"mode.active.desc": "近期频繁更新的高星项目",
"badge.starsPerDay": "{n} ★/天",
"empty.rising": "本周暂无满足阈值的新星项目，试试扩大时间范围"
```

- [ ] **Step 2: 在 en.json 的 `discoverProjects` 下方新增 8 个 key**

```jsonc
// extension/locales/en.json — 在 "discoverProjects" 行后追加
"mode.hot": "Hot",
"mode.rising": "Rising",
"mode.active": "Active",
"mode.hot.desc": "Discover classic projects by total stars",
"mode.rising.desc": "Recent high-star repos sorted by growth",
"mode.active.desc": "Recently updated high-star repos",
"badge.starsPerDay": "{n} ★/day",
"empty.rising": "No rising stars this week, try expanding the time range"
```

- [ ] **Step 3: 验证 JSON 格式正确**

Run: `cd extension && node -e "JSON.parse(require('fs').readFileSync('locales/zh.json','utf8')); JSON.parse(require('fs').readFileSync('locales/en.json','utf8')); console.log('OK')"`
Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add extension/locales/zh.json extension/locales/en.json
git commit -m "feat: add i18n keys for discovery modes and star velocity badge"
```

---

### Task 3: API 层 — 补充 created_at 字段

**Files:**
- Modify: `extension/lib/github.ts`

- [ ] **Step 1: 在 searchRepos 的 items.map 中补充 created_at**

在 `github.ts` 第 79 行 `updated_at` 后加一行：

```typescript
// extension/lib/github.ts:79 — 在 updated_at 行下方
updated_at: item.updated_at as string,
created_at: item.created_at as string,  // 新增：用于计算 ★/天 速率
```

- [ ] **Step 2: 确认 TypeScript 编译通过**

Run: `cd extension && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add extension/lib/github.ts
git commit -m "feat: extract created_at from GitHub Search API response"
```

---

### Task 4: FilterBar — 复用 getTimeRangeValue + Flash 动画支持

**Files:**
- Modify: `extension/components/FilterBar.tsx`

- [ ] **Step 1: 改造 FilterBar，新增 flashMode prop，getTimeRanges 改用 constants 中的函数**

```typescript
// extension/components/FilterBar.tsx — 完整替换

import { useI18n } from '../lib/i18n';
import { getTimeRangeValue } from '../lib/constants';
import type { DiscoveryMode } from '../lib/types';

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
  return [
    { value: '', label: t('allTime') },
    { value: getTimeRangeValue('week'), label: t('thisWeek') },
    { value: getTimeRangeValue('month'), label: t('thisMonth') },
    { value: getTimeRangeValue('year'), label: t('thisYear') },  // 注意：year 需要 constants 中也支持
  ];
}

const SORTS = [
  { value: 'stars', labelKey: 'sortByStars' },
  { value: 'forks', labelKey: 'sortByForks' },
  { value: 'updated', labelKey: 'sortByUpdated' },
];

interface Props {
  language: string;
  onLanguageChange: (v: string) => void;
  timeRange: string;
  onTimeRangeChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  flashMode?: DiscoveryMode | null;  // 新增：模式切换时的 flash 触发
}

const FLASH_COLORS: Record<string, string> = {
  rising: '#8b5cf6',
  active: '#10b981',
};

const selectClass = 'w-full text-[11px] border border-[#e5e7eb] rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] appearance-none cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]';

const Chevron = () => (
  <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="8" height="5" viewBox="0 0 8 5" fill="none">
    <path d="M1 1l3 3 3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function FilterBar({ language, onLanguageChange, timeRange, onTimeRangeChange, sort, onSortChange, flashMode }: Props) {
  const { t } = useI18n();
  const timeRanges = getTimeRanges(t);
  const flashColor = flashMode ? FLASH_COLORS[flashMode] : undefined;

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
        <select
          value={timeRange}
          onChange={e => onTimeRangeChange(e.target.value)}
          className={selectClass}
          style={flashColor ? { borderColor: flashColor, boxShadow: `0 0 0 1px ${flashColor}` } : undefined}
        >
          {timeRanges.map(tr => (
            <option key={tr.value} value={tr.value}>{tr.label}</option>
          ))}
        </select>
        <Chevron />
      </div>
      <div className="relative flex-1">
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value)}
          className={selectClass}
          style={flashColor ? { borderColor: flashColor, boxShadow: `0 0 0 1px ${flashColor}` } : undefined}
        >
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

`getTimeRangeValue` 已在 Task 1 中支持 `'year'` 参数，FilterBar 直接调用即可。

- [ ] **Step 2: 确认 TypeScript 编译通过**

Run: `cd extension && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 3: Commit**

```bash
git add extension/components/FilterBar.tsx extension/lib/constants.ts
git commit -m "feat: add flashMode prop to FilterBar, extract getTimeRangeValue to constants"
```

---

### Task 5: RepoCard — ★/天 Badge

**Files:**
- Modify: `extension/components/RepoCard.tsx`

- [ ] **Step 1: 新增 starsPerDay prop 和 badge 渲染**

```typescript
// extension/components/RepoCard.tsx — 完整替换

import { Repo } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  repo: Repo;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
  starsPerDay?: number | null;  // 新增：null = 不满足阈值不显示，undefined = 非新星模式不显示
}

export default function RepoCard({ repo, isFavorite, onToggleFavorite, starsPerDay }: Props) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl p-3 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-shadow flex gap-2.5 items-start">
      <img src={repo.owner_avatar} alt={repo.owner} className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <a
          href={`#/project/${repo.full_name}`}
          className="text-[13px] font-semibold text-[#3b82f6] hover:underline cursor-pointer"
        >
          {repo.full_name}
        </a>
        {starsPerDay != null && starsPerDay > 0 && (
          <span className="ml-1.5 inline-block text-[10px] font-semibold px-1.5 py-px rounded bg-[#fef3c7] text-[#92400e]">
            🚀 {t('badge.starsPerDay').replace('{n}', String(starsPerDay))}
          </span>
        )}
        <p className="text-xs text-[#6b7280] mt-0.5 line-clamp-2">{repo.description || t('noDescription')}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-[#9ca3af]">
          <span className="text-[#f59e0b]">★ {repo.stargazers_count.toLocaleString()}</span>
          {repo.language && <span>🔤 {repo.language}</span>}
          {repo.license && <span>📄 {repo.license.name}</span>}
        </div>
      </div>
      <button
        onClick={() => onToggleFavorite(repo.full_name)}
        className={`flex-shrink-0 text-xs border rounded-md px-1.5 py-0.5 mt-0.5 transition-colors flex items-center gap-0.5 ${isFavorite ? 'border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]' : 'border-[#e5e7eb] text-[#9ca3af] hover:text-[#f59e0b] hover:border-[#f59e0b]'}`}
      >
        {isFavorite ? t('favorited') : t('favorite')}
      </button>
    </div>
  );
}
```

**注意**：`RepoList` 需要透传 `starsPerDay` prop。需要在 Task 7 中同步更新。

- [ ] **Step 2: 确认 TypeScript 编译通过**

Run: `cd extension && npx tsc --noEmit`
Expected: RepoCard 编译通过，RepoList 暂有 prop 缺失告警（Task 7 修复）

- [ ] **Step 3: Commit**

```bash
git add extension/components/RepoCard.tsx
git commit -m "feat: add starsPerDay badge to RepoCard"
```

---

### Task 6: tailwind.css — Flash 动画 + Header 过渡

**Files:**
- Modify: `extension/assets/tailwind.css`

- [ ] **Step 1: 在 tailwind.css 末尾追加动画**

```css
/* extension/assets/tailwind.css — 在文件末尾追加 */

@keyframes filter-flash {
  0%   { border-color: var(--flash-color, #8b5cf6); box-shadow: 0 0 0 1px var(--flash-color, #8b5cf6); }
  100% { border-color: #e5e7eb; box-shadow: none; }
}

.animate-filter-flash {
  animation: filter-flash 200ms ease-out forwards;
}
```

- [ ] **Step 2: Commit**

```bash
git add extension/assets/tailwind.css
git commit -m "feat: add filter-flash animation and Header background transition"
```

---

### Task 7: popup.tsx — 模式状态 + Header 模式切换 + 集成

**Files:**
- Modify: `extension/popup.tsx`
- Modify: `extension/components/RepoList.tsx`

这是最核心的任务，将所有组件集成起来。

- [ ] **Step 1: 更新 imports**

在 popup.tsx 顶部 import 区域，追加新的导入：

```typescript
// extension/popup.tsx — 在现有 import 行后追加
import { DISCOVERY_MODES, MODE_EMOJI, getTimeRangeValue } from './lib/constants';
import type { DiscoveryMode } from './lib/types';
```

- [ ] **Step 2: PopupIndexInner 新增 mode state + 模式切换逻辑**

在 `PopupIndexInner` 函数中，`useState(false)` 的 `hasToken` 后新增：

```typescript
// 发现模式 state（不持久化，关闭 popup 重置为 hot）
const [mode, setMode] = useState<DiscoveryMode>('hot');
const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
const [flashMode, setFlashMode] = useState<DiscoveryMode | null>(null);
```

模式切换处理函数：

```typescript
const handleModeChange = useCallback((newMode: DiscoveryMode) => {
  setMode(newMode);
  setModeDropdownOpen(false);
  // 触发 FilterBar flash 动画
  setFlashMode(newMode);
  setTimeout(() => setFlashMode(null), 200);
}, []);
```

- [ ] **Step 3: 替换 Header 中的 discoverProjects 文本为模式胶囊按钮**

将第 556-568 行 Header 中的 `discoverProjects` 文本替换为模式按钮：

```tsx
// extension/popup.tsx:556-568 — 替换 discoverProjects span 为模式按钮
<div className="flex items-center gap-2.5">
  {/* 模式切换胶囊按钮 */}
  <div className="relative">
    <button
      onClick={() => setModeDropdownOpen(v => !v)}
      className={`flex items-center gap-1 text-[11px] font-medium rounded-full px-2.5 py-1 border transition-colors ${
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
  {/* 收藏按钮（不变） */}
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
```

- [ ] **Step 4: Header 背景色随模式变化**

修改 Header div 的 className（第 551 行），由静态 `bg-[#3b82f6]` 改为动态渐变：

```tsx
// extension/popup.tsx:551 — Header div className 修改
<div
  style={{
    width: POPUP_WIDTH,
    background: mode === 'rising'
      ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
      : mode === 'active'
        ? 'linear-gradient(135deg, #3b82f6, #10b981)'
        : '#3b82f6',
    transition: 'background 300ms',
  }}
  className="fixed top-0 z-30 px-4 py-3 shadow-[0_2px_8px_rgba(59,130,246,0.25)] flex items-center justify-between"
>
```

- [ ] **Step 5: HomePage 接收 mode prop，计算 starsPerDay，传递 flashMode**

修改 `HomePage` 函数签名，新增 `mode` prop：

```typescript
// extension/popup.tsx:61 — HomePage 签名修改
function HomePage({ hasToken, mode, flashMode }: { hasToken: boolean; mode: DiscoveryMode; flashMode: DiscoveryMode | null }) {
```

在 HomePage 中修改 FilterBar 的调用，传入 `flashMode`：

```tsx
// extension/popup.tsx:123-127 — FilterBar 调用修改
<FilterBar
  language={language} onLanguageChange={v => { setLanguage(v); setPage(1); }}
  timeRange={timeRange} onTimeRangeChange={v => { setTimeRange(v); setPage(1); }}
  sort={sort} onSortChange={v => { setSort(v); setPage(1); }}
  flashMode={flashMode}
/>
```

修改 RepoList 调用，传入 `mode`，以及在 `repos.map` 时计算 `starsPerDay`：

```tsx
// extension/popup.tsx:131 — RepoList 调用修改
<RepoList
  repos={repos}
  favorites={favorites}
  onToggleFavorite={toggleFavorite}
  loaded={!loading && favLoaded}
  mode={mode}
/>
```

- [ ] **Step 6: 在 PopupIndexInner 中传递 mode 到 HomePage**

修改 `renderHomePage` 的 useCallback，加入 `mode` 和 `flashMode` 依赖，在 HomePage 中传入：

```typescript
// extension/popup.tsx:513 — renderHomePage 修改
const renderHomePage = useCallback(
  () => <HomePage hasToken={hasToken} mode={mode} flashMode={flashMode} />,
  [hasToken, mode, flashMode]
);
```

- [ ] **Step 7: 更新 RepoList 透传 mode 和 starsPerDay**

`calcStarsPerDay` 统一放在 `lib/constants.ts` 中（已在 Task 1 的 Step 2 末尾定义），RepoList 从 `lib/constants` 导入：

```typescript
// extension/components/RepoList.tsx — 完整替换

import { Repo } from '../lib/types';
import type { DiscoveryMode } from '../lib/types';
import { calcStarsPerDay } from '../lib/constants';
import RepoCard from './RepoCard';
import EmptyState from './EmptyState';

interface Props {
  repos: Repo[];
  favorites: string[] | null;
  onToggleFavorite: (fullName: string) => void;
  loaded: boolean;
  mode: DiscoveryMode;  // 新增
}

export default function RepoList({ repos, favorites, onToggleFavorite, loaded, mode }: Props) {
  if (!loaded) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl p-3 bg-white animate-pulse shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
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
          starsPerDay={mode === 'rising' ? calcStarsPerDay(repo, mode) : undefined}
        />
      ))}
    </div>
  );
}

- [ ] **Step 8: 确认 TypeScript 编译通过**

Run: `cd extension && npx tsc --noEmit`
Expected: 无类型错误

- [ ] **Step 9: 运行测试确认未破坏现有功能**

Run: `cd extension && npx vitest run`
Expected: 所有已有测试通过

- [ ] **Step 10: Commit**

```bash
git add extension/popup.tsx extension/components/RepoList.tsx extension/lib/constants.ts
git commit -m "feat: integrate discovery mode switcher into Header, wire mode through HomePage/FilterBar/RepoCard"
```

---

### Task 8: 构建验证 + 最终检查

- [ ] **Step 1: 生产构建**

Run: `cd extension && npm run build`
Expected: 构建成功，无错误

- [ ] **Step 2: 手动验证清单**

在 Chrome 加载 `extension/build/chrome-mv3-prod/`：
- [ ] Popup 打开默认"热门"模式，Header 纯蓝
- [ ] 点击模式按钮，弹出 3 选项下拉，当前模式高亮+✓
- [ ] 选择"新星"模式，Header 变为蓝紫渐变，FilterBar 时间/排序联动+flash
- [ ] 新星模式下 RepoCard 显示 ★/天 badge（满足阈值项目）
- [ ] 新星模式下 < 500★ 项目不显示 badge
- [ ] 选择"活跃"模式，Header 变为蓝绿渐变
- [ ] 手动修改 FilterBar 时间/排序，不影响 Header 模式按钮
- [ ] 中英文切换，模式名和描述文字对应变化
- [ ] 关闭 popup 重新打开，默认回到"热门"模式
- [ ] 收藏页和详情页不显示 badge

- [ ] **Step 3: Commit（如有微调）**

```bash
git add -A
git commit -m "chore: production build verified for v1.1 discovery modes"
```
