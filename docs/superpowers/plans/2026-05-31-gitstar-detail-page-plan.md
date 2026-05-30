# 详情页渐进式信息披露 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将扩展详情页从平铺式布局升级为渐进式信息披露设计——默认紧凑评估模式，展开后进入深度阅读模式（Mini-bar sticky 常驻）。

**Architecture:** DetailPage 管理 `expanded` 状态，预览模式渲染完整 RepoHeader（身份 + Star 块 + 辅助操作），阅读模式渲染 MiniBar（sticky 迷你条）+ 全量 README。RepoHeader 简化为 3 段式（身份→Star→操作），ReadmeViewer 新增目录按钮和阅读时间。

**Tech Stack:** React 18 + TypeScript + Tailwind CSS

---

## File Structure

| 文件 | 操作 | 职责 |
|------|------|------|
| `extension/components/RepoHeader.tsx` | 修改 | 身份+Star+操作 3 段式布局，缩小头像 |
| `extension/components/MiniBar.tsx` | **新建** | 阅读模式 sticky 迷你条 |
| `extension/components/TocOverlay.tsx` | **新建** | README 目录浮层 |
| `extension/components/ReadmeViewer.tsx` | 修改 | 新增目录按钮、阅读时间、收起按钮 |
| `extension/popup.tsx` | 修改 | DetailPage 管理 expanded 状态，条件渲染 MiniBar |
| `extension/locales/zh.json` | 修改 | 新增 6 个翻译 key |
| `extension/locales/en.json` | 修改 | 新增 6 个翻译 key |

---

### Task 1: Restructure RepoHeader

**Files:**
- Modify: `extension/components/RepoHeader.tsx`

**Intent:** 将操作按钮从标题行内移到 Star 块下方独立行，缩小头像，整体形成 3 段式布局。

- [ ] **Step 1: Rewrite RepoHeader with 3-section layout**

Replace the entire file content:

```tsx
import { RepoDetail } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  repo: RepoDetail;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
  isStarred: boolean;
  onToggleStar: () => void;
  starLoading: boolean;
  hasToken: boolean;
}

export default function RepoHeader({ repo, isFavorite, onToggleFavorite, isStarred, onToggleStar, starLoading, hasToken }: Props) {
  const { t } = useI18n();

  return (
    <div>
      {/* Layer 1: Breadcrumb + Identity */}
      <nav className="flex items-center gap-1.5 text-[11px] mb-3 pb-3 border-b border-[#f3f4f6]">
        <a href="#" onClick={(e) => { e.preventDefault(); window.history.back(); }} className="text-[#3b82f6] hover:underline cursor-pointer">{t('back')}</a>
        <span className="text-[#9ca3af]">/</span>
        <span className="text-[#1e1b4b] font-semibold truncate max-w-[80px]">{repo.owner}</span>
        <span className="text-[#9ca3af]">/</span>
        <span className="text-[#1e1b4b] font-semibold truncate max-w-[120px]">{repo.name}</span>
      </nav>

      <div className="flex gap-2.5 items-start">
        <img src={repo.owner_avatar} alt={repo.owner} className="w-8 h-8 rounded-lg flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-[13px] font-bold text-[#1e1b4b] truncate">{repo.full_name}</h1>
          <p className="text-[11px] text-[#6b7280] mt-0.5 line-clamp-2 leading-[1.35]">{repo.description || t('noDescription')}</p>
        </div>
      </div>

      {/* Layer 2: Star action bar */}
      <div className="flex items-center gap-3 mt-2.5 py-2.5 px-3 bg-white rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
        {hasToken ? (
          <button
            onClick={onToggleStar}
            disabled={starLoading}
            className={`px-5 py-1.5 text-[13px] font-semibold rounded-md transition-colors disabled:opacity-50 min-w-[92px] text-center ${
              isStarred
                ? 'bg-[#f0fdf4] border border-[#16a34a] text-[#16a34a]'
                : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
            }`}
          >
            {starLoading ? '...' : isStarred ? t('starredButton') : t('starButton')}
          </button>
        ) : (
          <button
            disabled
            className="px-4 py-1.5 text-[12px] font-medium rounded-md bg-[#f3f4f6] text-[#9ca3af] border border-dashed border-[#d1d5db] cursor-not-allowed min-w-[92px] text-center"
            title={t('tokenNotConfigured')}
          >
            {t('starButton')}
          </button>
        )}
        <div className="min-w-0">
          <div className="text-[13px] text-[#f59e0b] font-semibold">
            ★ {repo.stargazers_count.toLocaleString()} <span className="text-[#9ca3af] font-normal text-[10px]">stars</span>
          </div>
          <div className="text-[10px] text-[#6b7280] mt-0.5 flex gap-2 flex-wrap">
            <span>🍴 {repo.forks_count.toLocaleString()}</span>
            <span>👀 {repo.watchers_count.toLocaleString()}</span>
            {repo.language && <span>🔤 {repo.language}</span>}
          </div>
          {!hasToken && (
            <div className="text-[10px] text-[#f59e0b] mt-0.5">{t('tokenNotConfigured')}</div>
          )}
        </div>
      </div>

      {/* Layer 3: Aux actions */}
      <div className="flex gap-1.5 mt-2">
        <button
          onClick={() => onToggleFavorite(repo.full_name)}
          className={`flex-1 py-1.5 text-[11px] border rounded-md transition-colors text-center ${
            isFavorite
              ? 'border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]'
              : 'border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50'
          }`}
        >
          {isFavorite ? t('favorited') : t('favorite')}
        </button>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 py-1.5 text-[11px] border border-[#e5e7eb] rounded-md text-[#6b7280] hover:bg-gray-50 transition-colors text-center"
        >
          {t('openOnGitHub')}
        </a>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star/extension && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star
git add extension/components/RepoHeader.tsx
git commit -m "refactor(extension): restructure RepoHeader to 3-section layout

- Move action buttons to separate row below Star block
- Reduce avatar from 40px to 32px (w-8 h-8 rounded-lg)
- Add hasToken prop for disabled Star state with dashed border
- Remove inline buttons from title row
- Truncate owner/name in breadcrumb with max-w constraints

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: Create MiniBar Component

**Files:**
- Create: `extension/components/MiniBar.tsx`

**Intent:** 阅读模式下 sticky 在顶栏下方的迷你操作条，含标题 + Star + 收藏。

- [ ] **Step 1: Create MiniBar.tsx**

```tsx
import { useI18n } from '../lib/i18n';

