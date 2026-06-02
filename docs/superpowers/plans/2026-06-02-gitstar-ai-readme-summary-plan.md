# AI README 概述 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 DetailPage 浮动按钮组中新增 AI 概述按钮，点击后调用 OpenAI 兼容 API 对 README 进行智能截断并生成本地语言概述，结果缓存复用。

**Architecture:** 新增 `extension/lib/ai-summary.ts` 封装智能截断、API 调用、独立缓存（独立前缀 `gitstar-ai:` 避开现有 LRU 淘汰）。在 `popup.tsx` DetailPage 中新增浮层弹窗状态管理，在 `options.tsx` 中新增配置区。7 个文件变更，自底向上构建（类型→核心逻辑→i18n→UI→集成）。

**Tech Stack:** React 18 + TypeScript + Tailwind CSS + Plasmo v0.90.5

---

### Task 1: Types 补充 + Constants 新增

**Files:**
- Modify: `extension/lib/types.ts` (append)
- Modify: `extension/lib/constants.ts` (append)

- [ ] **Step 1: 在 types.ts 末尾追加 AIConfig 接口**

```ts
export interface AIConfig {
  endpoint: string;
  apiKey: string;
  model: string;
  summaryLanguage: string;
}
```

- [ ] **Step 2: 在 constants.ts 末尾追加 AI 概述相关常量**

```ts
// AI Summary
export const DEFAULT_AI_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
export const DEFAULT_AI_MODEL = 'deepseek-chat';
export const MAX_SUMMARY_CACHE_ENTRIES = 50;
export const README_TRUNCATE_BYTES = 8192;
export const AI_SUMMARY_PREFIX = 'gitstar-ai:summary:';
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd extension && npx tsc --noEmit
```

Expected: 无新增错误（常量追加和接口追加不会影响现有代码）。

- [ ] **Step 4: 提交**

```bash
git add extension/lib/types.ts extension/lib/constants.ts
git commit -m "feat: AIConfig 类型 + AI 概述常量定义"
```

---

### Task 2: ai-summary.ts 核心逻辑（智能截断 + API 调用 + 缓存）

**Files:**
- Create: `extension/lib/ai-summary.ts`

- [ ] **Step 1: 创建 ai-summary.ts**

