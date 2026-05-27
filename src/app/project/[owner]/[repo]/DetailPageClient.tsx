'use client';
import { RepoDetail } from '@/lib/types';
import { useFavorites } from '@/hooks/useFavorites';
import RepoHeader from '@/components/RepoHeader';
import ReadmeViewer from '@/components/ReadmeViewer';
import ErrorState from '@/components/ErrorState';

interface Props {
  repo: RepoDetail | null;
  error: { title: string; message: string } | null;
}

export default function DetailPageClient({ repo, error }: Props) {
  const { favorites, toggle: toggleFavorite, loaded } = useFavorites();

  if (error) {
    return <ErrorState title={error.title} message={error.message} />;
  }

  if (!repo) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-200 rounded w-full mb-1" />
              <div className="h-4 bg-gray-200 rounded w-1/2" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <RepoHeader
        repo={repo}
        isFavorite={loaded && favorites.includes(repo.full_name)}
        onToggleFavorite={toggleFavorite}
      />
      {repo.readme ? (
        <ReadmeViewer content={repo.readme} />
      ) : (
        <p className="text-gray-400 text-center py-8">该项目没有 README 文件</p>
      )}
    </div>
  );
}
