# README 收起交互优化 — 设计文档

**日期：** 2026-06-02  
**范围：** Chrome 扩展 DetailPage 展开 README 后的收起操作优化

## 问题诊断

当前展开 README 后有两种收起方式，但都不够直观：

| # | 问题 | 严重度 |
|---|------|--------|
| 1 | 标题栏使用 `▾`（向下箭头）表示可点击收起，语义与"收起"矛盾，且无按钮形态，用户不知道可点击 | 高 |
| 2 | 底部"收起 README ▴"文字按钮需滚动到 README 最末尾才能看到，长文档中不可达 | 高 |

## 方案选择

选择 **方案 B：浮动收起按钮**。在右下角现有浮动按钮组（TOC + 返回顶部）中新增一个蓝底白字的收起按钮，始终可见。

理由：
- 与现有浮动按钮模式一致，用户心智模型统一（"操作按钮在右下角"）
- 收起按钮始终固定可见，无论滚动位置
- 统一收起入口，移除分散的标题栏点击和底部文字按钮

## 设计

### 1. 浮动按钮组新增收起按钮

按钮顺序（从上到下）：

1. 📋 目录 — `hasToc === true` 时显示
2. ↑ 返回顶部 — `scrollY > 200px` 时显示
3. ✕ 收起 — **始终显示**（展开模式下）

收起按钮样式：
- 与 TOC/返回顶部相同的尺寸（`w-7 h-7 rounded-full`）和阴影
- 白底 + 蓝字 + 蓝色边框（`bg-white text-[#3b82f6] border-[#3b82f6]`），与"展开全部"按钮首尾呼应，同时保持低视觉侵入
- `aria-label="收起 README"`
- hover 态：`hover:bg-[#eff6ff]`

### 2. ReadmeViewer 精简

- 移除标题栏 `onClick={onCollapse}` 点击行为
- 移除标题栏 `▾` 图标
- 移除底部"收起 README ▴"按钮（`expanded && (...)` 整块）
- 移除 `onCollapse` prop（收起操作由浮动按钮触发，不再需要传给 ReadmeViewer）
- 移除 `expanded` 为 true 时标题栏的 hover 样式（`cursor-pointer hover:bg-[#eff6ff] active:bg-[#dbeafe]`）
- 展开模式下标题栏改为常驻浅蓝底色（`bg-[#eff6ff]`），作为展开状态的视觉锚点，替代 hover 交互提示

### 3. DetailPage 调整

- 浮动按钮组 `<div>` 中新增收起按钮
- `handleCollapse` 回调直接传给浮动按钮的 `onClick`

### 4. 交互

- 点击收起 → `handleCollapse()` → `setReadmeExpanded(false)` + `window.scrollTo({ top: 0, behavior: 'smooth' })`（平滑滚动已实现）
- TOC 面板打开时点收起：TOC 和浮动按钮组在 `readmeExpanded` 分支内，随组件卸载自然销毁，无泄漏风险

## 涉及文件

| 文件 | 变更 |
|------|------|
| `extension/components/ReadmeViewer.tsx` | 移除标题栏点击/▾/底部按钮，移除 `onCollapse` prop |
| `extension/popup.tsx` (DetailPage) | 浮动按钮组新增收起按钮，调整 ReadmeViewer 传参 |

## Non-Goals

- 不改变 TOC 和返回顶部按钮的逻辑
- 不改变 MiniBar
- 不改变预览模式（未展开）的任何交互
- 不改变 `handleCollapse` 逻辑本身