```ts
import type { AIConfig } from './types';
import {
  DEFAULT_AI_ENDPOINT,
  DEFAULT_AI_MODEL,
  MAX_SUMMARY_CACHE_ENTRIES,
  README_TRUNCATE_BYTES,
  AI_SUMMARY_PREFIX,
} from './constants';

// -- Smart truncation --

const IMG_MD_RE = /!\[.*?\]\(.*?\)/g;
const IMG_HTML_RE = /<img[^>]*\/?>/gi;
const FENCED_CODE_RE = /```[\s\S]*?```/g;
const MULTI_BLANK_RE = /\n{3,}/g;

export function truncateReadme(content: string, maxBytes: number = README_TRUNCATE_BYTES): string {
  let text = content
    .replace(IMG_MD_RE, '')
    .replace(IMG_HTML_RE, '')
    .replace(FENCED_CODE_RE, '')
    .replace(MULTI_BLANK_RE, '\n\n')
    .trim();

  // Byte-aware truncation using TextEncoder
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  if (bytes.length <= maxBytes) return text;

  // Slice to maxBytes, then backtrack to last complete UTF-8 codepoint boundary
  const sliced = bytes.slice(0, maxBytes);
  const decoder = new TextDecoder('utf-8', { fatal: false });
  let result = decoder.decode(sliced);

  // Remove trailing partial character (if decoder produced replacement char)
  const lastNewline = result.lastIndexOf('\n');
  if (lastNewline > 0) {
    result = result.slice(0, lastNewline);
  }

  return result;
}

// -- System prompt per language --

const SYSTEM_PROMPTS: Record<string, string> = {
  '中文': '你是一个技术文档概述助手。用简洁的中文总结以下README文档，包括：(1)项目的主要功能 (2)适用场景。控制在3-5句话以内。',
  'English': 'You are a technical documentation summarizer. Summarize the following README in concise English, including: (1) what the project does, (2) applicable use cases. Keep it to 3-5 sentences.',
};

function getSystemPrompt(language: string): string {
  return SYSTEM_PROMPTS[language] || SYSTEM_PROMPTS['中文'];
}

// -- API call --

export class AISummaryError extends Error {
  code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'QUOTA_ERROR' | 'UNKNOWN_ERROR';
  constructor(code: 'NETWORK_ERROR' | 'AUTH_ERROR' | 'QUOTA_ERROR' | 'UNKNOWN_ERROR') {
    super(code);
    this.code = code;
  }
}

export async function fetchSummary(content: string, config: AIConfig): Promise<string> {
  const endpoint = config.endpoint || DEFAULT_AI_ENDPOINT;
  const model = config.model || DEFAULT_AI_MODEL;

  const truncated = truncateReadme(content, README_TRUNCATE_BYTES);

  let res: Response;
  try {
    res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: getSystemPrompt(config.summaryLanguage || '中文') },
          { role: 'user', content: truncated },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });
  } catch {
    throw new AISummaryError('NETWORK_ERROR');
  }

  if (res.status === 401 || res.status === 403) {
    throw new AISummaryError('AUTH_ERROR');
  }
  if (res.status === 429 || res.status === 402) {
    throw new AISummaryError('QUOTA_ERROR');
  }
  if (!res.ok) {
    throw new AISummaryError('UNKNOWN_ERROR');
  }

  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content;
  if (!text || typeof text !== 'string') {
    throw new AISummaryError('UNKNOWN_ERROR');
  }
  return text.trim();
}

// -- Cache helpers (independent prefix, no TTL, self-evict ≤ 50 entries) --

interface SummaryCacheEntry {
  text: string;
  ts: number;
}

function cacheKey(owner: string, repo: string): string {
  return `${AI_SUMMARY_PREFIX}${owner}/${repo}`;
}

export async function getCachedSummary(owner: string, repo: string): Promise<SummaryCacheEntry | null> {
  try {
    const result = await chrome.storage.local.get(cacheKey(owner, repo));
    const entry = result[cacheKey(owner, repo)];
    if (entry && typeof entry.text === 'string' && typeof entry.ts === 'number') {
      return entry as SummaryCacheEntry;
    }
    return null;
  } catch {
    return null;
  }
}

export async function saveSummary(owner: string, repo: string, text: string): Promise<void> {
  const key = cacheKey(owner, repo);
  try {
    await chrome.storage.local.set({ [key]: { text, ts: Date.now() } });
    evictSummaries();
  } catch {
    // silent degrade
  }
}

async function evictSummaries(): Promise<void> {
  try {
    const all = await chrome.storage.local.get(null);
    const summaryKeys = Object.keys(all)
      .filter((k) => k.startsWith(AI_SUMMARY_PREFIX))
      .sort((a, b) => (all[a]?.ts || 0) - (all[b]?.ts || 0));

    if (summaryKeys.length > MAX_SUMMARY_CACHE_ENTRIES) {
      const toRemove = summaryKeys.slice(0, summaryKeys.length - MAX_SUMMARY_CACHE_ENTRIES);
      await chrome.storage.local.remove(toRemove);
    }
  } catch {
    // silent degrade
  }
}

export async function removeSummary(owner: string, repo: string): Promise<void> {
  try {
    await chrome.storage.local.remove(cacheKey(owner, repo));
  } catch {
    // silent degrade
  }
}
```

- [ ] **Step 2: 验证 TypeScript 编译**

