import { Repo } from '../lib/types';
import RepoCard from './RepoCard';
import EmptyState from './EmptyState';

interface Props {
  repos: Repo[];
  favorites: string[] | null;
  onToggleFavorite: (fullName: string) => void;
  loaded: boolean;
}

export default function RepoList({ repos, favorites, onToggleFavorite, loaded }: Props) {
  if (!loaded) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border border-gray-200 rounded-lg p-4 bg-white animate-pulse">
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
      {repos.map(repo => (
        <RepoCard
          key={repo.id}
          repo={repo}
          isFavorite={(favorites || []).includes(repo.full_name)}
          onToggleFavorite={onToggleFavorite}
        />
      ))}
    </div>
  );
}
