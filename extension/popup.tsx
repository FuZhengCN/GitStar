import { useState, useEffect, useCallback } from 'react';
import { Router, Route } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import type { Repo, RepoDetail, SearchParams } from './lib/types';
import { searchRepos, getRepoInfo, loadToken, setToken, getToken } from './lib/github';
import { useFavorites } from './hooks/useFavorites';
import { I18nProvider, useI18n } from './lib/i18n';
import SearchBar from './components/SearchBar';
import FilterBar from './components/FilterBar';
import RepoList from './components/RepoList';
import Pagination from './components/Pagination';
import LoadingBar from './components/LoadingBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import ErrorState from './components/ErrorState';
import GitStarIcon from './components/GitStarIcon';
import RepoCard from './components/RepoCard';
import HomePage from './components/HomePage';
import DetailPage from './components/DetailPage';
import { getCache, setCache, isFresh } from './lib/cache';
import { DISCOVERY_MODES, MODE_EMOJI, getTimeRangeValue } from './lib/constants';
import type { DiscoveryMode } from './lib/types';
import './assets/tailwind.css';

import { POPUP_WIDTH } from './lib/constants';

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
  const { t } = useI18n();
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
          <div key={i} className="rounded-xl p-3 bg-white animate-pulse shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
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
            <div key={i} className="rounded-xl p-3 bg-white animate-pulse shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
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

export default function PopupIndex() {
  return (
    <I18nProvider>
      <PopupIndexInner />
    </I18nProvider>
  );
}

function PopupIndexInner() {
  const { t } = useI18n();
  const [tokenReady, setTokenReady] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [mode, setMode] = useState<DiscoveryMode>('hot');
  const [modeLoaded, setModeLoaded] = useState(false);
  const [modeDropdownOpen, setModeDropdownOpen] = useState(false);
  const [flashMode, setFlashMode] = useState<DiscoveryMode | null>(null);

  const handleModeChange = useCallback((newMode: DiscoveryMode) => {
    setMode(newMode);
    setModeDropdownOpen(false);
    setFlashMode(newMode);
    setTimeout(() => setFlashMode(null), 200);
    chrome.storage.local.set({ 'gitstar-mode': newMode }).catch(() => {});
  }, []);
  const hash = useCurrentHash();
  const { favorites, loaded: favLoaded } = useFavorites();
  const favCount = favLoaded ? (favorites || []).length : 0;
  const isFavPage = hash === '#/favorites';
  const renderHomePage = useCallback(() => <HomePage hasToken={hasToken} mode={mode} flashMode={flashMode} layout="popup" />, [hasToken, mode, flashMode]);

  useEffect(() => {
    loadToken().then(() => { setHasToken(!!getToken()); setTokenReady(true); });
    // Load persisted discovery mode
    chrome.storage.local.get('gitstar-mode').then(r => {
      if (r['gitstar-mode'] && ['hot', 'rising', 'active'].includes(r['gitstar-mode'])) {
        setMode(r['gitstar-mode'] as DiscoveryMode);
      }
      setModeLoaded(true);
    }).catch(() => setModeLoaded(true));
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
      <div style={{ width: POPUP_WIDTH }} className="min-h-[720px] bg-slate-50 flex flex-col">
        <div style={{ width: POPUP_WIDTH }} className="fixed top-0 z-30 bg-[#3b82f6] px-4 py-3 shadow-[0_2px_8px_rgba(59,130,246,0.25)] flex items-center justify-between">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <GitStarIcon />
            <span className="translate-y-[-1px]">GitStar</span>
          </h1>
          <div className="flex items-center gap-2.5">
            <span className="text-[11px] text-white/85 font-medium">{t('discoverProjects')}</span>
            <span className="text-[11px] font-semibold text-white/40 bg-[rgba(255,255,255,0.08)] border border-[rgba(255,255,255,0.15)] rounded-md px-2 py-1">{t('navFavorites')}</span>
          </div>
        </div>
        <div className="p-4 pt-[60px] flex-1">
          <LoadingBar loading={true} />
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={{ width: POPUP_WIDTH, minHeight: '720px' }} className="bg-slate-50 flex flex-col">
        <div style={{ width: POPUP_WIDTH, background: mode === 'rising' ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' : mode === 'active' ? 'linear-gradient(135deg, #3b82f6, #10b981)' : '#3b82f6', transition: 'background 300ms' }} className="fixed top-0 z-30 px-4 py-3 shadow-[0_2px_8px_rgba(59,130,246,0.25)] flex items-center justify-between">
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <GitStarIcon />
            <span className="translate-y-[-1px]">GitStar</span>
          </h1>
          <div className="flex items-center gap-2.5">
            {/* Mode switcher button */}
            <div className="relative">
              <button
                onClick={() => setModeDropdownOpen(v => !v)}
                className={`flex items-center gap-1 text-[11px] font-semibold rounded-md px-2 py-1 border transition-colors ${
                  mode !== 'hot'
                    ? 'text-white bg-[rgba(255,255,255,0.22)] border-[rgba(255,255,255,0.4)]'
                    : 'text-white bg-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.2)]'
                }`}
              >
                {MODE_EMOJI[mode]} {t(`mode.${mode}` as any)} ▾
              </button>
              {modeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setModeDropdownOpen(false)} />
                  <div className="absolute top-full right-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-[#e5e7eb] overflow-hidden min-w-[180px]">
                    {(['hot', 'rising', 'active'] as DiscoveryMode[]).map(m => (
                      <button
                        key={m}
                        onClick={() => handleModeChange(m)}
                        className={`w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[#f3f4f6] transition-colors ${
                          m === mode ? 'bg-[#eff6ff]' : ''
                        }`}
                      >
                        <span>{MODE_EMOJI[m]}</span>
                        <div>
                          <div className={`text-[12px] font-semibold ${m === mode ? 'text-[#3b82f6]' : 'text-[#1e1b4b]'}`}>
                            {t(`mode.${m}` as any)}
                            {m === mode && <span className="ml-1 text-[#3b82f6]">✓</span>}
                          </div>
                          <div className="text-[10px] text-[#6b7280]">{t(`mode.${m}.desc` as any)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <a
              href="#/favorites"
              className={`flex items-center gap-1 text-[11px] font-semibold no-underline rounded-md px-2 py-1 border transition-colors ${isFavPage ? 'text-[#f59e0b] bg-[rgba(245,158,11,0.15)] border-[rgba(245,158,11,0.3)]' : 'text-white bg-[rgba(255,255,255,0.12)] border-[rgba(255,255,255,0.25)] hover:bg-[rgba(255,255,255,0.2)]'}`}
              title={t('navFavoritesTitle')}
            >
              {t('navFavorites')}
              {favCount > 0 && (
                <span className={`rounded-full min-w-[16px] h-4 flex items-center justify-center text-[10px] px-1 ${isFavPage ? 'bg-[rgba(245,158,11,0.2)]' : 'bg-[rgba(255,255,255,0.2)]'}`}>{favCount}</span>
              )}
            </a>
          </div>
        </div>
        <div className="p-4 pt-[60px] flex-1">
          <Router hook={useHashLocation}>
            <Route path="/favorites" component={FavoritesPage} />
            <Route path="/project/:owner/:repo">
              {(params) => <DetailPage params={params} hasToken={hasToken} layout="popup" />}
            </Route>
            <Route path="/" component={renderHomePage} />
          </Router>
        </div>
      </div>
    </ErrorBoundary>
  );
}