```bash
cd extension && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 3: 提交**

```bash
git add extension/lib/ai-summary.ts
git commit -m "feat: ai-summary.ts — 智能截断 + API 调用 + 独立缓存层"
```

---

### Task 3: i18n 翻译 key 新增

**Files:**
- Modify: `extension/locales/zh.json`
- Modify: `extension/locales/en.json`

- [ ] **Step 1: 在 zh.json 末尾（`"feedback": "反馈"` 之前）追加 AI 概述 key**

在 `"feedback": "反馈"` 那行之后，`}` 之前，插入：

```json
  "aiSummaryButtonLabel": "AI 概述",
  "aiSummaryLoading": "正在生成概述...",
  "aiSummaryCached": "已缓存 · {n}分钟前",
  "aiSummaryCachedJustNow": "已缓存 · 刚刚",
  "aiSummaryRefresh": "刷新",
  "aiSummaryNotConfigured": "尚未配置 AI 服务",
  "aiSummaryGoConfig": "前往配置",
  "aiSummaryErrorNetwork": "网络连接失败，请检查网络",
  "aiSummaryErrorAuth": "API Key 无效，请检查配置",
  "aiSummaryErrorQuota": "API 配额不足",
  "aiSummaryErrorUnknown": "请求失败，请稍后重试",
  "aiOptionSectionTitle": "AI 概述",
  "aiOptionEndpoint": "API 地址",
  "aiOptionApiKey": "API Key",
  "aiOptionModel": "模型",
  "aiOptionLanguage": "概述语言",
```

注意：`"feedback": "反馈"` 那行末尾需要加逗号（当前无逗号，因为它是最后一项）。

- [ ] **Step 2: 在 en.json 中对应追加英文翻译**

```json
  "aiSummaryButtonLabel": "AI Summary",
  "aiSummaryLoading": "Generating summary...",
  "aiSummaryCached": "Cached · {n} min ago",
  "aiSummaryCachedJustNow": "Cached · just now",
  "aiSummaryRefresh": "Refresh",
  "aiSummaryNotConfigured": "AI service not configured",
  "aiSummaryGoConfig": "Configure",
  "aiSummaryErrorNetwork": "Network error, check connection",
  "aiSummaryErrorAuth": "Invalid API Key, check settings",
  "aiSummaryErrorQuota": "API quota exceeded",
  "aiSummaryErrorUnknown": "Request failed, please retry",
  "aiOptionSectionTitle": "AI Summary",
  "aiOptionEndpoint": "API Endpoint",
  "aiOptionApiKey": "API Key",
  "aiOptionModel": "Model",
  "aiOptionLanguage": "Summary Language",
