# 收藏列表页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 popup 中新增 `#/favorites` 路由和 FavoritesPage 组件，顶栏右侧加 ☆ 入口，用户可查看、管理所有本地收藏的项目。

**Architecture:** 修改 `ErrorState.tsx` 新增 `onRetry` prop；修改 `popup.tsx` 新增 `FavoritesPage` 组件（缓存优先 + 分批请求获取仓库元数据）、注册路由、顶栏新增 ☆ 按钮。不复用 RepoList（空状态和 loading 语义不同），直接使用 RepoCard。

**Tech Stack:** React 18 + TypeScript + wouter hash 路由 + chrome.storage.local API

---

## 文件结构

| 操作 | 文件 | 职责 |
|------|------|------|
| 修改 | `extension/components/ErrorState.tsx` | 新增可选 `onRetry` prop |
| 修改 | `extension/popup.tsx` | 新增 FavoritesPage 组件 + 路由 + 顶栏 ☆ 按钮 |

---

### Task 1: ErrorState 新增 onRetry prop

**Files:**
- Modify: `extension/components/ErrorState.tsx`

- [ ] **Step 1: 修改 ErrorState 接口和实现**

把 `extension/components/ErrorState.tsx` 的 Props 接口和组件实现替换为：

```tsx
interface Props {
  title?: string;
  message?: string;
  onBack?: () => void;
  onRetry?: () => void;
}

export default function ErrorState({
  title = '出错了',
  message = '请稍后重试',
  onBack,
  onRetry,
}: Props) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">{title}</p>
      <p className="text-gray-300 text-sm mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-[#3b82f6] hover:underline mr-3">
          重试
        </button>
      )}
      {onBack && (
        <button onClick={onBack} className="text-sm text-[#3b82f6] hover:underline">
          ← 返回首页
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 验证编译通过**

```bash
cd extension && npm run build
```

Expected: 构建成功。现有调用处（`onBack` 只传此 prop，不传 `onRetry`）不受影响，因为 `onRetry` 是可选的。

- [ ] **Step 3: 提交**

```bash
git add extension/components/ErrorState.tsx
git commit -m "feat: ErrorState 新增 onRetry prop 支持重试按钮"
```

---

### Task 2: 新增 FavoritesPage 组件和路由

**Files:**
- Modify: `extension/popup.tsx`

- [ ] **Step 1: 新增顶部 import**

在 `extension/popup.tsx` 顶部，现有 import 语句之后，新增 `getCache`、`setCache`、`isFresh` 的导入：

```tsx
import { getCache, setCache, isFresh } from './lib/cache';
```

在现有 `import { Repo, RepoDetail, SearchParams } from './lib/types';` 所在行中确认 `Repo` 已导入（已存在，无需改动）。

- [ ] **Step 2: 新增 hash change hook 和 FavoritesPage 组件**

在 `popup.tsx` 的 `DetailPage` 函数后面、`export default function PopupIndex()` 前面，新增以下代码块：

```tsx
function useCurrentHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash;
}

