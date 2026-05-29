import { useState, useEffect, useLayoutEffect, useCallback, Component } from 'react';
import { Router, Route } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import type { Repo, RepoDetail, SearchParams } from './lib/types';
import { README_PREVIEW_BYTES } from './lib/constants';
import { searchRepos, getRepoInfo, getRepoReadme, loadToken, setToken, getToken, checkStarred, starRepo, unstarRepo } from './lib/github';
import { parseMarkdown } from './lib/markdown';
import { useFavorites } from './hooks/useFavorites';
import { useStaleCache } from './hooks/useStaleCache';
import SearchBar from './components/SearchBar';
import FilterBar from './components/FilterBar';
import RepoList from './components/RepoList';
import Pagination from './components/Pagination';
import LoadingBar from './components/LoadingBar';
import RepoHeader from './components/RepoHeader';
import ReadmeViewer from './components/ReadmeViewer';
import ErrorState from './components/ErrorState';
import GitStarIcon from './components/GitStarIcon';
import RepoCard from './components/RepoCard';
import { getCache, setCache, isFresh } from './lib/cache';
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

function HomePage({ hasToken }: { hasToken: boolean }) {
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
      if (e.status === 403) throw new Error('GitHub API 限流。请前往 Options 页配置 Personal Access Token');
      throw err;
    }
  }, [search, language, timeRange, sort, page]);

  const { data: result, loading, error } = useStaleCache(cacheKey, fetcher, 2 * 60 * 1000);
  const repos = result?.items ?? [];
  const total = result?.total_count ?? 0;
  const totalPages = Math.min(Math.ceil(total / 10), 100);

  useEffect(() => {
    saveSearchState(search, language, timeRange, sort, page);
  }, [search, language, timeRange, sort, page, saveSearchState]);

  useEffect(() => { window.scrollTo(0, 0); }, [page]);

  return (
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
        {hasToken ? <span className="text-[#16a34a]">Token 已配置</span> : '未配置 Token · 限流 60 次/小时'}
      </div>
    </div>
  );
}