```

同样注意逗号。

- [ ] **Step 3: 验证 JSON 格式正确**

```bash
cd extension && node -e "JSON.parse(require('fs').readFileSync('locales/zh.json','utf8')); console.log('zh OK')" && node -e "JSON.parse(require('fs').readFileSync('locales/en.json','utf8')); console.log('en OK')"
```

Expected: `zh OK` + `en OK`。

- [ ] **Step 4: 验证 TypeScript 编译（i18n key 类型检查）**

```bash
cd extension && npx tsc --noEmit
```

- [ ] **Step 5: 提交**

```bash
git add extension/locales/zh.json extension/locales/en.json
git commit -m "feat: i18n — AI 概述 16 个翻译 key (zh + en)"
```

---

### Task 4: Options 页新增「AI 概述」配置区

**Files:**
- Modify: `extension/options.tsx`

- [ ] **Step 1: 在 OptionsForm 组件中新增 AI 配置 state 和加载逻辑**

在现有 `OptionsForm` 函数中，`sidebarEnabled` state 之后、`handleSave` 之前，新增：

```tsx
  // AI Summary config
  const [aiEndpoint, setAiEndpoint] = useState('https://api.deepseek.com/v1/chat/completions');
  const [aiKey, setAiKey] = useState('');
  const [aiModel, setAiModel] = useState('deepseek-chat');
  const [aiLang, setAiLang] = useState('中文');
  const [aiStatus, setAiStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [aiMessage, setAiMessage] = useState('');

  // Load AI config on mount
  useEffect(() => {
    chrome.storage.local.get('gitstar-ai-config').then(result => {
      const cfg = result['gitstar-ai-config'];
      if (cfg) {
        if (cfg.endpoint) setAiEndpoint(cfg.endpoint);
        if (cfg.apiKey) setAiKey(cfg.apiKey);
        if (cfg.model) setAiModel(cfg.model);
        if (cfg.summaryLanguage) setAiLang(cfg.summaryLanguage);
      }
    }).catch(() => {});
  }, []);

  async function handleSaveAiConfig() {
    if (!aiKey.trim()) {
      setAiStatus('error');
      setAiMessage(t('tokenEmpty'));
      return;
    }
    setAiStatus('saving');
    try {
      await chrome.storage.local.set({
        'gitstar-ai-config': {
          endpoint: aiEndpoint.trim(),
          apiKey: aiKey.trim(),
          model: aiModel.trim(),
          summaryLanguage: aiLang,
        },
      });
      setAiStatus('success');
      setAiMessage(t('tokenSaved'));
    } catch {
      setAiStatus('error');
      setAiMessage(t('tokenNetworkError'));
    }
  }

  async function handleClearAiConfig() {
    await chrome.storage.local.remove('gitstar-ai-config');
    setAiKey('');
    setAiStatus('idle');
    setAiMessage('');
  }
```

- [ ] **Step 2: 在 Options UI 中插入「AI 概述」配置区**

在语言选择器 `</div>` 之后、Sidebar toggle `{/* Sidebar toggle */}` 之前，插入：

```tsx
      {/* AI Summary config */}
      <div className="mb-6 p-4 bg-white border border-[#e5e7eb] rounded-lg">
        <h2 className="text-sm font-semibold text-[#1e1b4b] mb-3">{t('aiOptionSectionTitle')}</h2>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('aiOptionEndpoint')}</label>
            <input
              type="url"
              value={aiEndpoint}
              onChange={e => setAiEndpoint(e.target.value)}
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">{t('aiOptionApiKey')}</label>
            <input
              type="password"
              value={aiKey}
              onChange={e => { setAiKey(e.target.value); setAiStatus('idle'); setAiMessage(''); }}
              placeholder="sk-xxxxxxxxxxxxxxxx"
              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('aiOptionModel')}</label>
              <input
                type="text"
                value={aiModel}
                onChange={e => setAiModel(e.target.value)}
                placeholder="deepseek-chat"
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">{t('aiOptionLanguage')}</label>
              <select
                value={aiLang}
                onChange={e => setAiLang(e.target.value)}
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent"
              >
                <option value="中文">中文</option>
                <option value="English">English</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSaveAiConfig}
              disabled={aiStatus === 'saving'}
              className="px-4 py-2 bg-[#3b82f6] text-white text-sm rounded-lg hover:bg-[#2563eb] transition-colors disabled:opacity-50 min-w-[110px] text-center"
            >
              {aiStatus === 'saving' ? t('verifying') : t('save')}
            </button>
            {aiKey && (
              <button
                onClick={handleClearAiConfig}
                className="px-4 py-2 border border-[#e5e7eb] text-sm rounded-lg hover:bg-gray-50 transition-colors"
              >
                {t('clear')}
              </button>
            )}
          </div>
          {aiMessage && (
            <div
              className={`text-sm p-3 rounded-lg ${
                aiStatus === 'success' ? 'bg-green-50 text-green-700 border border-green-200' :
                aiStatus === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                'bg-gray-50 text-gray-600'
              }`}
            >
              {aiMessage}
            </div>
          )}
        </div>
      </div>
```

- [ ] **Step 3: 验证 TypeScript 编译**

```bash
cd extension && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 4: 提交**

```bash
git add extension/options.tsx
git commit -m "feat: Options 页新增 AI 概述配置区（Endpoint/Key/Model/语言）"
```

---

