import { useState, useEffect, useCallback } from 'react';
import { Router, Route } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import type { DiscoveryMode } from './lib/types';
import { loadToken, setToken, getToken } from './lib/github';
import { useFavorites } from './hooks/useFavorites';
import { I18nProvider, useI18n } from './lib/i18n';
import LoadingBar from './components/LoadingBar';
import { ErrorBoundary } from './components/ErrorBoundary';
import GitStarIcon from './components/GitStarIcon';
import HomePage from './components/HomePage';
import DetailPage from './components/DetailPage';
import FavoritesPage, { useCurrentHash } from './components/FavoritesPage';
import { MODE_EMOJI, POPUP_WIDTH } from './lib/constants';
import './assets/tailwind.css';

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
  const renderFavoritesPage = useCallback(() => <FavoritesPage layout="popup" />, []);

  // Safety net: if background.ts failed to disable popup for tab mode
  // (e.g., classic SW terminated before setPopup completed after browser restart),
  // redirect to tab immediately before rendering any content
  useEffect(() => {
    chrome.storage.local.get('gitstar-open-mode').then(r => {
      if (r['gitstar-open-mode'] === 'tab') {
        chrome.tabs.create({ url: 'tabs/tab.html' });
        window.close();
      }
    }).catch(() => {});
  }, []);

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
            <Route path="/favorites" component={renderFavoritesPage} />
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
