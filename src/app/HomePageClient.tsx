'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Repo } from '@/lib/types';
import { useFavorites } from '@/hooks/useFavorites';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import RepoList from '@/components/RepoList';
import Pagination from '@/components/Pagination';

interface Props {
  initialRepos: Repo[];
  totalCount: number;
  error: string | null;
}

export default function HomePageClient({ initialRepos, totalCount, error: serverError }: Props) {
  const router = useRouter();
  const sp = useSearchParams();

  const [search, setSearch] = useState(sp.get('q') || '');
  const [language, setLanguage] = useState(sp.get('language') || '');
  const [timeRange, setTimeRange] = useState(sp.get('created') || '');
  const [sort, setSort] = useState(sp.get('sort') || 'stars');
  const [page, setPage] = useState(parseInt(sp.get('page') || '1', 10));

  const [repos, setRepos] = useState<Repo[]>(initialRepos);
  const [total, setTotal] = useState(totalCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(serverError);

  const { favorites, toggle: toggleFavorite, loaded: favLoaded } = useFavorites();

  const totalPages = Math.min(Math.ceil(total / 10), 34);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort, order: 'desc', page: String(page), per_page: '10' });
      if (search) params.set('q', search);
      if (language) params.set('language', language);
      if (timeRange) params.set('created', timeRange);

      const res = await fetch(`/api/repos?${params}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Failed to fetch');
      }
      const data = await res.json();
      setRepos(data.items);
      setTotal(data.total_count);
    } catch (err: unknown) {
      setError((err as { message?: string }).message || 'Failed to load repositories');
    } finally {
      setLoading(false);
    }
  }, [search, language, timeRange, sort, page]);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (language) params.set('language', language);
    if (timeRange) params.set('created', timeRange);
    if (sort !== 'stars') params.set('sort', sort);
    if (page > 1) params.set('page', String(page));
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : '/', { scroll: false });
  }, [search, language, timeRange, sort, page, router]);

  // Fetch when filters change; reset to server data when back to defaults
  const isInitial = useMemo(() => {
    return !search && !language && !timeRange && sort === 'stars' && page === 1;
  }, [search, language, timeRange, sort, page]);

  useEffect(() => {
    if (isInitial) {
      setRepos(initialRepos);
      setTotal(totalCount);
    } else {
      fetchRepos();
    }
  }, [isInitial, fetchRepos]);

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const handleLanguage = useCallback((v: string) => { setLanguage(v); setPage(1); }, []);
  const handleTimeRange = useCallback((v: string) => { setTimeRange(v); setPage(1); }, []);
  const handleSort = useCallback((v: string) => { setSort(v); setPage(1); }, []);

  return (
    <div className="space-y-3 pb-14">
      <SearchBar value={search} onChange={handleSearch} />
      <FilterBar
        language={language} onLanguageChange={handleLanguage}
        timeRange={timeRange} onTimeRangeChange={handleTimeRange}
        sort={sort} onSortChange={handleSort}
      />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">
          {error}
        </div>
      )}
      {loading ? (
        <RepoList repos={[]} favorites={favorites} onToggleFavorite={toggleFavorite} loaded={false} />
      ) : (
        <RepoList repos={repos} favorites={favorites} onToggleFavorite={toggleFavorite} loaded={favLoaded} />
      )}
      <div className="sticky bottom-0 bg-slate-50 z-20 border-t border-gray-100 pt-2 pb-1 -mx-4 px-4">
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </div>
    </div>
  );
}