### Task 5: DetailPage 浮动按钮组新增 AI 概述按钮 + 浮层弹窗

**Files:**
- Modify: `extension/popup.tsx` (DetailPage 函数)

这是最复杂的任务。需要在 DetailPage 函数中新增多个 state、ref、handler 和 JSX。

- [ ] **Step 1: 在 import 区域新增引用**

在 popup.tsx 顶部现有 import 后追加：

```tsx
import { fetchSummary, getCachedSummary, saveSummary, AISummaryError } from './lib/ai-summary';
import type { AIConfig } from './lib/types';
```

- [ ] **Step 2: 在 DetailPage 函数中新增 state 和 refs**

在现有 state 声明区（`const [previewMaxH, setPreviewMaxH] = useState(300);` 之后），新增：

```tsx
  // AI Summary state
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'success' | 'error' | 'notConfigured'>('idle');
  const [aiText, setAiText] = useState('');
  const [aiVisible, setAiVisible] = useState(false);
  const [aiCachedTs, setAiCachedTs] = useState<number | null>(null);
  const isSummarizingRef = useRef(false);
```

- [ ] **Step 3: 修改 useLayoutEffect 导航重置，追加 AI 状态重置**

将现有 useLayoutEffect（约 257-263 行）修改为：

```tsx
  useLayoutEffect(() => {
    setReadmeExpanded(false);
    setDetailsExpanded(false);
    setTocVisible(false);
    setDisplayHtml('');
    setAiState('idle');
    setAiText('');
    setAiVisible(false);
    setAiCachedTs(null);
    window.scrollTo(0, 0);
  }, [owner, repo]);
```

- [ ] **Step 4: 新增 AI 概述 handler**

在 `handleToggleToc` 之后新增：

```tsx
  const handleAiSummary = useCallback(async () => {
    if (isSummarizingRef.current) return;

    // Load config
    let config: AIConfig | null = null;
    try {
      const result = await chrome.storage.local.get('gitstar-ai-config');
      config = result['gitstar-ai-config'] || null;
    } catch {
      // ignore
    }

    if (!config || !config.apiKey) {
      setAiState('notConfigured');
      setAiVisible(true);
      return;
    }

    // Close TOC to avoid overlap
    setTocVisible(false);
    setAiVisible(true);

    // Try cache first
    const cached = await getCachedSummary(owner, repo);
    if (cached) {
      setAiText(cached.text);
      setAiCachedTs(cached.ts);
      setAiState('success');
      return;
    }

    // Call API
    isSummarizingRef.current = true;
    setAiState('loading');
    setAiText('');

    try {
      const summary = await fetchSummary(readmeContent, config);
      setAiText(summary);
      setAiCachedTs(Date.now());
      setAiState('success');
      saveSummary(owner, repo, summary);
    } catch (e) {
      if (e instanceof AISummaryError) {
        setAiText(e.code);
      } else {
        setAiText('UNKNOWN_ERROR');
      }
      setAiState('error');
    } finally {
      isSummarizingRef.current = false;
    }
  }, [owner, repo, readmeContent]);

  const handleAiRefresh = useCallback(async () => {
    if (isSummarizingRef.current) return;

    let config: AIConfig | null = null;
    try {
      const result = await chrome.storage.local.get('gitstar-ai-config');
      config = result['gitstar-ai-config'] || null;
    } catch {
      // ignore
    }

    if (!config || !config.apiKey) return;

    isSummarizingRef.current = true;
    setAiState('loading');
    setAiText('');

    try {
      const summary = await fetchSummary(readmeContent, config);
      setAiText(summary);
      setAiCachedTs(Date.now());
      setAiState('success');
      saveSummary(owner, repo, summary);
    } catch (e) {
      if (e instanceof AISummaryError) {
        setAiText(e.code);
      } else {
        setAiText('UNKNOWN_ERROR');
      }
      setAiState('error');
    } finally {
      isSummarizingRef.current = false;
    }
  }, [owner, repo, readmeContent]);

  // Map AI error code to i18n message
  const aiErrorMessage = useCallback((code: string) => {
    const map: Record<string, string> = {
      'NETWORK_ERROR': t('aiSummaryErrorNetwork'),
      'AUTH_ERROR': t('aiSummaryErrorAuth'),
      'QUOTA_ERROR': t('aiSummaryErrorQuota'),
      'UNKNOWN_ERROR': t('aiSummaryErrorUnknown'),
    };
    return map[code] || t('aiSummaryErrorUnknown');
  }, [t]);

  // Format cached time
  const aiCachedLabel = useCallback((ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return t('aiSummaryCachedJustNow');
    return t('aiSummaryCached').replace('{n}', String(mins));
  }, [t]);
```

