import { useState, useEffect, useCallback, Component } from 'react';
import { Router, Route } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import type { Repo, RepoDetail, SearchParams } from './lib/types';
import { searchRepos, getRepoDetail, loadToken, setToken, getToken } from './lib/github';
import { useFavorites } from './hooks/useFavorites';
import SearchBar from './components/SearchBar';
import FilterBar from './components/FilterBar';
import RepoList from './components/RepoList';
import Pagination from './components/Pagination';
import LoadingBar from './components/LoadingBar';
import RepoHeader from './components/RepoHeader';
import ReadmeViewer from './components/ReadmeViewer';
import ErrorState from './components/ErrorState';
import './assets/tailwind.css';

const POPUP_WIDTH = '400px';

class ErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ width: POPUP_WIDTH, padding: 20, color: 'red', fontSize: 12, fontFamily: 'monospace' }}>
          <strong>Render Error:</strong>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{this.state.error.message}</pre>
        </div>
      );
    }
    return this.props.children;
  }
}

function HomePage() {
  const [search, setSearch] = useState('');
  const [language, setLanguage] = useState('');
  const [timeRange, setTimeRange] = useState('');
  const [sort, setSort] = useState('stars');
  const [page, setPage] = useState(1);

  const [repos, setRepos] = useState<Repo[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { favorites, toggle: toggleFavorite, loaded: favLoaded } = useFavorites();
  const totalPages = Math.min(Math.ceil(total / 30), 34);

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: SearchParams = { sort: sort as SearchParams['sort'], order: 'desc', page, per_page: 30 };
      if (search) params.q = search;
      if (language) params.language = language;
      if (timeRange) params.created = timeRange;
      const data = await searchRepos(params);
      setRepos(data.items);
      setTotal(data.total_count);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e.status === 403) setError('GitHub API 限流。请前往 Options 页配置 Personal Access Token');
      else setError(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [search, language, timeRange, sort, page]);

  useEffect(() => { fetchRepos(); }, [fetchRepos]);

  return (
    <div style={{ width: POPUP_WIDTH }} className="min-h-[500px] p-4 bg-white">
      <div className="space-y-3">
        <LoadingBar loading={loading} />
        <SearchBar value={search} onChange={v => { setSearch(v); setPage(1); }} />
        <FilterBar
          language={language} onLanguageChange={v => { setLanguage(v); setPage(1); }}
          timeRange={timeRange} onTimeRangeChange={v => { setTimeRange(v); setPage(1); }}
          sort={sort} onSortChange={v => { setSort(v); setPage(1); }}
        />
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-xs">{error}</div>
        )}
        <RepoList repos={repos} favorites={favorites} onToggleFavorite={toggleFavorite} loaded={!loading && favLoaded} />
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        <div className="text-center text-xs text-gray-400 pt-2">
          {getToken() ? 'Token 已配置' : '未配置 Token · 限流 60 次/小时'}
        </div>
      </div>
    </div>
  );
}

function DetailPage({ params }: { params: { owner: string; repo: string } }) {
  const { owner, repo } = params;
  const [detail, setDetail] = useState<RepoDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { favorites, toggle: toggleFavorite, loaded } = useFavorites();

  useEffect(() => {
    let cancelled = false;
    console.log('[DetailPage] enter:', owner, repo);
    const t0 = performance.now();
    setLoading(true);
    setError(null);
    getRepoDetail(owner, repo)
      .then(data => {
        if (cancelled) return;
        console.log('[DetailPage] API done in', (performance.now() - t0).toFixed(0), 'ms, readme:', data.readme ? `${Math.round(data.readme.length / 1024)}KB` : 'none');
        console.log('[DetailPage] setting detail state...');
        setDetail(data);
        setLoading(false);
        console.log('[DetailPage] setDetail done');
      })
      .catch((err: { message?: string; status?: number }) => {
        if (cancelled) return;
        if (err.status === 404) setError('仓库不存在');
        else if (err.status === 403) setError('GitHub API 限流。请前往 Options 页配置 Personal Access Token');
        else setError(err.message || '加载失败');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [owner, repo]);

  if (error) {
    return (
      <div style={{ width: POPUP_WIDTH }} className="min-h-[500px] p-4 bg-white">
        <ErrorState title="出错了" message={error} onBack={() => window.history.back()} />
      </div>
    );
  }

  if (loading || !detail) {
    return (
      <div style={{ width: POPUP_WIDTH }} className="min-h-[500px] p-4 bg-white">
        <LoadingBar loading={true} />
        <div className="animate-pulse space-y-4 mt-4">
          <div className="h-4 bg-gray-200 rounded w-24" />
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-gray-200" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-2/3" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: POPUP_WIDTH }} className="min-h-[500px] p-4 bg-white">
      <RepoHeader
        repo={detail}
        isFavorite={loaded && (favorites || []).includes(detail.full_name)}
        onToggleFavorite={toggleFavorite}
      />
      <div className="mt-4">
        {detail.readme ? (
          <ReadmeViewer content={detail.readme} owner={owner} repo={repo} branch={detail.default_branch} />
        ) : (
          <p className="text-gray-400 text-center py-8 text-sm">该项目没有 README 文件</p>
        )}
      </div>
    </div>
  );
}

export default function PopupIndex() {
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    loadToken().then(() => setTokenReady(true));
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.githubToken) setToken(changes.githubToken.newValue || null);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  if (!tokenReady) {
    return (
      <div style={{ width: POPUP_WIDTH }} className="min-h-[500px] bg-white">
        <div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
          <h1 className="text-base font-bold text-white">⭐ GitStar</h1>
          <span className="text-[10px] text-white/70">发现优质开源项目</span>
        </div>
        <div className="p-4">
          <LoadingBar loading={true} />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ width: POPUP_WIDTH, minHeight: '500px' }} className="bg-white">
        <div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
          <h1 className="text-base font-bold text-white">⭐ GitStar</h1>
          <span className="text-[10px] text-white/70">发现优质开源项目</span>
        </div>
        <div className="p-4">
          <Router hook={useHashLocation}>
            <Route path="/project/:owner/:repo">
              {(params) => <DetailPage params={params} />}
            </Route>
            <Route path="/" component={HomePage} />
          </Router>
        </div>
      </div>
    </ErrorBoundary>
  );
}
