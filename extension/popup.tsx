import { useState, useEffect, useCallback, Component } from 'react';
import { Router, Route } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import type { Repo, RepoDetail, SearchParams } from './lib/types';
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
import './assets/tailwind.css';

const POPUP_WIDTH = '400px';

const HeaderIcon = () => (
  <svg width="24" height="24" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
    <circle cx="64" cy="64" r="64" fill="#ffffff"/>
    <text x="54" y="104" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="88" font-weight="900" fill="#3b82f6" letter-spacing="-2">G</text>
    <polygon points="101,13 106.5,25.5 120,27.5 109.5,37.5 112,51 101,45 90,51 92.5,37.5 82,27.5 95.5,25.5" fill="#f59e0b"/>
  </svg>
);

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

  const { favorites, toggle: toggleFavorite, loaded: favLoaded } = useFavorites();

  const cacheKey = `search:${encodeURIComponent(search)}:${encodeURIComponent(language)}:${timeRange}:${sort}:${page}`;

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
        {getToken() ? <span className="text-[#16a34a]">Token 已配置</span> : '未配置 Token · 限流 60 次/小时'}
      </div>
    </div>
  );
}

const README_PREVIEW = 60000;

function DetailPage({ params }: { params: { owner: string; repo: string } }) {
  const { owner, repo } = params;
  const [readmeExpanded, setReadmeExpanded] = useState(false);
  const [displayHtml, setDisplayHtml] = useState('');
  const [isStarred, setIsStarred] = useState(false);
  const [starLoading, setStarLoading] = useState(false);
  const { favorites, toggle: toggleFavorite, loaded } = useFavorites();

  // Repo info cache (5 min TTL)
  const repoFetcher = useCallback(() => getRepoInfo(owner, repo), [owner, repo]);
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
    const src = content.length > README_PREVIEW ? content.slice(0, README_PREVIEW) : content;
    const html = await parseMarkdown(src, owner, repo, branch);
    return { content, html };
  }, [owner, repo, detail?.default_branch]);
  const { data: readmeData, loading: readmeLoading } = useStaleCache(
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
    parseMarkdown(readmeContent, owner, repo, detail!.default_branch).then(html => {
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
              <div className="w-12 h-12 rounded-full bg-gray-200" />
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
                <div className="px-4 py-3 border-b border-[#f3f4f6] bg-[#fafafa]">
                  <h2 className="text-sm font-semibold text-gray-700">📖 README.md</h2>
                </div>
                <div className="px-6 py-8 animate-pulse space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-full" />
                  <div className="h-4 bg-gray-200 rounded w-5/6" />
                  <div className="h-4 bg-gray-200 rounded w-4/6" />
                </div>
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8 text-sm">该项目没有 README 文件</p>
            )}
          </div>
        </>
      )}
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
      <div style={{ width: POPUP_WIDTH }} className="min-h-[600px] bg-white flex flex-col">
        <div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <HeaderIcon />
            GitStar
          </h1>
          <span className="text-[11px] text-white/85 font-medium">发现优质开源项目</span>
        </div>
        <div className="p-4 flex-1">
          <LoadingBar loading={true} />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ width: POPUP_WIDTH, minHeight: '600px' }} className="bg-white flex flex-col">
        <div className="bg-[#3b82f6] px-4 py-3 shadow-md flex items-center justify-between">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <HeaderIcon />
            GitStar
          </h1>
          <span className="text-[11px] text-white/85 font-medium">发现优质开源项目</span>
        </div>
        <div className="p-4 flex-1">
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
