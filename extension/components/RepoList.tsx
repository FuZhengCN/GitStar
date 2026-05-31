import { useMemo } from 'react';
import type { Repo, DiscoveryMode } from '../lib/types';
import { calcStarsPerDay } from '../lib/constants';
import RepoCard from './RepoCard';
import EmptyState from './EmptyState';
import SkeletonRepoCard from './SkeletonRepoCard';

interface Props {
  repos: Repo[];
  favorites: string[] | null;
  onToggleFavorite: (fullName: string) => void;
  loaded: boolean;
  mode: DiscoveryMode;
  timeRange: string;
}

export default function RepoList({ repos, favorites, onToggleFavorite, loaded, mode, timeRange }: Props) {
  // Pre-compute starsPerDay once per repo to avoid redundant calls during sort + render
  const starsPerDayMap = useMemo(() => {
    if (mode !== 'rising') return null;
    const map = new Map<number, number | null>();
    for (const r of repos) map.set(r.id, calcStarsPerDay(r, mode, timeRange));
    return map;
  }, [repos, mode, timeRange]);

  // Rising mode: client-side re-rank by growth rate (github-discover trending style)
  const ranked = useMemo(() => {
    if (!starsPerDayMap) return repos;
    return [...repos].sort((a, b) =>
      (starsPerDayMap.get(b.id) ?? 0) -
      (starsPerDayMap.get(a.id) ?? 0)
    );
  }, [repos, starsPerDayMap]);

  if (!loaded) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonRepoCard key={i} />
        ))}
      </div>
    );
  }

  if (repos.length === 0) return <EmptyState mode={mode} />;

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
