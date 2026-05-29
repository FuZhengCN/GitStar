# Popup 视觉柔化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 popup 卡片从硬边框分隔改为阴影层次分隔，视觉更柔和。

**Architecture:** 纯 CSS 类名替换，7 个文件，不改组件结构、配色方案、布局。外层 bg-white → bg-slate-50 做底色分层，卡片去边框加微阴影浮起，顶栏 shadow-md → 蓝调扩散阴影。

**Tech Stack:** Tailwind CSS 3 任意值（arbitrary values）

---

### Task 1: `popup.tsx` — 外层容器 + 顶栏

**Files:**
- Modify: `extension/popup.tsx`

- [ ] **Step 1: 两处外层容器 bg-white → bg-slate-50**

L524（骨架屏外层）：
```
// 当前
<div style={{ width: POPUP_WIDTH }} className="min-h-[720px] bg-white flex flex-col">
// 改为
<div style={{ width: POPUP_WIDTH }} className="min-h-[720px] bg-slate-50 flex flex-col">
```

L544（主容器外层）：
```
// 当前
<div style={{ width: POPUP_WIDTH, minHeight: '720px' }} className="bg-white flex flex-col">
// 改为
<div style={{ width: POPUP_WIDTH, minHeight: '720px' }} className="bg-slate-50 flex flex-col">
```

- [ ] **Step 2: 两处顶栏 shadow-md → 蓝调扩散阴影**

L525（骨架屏顶栏）：
```
// 当前
<div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
// 改为
<div className="bg-[#3b82f6] px-4 py-3 shadow-[0_2px_8px_rgba(59,130,246,0.25)] flex items-center justify-between">
```

L545（主顶栏）：
```
// 当前
<div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
// 改为
<div className="bg-[#3b82f6] px-4 py-3 shadow-[0_2px_8px_rgba(59,130,246,0.25)] flex items-center justify-between">
```

- [ ] **Step 3: Commit**

```bash
git add extension/popup.tsx
git commit -m "style: popup 外层 bg-slate-50 + 顶栏蓝调阴影"
```

---

### Task 2: `popup.tsx` — 骨架屏卡片

**Files:**
- Modify: `extension/popup.tsx`

- [ ] **Step 1: L269 README 加载骨架屏 — 去边框加阴影，保持 rounded-lg**

```
// 当前
<div className="border border-[#f3f4f6] rounded-lg bg-white">
// 改为
<div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
```

- [ ] **Step 2: L397 FavoritesPage 未就绪骨架屏 — 去边框加阴影，rounded-lg → rounded-xl**

```
// 当前
<div key={i} className="border border-[#f3f4f6] rounded-lg p-3 bg-white animate-pulse">
// 改为
<div key={i} className="rounded-xl p-3 bg-white animate-pulse shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
```

- [ ] **Step 3: L450 FavoritesPage 加载中骨架屏 — 同上**

```
// 当前
<div key={i} className="border border-[#f3f4f6] rounded-lg p-3 bg-white animate-pulse">
// 改为
<div key={i} className="rounded-xl p-3 bg-white animate-pulse shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
```

- [ ] **Step 4: Commit**

```bash
git add extension/popup.tsx
git commit -m "style: popup 骨架屏去边框加阴影，圆角匹配对应真实组件"
```

---

### Task 3: `RepoCard.tsx` — 卡片去边框加阴影

**Files:**
- Modify: `extension/components/RepoCard.tsx`

- [ ] **Step 1: 替换 L14 卡片外层 class**

```
// 当前
<div className="border border-[#f3f4f6] rounded-lg p-3 bg-white shadow-sm hover:shadow-md transition-shadow flex gap-2.5 items-start">
// 改为
<div className="rounded-xl p-3 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-shadow flex gap-2.5 items-start">
```

- [ ] **Step 2: Commit**

```bash
git add extension/components/RepoCard.tsx
git commit -m "style: RepoCard 去边框改用阴影，rounded-lg → rounded-xl"
```

---

### Task 4: `SearchBar.tsx` + `FilterBar.tsx` — 输入控件微阴影