function FavoritesPage() {
  const { favorites, toggle: toggleFavorite, loaded } = useFavorites();
  const [repos, setRepos] = useState<(Repo | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    if (!loaded) return;
    if (!favorites || favorites.length === 0) {
      setRepos([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    const CACHE_TTL = 5 * 60 * 1000;
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 200;

    const fetchRepos = async () => {
      setLoading(true);
      setError(false);
      setFailedCount(0);

      const results: (Repo | null)[] = new Array(favorites.length).fill(null);
      const missIndices: number[] = [];

      for (let i = 0; i < favorites.length; i++) {
        if (cancelled) return;
        const cached = await getCache<Repo>(`repo:${favorites[i]}`);
        if (cached && isFresh(cached, CACHE_TTL)) {
          results[i] = cached.data;
        } else {
          missIndices.push(i);
        }
      }

      if (missIndices.length > 0) {
        setRepos([...results]);
      }

      let failures = 0;
      for (let b = 0; b < missIndices.length; b += BATCH_SIZE) {
        if (cancelled) return;
        const batch = missIndices.slice(b, b + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(idx => {
            const [owner, repo] = favorites[idx].split('/');
            return getRepoInfo(owner, repo);
          })
        );
        batchResults.forEach((r, j) => {
          if (cancelled) return;
          const idx = batch[j];
          if (r.status === 'fulfilled') {
            results[idx] = r.value;
            setCache(`repo:${favorites[idx]}`, r.value);
          } else {
            failures++;
          }
        });
        setRepos([...results]);
        setFailedCount(failures);

        if (b + BATCH_SIZE < missIndices.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      if (!cancelled) {
        setRepos([...results]);
        setFailedCount(failures);
        if (failures === favorites.length) {
          setError(true);
        }
        setLoading(false);
      }
    };

    fetchRepos();
    return () => { cancelled = true; };
  }, [favorites, loaded, retryKey]);

  // Storage 未就绪
  if (!loaded || favorites === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-[#f3f4f6] rounded-lg p-3 bg-white animate-pulse">
            <div className="flex gap-2.5 items-start">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // 空收藏
  if (favorites.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[#6b7280] text-base mb-2">暂无收藏项目</p>
        <p className="text-[#9ca3af] text-sm mb-4">去首页探索优质开源项目吧</p>
        <a href="#/" className="text-sm text-[#3b82f6] hover:underline">← 返回发现</a>
      </div>
    );
  }

  // 全部失败
  if (error) {
    return (
      <ErrorState
        title="加载失败"
        message="无法获取收藏项目信息"
        onRetry={() => setRetryKey(k => k + 1)}
        onBack={() => { window.location.hash = '#/'; }}
      />
    );
  }

  // Repo 数据加载中（有缓存命中时可能部分数据已展示）
  // 过滤有效结果并按最近收藏在前排序
  const reversedFavorites = [...favorites].reverse();
  const validRepos = repos.filter((r): r is Repo => r !== null);
  const orderedRepos = reversedFavorites
    .map(fn => validRepos.find(r => r.full_name === fn))
    .filter((r): r is Repo => r !== undefined);

  return (
    <div>
      <nav className="text-xs mb-3">
        <a href="#/" className="text-[#3b82f6] hover:underline cursor-pointer">← 返回发现</a>
      </nav>
      <h2 className="text-[15px] font-bold text-[#1e1b4b] mb-3">★ 我的收藏 ({favorites.length})</h2>
      {loading && orderedRepos.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-[#f3f4f6] rounded-lg p-3 bg-white animate-pulse">
              <div className="flex gap-2.5 items-start">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {orderedRepos.map(repo => (
            <RepoCard
              key={repo.id}
              repo={repo}
              isFavorite={true}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
      {failedCount > 0 && !error && (
        <div className="text-center text-xs text-[#9ca3af] mt-3">
          {failedCount} 个项目加载失败
          {' '}
          <button
            onClick={() => setRetryKey(k => k + 1)}
            className="text-[#3b82f6] hover:underline"
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 修改路由注册**

找到 `popup.tsx` 中 `<Router hook={useHashLocation}>` 内部的 `<Route>` 列表（约在 291-296 行）：

```tsx
<Route path="/project/:owner/:repo">
  {(params) => <DetailPage params={params} />}
</Route>
<Route path="/" component={() => <HomePage hasToken={hasToken} />} />
```

在 `/` 路由**之前**插入 `/favorites` 路由，变为：

```tsx
<Route path="/favorites" component={FavoritesPage} />
<Route path="/project/:owner/:repo">
  {(params) => <DetailPage params={params} />}
</Route>
<Route path="/" component={() => <HomePage hasToken={hasToken} />} />
```

- [ ] **Step 3: 修改顶栏 — 新增 ☆ 按钮**

在 `PopupIndex` 函数体的开头（`const [tokenReady, setTokenReady] = ...` 之后），新增 hash 状态 hook 调用：

```tsx
const hash = useCurrentHash();
```

然后找到两处顶栏渲染（token 未就绪的骨架顶栏和正常顶栏），分别为它们添加 ☆ 按钮。

**骨架顶栏**（`!tokenReady` 分支，约 263-278 行）：
```tsx
<div style={{ width: POPUP_WIDTH }} className="min-h-[720px] bg-white flex flex-col">
  <div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
    <h1 className="text-base font-bold text-white flex items-center gap-2">
      <GitStarIcon />
      <span className="translate-y-[-1px]">GitStar</span>
    </h1>
    <span className="text-[11px] text-white/85 font-medium">发现优质开源项目</span>
  </div>
  ...
```

骨架顶栏不需要 ☆ 按钮（无交互状态），保持不变。

**正常顶栏**（`tokenReady` 分支，约 282-298 行），将：

```tsx
<div style={{ width: POPUP_WIDTH, minHeight: '720px' }} className="bg-white flex flex-col">
  <div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
    <h1 className="text-base font-bold text-white flex items-center gap-2">
      <GitStarIcon />
      <span className="translate-y-[-1px]">GitStar</span>
    </h1>
    <span className="text-[11px] text-white/85 font-medium">发现优质开源项目</span>
  </div>
```

替换为：

```tsx
<div style={{ width: POPUP_WIDTH, minHeight: '720px' }} className="bg-white flex flex-col">
  <div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
    <h1 className="text-base font-bold text-white flex items-center gap-2">
      <GitStarIcon />
      <span className="translate-y-[-1px]">GitStar</span>
    </h1>
    <div className="flex items-center gap-2.5">
      <span className="text-[11px] text-white/85 font-medium">发现优质开源项目</span>
      <a
        href="#/favorites"
        className={`text-lg leading-none no-underline transition-colors ${hash === '#/favorites' ? 'text-[#f59e0b]' : 'text-white/85 hover:text-white'}`}
        title="我的收藏"
      >
        ★
      </a>
    </div>
  </div>
```

- [ ] **Step 4: 验证编译通过**

```bash
cd extension && npm run build
```

Expected: 构建成功，无类型错误。

- [ ] **Step 5: 功能验证**

```bash
cd extension && npm run build
```

构建产物在 `extension/build/chrome-mv3-prod/`。

在 Chrome `chrome://extensions/` → "加载已解压的扩展程序" 指向该目录。手动验证以下场景：

| 场景 | 预期结果 |
|------|----------|
| 打开 popup，首页顶栏右侧有白色 ☆ | ☆ 可见，点击跳转收藏页 |
| 收藏页无收藏 | 显示「暂无收藏项目」+ 引导回首页 |
| 首页收藏一个项目，再到收藏页 | 项目正常展示（repo 信息完整），☆ 金色实心 |
| 收藏页点击 ☆ 取消收藏 | 项目立即从列表移除 |
| 收藏页点击项目名 | 跳转详情页，正常展示 |
| 浏览器后退 | 从详情页回到收藏页，数据秒出 |
| 顶栏 ☆ 在收藏页颜色 | 金色 `#f59e0b` |
| 顶栏 ☆ 在首页/详情页颜色 | 白色 |

- [ ] **Step 6: 提交**

```bash
git add extension/popup.tsx
git commit -m "feat: 新增收藏列表页面 (#/favorites 路由 + 顶栏 ☆ 入口)"
```

---
