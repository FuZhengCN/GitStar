import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCache, setCache, isFresh } from '../cache';

function mockChromeStorage(store: Record<string, unknown> = {}) {
  (globalThis as Record<string, unknown>).chrome = {
    storage: {
      local: {
        get: vi.fn().mockImplementation((keys: string | string[] | null) => {
          if (keys === null) return Promise.resolve({ ...store });
          const keyList = Array.isArray(keys) ? keys : [keys];
          const result: Record<string, unknown> = {};
          keyList.forEach((k: string) => {
            if (store[k] !== undefined) result[k] = store[k];
          });
          return Promise.resolve(result);
        }),
        set: vi.fn().mockImplementation((items: Record<string, unknown>) => {
          Object.assign(store, items);
          return Promise.resolve();
        }),
        remove: vi.fn().mockImplementation((keys: string | string[]) => {
          const keyList = Array.isArray(keys) ? keys : [keys];
          keyList.forEach((k: string) => delete store[k]);
          return Promise.resolve();
        }),
      },
    },
  };
  return store;
}

const PREFIX = 'gitstar-cache:';

describe('cache', () => {
  beforeEach(() => {
    delete (globalThis as Record<string, unknown>).chrome;
  });

  describe('getCache', () => {
    it('returns cached data when entry exists', async () => {
      const store = mockChromeStorage();
      const entry = { data: { name: 'test' }, ts: Date.now() - 1000 };
      store[PREFIX + 'mykey'] = entry;

      const result = await getCache('mykey');
      expect(result).toEqual(entry);
    });

    it('returns null when key does not exist', async () => {
      mockChromeStorage();
      const result = await getCache('nonexistent');
      expect(result).toBeNull();
    });

    it('returns null when entry has no timestamp', async () => {
      const store = mockChromeStorage();
      store[PREFIX + 'badkey'] = { data: 'test' };

      const result = await getCache('badkey');
      expect(result).toBeNull();
    });

    it('returns null when entry has NaN timestamp', async () => {
      const store = mockChromeStorage();
      store[PREFIX + 'badkey'] = { data: 'test', ts: NaN };

      const result = await getCache('badkey');
      expect(result).toBeNull();
    });

    it('returns null on chrome.storage error', async () => {
      (globalThis as Record<string, unknown>).chrome = {
        storage: {
          local: {
            get: vi.fn().mockRejectedValue(new Error('quota exceeded')),
          },
        },
      };

      const result = await getCache('mykey');
      expect(result).toBeNull();
    });
  });

  describe('setCache', () => {
    it('stores data with a timestamp', async () => {
      const store = mockChromeStorage();
      const before = Date.now();

      await setCache('mykey', { name: 'test' });

      const key = PREFIX + 'mykey';
      expect(store[key]).toBeDefined();
      expect(store[key].data).toEqual({ name: 'test' });
      expect(store[key].ts).toBeGreaterThanOrEqual(before);
    });

    it('triggers eviction when exceeding MAX_ENTRIES (30)', async () => {
      const store = mockChromeStorage();
      // Fill with 35 entries (exceeds MAX_ENTRIES=30)
      for (let i = 0; i < 35; i++) {
        store[PREFIX + `key${i}`] = { data: `item${i}`, ts: 1000 + i };
      }

      // Add one more, should trigger eviction of oldest
      await setCache('newkey', { name: 'new' });

      const keys = Object.keys(store).filter(k => k.startsWith(PREFIX));
      // After eviction, should have ≤ 31 entries (30 old + new, or fewer if eviction removed more)
      expect(keys.length).toBeLessThanOrEqual(31);
      // Newest entry should exist
      expect(store[PREFIX + 'newkey']).toBeDefined();
      // Oldest entries (smallest ts) should be removed
      expect(store[PREFIX + 'key0']).toBeUndefined();
    });

    it('survives chrome.storage error silently', async () => {
      (globalThis as Record<string, unknown>).chrome = {
        storage: {
          local: {
            set: vi.fn().mockRejectedValue(new Error('quota exceeded')),
          },
        },
      };

      // Should not throw
      await expect(setCache('key', 'data')).resolves.toBeUndefined();
    });
  });

  describe('isFresh', () => {
    it('returns true when entry is within TTL', () => {
      const entry = { data: 'test', ts: Date.now() - 1000 };
      expect(isFresh(entry, 5000)).toBe(true);
    });

    it('returns false when entry exceeds TTL', () => {
      const entry = { data: 'test', ts: Date.now() - 10000 };
      expect(isFresh(entry, 5000)).toBe(false);
    });

    it('returns false when entry is exactly at TTL boundary', () => {
      const now = Date.now();
      const entry = { data: 'test', ts: now - 5000 };
      expect(isFresh(entry, 5000)).toBe(false);
    });
  });
});
