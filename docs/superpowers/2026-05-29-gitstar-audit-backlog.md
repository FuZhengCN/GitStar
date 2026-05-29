# 体检遗留问题

2026-05-29 全项目体检，已修复 2 项，剩余问题待处理。

## 重要不紧急

### 5. Sidebar 拖拽后无法复位
**位置**: `extension/contents/github-sidebar.tsx:112-139`
**现象**: 面板拖拽到 `position: fixed` 后无重置机制。折叠再展开不会清除 `floatPos`，拖错位置后无法恢复。
**方向**: 折叠时清除 `floatPos`，或添加双击标题栏回原位。

### 7. 选项页 Token scope 提示不完整
**位置**: `extension/options.tsx:127`, `locales/zh.json:43`
**现象**: 提示"只需勾选 public_repo 权限"，但细粒度 Token 需要 `star` scope。用户按提示创建 Token 后 Star 功能不可用。
**方向**: 补充细粒度 Token 说明，或 Star 失败时给出 scope 排查指引。

### 13. i18n fallback 链调整为 `lang → en → key`
**位置**: `extension/lib/i18n.tsx:56-65`
**现象**: 当前 fallback: `lang → zh → key`。英文用户缺失 key 时看到中文比看到 key 名更困惑。
**方向**: 改为 `lang → en → key`，en.json 的 key 本身就是英文提示。

## 不重要不紧急

### 3. Pagination 尾页按钮样式不一致
**位置**: `extension/components/Pagination.tsx:42`
尾页按钮 `px-3 py-1.5 text-sm`，其他按钮 `px-2.5 py-1 text-xs`。

### 4. DetailPage README 加载失败可能被隐藏
**位置**: `extension/popup.tsx:270-285`
极低概率边界条件：缓存写入空 readme 后再发生错误时误显示"无 README"。

### 6. SearchBar 首次挂载触发多余 onChange
**位置**: `extension/components/SearchBar.tsx:13,16-18`
挂载时 debounced 初始值 === value，触发一次无意义的 `onChange('')` → sessionStorage 写入。

### 8. popup.tsx 职责过重（579 行）
**位置**: `extension/popup.tsx`
含 6 个组件/函数，HomePage、DetailPage、FavoritesPage 应拆分到独立文件。

### 9. FavoritesPage fetchRepos 过于复杂
**位置**: `extension/popup.tsx:317-393`
76 行异步逻辑内嵌 useEffect，可提取为 `useFavoritesRepos` hook。

### 10. `getRepoDetail` 死代码
**位置**: `extension/lib/github.ts:119-159`
仅 sidebar 的 `loadRecommendations` 使用，可考虑统一用双阶段模式后移除。

### 11. 两个 onChanged 监听器模式不统一
**位置**: `extension/contents/github-sidebar.tsx:50-57` 和 `:359-368`
组件内用 useEffect 监听 token change，模块顶层用 addListener 监听 sidebar toggle。

### 12. FavoritesPage O(n²) 查找
**位置**: `extension/popup.tsx:435-441`
`reversedFavorites.map(fn => validRepos.find(...))`，可用 Map 优化，但收藏量通常不大。

### 14. Worker 复用
**位置**: `extension/lib/markdown.ts:28-51`
每次解析 new Worker() → terminate()，可复用单例减少创建开销。

### 15. 缓存 TTL 调优
repo info 5min → 10-15min，README 10min → 30min。

### 16. useDebounce 使用可简化
**位置**: `extension/components/SearchBar.tsx`
去掉中间 useState + useEffect，用 mounted ref 避免首次多余的 onChange。

### 17. Sidebar mousemove 常驻监听
**位置**: `extension/contents/github-sidebar.tsx:116-131`
拖拽结束后 `mousemove`/`mouseup` 监听器仍常驻，每次鼠标移动都调用 `onMove`（dragRef 为 null 立即返回）。可在拖拽开始时才添加，结束时立即移除。
