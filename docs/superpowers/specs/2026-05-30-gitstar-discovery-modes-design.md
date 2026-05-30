# GitStar v1.1 — 发现模式 Design Spec

## Overview

为扩展增加"发现模式"功能，让用户可以在三种视角下发现 GitHub 项目：热门（经典高星）、新星（增长最快）、活跃（近期频繁更新）。模式切换通过 Header 胶囊按钮实现，切换时联动 FilterBar 默认值，新星模式下 RepoCard 显示 ★/天 增长速率 badge。

零后端改动，纯前端扩展。借鉴 `github-discover` npm 包的 star-per-day 量化思路，使用总星数+速率双重门槛过滤噪声。

---

## Motivation

- 用户最初诉求："涨星速度最快的项目"——当前仅支持按 Star 总数/Forks/更新时间排序
- 官方 API 不支持增长率排序，但可以通过 `created` 日期过滤 + 前端计算 stars/day 近似
- 不需要跟踪 star 历史，只需要"近期创建 + 高星"的代理指标
- 现有搜索/筛选/分页基础设施完全足以支撑三种模式

---

## Feature: 三种发现模式

### 模式定义

| 模式 | 排序 | 默认时间范围 | Header 颜色 | 特殊行为 |
|------|------|------------|-----------|---------|
| 🔥 热门 | `stars` | 全部时间 | 纯蓝 `#3b82f6` | 无，即当前 v1.0 行为 |
| 🚀 新星 | `stars` | 本周 | 蓝紫渐变 `#3b82f6 → #8b5cf6` | RepoCard 显示 ★/天 badge |
| 📈 活跃 | `updated` | 本月 | 蓝绿渐变 `#3b82f6 → #10b981` | 无 |

三种模式改变的是浏览视角，底层都是 GitHub Search API，不新增 API 调用。

### 模式切换入口

在 Header 蓝底标题右侧、收藏按钮左侧，增加白色半透明胶囊按钮：

```
★ GitStar   [🚀 新星 ▾]          ★ 收藏 (3)
```

- 按钮样式：`bg-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.25)]` 圆角胶囊，和右侧收藏按钮样式体系一致
- 非热门模式时：`bg-[rgba(255,255,255,0.22)] border-[rgba(255,255,255,0.4)]` 加亮 + font-weight 加粗，暗示"当前不在默认模式"
- 点击弹出 mini 下拉菜单（3 选项，自定义实现），当前模式高亮 + ✓。下拉用绝对定位 div + 点击外部关闭（约 40 行）
- 下拉选项格式：emoji + 模式名 + 一行描述文字（描述文字从 i18n `mode.*.desc` key 获取）
- **`discoverProjects` 文本移除**：模式胶囊按钮的文字本身已指示当前视角（"热门"/"新星"/"活跃"），不需要额外的描述性文字。Header 布局精简为：标题 + 模式按钮 + 收藏按钮

### Header 背景渐变

模式切换时 Header 背景色平滑过渡（CSS `transition: background 300ms`）。变化幅度控制在 ~20%，保持品牌识别。

- 热门：纯蓝（默认，不变）
- 新星：`linear-gradient(135deg, #3b82f6, #8b5cf6)` 蓝到紫
- 活跃：`linear-gradient(135deg, #3b82f6, #10b981)` 蓝到绿

**Header shadow 暂不跟随模式颜色变化**：当前 shadow 硬编码为蓝色 `rgba(59,130,246,0.25)`，模式切换后保持蓝色投影。后续迭代再处理。

### 模式切换联动规则

模式单向影响 FilterBar 默认值，不反向：

```
模式按钮 → 设置 FilterBar 时间/排序默认值 → 触发搜索
FilterBar 手动修改 → 不影响模式按钮（用户主动选择）
```

切换模式时：
- ✅ 保留搜索词、语言筛选
- ✅ 时间下拉框自动切换为模式默认值（200ms 边框 flash 动画建立因果联系）
- ✅ 排序下拉框自动切换为模式默认值（同上 flash）
- ✅ 页码重置为 1
- ✅ 触发搜索

### FilterBar 联动 Flash 动画

模式切换时，时间/排序下拉框边框短暂变为模式色（新星=紫 `#8b5cf6`，活跃=绿 `#10b981`），200ms 后淡出回默认 `#e5e7eb`。

