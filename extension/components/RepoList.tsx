import { useMemo } from 'react';
import type { Repo, DiscoveryMode } from '../lib/types';
import { calcStarsPerDay } from '../lib/constants';
import RepoCard from './RepoCard';
import EmptyState from './EmptyState';

interface Props {
  repos: Repo[];
  favorites: string[] | null;
  onToggleFavorite: (fullName: string) => void;
  loaded: boolean;
  mode: DiscoveryMode;
  timeRange: string;
  sort: string;
}

export default function RepoList({ repos, favorites, onToggleFavorite, loaded, mode, timeRange, sort }: Props) {
  // Pre-compute starsPerDay once per repo to avoid redundant calls during sort + render
  const starsPerDayMap = useMemo(() => {
    if (mode !== 'rising') return null;
    const map = new Map<number, number | null>();
    for (const r of repos) map.set(r.id, calcStarsPerDay(r, mode, timeRange));
    return map;
  }, [repos, mode, timeRange]);

  // Rising mode + growth sort: client-side re-rank by growth rate
  const ranked = useMemo(() => {
    if (!starsPerDayMap || sort !== 'growth') return repos;
    return [...repos].sort((a, b) =>
      (starsPerDayMap.get(b.id) ?? 0) -
      (starsPerDayMap.get(a.id) ?? 0)
    );
  }, [repos, starsPerDayMap, sort]);

  if (!loaded) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl p-3 bg-white animate-pulse shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
            <div className="flex gap-3 items-start">
              <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-2/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (repos.length === 0) return <EmptyState />;

  return (
    <div className="space-y-3">
      {ranked.map(repo => (
        <RepoCard
          key={repo.id}
          repo={repo}
          isFavorite={(favorites || []).includes(repo.full_name)}
          onToggleFavorite={onToggleFavorite}
          starsPerDay={starsPerDayMap ? starsPerDayMap.get(repo.id) ?? undefined : undefined}
        />
      ))}
    </div>
  );
}
