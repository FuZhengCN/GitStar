import { useState, useEffect } from 'react';
import type { Repo } from '../lib/types';
import { CACHE_TTL } from '../lib/constants';
import { getRepoInfo } from '../lib/github';
import { useFavorites } from '../hooks/useFavorites';
import { useI18n } from '../lib/i18n';
import Pagination from '../components/Pagination';
import ErrorState from '../components/ErrorState';
import RepoCard from '../components/RepoCard';
import SkeletonRepoCard from '../components/SkeletonRepoCard';
import { getCache, setCache, isFresh } from '../lib/cache';

export default function FavoritesPage() {
  const { t } = useI18n();
  const { favorites, toggle: toggleFavorite, loaded } = useFavorites();
  const [repos, setRepos] = useState<(Repo | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;
  const FAVORITES_REPO_TTL = CACHE_TTL.FAVORITES_REPO;

  useEffect(() => { setPage(1); }, [favorites, retryKey]);
  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  useEffect(() => {
    if (!loaded) return;
    if (!favorites || favorites.length === 0) {
      setRepos([]);
      setLoading(false);
      setError(false);
      return;
    }

    let cancelled = false;
    const BATCH_SIZE = 5;
    const BATCH_DELAY = 200;

    const fetchRepos = async () => {
      setLoading(true);
      setError(false);
      setFailedCount(0);

      const results: (Repo | null)[] = new Array(favorites.length).fill(null);
      const missIndices: number[] = [];

      for (let i = 0; i < favorites.length; i++) {
        if (cancelled) return;
        const cached = await getCache<Repo>(`repo:${favorites[i]}`);
        if (cached && isFresh(cached, FAVORITES_REPO_TTL)) {
          results[i] = cached.data;
        } else {
          missIndices.push(i);
        }
      }

      if (missIndices.length > 0) {
        setRepos([...results]);
      }

      let failures = 0;
      for (let b = 0; b < missIndices.length; b += BATCH_SIZE) {
        if (cancelled) return;
        const batch = missIndices.slice(b, b + BATCH_SIZE);
        const batchResults = await Promise.allSettled(
          batch.map(idx => {
            const [owner, repoName] = favorites[idx].split('/');
            return getRepoInfo(owner, repoName);
          })
        );
        batchResults.forEach((r, j) => {
          if (cancelled) return;
          const idx = batch[j];
          if (r.status === 'fulfilled') {
            results[idx] = r.value;
            setCache(`repo:${favorites[idx]}`, r.value);
          } else {
            failures++;
          }
        });
        setRepos([...results]);
        setFailedCount(failures);

        if (b + BATCH_SIZE < missIndices.length) {
          await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
        }
      }

      if (!cancelled) {
        setRepos([...results]);
        setFailedCount(failures);
        if (failures === favorites.length) {
          setError(true);
        }
        setLoading(false);
      }
    };

    fetchRepos();
    return () => { cancelled = true; };
  }, [favorites, loaded, retryKey, FAVORITES_REPO_TTL]);

  if (!loaded || favorites === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonRepoCard key={i} />
        ))}
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[#6b7280] text-base mb-2">{t('noFavorites')}</p>
        <p className="text-[#9ca3af] text-sm mb-4">{t('goDiscover')}</p>
        <a href="#/" className="text-sm text-[#3b82f6] hover:underline">{t('backToDiscover')}</a>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title={t('loadFailed')}
        message={t('favoritesLoadFailed')}
        onRetry={() => setRetryKey(k => k + 1)}
        onBack={() => { window.location.hash = '#/'; }}
      />
    );
  }

  const reversedFavorites = [...favorites].reverse();
  const validRepos = repos.filter((r): r is Repo => r !== null);
  const orderedRepos = reversedFavorites
    .map(fn => validRepos.find(r => r.full_name === fn))
    .filter((r): r is Repo => r !== undefined);
  const totalPages = Math.ceil(orderedRepos.length / PER_PAGE);
  const pageRepos = orderedRepos.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className="pb-14">
      <nav className="text-xs mb-3">
        <a href="#/" className="text-[#3b82f6] hover:underline cursor-pointer">{t('backToDiscover')}</a>
      </nav>
      <h2 className="text-[15px] font-bold text-[#1e1b4b] mb-3">{t('myFavorites').replace('{count}', String(favorites.length))}</h2>
      {loading && orderedRepos.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRepoCard key={i} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {pageRepos.map(repo => (
            <RepoCard
              key={repo.id}
              repo={repo}
              isFavorite={true}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
      {(totalPages > 1 || (failedCount > 0 && !error)) && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-50 z-20 border-t border-gray-100 pt-2 pb-1">
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
          {failedCount > 0 && !error && (
            <div className="text-center text-[10px] text-[#9ca3af] pt-0.5">
              {t('itemsLoadFailed').replace('{n}', String(failedCount))}
              {' '}
              <button
                onClick={() => setRetryKey(k => k + 1)}
                className="text-[#3b82f6] hover:underline"
              >
                {t('retry')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
