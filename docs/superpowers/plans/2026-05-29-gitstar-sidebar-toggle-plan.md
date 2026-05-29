# Sidebar 开关 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在选项页添加 Sidebar 推荐开关，允许用户关闭 GitHub 页面右侧栏的推荐注入。

**Architecture:** 使用 `chrome.storage.local` 存储 boolean 开关状态（key: `gitstar-sidebar-enabled`），默认 `true`。Options 页写入开关状态，Content Script 读取并响应变化。

**Tech Stack:** Plasmo v0.90.5, React 18, TypeScript, chrome.storage.local

---

## File Map

| 文件 | 操作 | 职责 |
|------|------|------|
| `extension/options.tsx` | 修改 | 新增 Toggle 开关 UI，读写 `gitstar-sidebar-enabled` |
| `extension/contents/github-sidebar.tsx` | 修改 | `mountPanel()` 前检查开关，监听 `storage.onChanged` 即时响应 |
| `extension/locales/zh.json` | 修改 | 新增 `sidebarToggle`、`sidebarToggleDesc` |
| `extension/locales/en.json` | 修改 | 新增 `sidebarToggle`、`sidebarToggleDesc` |

---

### Task 1: 添加 i18n 翻译 key

**Files:**
- Modify: `extension/locales/zh.json`
- Modify: `extension/locales/en.json`

- [ ] **Step 1: 在 zh.json 中添加 sidebar 相关 key**

在 `zh.json` 的 `"languageLabel"` 之前插入：

```json
"sidebarToggle": "GitHub 侧边栏推荐",
"sidebarToggleDesc": "在 GitHub 仓库页面右侧显示基于 topic 相似度的热门项目推荐",
```

- [ ] **Step 2: 在 en.json 中添加对应英文 key**

在 `en.json` 的 `"languageLabel"` 之前插入：

```json
"sidebarToggle": "GitHub Sidebar Recommendations",
"sidebarToggleDesc": "Show similar popular projects based on topic similarity in the GitHub repository sidebar",
```

- [ ] **Step 3: 验证 JSON 格式**

```bash
cd extension && node -e "JSON.parse(require('fs').readFileSync('locales/zh.json','utf8')); console.log('zh OK')" && node -e "JSON.parse(require('fs').readFileSync('locales/en.json','utf8')); console.log('en OK')"
```

- [ ] **Step 4: Commit**

```bash
git add extension/locales/zh.json extension/locales/en.json
git commit -m "feat(i18n): add sidebar toggle translation keys"
```

---

### Task 2: Options 页添加 Toggle 开关

**Files:**
- Modify: `extension/options.tsx`

- [ ] **Step 1: 在 OptionsForm 中添加 sidebar enabled state**

在 `OptionsForm` 函数内，`lang` state 之后添加：

```typescript
const [sidebarEnabled, setSidebarEnabled] = useState(true);

useEffect(() => {
  chrome.storage.local.get('gitstar-sidebar-enabled').then(result => {
    setSidebarEnabled(result['gitstar-sidebar-enabled'] !== false);
  }).catch(() => {});
}, []);
```

- [ ] **Step 2: 添加切换处理函数**

在 `handleClear` 函数之后添加：

```typescript
function handleSidebarToggle() {
  const next = !sidebarEnabled;
  setSidebarEnabled(next);
  chrome.storage.local.set({ 'gitstar-sidebar-enabled': next }).catch(() => {});
}
```

- [ ] **Step 3: 在语言选择器下方添加 Toggle UI**

在语言选择器的 `</div>`（`{/* Language selector */}` 所在 div 的闭合标签）之后，Token 配置区块之前，插入：

```tsx
{/* Sidebar toggle */}
<div className="mb-6">
  <label className="flex items-center gap-3 cursor-pointer">
    <div className="relative">
      <div
        onClick={handleSidebarToggle}
        className={`w-10 h-5 rounded-full transition-colors cursor-pointer ${sidebarEnabled ? 'bg-[#3b82f6]' : 'bg-gray-300'}`}
      >
        <div
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sidebarEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'}`}
        />
      </div>
    </div>
    <div>
      <div className="text-sm font-medium text-gray-800">{t('sidebarToggle')}</div>
      <div className="text-xs text-gray-400 mt-0.5">{t('sidebarToggleDesc')}</div>
    </div>
  </label>
</div>
```

- [ ] **Step 4: 验证 Options 页构建**

```bash
cd extension && npm run build 2>&1 | tail -20
```
Expected: 构建成功，无 TypeScript 错误。

- [ ] **Step 5: Commit**

```bash
git add extension/options.tsx
git commit -m "feat: add sidebar toggle to options page"
```

---

### Task 3: Content Script 响应开关状态

**Files:**
- Modify: `extension/contents/github-sidebar.tsx`

- [ ] **Step 1: 在文件顶部添加存储 key 常量和状态变量**

在 `let reactRoot` 行之后添加：

```typescript
let sidebarEnabled = true;
```

- [ ] **Step 2: 修改 mountPanel 函数，增加开关检查**

在 `mountPanel` 函数开头（`cleanup()` 之前）添加：

```typescript
if (!sidebarEnabled) return;
```

- [ ] **Step 3: 移除原始 mountPanel() 自动调用，替换为条件初始化**

删除第 348 行的原始无条件调用：

```
mountPanel();
```

在同样的位置（`setInterval` 调用之前）替换为条件初始化：

```typescript
// 初始化：读取 sidebar 开关状态，默认开启
chrome.storage.local.get('gitstar-sidebar-enabled').then(result => {
  sidebarEnabled = result['gitstar-sidebar-enabled'] !== false;
  if (sidebarEnabled) mountPanel();
}).catch(() => {
  mountPanel(); // 读取失败默认开启
});

// 监听选项页切换开关，即时生效
chrome.storage.onChanged.addListener((changes) => {
  if (changes['gitstar-sidebar-enabled']) {
    const enabled = changes['gitstar-sidebar-enabled'].newValue !== false;
    sidebarEnabled = enabled;
    if (enabled) {
      mountPanel();
    } else {
      cleanup();
    }
  }
});
```

- [ ] **Step 4: 验证构建**

```bash
cd extension && npm run build 2>&1 | tail -20
```
Expected: 构建成功，无 TypeScript 错误。

- [ ] **Step 5: Commit**

```bash
git add extension/contents/github-sidebar.tsx
git commit -m "feat: sidebar content script respects toggle state"
```

---

### Task 4: 端到端验证

- [ ] **Step 1: 加载扩展并验证默认行为**

1. Chrome `chrome://extensions/` → 加载 `extension/build/chrome-mv3-prod/`
2. 打开 `https://github.com/facebook/react`
3. Expected: 右侧栏出现 GitStar 推荐面板（默认开启）

- [ ] **Step 2: 验证关闭开关**

1. 右键扩展图标 → 选项 → 关闭 "GitHub 侧边栏推荐" 开关
2. 刷新 `https://github.com/facebook/react`
3. Expected: 右侧栏不再出现 GitStar 推荐面板

- [ ] **Step 3: 验证重新开启**

1. 选项页 → 打开开关
2. 切换到 `https://github.com/torvalds/linux`
3. Expected: 右侧栏重新出现推荐面板

- [ ] **Step 4: Commit 最终验证记录**

No code changes — 仅验证确认。
