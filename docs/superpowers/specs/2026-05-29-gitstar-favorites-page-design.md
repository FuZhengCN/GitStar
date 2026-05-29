# GitStar 收藏列表页面设计

## 背景

插件已有收藏功能（`useFavorites` hook），用户可在 RepoCard 和 RepoHeader 中点击 ☆ 收藏项目，数据存于 `chrome.storage.local` 的 `gitstar-favorites` 键（`owner/repo` 字符串数组）。但缺少一个集中查看已收藏项目的页面，用户收藏后无处回顾。

## 目标

在 popup 中新增「我的收藏」页面，用户可查看、管理所有本地收藏的项目。

## 方案

新增独立路由 `#/favorites`，顶栏右侧加 ☆ 图标入口，收藏页复用现有 RepoCard 组件展示列表。

### 路由设计

| 路由 | 页面 | 说明 |
|------|------|------|
| `#/favorites` | 收藏列表（新增） | 展示所有本地收藏项目 |
| `#/project/:owner/:repo` | 详情页 | 不变 |
| `#/` | 首页 | 不变 |

**关键约束：** wouter 的 `path="/"` 是前缀匹配，会吃掉所有以 `/` 开头的路径。`/favorites` 必须注册在 `/` 之前，否则收藏页不可达。

### 导航流程

```
#/ (首页) → 点击顶栏 ☆ → #/favorites → 点击项目 → #/project/x/y → 浏览器后退 → #/favorites
```

wouter hash 路由天然保留浏览器历史，从详情页后退正确回到收藏页。

### 顶栏改动

标语「发现优质开源项目」完整保留。在标语右侧新增 ☆ 图标按钮。

顶栏在 `<Router>` 外部，无法使用 wouter 的 `useLocation()`。通过 `window.location.hash === '#/favorites'` 判断当前路由来控制 ☆ 按钮样式：

- 非收藏页：☆ 为白色，点击跳转 `#/favorites`
- 收藏页：☆ 为金色 `#f59e0b`（激活态），表示当前在收藏页

### 收藏页布局

```
┌─ 蓝底顶栏（标语 + ★）─────────────┐
├─ 内容区 ──────────────────────────┤
│  ← 返回发现                       │
│  ★ 我的收藏 (N)                    │
│  ┌─ RepoCard ───────────────────┐ │
│  │ 头像  项目名          ★(已收藏)│ │
│  │       描述                    │ │
│  │       ★ stars  🔤 language   │ │
│  └──────────────────────────────┘ │
│  ┌─ RepoCard ───────────────────┐ │
│  │ ...                          │ │
│  └──────────────────────────────┘ │
│  N 个项目加载失败 [重试]           │  ← 部分失败时显示
│  (空收藏时显示空状态)              │
└───────────────────────────────────┘
```

- 面包屑：「← 返回发现」链接回 `#/`
- 标题：「★ 我的收藏 (N)」，N 为收藏数量
- 列表：复用 `RepoCard` 组件，按最近收藏在前排列（`favorites` 数组反转）
- 点击 ☆ 取消收藏后从列表乐观移除

### 数据获取

收藏列表仅存储 `owner/repo` 字符串，展示需要的仓库元数据（名称、描述、Star 数等）需逐个获取。

**缓存优先 + 分批请求：**

1. 先从 `chrome.storage.local` 读取 favorites 数组
2. 对每个 `owner/repo`，先查 `repo:owner/repo` 缓存（`getCache`），命中且未过期的直接使用
3. 缓存 miss 或过期的项目，分批并发请求 `getRepoInfo()`，每批最多 5 个，批次间隔 200ms
4. 请求成功后写 `setCache` 更新缓存
5. 使用 `cancelled` 标记在 `useEffect` cleanup 中阻止组件卸载后 setState

**并发控制理由：** GitHub 有 secondary rate limit，无控制并发会触发 429。无 Token 用户限流 60 次/小时，5 个一批能避免瞬时耗尽配额。

**缓存复用：** 详情页用 `useStaleCache` 写入的 `repo:*` 缓存键，收藏页可直接读取。从详情页返回收藏页时，已查看过的项目秒出。

### 修改文件

| 文件 | 改动 |
|------|------|
| `extension/popup.tsx` | 新增 `FavoritesPage` 组件 + `#/favorites` 路由；顶栏新增 ☆ 入口 |
| `extension/components/ErrorState.tsx` | 新增可选 `onRetry` prop，渲染重试按钮 |
| `extension/components/RepoCard.tsx` | 无改动，直接复用 |

### 不改的文件

- `extension/hooks/useFavorites.ts` — 功能不变
- `extension/lib/github.ts` — 纯 API 层，不变
- `extension/lib/cache.ts` — 功能不变，收藏页直接调用 `getCache` / `setCache`
- `extension/components/RepoList.tsx` — 收藏页直接使用 RepoCard，不复用 RepoList（空状态和 loading 语义不同）
- `extension/contents/github-sidebar.tsx` — 内容脚本不涉及

## 状态处理

| 状态 | 条件 | 表现 |
|------|------|------|
| Storage 未就绪 | `favorites === null` | 轻量骨架屏（3 个卡片占位），不等同于空收藏 |
| Repo 数据加载中 | `favorites.length > 0`，请求进行中 | 骨架屏（5 个卡片占位） |
| 有收藏 | 请求完成，有成功结果 | RepoCard 列表，☆ 金色实心 |
| 空收藏 | `favorites.length === 0` | 空状态：「暂无收藏项目，去首页探索优质开源项目吧」+ 链接回首页 |
| 部分失败 | 部分请求失败 | 成功项目正常展示，列表底部提示「N 个项目加载失败」+ 重试链接 |
| 全部失败 | 所有请求失败 | ErrorState 组件（含 `onRetry` 重试按钮） |

**注意：** `favorites === null`（chrome.storage 尚未读取完毕）和 `favorites.length === 0`（无收藏）是两个不同的状态，必须先等 storage 读取完成再判断是否空收藏，避免闪现空状态文案。

## 交互细节

- 在收藏页点击 ☆ 取消收藏，项目从列表立即移除（乐观更新）
- 在收藏页点击项目名，跳转 `#/project/:owner/:repo`
- 在详情页收藏/取消收藏后返回收藏页，`useFavorites` 通过 `chrome.storage.onChanged` 监听感知变化。FavoritesPage 需依赖 favorites 数组变化来触发 repo 数据重新关联（不能写 `useEffect(..., [])` 空依赖）
- 浏览器后退从详情页回到收藏页，已缓存的 repo 数据秒出（缓存优先策略），miss 的按需分批获取
- 用户导航离开收藏页时，`useEffect` cleanup 设置 `cancelled = true`，阻止已发出请求的 setState

## 后续优化（本期不做）

- 收藏数量超过 50 时考虑分页或虚拟滚动
- 超过 100 个收藏时考虑将 repo 元数据完整存入收藏（避免每次批量请求）
