'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Repo } from '@/lib/types';
import { useFavorites } from '@/hooks/useFavorites';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import RepoList from '@/components/RepoList';
import Pagination from '@/components/Pagination';
import LoadingBar from '@/components/LoadingBar';

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

  const totalPages = Math.min(Math.ceil(total / 30), 34);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ sort, order: 'desc', page: String(page), per_page: '30' });
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

  // Fetch when filters change (skip initial load since server already fetched)
  const isInitial = useMemo(() => {
    return !search && !language && !timeRange && sort === 'stars' && page === 1;
  }, [search, language, timeRange, sort, page]);

  useEffect(() => {
    if (!isInitial) fetchRepos();
  }, [isInitial, fetchRepos]);

  const handleSearch = useCallback((v: string) => { setSearch(v); setPage(1); }, []);
  const handleLanguage = useCallback((v: string) => { setLanguage(v); setPage(1); }, []);
  const handleTimeRange = useCallback((v: string) => { setTimeRange(v); setPage(1); }, []);
  const handleSort = useCallback((v: string) => { setSort(v); setPage(1); }, []);

  return (
    <div className="space-y-4">
      <LoadingBar loading={loading} />
      <SearchBar value={search} onChange={handleSearch} />
      <FilterBar
        language={language} onLanguageChange={handleLanguage}
        timeRange={timeRange} onTimeRangeChange={handleTimeRange}
        sort={sort} onSortChange={handleSort}
      />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-4 text-sm">
          {error}
        </div>
      )}
      {loading ? (
        <RepoList repos={[]} favorites={favorites} onToggleFavorite={toggleFavorite} loaded={false} />
      ) : (
        <RepoList repos={repos} favorites={favorites} onToggleFavorite={toggleFavorite} loaded={favLoaded} />
      )}
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
    </div>
  );
}