- [ ] **Step 5: 在浮动按钮组中新增 AI 概述按钮**

在浮动按钮组 `<div>` 中，返回顶部按钮之后、收起按钮之前，插入：

```tsx
              {/* AI Summary button */}
              <button
                onClick={handleAiSummary}
                className="w-7 h-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[#e5e7eb] flex items-center justify-center hover:bg-gray-50 transition-colors"
                aria-label={t('aiSummaryButtonLabel')}
              >
                <span className="text-xs">🤖</span>
              </button>
```

- [ ] **Step 6: 在浮动按钮组 `</div>` 之后、`<TocOverlay>` 之前，新增 AI 概述弹窗**

```tsx
            {/* AI Summary popover */}
            {aiVisible && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAiVisible(false)} />
                <div
                  className="fixed z-50 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-[#e5e7eb] overflow-hidden"
                  style={{ right: '56px', bottom: '72px', width: '260px', maxHeight: '300px', overflowY: 'auto' }}
                >
                  {/* Header */}
                  <div className="px-3 py-2 text-[11px] font-semibold text-[#374151] border-b border-[#f3f4f6] bg-[#f9fafb] sticky top-0 flex items-center justify-between">
                    <span>🤖 {t('aiSummaryButtonLabel')}</span>
                    <button
                      onClick={() => setAiVisible(false)}
                      className="text-[#9ca3af] hover:text-[#6b7280] text-xs leading-none"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Body */}
                  <div className="px-3 py-2.5">
                    {aiState === 'loading' && (
                      <div className="animate-pulse space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full" />
                        <div className="h-3 bg-gray-200 rounded w-5/6" />
                        <div className="h-3 bg-gray-200 rounded w-4/6" />
                        <p className="text-[11px] text-[#9ca3af] text-center mt-2">{t('aiSummaryLoading')}</p>
                      </div>
                    )}

                    {aiState === 'notConfigured' && (
                      <div className="text-center py-2">
                        <p className="text-xs text-[#6b7280] mb-2">{t('aiSummaryNotConfigured')}</p>
                        <a
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            chrome.runtime.openOptionsPage();
                          }}
                          className="text-xs text-[#3b82f6] hover:underline"
                        >
                          {t('aiSummaryGoConfig')}
                        </a>
                      </div>
                    )}

                    {aiState === 'error' && (
                      <div className="text-center py-2">
                        <span className="text-red-500 text-xs">⚠️ {aiErrorMessage(aiText)}</span>
                      </div>
                    )}

                    {aiState === 'success' && (
                      <>
                        <p className="text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">{aiText}</p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#f3f4f6]">
                          {aiCachedTs && (
                            <span className="text-[10px] text-[#9ca3af]">{aiCachedLabel(aiCachedTs)}</span>
                          )}
                          <button
                            onClick={handleAiRefresh}
                            className="text-[10px] text-[#3b82f6] hover:text-[#2563eb] cursor-pointer ml-auto"
                          >
                            🔄 {t('aiSummaryRefresh')}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
```

- [ ] **Step 7: 验证 TypeScript 编译**

```bash
cd extension && npx tsc --noEmit
```

Expected: 无错误。

- [ ] **Step 8: 提交**