**触发方式**：FilterBar 接收 `flashMode` prop（`DiscoveryMode | null`），父组件 `useEffect` 中在模式切换时设置 `flashMode = 新mode`，200ms `setTimeout` 后置为 `null`。FilterBar 中 `flashMode !== null` 时给对应 `<select>` 添加 `animate-[filter-flash_200ms_ease-out]` 类。

动画定义在 `assets/tailwind.css`：

```css
@keyframes filter-flash {
  0%   { border-color: var(--flash-color); box-shadow: 0 0 0 1px var(--flash-color); }
  100% { border-color: #e5e7eb; box-shadow: none; }
}
```

---

## Feature: ★/天 增长速率 Badge

### 借鉴 github-discover 的双重门槛

github-discover 对不同周期设最低总星数门槛（日≥60、周≥500、月≥4000、年≥10000），目的是过滤"样本太小"的噪声项目。我们借鉴这个思路：

```typescript
function calcStarsPerDay(repo: Repo, mode: DiscoveryMode): number | null {
  if (mode !== 'rising') return null;

  // 1. 总星数门槛（过滤噪声）
  if (repo.stargazers_count < STAR_VELOCITY_MIN_STARS) return null; // 500

  // 2. 速率计算
  const ageDays = Math.max(1,
    (Date.now() - new Date(repo.created_at).getTime()) / 86400000
  );
  const velocity = Math.floor(repo.stargazers_count / ageDays);

  // 3. 速率门槛
  if (velocity < STAR_VELOCITY_MIN_PER_DAY) return null; // 10

  return velocity;
}
```

### 显示阈值

| 常量 | 值 | 说明 |
|------|---|------|
| `STAR_VELOCITY_MIN_STARS` | 500 | 最低总星数，借鉴 github-discover 周榜阈值 |
| `STAR_VELOCITY_MIN_PER_DAY` | 10 | 最低日增速率 |
| `STAR_VELOCITY_MAX_AGE_DAYS` | 30 | 仅对 30 天内创建的项目显示 badge |

**关于 30 天上限**：新星模式默认时间范围为"本周"（7 天），默认搜索结果均 ≤ 7 天，30 天上限不会被触发。该阈值仅在用户手动扩大时间范围（如"本月"）时生效，防止对创建较久的项目显示偏低的 ★/天。

### Badge 样式

琥珀色底 + 深琥珀字，放在 RepoCard 标题右侧：

```
owner/awesome-repo  [🚀 127 ★/天]
```

- 背景 `#fef3c7`，文字 `#92400e`
- `text-[10px] px-1.5 py-px rounded font-semibold`
- 仅在新星模式下才计算和显示

---

## i18n

新增约 8 个翻译 key：

| key | zh | en |
|-----|----|----|
| `mode.hot` | 热门 | Hot |
| `mode.rising` | 新星 | Rising |
| `mode.active` | 活跃 | Active |
| `mode.hot.desc` | 按 Star 总数发现经典项目 | Discover classic projects by total stars |
| `mode.rising.desc` | 近期高星，按增长速率排序 | Recent high-star repos sorted by growth |
| `mode.active.desc` | 近期频繁更新的高星项目 | Recently updated high-star repos |
| `badge.starsPerDay` | {n} ★/天 | {n} ★/day |
| `empty.rising` | 本周暂无满足阈值的新星项目，试试扩大时间范围 | No rising stars this week, try expanding the time range |

---

## Components

### 改动文件

| 文件 | 改动 | 行数估计 |
|------|------|---------|
| `popup.tsx` | Header 区域加模式按钮 + `mode` state；HomePage 传 mode 给 RepoCard；模式下拉组件 | +40 |
| `components/FilterBar.tsx` | 接收 `mode` prop，模式切换时联动时间/排序默认值 + flash 动画 | +15 |
| `components/RepoCard.tsx` | 接收 `starsPerDay?: number` prop，条件渲染 badge | +8 |
| `lib/constants.ts` | 模式定义、模式颜色、阈值常量 | +20 |
| `lib/types.ts` | 新增 `DiscoveryMode` 类型 | +3 |
| `locales/zh.json` | 新增翻译 key | +8 |
| `locales/en.json` | 新增翻译 key | +8 |
| `assets/tailwind.css` | FilterBar 联动 flash 动画 keyframes | +10 |

### 不改的文件

