# Popup 视觉柔化设计

**日期：** 2026-05-29
**方案：** B — 阴影层次柔化

## 目标

当前 popup 所有卡片用硬边框（`border-[#f3f4f6]`）分隔，白色背景，整体方正规整但生硬。通过阴影替代边框、背景分层，让 popup 视觉更柔和有层次。

## 原则

- 不改配色方案、布局结构、字体大小、间距
- 不改任何功能逻辑
- 只动 CSS 类名（Tailwind），不动组件结构

## 改动清单

### 1. 外层容器背景 `popup.tsx`

| 位置 | 当前 | 改为 |
|------|------|------|
| 骨架屏外层 (L524) | `bg-white` | `bg-slate-50` |
| 主容器外层 (L544) | `bg-white` | `bg-slate-50` |

### 2. 顶栏阴影 `popup.tsx`

| 位置 | 当前 | 改为 |
|------|------|------|
| 骨架屏顶栏 (L525) | `shadow-md` | `shadow-[0_2px_8px_rgba(59,130,246,0.25)]` |
| 主顶栏 (L545) | `shadow-md` | `shadow-[0_2px_8px_rgba(59,130,246,0.25)]` |

蓝调扩散阴影，与主蓝色系统一，视觉上顶栏不再"切"在白色背景上。

### 3. RepoCard `RepoCard.tsx`

| 属性 | 当前 | 改为 |
|------|------|------|
| 边框 | `border border-[#f3f4f6]` | 移除 |
| 圆角 | `rounded-lg` | `rounded-xl` |
| 阴影 | `shadow-sm` | `shadow-[0_1px_4px_rgba(0,0,0,0.06)]` |
| hover 阴影 | `hover:shadow-md` | `hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)]` |

### 4. 搜索框 `SearchBar.tsx`

在现有 class 追加 `shadow-[0_1px_3px_rgba(0,0,0,0.04)]`，输入框略微"浮起"。

### 5. 筛选下拉框 `FilterBar.tsx`

在 `selectClass` 常量追加 `shadow-[0_1px_2px_rgba(0,0,0,0.03)]`。

### 6. Star 信息块 `RepoHeader.tsx`

| 属性 | 当前 | 改为 |
|------|------|------|
| 边框 | `border border-[#f3f4f6]` | 移除 |
| 阴影 | 无 | `shadow-[0_1px_4px_rgba(0,0,0,0.04)]` |

### 7. README 卡片 `ReadmeViewer.tsx`

| 属性 | 当前 | 改为 |
|------|------|------|
| 外层边框 | `border border-[#f3f4f6]` | 移除 |
| 外层阴影 | 无 | `shadow-[0_1px_4px_rgba(0,0,0,0.04)]` |

### 8. 骨架屏卡片 `popup.tsx` / `RepoList.tsx`

同 RepoCard 处理：去边框 → 加阴影，`rounded-lg` → `rounded-xl`，`bg-white` 保留（骨架屏白色卡片在 slate-50 背景上自然浮起）。

涉及位置：
- `popup.tsx` L397（FavoritesPage 未就绪骨架屏）
- `popup.tsx` L450（FavoritesPage 加载中骨架屏）
- `popup.tsx` L269（DetailPage README 加载骨架屏）
- `RepoList.tsx` L17（首页列表骨架屏）

### 9. 不改动的部分

- Pagination 按钮（小控件，保持边框即可）
- 错误提示框（`bg-red-50 border-red-200`，保留边框更清晰）
- RepoHeader 顶部分隔线（`border-b border-[#f3f4f6]`，导航分隔保留）
- 按钮样式全部不变

## 覆盖范围

仅 CSS 类名修改，涉及文件：
- `extension/popup.tsx`
- `extension/components/RepoCard.tsx`
- `extension/components/SearchBar.tsx`
- `extension/components/FilterBar.tsx`
- `extension/components/RepoHeader.tsx`
- `extension/components/ReadmeViewer.tsx`
- `extension/components/RepoList.tsx`
