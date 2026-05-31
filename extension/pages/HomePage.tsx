import { useState, useEffect, useCallback } from 'react';
import type { Repo, SearchParams, DiscoveryMode } from '../lib/types';
import { AppError } from '../lib/types';
import { CACHE_TTL } from '../lib/constants';
import { searchRepos } from '../lib/github';
import { useFavorites } from '../hooks/useFavorites';
import { useStaleCache } from '../hooks/useStaleCache';
import { useI18n } from '../lib/i18n';
import { errorMessageText } from '../lib/errors';
import SearchBar from '../components/SearchBar';
import FilterBar from '../components/FilterBar';
import RepoList from '../components/RepoList';
import Pagination from '../components/Pagination';
import LoadingBar from '../components/LoadingBar';
import { DISCOVERY_MODES, getTimeRangeValue } from '../lib/constants';

interface Props {
  hasToken: boolean;
  mode: DiscoveryMode;
  flashMode: DiscoveryMode | null;
}

export default function HomePage({ hasToken, mode, flashMode }: Props) {
  const [search, setSearch] = useState(() => {
    try { return sessionStorage.getItem('gs-search') || ''; } catch { return ''; }
  });
  const [language, setLanguage] = useState(() => {
    try { return sessionStorage.getItem('gs-language') || ''; } catch { return ''; }
  });
  const [timeRange, setTimeRange] = useState(() => {
    try { return sessionStorage.getItem('gs-timerange') || ''; } catch { return ''; }
  });
  const [sort, setSort] = useState(() => {
    try { return sessionStorage.getItem('gs-sort') || 'stars'; } catch { return 'stars'; }
  });
  const [page, setPage] = useState(() => {
    try { return parseInt(sessionStorage.getItem('gs-page') || '1', 10); } catch { return 1; }
  });

  const { favorites, toggle: toggleFavorite, loaded: favLoaded } = useFavorites();

  const saveSearchState = useCallback((s: string, l: string, t: string, so: string, p: number) => {
    try {
      sessionStorage.setItem('gs-search', s);
      sessionStorage.setItem('gs-language', l);
      sessionStorage.setItem('gs-timerange', t);
      sessionStorage.setItem('gs-sort', so);
      sessionStorage.setItem('gs-page', String(p));
    } catch { /* ignore */ }
  }, []);

  const { t } = useI18n();

  const cacheKey = `search:${encodeURIComponent(search)}:${encodeURIComponent(language)}:${encodeURIComponent(timeRange)}:${encodeURIComponent(sort)}:${page}`;

  const fetcher = useCallback(async () => {
    try {
      const params: SearchParams = { sort: sort as SearchParams['sort'], order: 'desc', page, per_page: 10 };
      if (search) params.q = search;
      if (language) params.language = language;
      if (timeRange) params.created = timeRange;
      return await searchRepos(params);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e.status === 403) throw new AppError('RATE_LIMIT');
      throw err;
    }
  }, [search, language, timeRange, sort, page]);

  const { data: result, loading, error } = useStaleCache(cacheKey, fetcher, CACHE_TTL.SEARCH);
  const repos = result?.items ?? [];
  const total = result?.total_count ?? 0;
  const totalPages = Math.min(Math.ceil(total / 10), 100);

  useEffect(() => {
    saveSearchState(search, language, timeRange, sort, page);
  }, [search, language, timeRange, sort, page, saveSearchState]);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  // Sync sort/timeRange when discovery mode changes
  useEffect(() => {
    const config = DISCOVERY_MODES[mode];
    setSort(config.sort);
    setTimeRange(config.created ? getTimeRangeValue(config.created as 'week' | 'month') : '');
    setPage(1);
  }, [mode]);

  return (
    <div className="space-y-3 pb-14">
      <LoadingBar loading={loading} />
      <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} />
      <FilterBar
        language={language} onLanguageChange={v => { setLanguage(v); setPage(1); }}
        timeRange={timeRange} onTimeRangeChange={v => { setTimeRange(v); setPage(1); }}
        sort={sort} onSortChange={v => { setSort(v); setPage(1); }}
        flashMode={flashMode}
      />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">{errorMessageText(error, t)}</div>
      )}
      <RepoList repos={repos} favorites={favorites} onToggleFavorite={toggleFavorite} loaded={!loading && favLoaded} mode={mode} />
      <div className="fixed bottom-0 left-0 right-0 bg-slate-50 z-20 border-t border-gray-100 pt-2 pb-1">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        <div className="text-center text-[10px] text-gray-400 pt-0.5">
          {hasToken ? <span className="text-[#16a34a]">{t('tokenConfigured')}</span> : t('tokenNotConfigured')}
        </div>
      </div>
    </div>
  );
}
