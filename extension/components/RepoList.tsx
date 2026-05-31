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
}

export default function RepoList({ repos, favorites, onToggleFavorite, loaded, mode }: Props) {
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
      {repos.map(repo => (
        <RepoCard
          key={repo.id}
          repo={repo}
          isFavorite={(favorites || []).includes(repo.full_name)}
          onToggleFavorite={onToggleFavorite}
          starsPerDay={mode === 'rising' ? calcStarsPerDay(repo, mode) : undefined}
        />
      ))}
    </div>
  );
}
