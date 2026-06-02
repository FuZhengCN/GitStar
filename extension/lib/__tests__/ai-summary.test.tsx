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
