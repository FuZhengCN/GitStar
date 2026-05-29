# GitStar 扩展国际化（i18n）设计

## 背景

扩展现有 60 处硬编码中文字符串分布在 11 个文件中，不支持英文。扩展需要走向国际化，新增英文显示支持。

## 目标

Popup、Options、Sidebar 三个界面全部支持中/英文切换。默认跟随浏览器语言，允许用户在 Options 页手动覆盖。

## 方案

极简自研方案：一个 `I18nProvider` Context + `useI18n` hook + 两个 JSON 字典文件（`zh.json` / `en.json`），零外部依赖，约 60 行核心代码。

不引入 `i18next` 等库，原因：60 条文本量级不匹配，不需要复数/命名空间/懒加载等特性；零依赖减小扩展体积和安全审计面；自定义 hook 与项目已有模式（`useFavorites`、`useDebounce`、`useStaleCache`）一致。

### 新增文件

```
extension/
├── lib/
│   └── i18n.ts              ← I18nContext + useI18n hook + 语言检测
├── locales/
│   ├── zh.json              ← 中文翻译（源语言）
│   └── en.json              ← 英文翻译
```

### 数据流

```
navigator.language (默认)
  ↓ 如果用户手动覆盖
chrome.storage.local (lang 字段)
  ↓ I18nProvider 初始化时读取
React Context
  ↓ useI18n() hook
组件中的 t('key')
  ↓ 查 locales/{lang}.json
输出对应语言文本，key 缺失 fallback 到 zh
```

### 语言检测 & 存储

- **初始化**：同步读 `navigator.language`，提取前两字符归一化（`zh-*` → `zh`，其他 → `en`）
- **手动覆盖**：异步读 `chrome.storage.local` 的 `lang` 字段，如果用户之前在 Options 页选了语言则覆盖默认
- **存储位置**：`chrome.storage.local`（非 `sync`），语言偏好是设备相关的，不应跨设备同步
- **存储键**：`gitstar-lang`

### 跨上下文语言同步

Popup、Options、Sidebar 三个独立 React 树各有自己的 `<I18nProvider>` 实例。用户 Options 页切换语言后，已打开的 Popup（短暂存在）和 Sidebar（可能长时间存在）无法自动感知变化。

**解决方案：** 在 `I18nProvider` 内注册 `chrome.storage.onChanged` 监听，检测 `gitstar-lang` 键变化时更新内部 `lang` state：

```ts
useEffect(() => {
  const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
    if (changes['gitstar-lang']?.newValue) {
      setLangInternal(changes['gitstar-lang'].newValue);
    }
  };
  chrome.storage.onChanged.addListener(listener);
  return () => chrome.storage.onChanged.removeListener(listener);
}, []);
```

### 初始化时序 & 语言闪烁

Provider mount 时先同步用 `navigator.language` 渲染，再异步读 `chrome.storage.local`。如果用户手动选择与浏览器不同的语言，在 storage 读取完成前会出现短暂闪烁（浏览器语言 → 用户偏好）。

`chrome.storage.local` 读取在微秒级，实际闪烁概率极低。设计上采取简化处理：接受此权衡，不引入额外的 `initialized` 加载态。Provider 直接渲染，异步读取完成后若值不同则触发一次同步更新（瞬间切换，用户几乎感知不到）。

### I18nProvider & useI18n Hook

`lib/i18n.ts` 约 60 行，核心逻辑：

- `I18nProvider`：包裹组件树的 Context Provider，管理 `lang` state 和 `t` 函数，注册 `onChanged` 监听
- `useI18n()`：返回 `{ t, lang, setLang }`
  - `t(key)`：查当前语言 JSON，缺失 fallback 到 `zh.json`；`zh.json` 也缺失时返回 key 本身，开发模式 `console.warn('i18n key missing:', key)`
  - `setLang(lang)`：写入 `chrome.storage.local` + 更新 React state
- `t` 函数用 `useMemo` 缓存，仅在 `lang` 变化时重建

三个入口（Popup、Options、Sidebar）各自包裹独立的 `<I18nProvider>`。

### 错误消息国际化策略

当前 fetcher 函数（`popup.tsx`、`useStaleCache.ts`）中 `throw new Error('中文字符串')` 后，Error 的 `.message` 被 `useStaleCache` 捕获，组件直接 `{error}` 展示，不经过 `t()` 翻译。

**解决方案 — 错误码模式：** fetcher 抛出错误码，组件负责翻译：

```ts
// lib/types.ts 新增
export class AppError extends Error {
  constructor(public code: 'RATE_LIMIT' | 'REPO_NOT_FOUND' | 'NETWORK_ERROR' | 'LOAD_FAILED') {
    super(code);
  }
}

// github.ts fetcher 中
throw new AppError('RATE_LIMIT');

// 组件中
const errorText = error instanceof AppError ? t(error.code.toLowerCase()) : t('loadFailed');
```

`useStaleCache` 不再硬编码 `'加载失败'` 默认字符串，直接保留原始 Error 对象，由组件负责展示翻译。

### JSON 结构

平铺结构，按语义分组，camelCase 命名。同义文本复用同一个 key：

