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

// Badge thresholds
export const STAR_VELOCITY_MIN_STARS = 500;
export const STAR_VELOCITY_MIN_PER_DAY = 10;
export const STAR_VELOCITY_MAX_AGE_DAYS = 30;

// Stars/day velocity calculation (borrows github-discover dual threshold approach)
export function calcStarsPerDay(repo: Repo, mode: DiscoveryMode): number | null {
  if (mode !== 'rising') return null;
  if (repo.stargazers_count < STAR_VELOCITY_MIN_STARS) return null;
  if (!repo.created_at) return null;
  const ageDays = Math.max(1, (Date.now() - new Date(repo.created_at).getTime()) / 86400000);
  if (ageDays > STAR_VELOCITY_MAX_AGE_DAYS) return null;
  const velocity = Math.floor(repo.stargazers_count / ageDays);
  if (velocity < STAR_VELOCITY_MIN_PER_DAY) return null;
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
