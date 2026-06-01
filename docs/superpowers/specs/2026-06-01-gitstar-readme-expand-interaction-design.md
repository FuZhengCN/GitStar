# README 展开交互改进 — 设计文档

**日期：** 2026-06-01  
**范围：** Chrome 扩展 DetailPage 展开 README 后的交互体验

## 问题诊断

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 展开 README 后 RepoHeader 替换为 MiniBar，丢失描述/Star 数/GitHub 链接/项目详情 | 高 |
| 2 | TOC 按钮在非 sticky 标题栏内，长文档滚动后不可达 | 高 |
| 3 | TocOverlay 用 absolute 定位（相对 README 容器），滚动后可能出现在视口外 | 中 |
| 4 | 收起 README 用 scrollTo(0,0) 瞬间跳转，无过渡 | 低 |
| 5 | 长文档缺少「返回顶部」快捷操作 | 低 |

## 方案选择

选择 **增强 MiniBar**（方案 B），而非保留完整 RepoHeader（方案 A）。理由：400px popup 空间有限，紧凑条 + 可展开详情在空间效率和信息完整性之间取得平衡。

## 设计

### 1. 增强 MiniBar

MiniBar 从单行扩展为双行结构：

**第 1 行（主行）：** 头像 + 仓库名（下方 Star 数量小字） + Star 按钮 + 收藏按钮 + GitHub 链接图标 + 详情展开箭头

**第 2 行（可展开）：** 仓库描述（单行截断）+ 项目详情（创建/更新时间、License、Topics）

Props 变更：
- 新增：`detail: RepoDetail`（替代 8 个独立 prop，避免 prop drilling）
- 新增内部状态：`detailsExpanded`
- 详情展开箭头使用 `aria-label`，不依赖 ▾ 字符传达语义

### 2. 浮动操作按钮

展开 README 后，右下角 fixed 定位两个圆形按钮（上下排列，间距 6px）：

- **📋 目录**（`aria-label="目录"`）：点击弹出 TocOverlay。**仅在 README 中存在 h2/h3 标题时渲染**，避免无标题时弹出空面板。
- **↑ 返回顶部**（`aria-label="回到顶部"`）：仅在 `scrollY > 200px` 时显示，点击平滑滚动到顶部。

按钮样式：`w-7 h-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[#e5e7eb]`

**内容区底部留白：** 展开模式下 `#readme-content` 需要 `pb-16`（或等效），防止浮动按钮遮挡 README 底部的代码块、表格等内容。

### 3. TocOverlay 定位修复

- 面板从 `absolute right-0 top-8` 改为 `fixed`，定位到浮动目录按钮上方
- 按钮位置和 TOC 面板位置均基于视口（`bottom: X; right: Y`）
- 背景遮罩保持 `fixed inset-0`

### 4. ReadmeViewer 精简

移除标题栏中的 TOC 按钮（`onToggleToc`/`tocVisible` props），TOC 功能完全由浮动按钮接管。标题栏保留文件名、大小、阅读时间显示。

### 5. 收起平滑滚动

`handleCollapse` 中 `window.scrollTo(0, 0)` → `window.scrollTo({ top: 0, behavior: 'smooth' })`

### 6. 无障碍

- 浮动按钮（📋/↑）添加 `aria-label`，不依赖 emoji 传达语义
- 详情展开箭头使用 `aria-label` + `aria-expanded`，不依赖 ▾/▴ 字符
- TOC 面板出现时焦点移入、关闭时焦点回到触发按钮
- 浮动按钮使用 `<button>` 原生元素（键盘可聚焦）

### 7. 性能

- scroll 监听使用 `passive: true`，避免阻塞主线程
- 返回顶部按钮的显示/隐藏用 `requestAnimationFrame` 节流，不在 scroll 事件中直接 setState

## 涉及文件

| 文件 | 变更 |
|------|------|
| `extension/components/MiniBar.tsx` | 增强布局 + 新增 props + 可展开详情 |
| `extension/components/ReadmeViewer.tsx` | 移除 TOC 按钮相关 props/UI |
| `extension/components/TocOverlay.tsx` | absolute → fixed，按钮相对定位 |
| `extension/popup.tsx` (DetailPage) | 浮动按钮组 + scroll 监听 + 增强 MiniBar 传参 + 平滑收起 |

## Non-Goals

- 不改变预览模式（未展开）的任何交互
- 不改变 RepoHeader（预览模式照旧）
- 不改变 TOC 提取/导航逻辑（仅改变触发方式和面板定位）
- 不改变缓存/数据加载逻辑