```json
{
  "searchPlaceholder": "搜索项目...",
  "searchAriaLabel": "搜索",
  "allLanguages": "全部语言",
  "allTime": "全部时间",
  "thisWeek": "本周",
  "thisMonth": "本月",
  "thisYear": "今年",
  "sortByStars": "按 Star 排",
  "sortByForks": "按 Fork 排",
  "sortByUpdated": "最近更新",
  "noResults": "没有找到匹配的项目",
  "noResultsHint": "尝试调整筛选条件或搜索关键词",
  "noDescription": "暂无描述",
  "noReadme": "该项目没有 README 文件",
  "backToHome": "← 返回首页",
  "backToDiscover": "← 返回发现",
  "back": "← 返回",
  "myFavorites": "★ 我的收藏 ({count})",
  "noFavorites": "暂无收藏项目",
  "goDiscover": "去首页探索优质开源项目吧",
  "discoverProjects": "发现优质开源项目",
  "navFavorites": "★ 收藏",
  "navFavoritesTitle": "我的收藏",
  "favorite": "☆ 收藏",
  "favorited": "★ 已收藏",
  "openOnGitHub": "🔗 打开",
  "retry": "重试",
  "loadFailed": "加载失败",
  "errorOccurred": "出错了",
  "errorRetryMessage": "请稍后重试",
  "itemsLoadFailed": "{n} 个项目加载失败",
  "tokenNotConfigured": "未配置 Token · 限流 60 次/小时",
  "tokenConfigured": "Token 已配置",
  "tokenEmpty": "Token 不能为空",
  "tokenInvalid": "Token 无效，请检查后重试",
  "tokenSaved": "Token 验证成功，已保存",
  "tokenCleared": "Token 已清除",
  "tokenNetworkError": "网络错误，请检查网络连接",
  "configTitle": "GitStar 配置",
  "createTokenAt": "在",
  "createTokenHint": "创建，只需勾选 public_repo 权限",
  "verifying": "验证中...",
  "save": "保存",
  "clear": "清除",
  "rateLimitError": "GitHub API 限流。请前往 Options 页配置 Personal Access Token",
  "repoNotFound": "仓库不存在",
  "sidebarTitle": "GitStar · 同类热门",
  "sidebarLoading": "加载中...",
  "sidebarEmpty": "暂无推荐",
  "expandReadme": "展开全部 README（{size}KB，可能较慢）"
}
```

**JSON 加载方式：** 构建时通过 ES `import` 静态导入（`import zh from '~locales/zh.json'`），两个 JSON 由 Plasmo/Parcel 在构建时内联打包进 bundle（各约 2-3KB）。不涉及运行时网络请求或懒加载。

### Options 页语言切换

在 Options 页 Token 配置区上方增加语言下拉选择器：

```
语言 / Language:  [ 中文 ▼ ]
```

选项：中文、English。切换后立即生效，通过 `setLang()` 写入 storage + 更新 context，无需刷新。

### 组件改造模式

每个组件进行机械替换：

```tsx
// 之前
<span>发现优质开源项目</span>

// 之后
import { useI18n } from '~lib/i18n';
const { t } = useI18n();
<span>{t('discoverProjects')}</span>
```

带变量的文本使用统一模板替换模式 `t('key').replace('{n}', String(value))`。JSON 中的模板占位符统一为 `{n}`，英语同理。

**模板变量约束：** 所有模板变量仅限数字类型（计数、文件大小等），`String()` 转换后输出。禁止将未净化的用户输入（仓库名、用户名等）作为模板参数，防止 XSS。当前所有带变量文本的变量均为数字，暂无风险。

示例：
```tsx
// itemsLoadFailed: "{n} 个项目加载失败"
<span>{t('itemsLoadFailed').replace('{n}', String(failedCount))}</span>

// expandReadme: "展开全部 README（{size}KB，可能较慢）"
<span>{t('expandReadme').replace('{size}', String(Math.round(content.length / 1024)))}</span>

// myFavorites: "★ 我的收藏 ({count})"
<span>{t('myFavorites').replace('{count}', String(favorites.length))}</span>
```

### Sidebar 特殊处理

Sidebar 使用手动 `createRoot` 挂载（非 Plasmo 自动渲染），需要在 `mountPanel()` 中手动包裹 `<I18nProvider>`，与 Popup/Options 的 Provider 是同一组件、独立实例。

### 改造范围

| 文件 | 改动量 |
|------|--------|
| `popup.tsx` | 20 处 |
| `options.tsx` | 10 处 + 语言下拉 |
| `components/FilterBar.tsx` | 9 处 |
| `contents/github-sidebar.tsx` | 4 处 |
| `components/ErrorState.tsx` | 4 处 |
| `components/RepoHeader.tsx` | 4 处 |
| `components/RepoCard.tsx` | 3 处 |
| `components/EmptyState.tsx` | 2 处 |
| `components/SearchBar.tsx` | 2 处 |
| `components/ReadmeViewer.tsx` | 1 处 |
| `hooks/useStaleCache.ts` | 1 处 |

共 11 个文件，60 处硬编码中文字符串替换。

### 不更改的部分

- 中英文注释保持原样
- `chrome.storage` 的键名（`gitstar-favorites`、`gitstar-cache:*`）不变
- API 请求和路由逻辑不变
- `ErrorBoundary` 类组件（popup.tsx 第 38 行）不做 i18n。原因：ErrorBoundary 在 `<I18nProvider>` 外部，且它自身可能在 Provider 崩溃时被触发，依赖 `useI18n` hook 不可靠。其提示文本保持静态中英文混合或纯英文技术提示

### 回退策略

`t(key)` 在翻译缺失时自动回退到 `zh.json`。中文是源语言，位于源码仓库中，保证永远有值。

### 非目标

- 不做 i18n 翻译编辑器/管理平台
- 不做复数/性别/格式化等高级 i18n 特性
- 不翻译注释
- 不新增更多语言（目前只做中英双语）