function DetailPage({ params }: { params: { owner: string; repo: string } }) {
  const { owner, repo } = params;
  const [readmeExpanded, setReadmeExpanded] = useState(false);
  const [displayHtml, setDisplayHtml] = useState('');
  const [isStarred, setIsStarred] = useState(false);
  const [starLoading, setStarLoading] = useState(false);
  const { favorites, toggle: toggleFavorite, loaded } = useFavorites();

  // Repo info cache (5 min TTL)
  const repoFetcher = useCallback(async () => {
    try {
      return await getRepoInfo(owner, repo);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e.status === 404) throw new Error('仓库不存在');
      if (e.status === 403) throw new Error('GitHub API 限流。请前往 Options 页配置 Personal Access Token');
      throw err;
    }
  }, [owner, repo]);
  const { data: detail, loading: repoLoading, error } = useStaleCache(
    `repo:${owner}/${repo}`,
    repoFetcher,
    5 * 60 * 1000
  );

  // README cache (10 min TTL), gated on detail availability
  const readmeCacheKey = detail ? `readme:${owner}/${repo}` : null;
  const readmeFetcher = useCallback(async () => {
    const content = await getRepoReadme(owner, repo);
    if (!content) return { content: '', html: '' };
    const branch = detail?.default_branch || 'main';
	const src = content.length > README_PREVIEW_BYTES ? content.slice(0, README_PREVIEW_BYTES) : content;
    const html = await parseMarkdown(src, owner, repo, branch);
    return { content, html };
  }, [owner, repo, detail?.default_branch]);
  const { data: readmeData, loading: readmeLoading, error: readmeError } = useStaleCache(
    readmeCacheKey, readmeFetcher, 10 * 60 * 1000
  );

  const readmeContent = readmeData?.content ?? '';

  // Sync display HTML from cache (preview HTML)
  useEffect(() => {
    if (readmeData?.html && !readmeExpanded) {
      setDisplayHtml(readmeData.html);
    }
  }, [readmeData?.html, readmeExpanded]);

  // Star check (not cached — always fetch current state)
  useEffect(() => {
    if (!detail) return;
    checkStarred(owner, repo).then(setIsStarred).catch(() => {});
  }, [detail, owner, repo]);

  // Reset state when navigating to a different repo (before paint to avoid flicker)
  useLayoutEffect(() => {
    setReadmeExpanded(false);
    window.scrollTo(0, 0);
  }, [owner, repo]);

  const handleToggleStar = useCallback(async () => {
    setStarLoading(true);
    try {
      if (isStarred) {
        await unstarRepo(owner, repo);
        setIsStarred(false);
      } else {
        await starRepo(owner, repo);
        setIsStarred(true);
      }
    } catch {
      // keep current state on failure
    } finally {
      setStarLoading(false);
    }
  }, [isStarred, owner, repo]);

  const handleExpand = () => {
    setReadmeExpanded(true);
    parseMarkdown(readmeContent, owner, repo, detail?.default_branch || 'main').then(html => {
      setDisplayHtml(html);
    });
  };

  if (error) {
    return (
      <ErrorState title="出错了" message={error} onBack={() => window.history.back()} />
    );
  }

  return (
    <div>
      {repoLoading || !detail ? (
        <>
          <LoadingBar loading={true} />
          <div className="animate-pulse space-y-4 mt-4">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <RepoHeader
            repo={detail}
            isFavorite={loaded && (favorites || []).includes(detail.full_name)}
            onToggleFavorite={toggleFavorite}
            isStarred={isStarred}
            onToggleStar={handleToggleStar}
            starLoading={starLoading}
          />
          <div className="mt-4">
            {readmeContent ? (
              <ReadmeViewer
                content={readmeContent}
                html={displayHtml}
                expanded={readmeExpanded}
                onExpand={handleExpand}
                loading={readmeLoading}
              />
            ) : readmeLoading ? (
              <div className="border border-[#f3f4f6] rounded-lg bg-white">
                <div className="px-4 py-3 border-b border-[#f3f4f6] bg-[#f9fafb]">
                  <h2 className="text-xs font-semibold text-gray-700">📖 README.md</h2>
                </div>
                <div className="px-6 py-4 animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 rounded w-4/6" />
                </div>
              </div>
            ) : readmeError && !readmeContent ? (
              <p className="text-red-500 text-center py-8 text-sm">{readmeError}</p>
            ) : (
              <p className="text-gray-400 text-center py-8 text-sm">该项目没有 README 文件</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function useCurrentHash() {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const handler = () => setHash(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  return hash;
}

function FavoritesPage() {
  const { favorites, toggle: toggleFavorite, loaded } = useFavorites();
  const [repos, setRepos] = useState<(Repo | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [failedCount, setFailedCount] = useState(0);
  const [retryKey, setRetryKey] = useState(0);
  const [page, setPage] = useState(1);
  const PER_PAGE = 10;

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
    const CACHE_TTL = 5 * 60 * 1000;
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
        if (cached && isFresh(cached, CACHE_TTL)) {
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
            const [owner, repo] = favorites[idx].split('/');
            return getRepoInfo(owner, repo);
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
  }, [favorites, loaded, retryKey]);

  if (!loaded || favorites === null) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-[#f3f4f6] rounded-lg p-3 bg-white animate-pulse">
            <div className="flex gap-2.5 items-start">
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

  if (favorites.length === 0) {
    return (
      <div className="text-center py-16">
        <p className="text-[#6b7280] text-base mb-2">暂无收藏项目</p>
        <p className="text-[#9ca3af] text-sm mb-4">去首页探索优质开源项目吧</p>
        <a href="#/" className="text-sm text-[#3b82f6] hover:underline">← 返回发现</a>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="加载失败"
        message="无法获取收藏项目信息"
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
    <div>
      <nav className="text-xs mb-3">
        <a href="#/" className="text-[#3b82f6] hover:underline cursor-pointer">← 返回发现</a>
      </nav>
      <h2 className="text-[15px] font-bold text-[#1e1b4b] mb-3">★ 我的收藏 ({favorites.length})</h2>
      {loading && orderedRepos.length === 0 ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="border border-[#f3f4f6] rounded-lg p-3 bg-white animate-pulse">
              <div className="flex gap-2.5 items-start">
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
      <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      {failedCount > 0 && !error && (
        <div className="text-center text-xs text-[#9ca3af] mt-3">
          {failedCount} 个项目加载失败
          {' '}
          <button
            onClick={() => setRetryKey(k => k + 1)}
            className="text-[#3b82f6] hover:underline"
          >
            重试
          </button>
        </div>
      )}
    </div>
  );
}

export default function PopupIndex() {
  const [tokenReady, setTokenReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const hash = useCurrentHash();
  const { favorites, loaded: favLoaded } = useFavorites();
  const favCount = favLoaded ? (favorites || []).length : 0;
  const isFavPage = hash === '#/favorites';
  const renderHomePage = useCallback(() => <HomePage hasToken={hasToken} />, [hasToken]);

  useEffect(() => {
    loadToken().then(() => { setHasToken(!!getToken()); setTokenReady(true); });
    const listener = (changes: Record<string, chrome.storage.StorageChange>) => {
      if (changes.githubToken) {
        const val = changes.githubToken.newValue || null;
        setToken(val);
        setHasToken(!!val);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  if (!tokenReady) {
    return (
      <div style={{ width: POPUP_WIDTH }} className="min-h-[720px] bg-white flex flex-col">
        <div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <GitStarIcon />
            <span className="translate-y-[-1px]">GitStar</span>
          </h1>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-white/85 font-medium">发现优质开源项目</span>
            <span className="text-[11px] font-semibold text-white/40 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] rounded-md px-2 py-1">★ 收藏</span>
          </div>
        </div>
        <div className="p-4 flex-1">
          <LoadingBar loading={true} />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ width: POPUP_WIDTH, minHeight: '720px' }} className="bg-white flex flex-col">
        <div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <GitStarIcon />
            <span className="translate-y-[-1px]">GitStar</span>
          </h1>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-white/85 font-medium">发现优质开源项目</span>
            <a
              href="#/favorites"
              className={`flex items-center gap-1 text-[11px] font-semibold no-underline rounded-md px-2 py-1 border transition-colors ${isFavPage ? 'text-[#f59e0b] bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.3)]' : 'text-white bg-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.2)]'}`}
              title="我的收藏"
            >
              ★ 收藏
              {favCount > 0 && (
                <span className={`rounded-full min-w-[16px] h-4 flex items-center justify-center text-[10px] px-1 ${isFavPage ? 'bg-[rgba(245,158,11,0.2)]' : 'bg-[rgba(255,255,255,0.2)]'}`}>{favCount}</span>
              )}
            </a>
          </div>
        </div>
        <div className="p-4 flex-1">
          <Router hook={useHashLocation}>
            <Route path="/favorites" component={FavoritesPage} />
            <Route path="/project/:owner/:repo">
              {(params) => <DetailPage params={params} />}
            </Route>
            <Route path="/" component={renderHomePage} />
          </Router>
        </div>
      </div>
    </ErrorBoundary>
  );
}