```bash
git add extension/popup.tsx
git commit -m "feat: DetailPage 浮动按钮组新增 AI 概述按钮 + 浮层弹窗"
```

---

### Task 6: 验证构建 + 功能手动测试

- [ ] **Step 1: 构建**

```bash
cd extension && npm run build
```

Expected: 构建成功，无 warning。

- [ ] **Step 2: 加载扩展并手动测试**

在 Chrome `chrome://extensions/` 加载 `extension/build/chrome-mv3-prod/` 目录，验证：

1. **Options 页：** 打开 Options → 看到新的「AI 概述」配置区（Endpoint/Key/Model/语言），填写 DeepSeek API Key 并保存
2. **未配置弹窗：** 进入详情页 → 展开 README → 点击 🤖 → 弹窗提示配置引导
3. **正常生成：** 配置好 API Key 后 → 进入详情页 → 展开 README → 点击 🤖 → 弹窗显示加载动画 → 成功显示中文概述
4. **缓存命中：** 关闭 popup → 重新打开进入同一个仓库详情页 → 展开 README → 点击 🤖 → 弹窗立即显示概述 + "已缓存 · X分钟前"
5. **刷新：** 在弹窗中点击 🔄 刷新 → 重新加载概述
6. **错误处理：** 使用无效 API Key → 点击 🤖 → 显示 "API Key 无效"
7. **双击防重：** 快速双击 🤖 → 只触发一次 API 调用（弹窗不闪烁）
8. **TOC 冲突：** 先打开 TOC 面板 → 再点击 🤖 → TOC 自动关闭
9. **导航重置：** 展开 README → 点击 🤖 打开弹窗 → 返回首页 → 进入另一个仓库 → 弹窗已关闭
10. **缓存隔离：** 仓库 A 的概述和仓库 B 的概述独立缓存，不混淆

- [ ] **Step 5: 提交（如有修复）**

如果测试发现 bug，修复后提交。否则完成。

---

### Task 7: 测试 (vitest) — ai-summary.ts 核心函数单测

**Files:**
- Create: `extension/lib/__tests__/ai-summary.test.tsx`

- [ ] **Step 1: 编写测试文件**

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { truncateReadme, AISummaryError, fetchSummary } from '../ai-summary';
import type { AIConfig } from '../types';

// Mock chrome.storage.local for cache tests
const storage: Record<string, unknown> = {};
beforeEach(() => {
  Object.keys(storage).forEach(k => delete storage[k]);
});

(globalThis as any).chrome = {
  storage: {
    local: {
      get: vi.fn(async (key: string | string[] | null) => {
        if (key === null) return { ...storage };
        const keys = Array.isArray(key) ? key : [key];
        const result: Record<string, unknown> = {};
        keys.forEach(k => {
          if (storage[k] !== undefined) result[k] = storage[k];
        });
        return result;
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storage, items);
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        const arr = Array.isArray(keys) ? keys : [keys];
        arr.forEach(k => delete storage[k]);
      }),
    },
  },
};