**Files:**
- Modify: `extension/components/SearchBar.tsx`
- Modify: `extension/components/FilterBar.tsx`

- [ ] **Step 1: SearchBar 输入框追加阴影**

L32 input class 末尾追加 ` shadow-[0_1px_3px_rgba(0,0,0,0.04)]`：
```
// 当前
className="w-full px-2.5 py-1.5 pl-8 border border-[#e5e7eb] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent text-[13px]"
// 改为
className="w-full px-2.5 py-1.5 pl-8 border border-[#e5e7eb] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent text-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
```

- [ ] **Step 2: FilterBar selectClass 追加阴影**

L45 `selectClass` 末尾追加 ` shadow-[0_1px_2px_rgba(0,0,0,0.03)]`：
```
// 当前
const selectClass = 'w-full text-[11px] border border-[#e5e7eb] rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] appearance-none cursor-pointer';
// 改为
const selectClass = 'w-full text-[11px] border border-[#e5e7eb] rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] appearance-none cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]';
```

- [ ] **Step 3: Commit**

```bash
git add extension/components/SearchBar.tsx extension/components/FilterBar.tsx
git commit -m "style: SearchBar/FilterBar 追加微阴影"
```

---

### Task 5: `RepoHeader.tsx` — Star 信息块去边框

**Files:**
- Modify: `extension/components/RepoHeader.tsx`

- [ ] **Step 1: L50 Star 信息块去边框，bg-[#f9fafb] → bg-white，加阴影**

```
// 当前
<div className="flex items-center gap-3 mt-3 py-2.5 px-3 bg-[#f9fafb] border border-[#f3f4f6] rounded-lg">
// 改为
<div className="flex items-center gap-3 mt-3 py-2.5 px-3 bg-white rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
```

- [ ] **Step 2: Commit**

```bash
git add extension/components/RepoHeader.tsx
git commit -m "style: Star 信息块去边框加阴影，背景改为 bg-white"
```

---

### Task 6: `ReadmeViewer.tsx` — 外层去边框加阴影

**Files:**
- Modify: `extension/components/ReadmeViewer.tsx`

- [ ] **Step 1: L17 README 外层去边框加阴影**

```
// 当前
<div className="border border-[#f3f4f6] rounded-lg bg-white">
// 改为
<div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
```

- [ ] **Step 2: Commit**

```bash
git add extension/components/ReadmeViewer.tsx
git commit -m "style: ReadmeViewer 去边框加阴影"
```

---

### Task 7: `RepoList.tsx` — 首页骨架屏

**Files:**
- Modify: `extension/components/RepoList.tsx`

- [ ] **Step 1: L17 骨架屏去边框加阴影，rounded-lg → rounded-xl**

```
// 当前
<div key={i} className="border border-[#f3f4f6] rounded-lg p-3 bg-white animate-pulse">
// 改为
<div key={i} className="rounded-xl p-3 bg-white animate-pulse shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
```

- [ ] **Step 2: Commit**

```bash
git add extension/components/RepoList.tsx
git commit -m "style: RepoList 骨架屏去边框加阴影，rounded-lg → rounded-xl"
```

---

### Task 8: 构建验证

- [ ] **Step 1: 构建扩展**

```bash
cd extension && npm run build
```
Expected: `🟢 DONE`，构建成功，无错误。

- [ ] **Step 2: 视觉验证**

Chrome `chrome://extensions/` → 加载 `extension/build/chrome-mv3-prod/`，打开 popup 检查：
- 首页：搜索框/筛选框有微阴影，RepoCard 无边框有阴影浮起
- 详情页：Star 块白色背景 + 阴影，README 卡片无边框
- 收藏页：RepoCard 与首页一致
- 骨架屏：pulse 动画 + 阴影"呼吸"效果正常
- 顶栏：蓝调扩散阴影柔和过渡

- [ ] **Step 3: 低对比度验证（可选）**

在 Windows 低亮度 / 高对比度模式下确认卡片分隔仍然可见。如果不足，后续可将 `bg-slate-50` → `bg-slate-100`。

---

### Task 9: 提交最终变更

```bash
git status
git log --oneline -8
```

确认所有 commit 整齐后，推送到远程。
