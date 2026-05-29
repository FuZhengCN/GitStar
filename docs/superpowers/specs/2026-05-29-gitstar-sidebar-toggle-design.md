# GitStar Sidebar Toggle Design (2026-05-29)

## Purpose

在选项页添加侧边栏推荐开关，允许用户在不需要时关闭 GitHub 页面的侧边栏注入。

## Design

### Storage

- Key: `gitstar-sidebar-enabled`
- Storage: `chrome.storage.local`
- Type: `boolean`
- Default: `true` (开启)

### Options Page (`extension/options.tsx`)

在语言选择器下方新增一个 toggle 开关组件：

- 标签：「GitHub 侧边栏推荐」
- 说明文案：「在 GitHub 仓库页面右侧显示基于 topic 相似度的热门项目推荐」
- 交互：点击切换开/关，状态即时写入 `chrome.storage.local`
- 初始化：从 `chrome.storage.local` 读取 `gitstar-sidebar-enabled`，默认 `true`

### Sidebar Content Script (`extension/contents/github-sidebar.tsx`)

`mountPanel()` 调用前增加判断：

1. 读取 `chrome.storage.local` 中的 `gitstar-sidebar-enabled`
2. 若为 `false`，跳过 DOM 挂载，不注入任何元素
3. 监听 `chrome.storage.onChanged`：
   - `gitstar-sidebar-enabled` 变为 `true` → 调用 `mountPanel()`
   - `gitstar-sidebar-enabled` 变为 `false` → 调用 `cleanup()` 移除已注入元素

### i18n

`zh.json`:
```json
"sidebarToggle": "GitHub 侧边栏推荐",
"sidebarToggleDesc": "在 GitHub 仓库页面右侧显示基于 topic 相似度的热门项目推荐"
```

`en.json`:
```json
"sidebarToggle": "GitHub Sidebar Recommendations",
"sidebarToggleDesc": "Show similar popular projects based on topic similarity in the GitHub repository sidebar"
```

## Non-Goals

- 不改变 popup 的任何行为
- 不改变侧边栏本身的功能逻辑
