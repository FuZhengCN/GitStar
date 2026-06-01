# README 展开交互改进 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 增强 DetailPage 展开 README 后的交互体验：MiniBar 信息补全、浮动 TOC/返回顶部按钮、TocOverlay 定位修复、平滑收起滚动。

**Architecture:** 修改 4 个现有文件，不新增文件。MiniBar 接收 `detail` prop 替代独立字段；TOC 功能从 ReadmeViewer 标题栏剥离为 DetailPage 层的浮动按钮；TocOverlay 从 absolute 改为 fixed 定位。

**Tech Stack:** React 18 + TypeScript + Tailwind CSS，无新增依赖。

---

### Task 1: 增强 MiniBar（双行布局 + 可展开详情）

**Files:**
- Modify: `extension/components/MiniBar.tsx`

- [ ] **Step 1: 重写 MiniBar — 新 Props 接口 + 双行布局**

将 `extension/components/MiniBar.tsx` 替换为以下内容：

```tsx
import { useState } from 'react';
import { RepoDetail } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  owner: string;
  repo: string;
  fullName: string;
  avatar: string;
  detail: RepoDetail;
  isStarred: boolean;
  onToggleStar: () => void;
  starLoading: boolean;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
  hasToken: boolean;
}

export default function MiniBar({ owner, repo, fullName, avatar, detail, isStarred, onToggleStar, starLoading, isFavorite, onToggleFavorite, hasToken }: Props) {
  const { t } = useI18n();
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  return (
    <div className="sticky top-[60px] z-20 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      {/* Row 1: identity + key actions */}
      <div className="px-3 py-2 flex items-center gap-2">
        <img src={avatar} alt={owner} className="w-6 h-6 rounded-md flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-bold text-[#1e1b4b] truncate block">{fullName}</span>
          <span className="text-[10px] font-semibold text-[#f59e0b]">★ {detail.stargazers_count.toLocaleString()}</span>
        </div>
        <button
          onClick={onToggleStar}
          disabled={starLoading || !hasToken}
          className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50 shrink-0 ${
            hasToken
              ? isStarred
                ? 'bg-[#f0fdf4] border border-[#16a34a] text-[#16a34a]'
                : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
              : 'bg-[#f3f4f6] text-[#9ca3af] border border-dashed border-[#d1d5db] cursor-not-allowed'
          }`}
        >
          {starLoading ? '...' : isStarred && hasToken ? t('starredButton') : t('starButton')}
        </button>
        <button
          onClick={() => onToggleFavorite(fullName)}
          className={`px-2 py-1 text-[11px] border rounded-md transition-colors shrink-0 ${
            isFavorite
              ? 'border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]'
              : 'border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50'
          }`}
        >
          {isFavorite ? t('favorited') : t('favorite')}
        </button>
        <a
          href={detail.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6b7280] hover:text-[#3b82f6] shrink-0 leading-none"
          title={t('openOnGitHub')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <button
          onClick={() => setDetailsExpanded(v => !v)}
          className="text-[#9ca3af] hover:text-[#374151] shrink-0 leading-none"
          aria-label={t('projectDetails')}
          aria-expanded={detailsExpanded}
        >
          {detailsExpanded ? '▴' : '▾'}
        </button>
      </div>

      {/* Row 2: details (expandable) */}
      {detailsExpanded && (
        <div className="px-3 pb-2 border-t border-[#f3f4f6]">
          {detail.description && (
            <p className="text-[10px] text-[#6b7280] truncate mt-1.5">{detail.description}</p>
          )}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[10px] text-[#6b7280]">
            <span>📅 {new Date(detail.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span>🔄 {new Date(detail.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span>📄 {detail.license?.name || '—'}</span>
            <span>🔤 {detail.language || '—'}</span>
          </div>
          {detail.topics && detail.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {detail.topics.slice(0, 8).map(topic => (
                <span key={topic} className="text-[9px] bg-[#eff6ff] text-[#3b82f6] px-1.5 py-0.5 rounded-full">{topic}</span>
              ))}
              {detail.topics.length > 8 && (
                <span className="text-[9px] text-[#9ca3af]">+{detail.topics.length - 8}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 提交**

```bash
git add extension/components/MiniBar.tsx
git commit -m "feat: MiniBar 增强 — 双行布局 + 可展开详情"
```

---

### Task 2: ReadmeViewer 移除 TOC 按钮

**Files:**
- Modify: `extension/components/ReadmeViewer.tsx`

- [ ] **Step 1: 精简 Props 接口并移除 TOC 按钮**

修改 `extension/components/ReadmeViewer.tsx`：

删除 Props 中的 `onToggleToc` 和 `tocVisible`，删除标题栏中对应的 TOC 按钮 JSX。

将文件内容替换为：

```tsx
import { useI18n } from '../lib/i18n';

function estimateReadTime(content: string): string {
  const mins = Math.max(1, Math.round((content.length / 5) / 200));
  return `${mins} min`;
}

interface Props {
  content: string;
  html: string;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  loading: boolean;
}

export default function ReadmeViewer({ content, html, expanded, onExpand, onCollapse, loading }: Props) {
  const { t } = useI18n();
  const needsTruncation = !expanded;

  return (
    <div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {/* Header bar — clickable to collapse when expanded */}
      <div
        className={`px-4 py-3 border-b border-[#f3f4f6] bg-[#f9fafb] flex items-center justify-between ${
          expanded ? 'cursor-pointer hover:bg-[#eff6ff] active:bg-[#dbeafe] select-none' : ''
        }`}
        onClick={expanded ? onCollapse : undefined}
      >
        <div className="flex items-center gap-1.5">
          {expanded && <span className="text-[10px] text-[#9ca3af]">▾</span>}
          <h2 className="text-xs font-semibold text-gray-700">📖 README.md</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{(content.length / 1024).toFixed(1)} KB · {estimateReadTime(content)}</span>
        </div>
      </div>

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
              needsTruncation ? 'max-h-[160px]' : 'pb-16'
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
            className="text-xs text-[#3b82f6] hover:text-[#2563eb] cursor-pointer"
          >
            {t('expandReadmeFull')} ↓ · {estimateReadTime(content)}
          </button>
        </div>
      )}
      {expanded && (
        <div className="border-t border-[#f3f4f6] px-6 pb-4 pt-4 text-center">
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

关键变更：
- `Props` 移除 `onToggleToc: () => void` 和 `tocVisible: boolean`
- 标题栏右侧移除整个 TOC 按钮（原 lines 38-46）
- `#readme-content` 的 `className` 中，展开模式追加 `pb-16`（防止浮动按钮遮挡内容底部）

- [ ] **Step 2: 提交**

```bash
git add extension/components/ReadmeViewer.tsx
git commit -m "refactor: ReadmeViewer 移除标题栏 TOC 按钮 + 展开模式底部留白"
```

---

### Task 3: TocOverlay 定位修复（absolute → fixed）

**Files:**
- Modify: `extension/components/TocOverlay.tsx`

- [ ] **Step 1: 面板从 absolute 改为 fixed，定位在视口右下**

修改 `extension/components/TocOverlay.tsx`，将面板定位从 `absolute right-0 top-8` 改为 `fixed`，定位到浮动按钮上方。

找到面板 div（原 line 86 附近）：

```tsx
<div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-[#e5e7eb] overflow-hidden min-w-[160px] max-w-[200px] max-h-[280px] overflow-y-auto">
```

替换为：

```tsx
<div className="fixed right-4 bottom-[80px] z-50 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-[#e5e7eb] overflow-hidden min-w-[160px] max-w-[200px] max-h-[240px] overflow-y-auto">
```

变更说明：
- `absolute right-0 top-8` → `fixed right-4 bottom-[80px]`：面板固定在视口右下，位于浮动按钮（bottom: ~50px）上方
- `max-h-[280px]` → `max-h-[240px]`：确保 600px 弹窗内不会溢出

- [ ] **Step 2: 提交**

```bash
git add extension/components/TocOverlay.tsx
git commit -m "fix: TocOverlay 面板 absolute → fixed，防止滚动后不可见"
```

---

### Task 4: DetailPage 集成（浮动按钮 + scroll 监听 + 增强传参 + 平滑收起）

**Files:**
- Modify: `extension/popup.tsx` (DetailPage 组件，lines 162-411)

- [ ] **Step 1: 添加 scroll 监听、TOC 检测、浮动按钮渲染**

在 `DetailPage` 组件中，于现有 state 声明之后（line 172 `const { favorites, toggle: toggleFavorite, loaded } = useFavorites();` 之后）添加以下 state 和 useEffect：

```tsx
const [showBackToTop, setShowBackToTop] = useState(false);
const [hasToc, setHasToc] = useState(false);
```

在 Star check useEffect（lines 215-222）之后添加 scroll 监听：

```tsx
// Scroll listener for back-to-top button (passive, rAF-throttled)
useEffect(() => {
  if (!readmeExpanded) return;
  let ticking = false;
  const onScroll = () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        setShowBackToTop(window.scrollY > 200);
        ticking = false;
      });
      ticking = true;
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  return () => window.removeEventListener('scroll', onScroll);
}, [readmeExpanded]);
```

在 README HTML 就绪后检测是否有标题（TOC 按钮条件渲染）：

```tsx
// Detect headings for TOC button visibility
useEffect(() => {
  if (!readmeExpanded || !displayHtml) return;
  const raf = requestAnimationFrame(() => {
    const headings = document.querySelectorAll('#readme-content h2, #readme-content h3');
    setHasToc(headings.length > 0);
  });
  return () => cancelAnimationFrame(raf);
}, [readmeExpanded, displayHtml]);
```

- [ ] **Step 2: 修改 MiniBar 调用（传入 detail prop）**

找到 expanded 分支中的 `<MiniBar .../>`（line 326-337），添加 `detail={detail}` prop：

```tsx
<MiniBar
  owner={owner}
  repo={repo}
  fullName={detail.full_name}
  avatar={detail.owner_avatar}
  detail={detail}
  isStarred={isStarred}
  onToggleStar={handleToggleStar}
  starLoading={starLoading}
  isFavorite={loaded && (favorites || []).includes(detail.full_name)}
  onToggleFavorite={toggleFavorite}
  hasToken={hasToken}
/>
```

- [ ] **Step 3: 移除 ReadmeViewer 的 TOC props + 修改 readmeSection 变量**

找到 `readmeSection` 变量（lines 269-295 附近的局部变量），移除传给 `ReadmeViewer` 的 `onToggleToc` 和 `tocVisible` props：

```tsx
const readmeSection = readmeContent ? (
  <ReadmeViewer
    content={readmeContent}
    html={displayHtml}
    expanded={readmeExpanded}
    onExpand={handleExpand}
    onCollapse={handleCollapse}
    loading={readmeLoading}
  />
) : readmeLoading ? (
  // ...骨架屏不变...
) : readmeError && !readmeContent ? (
  // ...错误状态不变...
) : (
  // ...空状态不变...
);
```

- [ ] **Step 4: 替换 expanded 分支的渲染（添加浮动按钮 + TocOverlay）**

找到 expanded 分支（lines 324-346），替换为：

```tsx
) : readmeExpanded ? (
  <>
    <MiniBar
      owner={owner}
      repo={repo}
      fullName={detail.full_name}
      avatar={detail.owner_avatar}
      detail={detail}
      isStarred={isStarred}
      onToggleStar={handleToggleStar}
      starLoading={starLoading}
      isFavorite={loaded && (favorites || []).includes(detail.full_name)}
      onToggleFavorite={toggleFavorite}
      hasToken={hasToken}
    />
    {readmeSection}
    {/* Floating action buttons */}
    <div className="fixed right-4 z-50 flex flex-col gap-1.5 items-end" style={{ bottom: '16px' }}>
      {hasToc && (
        <button
          onClick={handleToggleToc}
          className="w-7 h-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[#e5e7eb] flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label={t('toc')}
        >
          <span className="text-xs">📋</span>
        </button>
      )}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="w-7 h-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[#e5e7eb] flex items-center justify-center hover:bg-gray-50 transition-colors"
          aria-label={t('backToTop')}
        >
          <span className="text-xs">↑</span>
        </button>
      )}
    </div>
    <TocOverlay
      containerSelector="#readme-content"
      visible={tocVisible}
      onClose={() => setTocVisible(false)}
    />
  </>
) : (
```

- [ ] **Step 5: 平滑收起滚动**

找到 `handleCollapse` 函数（lines 258-262），修改 `scrollTo`：

```tsx
const handleCollapse = () => {
  expandRef.current = false;
  setReadmeExpanded(false);
  window.scrollTo({ top: 0, behavior: 'smooth' });
};
```

- [ ] **Step 6: 添加 `backToTop` i18n 翻译键**

在 `extension/locales/zh.json` 中添加：

```json
"backToTop": "回到顶部"
```

在 `extension/locales/en.json` 中添加：

```json
"backToTop": "Back to top"
```

- [ ] **Step 7: 验证并提交**

构建并加载扩展验证：
```bash
cd extension && npm run build
```
在 Chrome `chrome://extensions/` 加载 `build/chrome-mv3-prod/`，验证：
1. 详情页展开 README → MiniBar 显示 Star 数量 + 描述 + GitHub 链接
2. 点击 ▾ → 展开项目详情（日期/许可/Topics）
3. 右下角显示 📋 和 ↑ 浮动按钮
4. 点击 📋 → 目录面板从底部弹出（fixed 定位）
5. 滚动超过 200px 后 ↑ 按钮出现
6. 点击 ↑ → 平滑回到顶部
7. 点击标题栏或底部「收起」→ 平滑滚动到顶部

```bash
git add extension/popup.tsx extension/locales/zh.json extension/locales/en.json
git commit -m "feat: DetailPage 展开模式浮动 TOC/返回顶部 + 增强 MiniBar + 平滑收起"
```

---

## 验证清单

- [ ] MiniBar 展开后显示 Star 数量、GitHub 链接、可展开项目详情
- [ ] 浮动目录按钮仅在 README 有 h2/h3 标题时出现
- [ ] 浮动返回顶部按钮仅在 scrollY > 200px 时出现
- [ ] TocOverlay 面板 fixed 定位，始终在视口内可见
- [ ] 收起 README 平滑滚动到顶部
- [ ] README 底部不被浮动按钮遮挡（pb-16 留白有效）
- [ ] 浮动按钮有 aria-label，键盘可聚焦
