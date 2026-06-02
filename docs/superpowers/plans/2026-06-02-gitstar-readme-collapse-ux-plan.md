# README 收起交互优化 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 README 收起入口从标题栏点击 + 底部文字按钮统一到浮动按钮组中，提升收起操作的直观性。

**Architecture:** 修改 ReadmeViewer 移除分散的收起入口，在 DetailPage 的浮动按钮组中新增白底蓝字收起按钮。涉及 2 个文件，均为小范围修改。

**Tech Stack:** React 18 + TypeScript + Tailwind CSS

---

### Task 1: ReadmeViewer 移除分散的收起入口

**Files:**
- Modify: `extension/components/ReadmeViewer.tsx`

- [ ] **Step 1: 移除 `onCollapse` prop，标题栏展开时改为静态浅蓝底色，移除 ▾ 和点击行为，移除底部收起按钮**

将 `ReadmeViewer.tsx` 替换为以下内容：

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
  loading: boolean;
}

export default function ReadmeViewer({ content, html, expanded, onExpand, loading }: Props) {
  const { t } = useI18n();
  const needsTruncation = !expanded;

  return (
    <div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {/* Header bar — static when expanded, shows light blue anchor */}
      <div
        className={`px-4 py-3 border-b border-[#f3f4f6] flex items-center justify-between ${
          expanded ? 'bg-[#eff6ff]' : 'bg-[#f9fafb]'
        }`}
      >
        <div className="flex items-center gap-1.5">
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

      {/* Bottom actions — expand button only (collapse moved to floating button) */}
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
    </div>
  );
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd extension && npx tsc --noEmit
```

Expected: 如果 popup.tsx 仍引用 `onCollapse` prop 则会报错，下一步修复。

- [ ] **Step 3: 提交**

```bash
git add extension/components/ReadmeViewer.tsx
git commit -m "refactor: ReadmeViewer 移除分散收起入口，展开模式标题栏静态浅蓝底色"
```

---

### Task 2: DetailPage 浮动按钮组新增收起按钮

**Files:**
- Modify: `extension/popup.tsx` (DetailPage 函数，约 289-395 行)

- [ ] **Step 1: 移除 `<ReadmeViewer>` 的 `onCollapse` prop**

将第 306 行的 `onCollapse={handleCollapse}` 删除：

```tsx
// 修改前 (line 300-308)
const readmeSection = readmeContent ? (
    <ReadmeViewer
      content={readmeContent}
      html={displayHtml}
      expanded={readmeExpanded}
      onExpand={handleExpand}
      onCollapse={handleCollapse}
      loading={readmeLoading}
    />
  ) : ...

// 修改后
const readmeSection = readmeContent ? (
    <ReadmeViewer
      content={readmeContent}
      html={displayHtml}
      expanded={readmeExpanded}
      onExpand={handleExpand}
      loading={readmeLoading}
    />
  ) : ...
```

- [ ] **Step 2: 浮动按钮组新增收起按钮**

在浮动按钮组 `<div>` 中（约 369-388 行），返回顶部按钮之后、`</div>` 之前，新增收起按钮：

```tsx
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
  <button
    onClick={handleCollapse}
    className="w-7 h-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[#3b82f6] flex items-center justify-center hover:bg-[#eff6ff] transition-colors"
    aria-label={t('collapseReadme')}
  >
    <span className="text-xs text-[#3b82f6] font-bold">✕</span>
  </button>
</div>
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd extension && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 4: 构建并测试**

```bash
cd extension && npm run build
```

Expected: 构建成功。然后在 Chrome `chrome://extensions/` 加载 `extension/build/chrome-mv3-prod/` 目录，打开 popup 验证：

1. 进入任意仓库详情页 → 点击"展开阅读全部" → 右下角应出现三个浮动按钮（📋 目录、↑ 返回顶部、✕ 收起）
2. 点击 ✕ 收起按钮 → README 平滑收起回到预览模式
3. 展开 README → 标题栏应显示浅蓝底色（`#eff6ff`），不显示 ▾ 图标
4. 底部不应再显示"收起 README ▴"文字按钮
5. 无 TOC 的 README（短文档）→ 只显示 ✕ 收起按钮（📋 不出现）
6. 展开后滚动到中间 → 应显示 ↑ 返回顶部按钮 + ✕ 收起按钮

- [ ] **Step 5: 提交**

```bash
git add extension/popup.tsx
git commit -m "feat: 浮动按钮组新增收起按钮，统一 README 收起入口"
```