- `lib/github.ts` — `buildSearchQuery` 已有 `sort` 和 `created` 参数，完全覆盖所有模式。**注意：`searchRepos()` 需补充提取 `created_at` 字段（GitHub Search API 返回项中包含该字段，当前未使用），约 +2 行**
- `lib/cache.ts` — 缓存策略不变
- `hooks/useStaleCache.ts` — SWR 逻辑不变（已有 `cancelled` 标记可丢弃旧响应，不需要 AbortController）
- `components/SearchBar.tsx` — 搜索行为不变
- `components/Pagination.tsx` — 分页逻辑不变
- `options.tsx` — 选项页不变
- `contents/github-sidebar.tsx` — Content Script 不变

---

## Data Flow

```
PopupIndex
  ├─ mode: DiscoveryMode (state, default 'hot')
  ├─ Header
  │    └─ 模式胶囊按钮 (onClick → setMode + 联动 FilterBar)
  ├─ HomePage
  │    ├─ FilterBar (mode prop → 联动时间/排序默认值)
  │    └─ RepoList
  │         └─ RepoCard (mode='rising' → calcStarsPerDay → badge)
  └─ [DetailPage, FavoritesPage 不变]

API 层完全不变:
  popup → lib/github.ts → fetch('api.github.com/search/repositories?...sort={sort}&created={created}')
```

### 模式 → FilterBar 时间值映射

`ModeConfig.created` 使用语义值 (`''` / `'week'` / `'month'`)，需在 PopupIndex 中运行时映射为 FilterBar 的 `timeRange` 动态日期格式（如 `>2026-05-23`）。复用 `FilterBar.getTimeRanges()` 的计算逻辑：

```typescript
// popup.tsx — 模式切换时
function getModeTimeRange(created: string): string {
  switch (created) {
    case 'week':  return getTimeRangeValue('week');  // 计算本周起始 ISO 日期
    case 'month': return getTimeRangeValue('month'); // 计算本月起始 ISO 日期
    default:      return '';  // 全部时间
  }
}
```

`getTimeRangeValue` 从 FilterBar 的 `getTimeRanges()` 逻辑中提取为 `lib/constants.ts` 的导出函数。

### 类型定义

```typescript
// lib/types.ts
export type DiscoveryMode = 'hot' | 'rising' | 'active';

export interface ModeConfig {
  mode: DiscoveryMode;
  sort: 'stars' | 'updated';
  created: string;  // '' | 'week' | 'month' — 语义值，运行时映射为动态日期
}

// lib/constants.ts
export const DISCOVERY_MODES: Record<DiscoveryMode, ModeConfig> = {
  hot:    { mode: 'hot',    sort: 'stars',   created: '' },
  rising: { mode: 'rising', sort: 'stars',   created: 'week' },
  active: { mode: 'active', sort: 'updated', created: 'month' },
};

// ModeConfig 不包含 label——label 通过 i18n t() 在组件中获取，emoji 从常量映射获取
export const MODE_EMOJI: Record<DiscoveryMode, string> = {
  hot: '🔥', rising: '🚀', active: '📈',
};
```

**`Repo` 类型需补充 `created_at`**：GitHub Search API 返回项中包含该字段，当前 `types.ts` 和 `searchRepos()` 均未使用。需在 `Repo` 接口加 `created_at: string`，`searchRepos()` 映射加 `created_at: item.created_at`。

---

## Edge Cases

| 场景 | 处理 |
|------|------|
| 新星模式下搜索结果为空 | 空状态使用 `empty.rising` key 提示"试试扩大时间范围" |
| `repo.created_at` 缺失 | 跳过 badge 计算，静默降级（不显示 badge） |
| 新星模式 + 项目 < 500★ | 正常显示 RepoCard，不显示 badge |
| 模式切换快速连点 | 使用 `useDebounce` 或 AbortController 取消上一次搜索请求 |
| 从详情页返回 | sessionStorage 恢复搜索参数，`mode` 通过 PopupIndex state 保持（不写 sessionStorage，关闭 popup 即重置为 hot） |
| 非 Chrome 环境（dev 模式） | `mode` 默认 'hot'，所有功能正常降级 |
| 收藏页和详情页 | 不传 `mode`/`starsPerDay` prop 给 RepoCard，不显示 ★/天 badge（仅首页新星模式显示） |

---

## Non-Goals

- 不新增后端服务
- 不新增 API 调用
- 不修改 permissions
- 不修改缓存策略
- 不处理遗留体检问题（单独迭代）
- 不支持 Firefox/Edge 独立构建（Plasmo 一次构建通用）
- `mode` 不持久化到 sessionStorage（关闭 popup 默认回到热门，符合"每次打开是全新浏览"的设计意图）