interface Props {
  owner: string;
  repo: string;
  fullName: string;
  avatar: string;
  isStarred: boolean;
  onToggleStar: () => void;
  starLoading: boolean;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
  hasToken: boolean;
}

export default function MiniBar({ owner, repo, fullName, avatar, isStarred, onToggleStar, starLoading, isFavorite, onToggleFavorite, hasToken }: Props) {
  const { t } = useI18n();

  return (
    <div className="sticky top-[60px] z-20 bg-white rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-3 py-2 flex items-center gap-2 mb-2">
      <img src={avatar} alt={owner} className="w-6 h-6 rounded-md flex-shrink-0" />
      <span className="text-[12px] font-bold text-[#1e1b4b] truncate flex-1 min-w-0">{fullName}</span>
      {hasToken ? (
        <button
          onClick={onToggleStar}
          disabled={starLoading}
          className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50 flex-shrink-0 ${
            isStarred
              ? 'bg-[#f0fdf4] border border-[#16a34a] text-[#16a34a]'
              : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
          }`}
        >
          {starLoading ? '...' : isStarred ? t('starredButton') : t('starButton')}
        </button>
      ) : (
        <button
          disabled
          className="px-3 py-1 text-[11px] font-medium rounded-md bg-[#f3f4f6] text-[#9ca3af] border border-dashed border-[#d1d5db] cursor-not-allowed flex-shrink-0"
        >
          {t('starButton')}
        </button>
      )}
      <button
        onClick={() => onToggleFavorite(fullName)}
        className={`px-2 py-1 text-[11px] border rounded-md transition-colors flex-shrink-0 ${
          isFavorite
            ? 'border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]'
            : 'border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50'
        }`}
      >
        {isFavorite ? t('favorited') : t('favorite')}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star/extension && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star
git add extension/components/MiniBar.tsx
git commit -m "feat(extension): add MiniBar component for reading mode

Sticky compact header bar shown during README reading mode.
Contains avatar, repo name, Star button, and favorite toggle.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: Create TocOverlay Component

**Files:**
- Create: `extension/components/TocOverlay.tsx`

**Intent:** 从 README 渲染后 DOM 的 h2/h3 提取目录，浮层展示，点击锚点跳转并关闭。

- [ ] **Step 1: Create TocOverlay.tsx**

```tsx
import { useEffect, useState, useCallback } from 'react';
import { useI18n } from '../lib/i18n';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  containerSelector: string;
  visible: boolean;
  onClose: () => void;
}

export default function TocOverlay({ containerSelector, visible, onClose }: Props) {
  const { t } = useI18n();
  const [items, setItems] = useState<TocItem[]>([]);

  const extractToc = useCallback(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;
    const headings = container.querySelectorAll('h2, h3');
    const toc: TocItem[] = [];
    headings.forEach((h, i) => {
      const id = `toc-${i}`;
      h.id = id;
      toc.push({
        id,
        text: h.textContent || '',
        level: Number(h.tagName[1]) as 2 | 3,
      });
    });
    setItems(toc);
  }, [containerSelector]);

  useEffect(() => {
    if (visible && items.length === 0) {
      // Delay extraction to allow DOM render
      const timer = setTimeout(extractToc, 100);
      return () => clearTimeout(timer);
    }
  }, [visible, items.length, extractToc]);

  if (!visible) return null;

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-[#e5e7eb] overflow-hidden min-w-[160px] max-w-[200px] max-h-[280px] overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold text-[#374151] border-b border-[#f3f4f6] bg-[#f9fafb] sticky top-0">
          📋 {t('tocTitle')}
        </div>
        {items.length === 0 ? (
          <div className="px-3 py-4 text-[11px] text-[#9ca3af] text-center">{t('tocEmpty')}</div>
        ) : (
          <div className="py-1">
            {items.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  document.getElementById(item.id)?.scrollIntoView({ behavior: 'smooth' });
                  onClose();
                }}
                className={`block px-3 py-1.5 text-[11px] hover:bg-[#f3f4f6] transition-colors ${
                  item.level === 3 ? 'pl-6 text-[#6b7280]' : 'text-[#1e1b4b] font-medium'
                }`}
              >
                {item.text}
              </a>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star/extension && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star
git add extension/components/TocOverlay.tsx
git commit -m "feat(extension): add TocOverlay component for README navigation

Extracts h2/h3 headings from rendered README DOM and displays
a floating table of contents. Click to smooth-scroll to anchor.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: Update ReadmeViewer

**Files:**
- Modify: `extension/components/ReadmeViewer.tsx`

**Intent:** 标题栏新增目录按钮和阅读时间估算，底部新增收起按钮（阅读模式下），展开按钮文案简化。

- [ ] **Step 1: Rewrite ReadmeViewer**

```tsx
import { README_PREVIEW_BYTES } from '../lib/constants';
import { useI18n } from '../lib/i18n';

interface Props {
  content: string;
  html: string;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  loading: boolean;
  onToggleToc: () => void;
  tocVisible: boolean;
}

function estimateReadTime(content: string): string {
  // Average reading speed: ~200 words/min, ~5 chars/word in code
  const words = content.length / 5;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min`;
}

export default function ReadmeViewer({ content, html, expanded, onExpand, onCollapse, loading, onToggleToc, tocVisible }: Props) {
  const { t } = useI18n();
  const needsTruncation = content.length > README_PREVIEW_BYTES && !expanded;
  const readTime = estimateReadTime(content);

  return (
    <div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-[#f3f4f6] bg-[#f9fafb] flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-700">📖 README.md</h2>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#9ca3af]">
            {(content.length / 1024).toFixed(1)} KB · {readTime}
          </span>
          {expanded && (
            <button
              onClick={onToggleToc}
              className={`text-[10px] font-medium rounded px-1.5 py-0.5 transition-colors ${
                tocVisible ? 'bg-[#eff6ff] text-[#3b82f6]' : 'text-[#3b82f6] hover:bg-[#f3f4f6]'
              }`}
            >
              📋 {t('toc')}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="px-6 py-8 animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
        </div>
      ) : (
        <div className="relative">
          <div
            id="readme-content"
            className={`px-6 py-4 text-sm prose prose-sm max-w-none overflow-y-auto ${
              !expanded ? 'max-h-[200px]' : ''
            }`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {needsTruncation && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>
      )}

      {/* Bottom actions */}
      {needsTruncation && (
        <div className="px-6 pb-4 text-center">
          <button
            onClick={onExpand}
            className="text-xs text-[#3b82f6] hover:text-[#2563eb] cursor-pointer font-medium"
          >
            {t('expandReadmeFull')} ↓ · {estimateReadTime(content)}
          </button>
        </div>
      )}
      {expanded && (
        <div className="px-6 pb-4 text-center border-t border-[#f3f4f6] pt-3">
          <button
            onClick={onCollapse}
            className="text-xs text-[#6b7280] hover:text-[#374151] cursor-pointer"
          >
            {t('collapseReadme')} ▴
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star/extension && npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Step 3: Commit**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star
git add extension/components/ReadmeViewer.tsx
git commit -m "feat(extension): enhance ReadmeViewer with TOC, read time, collapse

- Add reading time estimate in header bar
- Add TOC toggle button (visible in expanded mode)
- Add collapse button at bottom for reading mode
- Add gradient mask overlay for truncated preview
- Simplify expand button text
- Add onCollapse and onToggleToc props

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: Add i18n Strings

**Files:**
- Modify: `extension/locales/zh.json`
- Modify: `extension/locales/en.json`

**Intent:** 新增 6 个翻译 key。

- [ ] **Step 1: Add keys to zh.json**

Add the following keys to `extension/locales/zh.json` (before the closing `}`):

```json
  "toc": "目录",
  "tocTitle": "本文目录",
  "tocEmpty": "未检测到标题",
  "collapseReadme": "收起 README",
  "expandReadmeFull": "展开阅读全部",
  "projectDetails": "项目详情"
```

- [ ] **Step 2: Add keys to en.json**

Add the following keys to `extension/locales/en.json` (before the closing `}`):

```json
  "toc": "TOC",
  "tocTitle": "On this page",
  "tocEmpty": "No headings found",
  "collapseReadme": "Collapse README",
  "expandReadmeFull": "Expand full README",
  "projectDetails": "Project Details"
```

- [ ] **Step 3: Verify JSON validity**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star/extension
node -e "JSON.parse(require('fs').readFileSync('locales/zh.json','utf8')); console.log('zh.json OK')"
node -e "JSON.parse(require('fs').readFileSync('locales/en.json','utf8')); console.log('en.json OK')"
```

Expected: Both print "OK".

- [ ] **Step 4: Verify build passes**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star/extension && npm run build
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star
git add extension/locales/zh.json extension/locales/en.json
git commit -m "feat(extension): add i18n keys for detail page enhancement

- toc, tocTitle, tocEmpty for TOC overlay
- collapseReadme, expandReadmeFull for README controls
- projectDetails for collapsible detail section

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: Wire Up DetailPage

**Files:**
- Modify: `extension/popup.tsx` (DetailPage function, lines 155-302)

**Intent:** 管理 expanded 状态，条件渲染 RepoHeader（预览模式）vs MiniBar + 全量 README（阅读模式），集成 TocOverlay。

- [ ] **Step 1: Update DetailPage imports**

Add at top of file (line 1 area), add the two new imports:

```tsx
import MiniBar from './components/MiniBar';
import TocOverlay from './components/TocOverlay';
```

Insert these after the existing `import ReadmeViewer from './components/ReadmeViewer';` line.

- [ ] **Step 2: Add hasToken and tocVisible state to DetailPage**

Inside the `DetailPage` function, after the existing `const [starLoading, setStarLoading] = useState(false);` line, add:

```tsx
const [hasToken, setHasToken] = useState(false);
const [tocVisible, setTocVisible] = useState(false);
```

- [ ] **Step 3: Add hasToken detection effect**

After the existing Star check `useEffect`, add:

```tsx
// Token check
useEffect(() => {
  import('../lib/github').then(m => {
    setHasToken(!!m.getToken());
  });
}, []);
```

Note: The import path `../lib/github` is relative to `extension/popup.tsx`. Verify `getToken` is exported from `extension/lib/github.ts`.

- [ ] **Step 4: Add handleCollapse function**

After `handleToggleStar`, add:

```tsx
const handleCollapse = useCallback(() => {
  setReadmeExpanded(false);
  setTocVisible(false);
  window.scrollTo(0, 0);
}, []);
```

- [ ] **Step 5: Rewrite the DetailPage return JSX**

Replace the entire `return` block of DetailPage (from the `if (error)` check through the end of the function) with:

```tsx
if (error) {
  return (
    <ErrorState title={t('errorOccurred')} message={errorMessageText(error, t)} onBack={() => window.history.back()} />
  );
}

if (repoLoading || !detail) {
  return (
    <>
      <LoadingBar loading={true} />
      <div className="animate-pulse space-y-3 mt-4">
        <div className="h-4 bg-gray-200 rounded w-24" />
        <div className="flex gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gray-200 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-200 rounded w-full" />
          </div>
        </div>
        <div className="h-10 bg-gray-200 rounded-lg" />
      </div>
    </>
  );
}

return (
  <div>
    {readmeExpanded ? (
      /* Reading mode: MiniBar + full README */
      <>
        <MiniBar
          owner={owner}
          repo={repo}
          fullName={detail.full_name}
          avatar={detail.owner_avatar}
          isStarred={isStarred}
          onToggleStar={handleToggleStar}
          starLoading={starLoading}
          isFavorite={loaded && (favorites || []).includes(detail.full_name)}
          onToggleFavorite={toggleFavorite}
          hasToken={hasToken}
        />
        {readmeContent ? (
          <div className="relative">
            <ReadmeViewer
              content={readmeContent}
              html={displayHtml}
              expanded={readmeExpanded}
              onExpand={() => {}}
              onCollapse={handleCollapse}
              loading={readmeLoading}
              onToggleToc={() => setTocVisible(v => !v)}
              tocVisible={tocVisible}
            />
            <TocOverlay
              containerSelector="#readme-content"
              visible={tocVisible}
              onClose={() => setTocVisible(false)}
            />
          </div>
        ) : readmeLoading ? (
          <div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] mt-2">
            <div className="px-4 py-3 border-b border-[#f3f4f6] bg-[#f9fafb]">
              <h2 className="text-xs font-semibold text-gray-700">📖 README.md</h2>
            </div>
            <div className="px-6 py-4 animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-full" />
              <div className="h-4 bg-gray-200 rounded w-5/6" />
              <div className="h-4 bg-gray-200 rounded w-4/6" />
            </div>
          </div>
        ) : readmeError && !readmeContent ? (
          <p className="text-red-500 text-center py-8 text-sm">{readmeError.message}</p>
        ) : (
          <p className="text-gray-400 text-center py-8 text-sm">{t('noReadme')}</p>
        )}
      </>
    ) : (
      /* Preview mode: full RepoHeader + README preview */
      <>
        <RepoHeader
          repo={detail}
          isFavorite={loaded && (favorites || []).includes(detail.full_name)}
          onToggleFavorite={toggleFavorite}
          isStarred={isStarred}
          onToggleStar={handleToggleStar}
          starLoading={starLoading}
          hasToken={hasToken}
        />
        <div className="mt-2">
          {readmeContent ? (
            <ReadmeViewer
              content={readmeContent}
              html={displayHtml}
              expanded={readmeExpanded}
              onExpand={() => setReadmeExpanded(true)}
              onCollapse={handleCollapse}
              loading={readmeLoading}
              onToggleToc={() => setTocVisible(v => !v)}
              tocVisible={tocVisible}
            />
          ) : readmeLoading ? (
            <div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
              <div className="px-4 py-3 border-b border-[#f3f4f6] bg-[#f9fafb]">
                <h2 className="text-xs font-semibold text-gray-700">📖 README.md</h2>
              </div>
              <div className="px-6 py-4 animate-pulse space-y-3">
                <div className="h-4 bg-gray-200 rounded w-full" />
                <div className="h-4 bg-gray-200 rounded w-5/6" />
                <div className="h-4 bg-gray-200 rounded w-4/6" />
              </div>
            </div>
          ) : readmeError && !readmeContent ? (
            <p className="text-red-500 text-center py-8 text-sm">{readmeError.message}</p>
          ) : (
            <p className="text-gray-400 text-center py-8 text-sm">{t('noReadme')}</p>
          )}
        </div>
      </>
    )}
  </div>
);
```

- [ ] **Step 6: Verify build passes**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star/extension && npm run build
```

Expected: Build succeeds with no type errors.

- [ ] **Step 7: Commit**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star
git add extension/popup.tsx
git commit -m "feat(extension): wire up progressive disclosure in DetailPage

- Add hasToken state for disabled Star button in RepoHeader/MiniBar
- Conditionally render RepoHeader (preview) vs MiniBar (reading mode)
- Integrate TocOverlay with toggle state
- Add handleCollapse to reset reading mode and scroll to top
- Update skeleton to match new 32px avatar layout
- Reset tocVisible on collapse

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6.5: Add Project Details Collapsible Section

**Files:**
- Modify: `extension/popup.tsx` (DetailPage function)

**Intent:** 在预览模式 README 下方添加可折叠的「项目详情」区块（Layer 5），展示元数据网格 + Topics 标签。

- [ ] **Step 1: Add collapsed state and section JSX in DetailPage**

After the existing `const [tocVisible, setTocVisible] = useState(false);` line, add:

```tsx
const [detailsExpanded, setDetailsExpanded] = useState(false);
```

In the preview mode JSX (the `!readmeExpanded` branch), after the README section's closing `</div>` (the `mt-2` div), add:

```tsx
{/* Layer 5: Project Details (collapsible) */}
<div className="mt-2 rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-3">
  <button
    onClick={() => setDetailsExpanded(v => !v)}
    className="w-full flex items-center justify-between text-[11px] font-semibold text-[#374151]"
  >
    <span>📋 {t('projectDetails')}</span>
    <span className="text-[10px] text-[#9ca3af]">{detailsExpanded ? '▴' : '▾'}</span>
  </button>
  {detailsExpanded && (
    <>
      <div className="grid grid-cols-2 gap-1.5 mt-2.5">
        <div className="text-[11px]">
          <span className="text-[#9ca3af]">📅 {t('created')}</span>
          <br />
          <span className="text-[#1e1b4b] font-medium">
            {new Date(detail.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="text-[11px]">
          <span className="text-[#9ca3af]">🔄 {t('updated')}</span>
          <br />
          <span className="text-[#1e1b4b] font-medium">
            {new Date(detail.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
        <div className="text-[11px]">
          <span className="text-[#9ca3af]">📄 {t('license')}</span>
          <br />
          <span className="text-[#1e1b4b] font-medium">{detail.license?.name || '—'}</span>
        </div>
        <div className="text-[11px]">
          <span className="text-[#9ca3af]">🔤 {t('languageLabel')}</span>
          <br />
          <span className="text-[#1e1b4b] font-medium">{detail.language || '—'}</span>
        </div>
      </div>
      {detail.topics && detail.topics.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {detail.topics.slice(0, 8).map(topic => (
            <span key={topic} className="text-[10px] bg-[#eff6ff] text-[#3b82f6] px-2 py-0.5 rounded-full">
              {topic}
            </span>
          ))}
          {detail.topics.length > 8 && (
            <span className="text-[10px] text-[#9ca3af]">+{detail.topics.length - 8}</span>
          )}
        </div>
      )}
    </>
  )}
</div>
```

Note: `detail` is already in scope from the `repoLoading || !detail` guard above.

- [ ] **Step 2: Add i18n keys for detail labels**

Add to `extension/locales/zh.json`:
```json
  "created": "创建",
  "updated": "更新",
  "license": "协议"
```

Add to `extension/locales/en.json`:
```json
  "created": "Created",
  "updated": "Updated",
  "license": "License"
```

- [ ] **Step 3: Verify build passes**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star/extension && npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star
git add extension/popup.tsx extension/locales/zh.json extension/locales/en.json
git commit -m "feat(extension): add collapsible project details section

Layer 5 of progressive disclosure: default-collapsed metadata grid
showing created/updated dates, license, language, and topic tags.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: Verify Full Flow

**Files:**
- All modified files

- [ ] **Step 1: Build production**

```bash
cd /Users/fuzheng/workspace/GitStar/github-star/extension && npm run build
```

Expected: Build succeeds with no errors or warnings.

- [ ] **Step 2: Load extension and test manually**

```bash
# Load build/chrome-mv3-prod/ in chrome://extensions/
```

Test checklist:
1. Open popup → search → click a repo → detail page loads in preview mode
2. Verify RepoHeader shows: breadcrumb → avatar(32px) + name → Star block → action buttons (收藏 + 打开)
3. Click Star button → verify loading ("...") → verify Starred state (green)
4. Click Starred button → verify Unstar (back to blue)
5. Click "展开阅读全部" → verify MiniBar appears, header transitions
6. Verify MiniBar has: avatar(24px) + name + Star + 收藏, sticky under top bar
7. Click "📋 目录" → verify TOC overlay appears with headings
8. Click a TOC item → verify smooth scroll + overlay closes
9. Click "收起 README" → verify back to preview mode, scrolled to top
10. Verify 收藏 toggle works in both preview and reading modes

- [ ] **Step 3: Commit if any fixes needed, or mark complete**

If no issues found:

```bash
cd /Users/fuzheng/workspace/GitStar/github-star
git commit --allow-empty -m "chore(extension): verify detail page progressive disclosure flow

All manual tests pass:
- Preview mode: 3-section layout, Star toggle, README preview
- Reading mode: MiniBar sticky, full README, TOC overlay
- Transition: expand/collapse smooth, scroll reset on collapse

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```
