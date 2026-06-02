import type { DiscoveryMode, ModeConfig } from './types';
import type { Repo } from './types';

export const README_PREVIEW_BYTES = 60000;

// README cache key prefix, bump version when cache format changes
export const README_CACHE_PREFIX = 'readme:v2:';

// Discovery mode configs (label via i18n t())
export const DISCOVERY_MODES: Record<DiscoveryMode, ModeConfig> = {
  hot:    { mode: 'hot',    sort: 'stars',   created: '' },
  rising: { mode: 'rising', sort: 'stars',   created: 'week' },
  active: { mode: 'active', sort: 'updated', created: 'month' },
};

// Emoji mapping (emoji don't need i18n)
export const MODE_EMOJI: Record<DiscoveryMode, string> = {
  hot: '🔥', rising: '🚀', active: '📈',
};

// Age smoothing constant: prevents division-by-zero for day-0 repos
// and reduces ranking noise for very young projects (github-discover style)
const AGE_SMOOTHING = 1;

const MS_PER_DAY = 86400000;

// Period threshold configs (github-discover thresholds: daily=60, weekly=500, monthly=4000, yearly=10000)
interface PeriodThreshold {
  minStars: number;
  maxAge: number;    // days
  minPerDay: number;
}

const PERIOD_CONFIG: Record<string, PeriodThreshold> = {
  week:  { minStars: 500,   maxAge: 30,  minPerDay: 10 },
  month: { minStars: 4000,  maxAge: 90,  minPerDay: 10 },
  year:  { minStars: 10000, maxAge: 365, minPerDay: 10 },
  all:   { minStars: 10000, maxAge: 365, minPerDay: 10 },
};

const PERIOD_DEFAULT: PeriodThreshold = PERIOD_CONFIG.all;

// Derive period key from timeRange filter value (e.g., ">2026-05-24" → "week")
export function getPeriodFromTimeRange(created: string): string {
  if (!created || typeof created !== 'string' || !created.startsWith('>')) return 'all';
  try {
    const iso = created.slice(1); // remove ">"
    const target = new Date(iso);
    if (isNaN(target.getTime())) return 'all';
    const diffMs = Date.now() - target.getTime();
    const diffDays = Math.floor(diffMs / MS_PER_DAY);
    // 8 days = 7-day week + 1 day buffer for timezone/clock variance
    if (diffDays <= 8) return 'week';
    // 32 days = ~30-day month + buffer
    if (diffDays <= 32) return 'month';
    // 367 days = ~365-day year + buffer
    if (diffDays <= 367) return 'year';
    return 'all';
  } catch {
    return 'all';
  }
}

// Stars/day velocity calculation with age smoothing and period-based thresholds.
// Inspired by github-discover: dual threshold (total stars + rate) filters noise.
// Age smoothing adds 1 day to denominator so day-0 repos don't inflate.
export function calcStarsPerDay(repo: Repo, mode: DiscoveryMode, timeRange?: string): number | null {
  if (mode !== 'rising') return null;
  if (!repo.created_at) return null;

  const cfg = PERIOD_CONFIG[getPeriodFromTimeRange(timeRange || '')] || PERIOD_DEFAULT;

  if (repo.stargazers_count < cfg.minStars) return null;

  const ageDays = (Date.now() - new Date(repo.created_at).getTime()) / MS_PER_DAY;
  // Guard against NaN (malformed date) and future dates from clock skew
  if (isNaN(ageDays) || ageDays < 0) return null;
  if (ageDays > cfg.maxAge) return null;

  const velocity = Math.floor(repo.stargazers_count / (ageDays + AGE_SMOOTHING));
  if (velocity < cfg.minPerDay) return null;
  return velocity;
}

// Time range value calculation (extracted from FilterBar, reusable)
export function getTimeRangeValue(period: 'week' | 'month' | 'year'): string {
  const now = new Date();
  if (period === 'week') {
    const week = new Date(now);
    week.setDate(week.getDate() - 7);
    return `>${week.toISOString().split('T')[0]}`;
  }
  if (period === 'month') {
    const month = new Date(now);
    month.setMonth(month.getMonth() - 1);
    return `>${month.toISOString().split('T')[0]}`;
  }
  if (period === 'year') {
    const year = new Date(now);
    year.setFullYear(year.getFullYear() - 1);
    return `>${year.toISOString().split('T')[0]}`;
  }
  return '';
}

// AI Summary — separate namespace from gitstar-cache: to avoid LRU eviction in cache.ts
export const DEFAULT_AI_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
export const DEFAULT_AI_MODEL = 'deepseek-chat';
export const MAX_SUMMARY_CACHE_ENTRIES = 50;
// Byte limit for README content sent to LLM (not rendered content)
export const README_TRUNCATE_BYTES = 8192;
export const AI_SUMMARY_PREFIX = 'gitstar-ai:summary:v1:';
