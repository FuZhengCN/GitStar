import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calcStarsPerDay, getPeriodFromTimeRange } from '../constants';
import type { Repo, DiscoveryMode } from '../types';

function makeRepo(overrides: Partial<Repo> = {}): Repo {
  return {
    id: 1,
    owner: 'test',
    name: 'repo',
    full_name: 'test/repo',
    description: null,
    html_url: 'https://github.com/test/repo',
    stargazers_count: 0,
    forks_count: 0,
    watchers_count: 0,
    language: null,
    license: null,
    owner_avatar: '',
    topics: [],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function daysAgo(n: number): string {
  const d = new Date(Date.now() - n * 86400000);
  return d.toISOString();
}

describe('getPeriodFromTimeRange', () => {
  it('returns "week" for timeRange within 8 days', () => {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    expect(getPeriodFromTimeRange(`>${weekAgo}`)).toBe('week');
  });

  it('returns "month" for timeRange within 32 days', () => {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    expect(getPeriodFromTimeRange(`>${monthAgo}`)).toBe('month');
  });

  it('returns "year" for timeRange within 367 days', () => {
    const yearAgo = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];
    expect(getPeriodFromTimeRange(`>${yearAgo}`)).toBe('year');
  });

  it('returns "all" for empty string', () => {
    expect(getPeriodFromTimeRange('')).toBe('all');
  });

  it('returns "all" for timeRange without ">" prefix', () => {
    expect(getPeriodFromTimeRange('2026-01-01')).toBe('all');
  });
});

describe('calcStarsPerDay', () => {
  it('returns null for non-rising mode', () => {
    const repo = makeRepo({ stargazers_count: 1000, created_at: daysAgo(3) });
    expect(calcStarsPerDay(repo, 'hot')).toBeNull();
    expect(calcStarsPerDay(repo, 'active')).toBeNull();
  });

  it('returns null when created_at is missing', () => {
    const repo = makeRepo({ stargazers_count: 1000, created_at: '' });
    expect(calcStarsPerDay(repo, 'rising', '>2026-05-24')).toBeNull();
  });

  it('returns null when stargazers_count below period threshold (weekly: 500)', () => {
    const repo = makeRepo({ stargazers_count: 499, created_at: daysAgo(3) });
    expect(calcStarsPerDay(repo, 'rising', '>2026-05-24')).toBeNull();
  });

  it('returns null when stargazers_count below monthly threshold (4000)', () => {
    const monthAgo = new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0];
    const repo = makeRepo({ stargazers_count: 3999, created_at: daysAgo(20) });
    expect(calcStarsPerDay(repo, 'rising', `>${monthAgo}`)).toBeNull();
  });

  it('returns null when stargazers_count below yearly threshold (10000)', () => {
    const yearAgo = new Date(Date.now() - 200 * 86400000).toISOString().split('T')[0];
    const repo = makeRepo({ stargazers_count: 9999, created_at: daysAgo(200) });
    expect(calcStarsPerDay(repo, 'rising', `>${yearAgo}`)).toBeNull();
  });

  it('returns null when age exceeds period maxAge (weekly: 30 days)', () => {
    const repo = makeRepo({ stargazers_count: 600, created_at: daysAgo(35) });
    expect(calcStarsPerDay(repo, 'rising', '>2026-05-24')).toBeNull();
  });

  it('returns null when rate below minPerDay', () => {
    // 100 stars / (50 days + 1 smoothing) = 1 star/day < 10
    const repo = makeRepo({ stargazers_count: 100, created_at: daysAgo(50) });
    expect(calcStarsPerDay(repo, 'rising', '>2026-01-01')).toBeNull();
  });

  it('applies age smoothing: 1 day old 500 stars => 500/(1+1)=250, not 500/1=500', () => {
    vi.useFakeTimers();
    const now = new Date('2026-05-31T12:00:00Z');
    vi.setSystemTime(now);
    const created = new Date(now.getTime() - 86400000).toISOString(); // exactly 1 day ago
    const repo = makeRepo({ stargazers_count: 500, created_at: created });
    const result = calcStarsPerDay(repo, 'rising', '>2026-05-24');
    // Without smoothing: 500/(1) = 500. With smoothing: 500/(1+1) = 250
    expect(result).toBe(250);
    vi.useRealTimers();
  });

  it('shows badge for qualifying weekly repo (500 stars, 3 days old)', () => {
    const repo = makeRepo({ stargazers_count: 500, created_at: daysAgo(3) });
    const result = calcStarsPerDay(repo, 'rising', '>2026-05-24');
    // 500 / (3+1) = 125 star/day, passes weekly thresholds (500 min, 10 minPerDay)
    expect(result).toBe(125);
  });

  it('shows badge for qualifying monthly repo (4000 stars, 20 days old)', () => {
    const monthAgo = new Date(Date.now() - 20 * 86400000).toISOString().split('T')[0];
    const repo = makeRepo({ stargazers_count: 4000, created_at: daysAgo(20) });
    const result = calcStarsPerDay(repo, 'rising', `>${monthAgo}`);
    // 4000 / (20+1) = 190 star/day, passes monthly thresholds (4000 min, 10 minPerDay)
    expect(result).toBe(190);
  });

  it('shows badge for qualifying yearly repo (10000 stars, 200 days old)', () => {
    const yearAgo = new Date(Date.now() - 200 * 86400000).toISOString().split('T')[0];
    const repo = makeRepo({ stargazers_count: 10000, created_at: daysAgo(200) });
    const result = calcStarsPerDay(repo, 'rising', `>${yearAgo}`);
    // 10000 / (200+1) = 49 star/day, passes yearly thresholds (10000 min, 10 minPerDay)
    expect(result).toBe(49);
  });

  it('uses "all" period defaults when no timeRange provided', () => {
    // 30-day-old repo with 500 stars: weekly maxAge=30 would pass but yearly minStars=10000 would fail
    const repo = makeRepo({ stargazers_count: 500, created_at: daysAgo(30) });
    expect(calcStarsPerDay(repo, 'rising')).toBeNull(); // defaults to 'all' → 10000 min
  });
});