describe('truncateReadme', () => {
  it('passes through short content unchanged', () => {
    const input = 'This is a short README.\n\nIt has two paragraphs.';
    const result = truncateReadme(input, 8192);
    expect(result).toBe(input);
  });

  it('removes markdown image syntax', () => {
    const input = 'Before ![alt](https://example.com/img.png) After';
    const result = truncateReadme(input, 8192);
    expect(result).toContain('Before');
    expect(result).toContain('After');
    expect(result).not.toContain('![alt]');
    expect(result).not.toContain('img.png');
  });

  it('removes HTML img tags', () => {
    const input = 'Text <img src="x.png" /> more text <img alt="y"> end';
    const result = truncateReadme(input, 8192);
    expect(result).toContain('Text');
    expect(result).toContain('more text');
    expect(result).toContain('end');
    expect(result).not.toContain('<img');
  });

  it('removes fenced code blocks', () => {
    const input = 'Intro\n\n```js\nconst x = 1;\nconsole.log(x);\n```\n\nOutro';
    const result = truncateReadme(input, 8192);
    expect(result).toContain('Intro');
    expect(result).toContain('Outro');
    expect(result).not.toContain('```');
    expect(result).not.toContain('console.log');
  });

  it('collapses multiple blank lines', () => {
    const input = 'Line 1\n\n\n\n\nLine 2\n\n\nLine 3';
    const result = truncateReadme(input, 8192);
    const blankGroups = result.match(/\n{3,}/g);
    expect(blankGroups).toBeNull();
  });

  it('truncates content exceeding maxBytes', () => {
    const input = 'A'.repeat(20000);
    const result = truncateReadme(input, 100);
    expect(new TextEncoder().encode(result).length).toBeLessThanOrEqual(100);
  });

  it('handles Chinese characters correctly in truncation', () => {
    const input = '你好世界'.repeat(500);
    const result = truncateReadme(input, 200);
    const bytes = new TextEncoder().encode(result).length;
    expect(bytes).toBeLessThanOrEqual(200);
  });
});

describe('AISummaryError', () => {
  it('creates error with code', () => {
    const err = new AISummaryError('NETWORK_ERROR');
    expect(err.code).toBe('NETWORK_ERROR');
    expect(err.message).toBe('NETWORK_ERROR');
  });
});

describe('fetchSummary', () => {
  it('throws NETWORK_ERROR on fetch failure', async () => {
    (globalThis as any).fetch = vi.fn().mockRejectedValue(new Error('fail'));
    const config: AIConfig = { endpoint: 'https://api.test.com/v1', apiKey: 'sk-test', model: 'test', summaryLanguage: '中文' };
    await expect(fetchSummary('test content', config)).rejects.toThrow(AISummaryError);
    await expect(fetchSummary('test content', config)).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('throws AUTH_ERROR on 401', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    const config: AIConfig = { endpoint: 'https://api.test.com/v1', apiKey: 'sk-bad', model: 'test', summaryLanguage: '中文' };
    await expect(fetchSummary('test', config)).rejects.toMatchObject({ code: 'AUTH_ERROR' });
  });

  it('throws QUOTA_ERROR on 429', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({ ok: false, status: 429 });
    const config: AIConfig = { endpoint: 'https://api.test.com/v1', apiKey: 'sk-test', model: 'test', summaryLanguage: '中文' };
    await expect(fetchSummary('test', config)).rejects.toMatchObject({ code: 'QUOTA_ERROR' });
  });

  it('returns summary text on success', async () => {
    (globalThis as any).fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'This is a summary.' } }] }),
    });
    const config: AIConfig = { endpoint: 'https://api.test.com/v1', apiKey: 'sk-test', model: 'test', summaryLanguage: 'English' };
    const result = await fetchSummary('test README content', config);
    expect(result).toBe('This is a summary.');
  });
});
```

- [ ] **Step 2: 运行测试验证通过**

```bash
cd extension && npx vitest run lib/__tests__/ai-summary.test.tsx
```

Expected: 所有 11 个测试通过。

- [ ] **Step 3: 提交**

```bash
git add extension/lib/__tests__/ai-summary.test.tsx
git commit -m "test: ai-summary.ts 单测 — 截断/API 错误/成功共 11 个用例"
```

---

## 执行顺序依赖

```
Task 1 (types + constants)
  ↓
Task 2 (ai-summary.ts) ← Task 3 (i18n) 可并行
  ↓                              ↓
Task 4 (options.tsx) ← Task 5 (popup.tsx) 可并行
  ↓
Task 6 (构建 + 手动测试)
  ↓
Task 7 (单测)
```

Task 2 和 Task 3 无依赖，可并行。Task 4 和 Task 5 无互相依赖，可并行。建议 Task 7 在 Task 6 之后（因为 API 调用函数已在集成测试中验证过行为正确）。
