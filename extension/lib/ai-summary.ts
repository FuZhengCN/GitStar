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

  // Slice to maxBytes, then backtrack to last complete UTF-8 character boundary
  const sliced = bytes.slice(0, maxBytes);
  let cut = sliced.length;
  while (cut > 0) {
    try {
      new TextDecoder('utf-8', { fatal: true }).decode(sliced.slice(0, cut));
      break;
    } catch {
      cut--;
    }
  }

  let result = new TextDecoder('utf-8').decode(sliced.slice(0, cut));

  // Remove trailing partial line (cut incomplete char, then cut to last newline)
  const lastNewline = result.lastIndexOf('\n');
  if (lastNewline > 0) {
    result = result.slice(0, lastNewline);
  }

  return result;
}

// -- System prompt per language --

const SYSTEM_PROMPTS: Record<string, string> = {
  '中文': `你是一个面向开发者的技术文档概述助手。用简洁、技术化的中文总结以下README文档。严格按以下格式输出（不要输出其他内容）：

功能：<一句话描述这是什么项目，必须包含关键技术栈或架构关键词，不超过40字。避免空泛描述。>
特点：
- <一条技术亮点或与同类项目的差异化优势>
- <另一条特点要点>
场景：
- <一条目标用户描述，说明适合哪类开发者或团队使用>
- <另一条适用角色或团队类型>`,
  'English': `You are a developer-oriented technical documentation summarizer. Summarize the following README in concise, technical English. Output strictly in this format (no other content):

Function: <A one-sentence summary of what this project is. MUST include key tech stack or architecture keywords. Keep within 25 words. Avoid vague descriptions.>
Highlights:
- <A technical highlight or differentiator from similar projects>
- <Another highlight point>
Use cases:
- <A target audience description — which type of developer or team should use this>
- <Another applicable role or team type>`,
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
    await evictSummaries();
  } catch {
    // silent degrade
  }
}

async function evictSummaries(): Promise<void> {
  try {
    const all = await chrome.storage.local.get(null) as unknown as Record<string, { text?: string; ts?: number }>;
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

// -- AI summary section parser (shared by DetailPage) --

const SECTION_LABELS = ['功能', '特点', '场景', 'Function', 'Highlights', 'Use cases'];

export interface ParsedSection {
  label: string;
  text: string;
}

export function parseAiSections(rawText: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  let currentLabel = '';
  let currentLines: string[] = [];

  for (const rawLine of rawText.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    let matchedLabel = '';
    let matchedPrefix = '';
    for (const label of SECTION_LABELS) {
      if (line.startsWith(label + '：')) {
        matchedLabel = label;
        matchedPrefix = label + '：';
        break;
      }
      if (line.startsWith(label + ': ')) {
        matchedLabel = label;
        matchedPrefix = label + ': ';
        break;
      }
    }

    if (matchedLabel) {
      if (currentLabel && currentLines.length > 0) {
        sections.push({ label: currentLabel, text: currentLines.join('\n') });
      }
      currentLabel = matchedLabel;
      currentLines = [line.slice(matchedPrefix.length).trim()];
    } else if (currentLabel) {
      currentLines.push(line);
    }
  }

  if (currentLabel && currentLines.length > 0) {
    sections.push({ label: currentLabel, text: currentLines.join('\n') });
  }

  return sections;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
