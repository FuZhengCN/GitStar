import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import type { AIConfig } from '../lib/types';
import { AppError } from '../lib/types';
import { README_PREVIEW_BYTES, README_CACHE_PREFIX } from '../lib/constants';
import { getRepoInfo, getRepoReadme, checkStarred, starRepo, unstarRepo } from '../lib/github';
import { parseMarkdown } from '../lib/markdown';
import { useFavorites } from '../hooks/useFavorites';
import { useStaleCache } from '../hooks/useStaleCache';
import { useI18n, errorMessageText } from '../lib/i18n';
import { fetchSummary, getCachedSummary, saveSummary, AISummaryError, parseAiSections, escapeHtml } from '../lib/ai-summary';
import LoadingBar from './LoadingBar';
import RepoHeader from './RepoHeader';
import ReadmeViewer from './ReadmeViewer';
import MiniBar from './MiniBar';
import TocOverlay from './TocOverlay';
import ErrorState from './ErrorState';
import type { PageLayout } from './HomePage';

interface DetailPageProps {
  params: { owner: string; repo: string };
  hasToken: boolean;
  layout: PageLayout;
}

export default function DetailPage({ params, hasToken, layout }: DetailPageProps) {
  const { owner, repo } = params;
  const { t } = useI18n();
  const [readmeExpanded, setReadmeExpanded] = useState(false);
  const expandRef = useRef(false);
  const [tocVisible, setTocVisible] = useState(false);
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [displayHtml, setDisplayHtml] = useState('');
  const [isStarred, setIsStarred] = useState(false);
  const [starLoading, setStarLoading] = useState(false);
  const { favorites, toggle: toggleFavorite, loaded } = useFavorites();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [hasToc, setHasToc] = useState(false);
  const [previewMaxH, setPreviewMaxH] = useState(300);
  // AI Summary state
  const [aiState, setAiState] = useState<'idle' | 'loading' | 'success' | 'error' | 'notConfigured'>('idle');
  const [aiText, setAiText] = useState('');
  const [aiVisible, setAiVisible] = useState(false);
  const [aiCachedTs, setAiCachedTs] = useState<number | null>(null);
  const [aiModel, setAiModel] = useState('');
  const [aiSectionHtmls, setAiSectionHtmls] = useState<{ label: string; html: string }[]>([]);
  const isSummarizingRef = useRef(false);
  const repoHeaderRef = useRef<HTMLDivElement>(null);
  const detailsRef = useRef<HTMLDivElement>(null);

  // Repo info cache (5 min TTL)
  const repoFetcher = useCallback(async () => {
    try {
      return await getRepoInfo(owner, repo);
    } catch (err: unknown) {
      const e = err as { message?: string; status?: number };
      if (e.status === 404) throw new AppError('REPO_NOT_FOUND');
      if (e.status === 403) throw new AppError('RATE_LIMIT');
      throw err;
    }
  }, [owner, repo]);
  const { data: detail, loading: repoLoading, error } = useStaleCache(
    `repo:${owner}/${repo}`,
    repoFetcher,
    5 * 60 * 1000
  );

  // README cache (10 min TTL), gated on detail availability
  const readmeCacheKey = detail ? `${README_CACHE_PREFIX}${owner}/${repo}` : null;
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
    let cancelled = false;
    checkStarred(owner, repo).then(result => {
      if (!cancelled) setIsStarred(result);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [detail, owner, repo]);

  // Scroll listener for back-to-top button (passive, rAF-throttled)
  useEffect(() => {
    if (!readmeExpanded) return;
    let ticking = false;
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          setShowBackToTop(window.scrollY > 200);
          ticking = false;
        });
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [readmeExpanded]);

  // Detect headings for TOC button visibility
  useEffect(() => {
    if (!readmeExpanded || !displayHtml) return;
    const raf = requestAnimationFrame(() => {
      const headings = document.querySelectorAll('#readme-content h2, #readme-content h3');
      setHasToc(headings.length > 0);
    });
    return () => cancelAnimationFrame(raf);
  }, [readmeExpanded, displayHtml]);

  // Reset state when navigating to a different repo (before paint to avoid flicker)
  useLayoutEffect(() => {
    setReadmeExpanded(false);
    setDetailsExpanded(false);
    setTocVisible(false);
    setDisplayHtml('');
    setAiState('idle');
    setAiText('');
    setAiVisible(false);
    setAiCachedTs(null);
    setAiModel('');
    setAiSectionHtmls([]);
    window.scrollTo(0, 0);
  }, [owner, repo]);

  // Dynamic README preview height — measure actual layout, then self-correct
  useLayoutEffect(() => {
    if (readmeExpanded || !detail || repoLoading || readmeLoading || !readmeContent) return;
    const raf = requestAnimationFrame(() => {
      const detailsEl = detailsRef.current;
      if (!detailsEl) return;
      const gap = window.innerHeight - detailsEl.getBoundingClientRect().bottom;
      if (Math.abs(gap) > 12) {
        setPreviewMaxH(h => Math.max(100, Math.min(500, h + gap - 8)));
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [detail, readmeExpanded, repoLoading, readmeLoading, readmeContent]);

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
    expandRef.current = true;
    setReadmeExpanded(true);
    setTocVisible(false);
    setShowBackToTop(false);
    parseMarkdown(readmeContent, owner, repo, detail?.default_branch || 'main').then(html => {
      if (expandRef.current) setDisplayHtml(html);
    });
  };

  const handleCollapse = () => {
    expandRef.current = false;
    setReadmeExpanded(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleToc = () => {
    setTocVisible(v => !v);
  };

  const handleAiSummary = useCallback(async () => {
    if (isSummarizingRef.current || !readmeContent) return;

    // Load config
    let config: AIConfig | null = null;
    try {
      const result = await chrome.storage.local.get('gitstar-ai-config');
      config = result['gitstar-ai-config'] || null;
    } catch {
      // ignore
    }

    if (!config || !config.apiKey) {
      setAiState('notConfigured');
      setAiVisible(true);
      return;
    }

    setAiModel(config.model || '');

    // Close TOC to avoid overlap
    setTocVisible(false);
    setAiVisible(true);

    // Try cache first
    const cached = await getCachedSummary(owner, repo);
    if (cached) {
      setAiText(cached.text);
      setAiCachedTs(cached.ts);
      setAiState('success');
      return;
    }

    // Call API
    isSummarizingRef.current = true;
    setAiState('loading');
    setAiText('');

    try {
      const summary = await fetchSummary(readmeContent, config);
      setAiText(summary);
      setAiCachedTs(Date.now());
      setAiState('success');
      saveSummary(owner, repo, summary);
    } catch (e) {
      if (e instanceof AISummaryError) {
        setAiText(e.code);
      } else {
        setAiText('UNKNOWN_ERROR');
      }
      setAiState('error');
    } finally {
      isSummarizingRef.current = false;
    }
  }, [owner, repo, readmeContent]);

  const handleAiRefresh = useCallback(async () => {
    if (isSummarizingRef.current || !readmeContent) return;

    let config: AIConfig | null = null;
    try {
      const result = await chrome.storage.local.get('gitstar-ai-config');
      config = result['gitstar-ai-config'] || null;
    } catch {
      // ignore
    }

    if (!config || !config.apiKey) return;

    setAiModel(config.model || '');

    isSummarizingRef.current = true;
    setAiState('loading');
    setAiText('');

    try {
      const summary = await fetchSummary(readmeContent, config);
      setAiText(summary);
      setAiCachedTs(Date.now());
      setAiState('success');
      saveSummary(owner, repo, summary);
    } catch (e) {
      if (e instanceof AISummaryError) {
        setAiText(e.code);
      } else {
        setAiText('UNKNOWN_ERROR');
      }
      setAiState('error');
    } finally {
      isSummarizingRef.current = false;
    }
  }, [owner, repo, readmeContent]);

  // Map AI error code to i18n message
  const aiErrorMessage = useCallback((code: string) => {
    const map: Record<string, string> = {
      'NETWORK_ERROR': t('aiSummaryErrorNetwork'),
      'AUTH_ERROR': t('aiSummaryErrorAuth'),
      'QUOTA_ERROR': t('aiSummaryErrorQuota'),
      'UNKNOWN_ERROR': t('aiSummaryErrorUnknown'),
    };
    return map[code] || t('aiSummaryErrorUnknown');
  }, [t]);

  // Format cached time
  const aiCachedLabel = useCallback((ts: number) => {
    const mins = Math.floor((Date.now() - ts) / 60000);
    if (mins < 1) return t('aiSummaryCachedJustNow');
    return t('aiSummaryCached').replace('{n}', String(mins));
  }, [t]);

  // Async markdown rendering for AI summary sections
  useEffect(() => {
    if (aiState !== 'success' || !aiText || !detail) {
      setAiSectionHtmls([]);
      return;
    }

    const sections = parseAiSections(aiText);
    const displaySections = sections.length > 0
      ? sections
      : [{ label: '', text: aiText }];

    let cancelled = false;
    const branch = detail.default_branch || 'main';

    Promise.all(
      displaySections.map(async (s) => {
        try {
          const html = await parseMarkdown(s.text, owner, repo, branch);
          return { label: s.label, html };
        } catch {
          return { label: s.label, html: `<p>${escapeHtml(s.text)}</p>` };
        }
      })
    ).then((results) => {
      if (!cancelled) setAiSectionHtmls(results);
    });

    return () => { cancelled = true; };
  }, [aiText, aiState, owner, repo, detail]);

  // Extracted README rendering (shared between preview and reading modes)
  const readmeSection = readmeContent ? (
    <ReadmeViewer
      content={readmeContent}
      html={displayHtml}
      expanded={readmeExpanded}
      onExpand={handleExpand}
      loading={readmeLoading}
      maxPreviewHeight={previewMaxH}
    />
  ) : readmeLoading ? (
    <div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      <div className="px-4 py-3 border-b border-[#f3f4f6] bg-[#f9fafb]">
        <h2 className="text-xs font-semibold text-gray-700">{'\u{1F4D6}'} README.md</h2>
      </div>
      <div className="px-6 py-4 animate-pulse space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="h-4 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  ) : readmeError && !readmeContent ? (
    <p className="text-red-500 text-center py-8 text-sm">{errorMessageText(readmeError, t)}</p>
  ) : (
    <p className="text-gray-400 text-center py-8 text-sm">{t('noReadme')}</p>
  );

  if (error) {
    return (
      <ErrorState title={t('errorOccurred')} message={errorMessageText(error, t)} onBack={() => window.history.back()} />
    );
  }

  return (
    <div>
      {repoLoading || !detail ? (
        <>
          <LoadingBar loading={true} />
          <div className="animate-pulse space-y-3 mt-4">
            <div className="h-4 bg-gray-200 rounded w-24" />
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-gray-200 shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-gray-200 rounded w-2/3" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            </div>
            <div className="h-12 bg-gray-200 rounded-lg" />
            <div className="flex gap-2">
              <div className="flex-1 h-8 bg-gray-200 rounded-md" />
              <div className="flex-1 h-8 bg-gray-200 rounded-md" />
            </div>
          </div>
        </>
      ) : readmeExpanded ? (
          <>
            <MiniBar
              owner={owner}
              fullName={detail.full_name}
              avatar={detail.owner_avatar}
              stargazersCount={detail.stargazers_count}
              isStarred={isStarred}
              onToggleStar={handleToggleStar}
              starLoading={starLoading}
              isFavorite={loaded && (favorites || []).includes(detail.full_name)}
              onToggleFavorite={toggleFavorite}
              hasToken={hasToken}
            />
            {readmeSection}
            {/* Floating action buttons */}
            <div className="fixed right-4 z-50 flex flex-col gap-1.5 items-end" style={{ bottom: '16px' }}>
              {showBackToTop && (
                <button
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="w-7 h-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[#e5e7eb] flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label={t('backToTop')}
                >
                  <span className="text-xs">{'↑'}</span>
                </button>
              )}
              {hasToc && (
                <button
                  onClick={handleToggleToc}
                  className="w-7 h-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[#e5e7eb] flex items-center justify-center hover:bg-gray-50 transition-colors"
                  aria-label={t('toc')}
                >
                  <span className="text-xs">{'\u{1F4CB}'}</span>
                </button>
              )}
              {/* AI Summary button */}
              <button
                onClick={handleAiSummary}
                className={`w-7 h-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] flex items-center justify-center hover:bg-gray-50 transition-colors ${aiVisible ? 'border-2 border-[#3b82f6]' : 'border border-[#e5e7eb]'}`}
                aria-label={t('aiSummaryButtonLabel')}
              >
                <span className="text-xs">{'\u{1F916}'}</span>
              </button>
              <button
                onClick={handleCollapse}
                className="w-7 h-7 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] border border-[#3b82f6] flex items-center justify-center hover:bg-[#eff6ff] transition-colors"
                aria-label={t('collapseReadme')}
              >
                <span className="text-xs text-[#3b82f6] font-bold">{'✕'}</span>
              </button>
            </div>
            {/* AI Summary popover */}
            {aiVisible && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setAiVisible(false)} />
                <div
                  className="fixed z-50 bg-white rounded-lg shadow-[0_6px_20px_rgba(0,0,0,0.15)] border border-[#e5e7eb] overflow-hidden"
                  style={{ right: '56px', bottom: '72px', width: layout === 'tab' ? '448px' : '310px', maxHeight: '390px', display: 'flex', flexDirection: 'column' }}
                  role="dialog"
                  aria-label={t('aiSummaryButtonLabel')}
                >
                    {/* Header */}
                    <div className="shrink-0 px-3 pt-2.5 pb-1.5 text-xs font-bold text-[#1e1b4b] bg-white border-b border-[#f3f4f6] flex items-center justify-between">
                      <div>
                        <span>{'\u{1F916}'} {t('aiSummaryButtonLabel')}</span>
                        {aiModel ? <span className="block text-[9px] font-normal text-[#9ca3af]">{'由'} {aiModel} {'生成'}</span> : null}
                      </div>
                      <button
                        onClick={() => setAiVisible(false)}
                        className="text-[#9ca3af] hover:text-[#6b7280] hover:bg-[#f3f4f6] rounded p-0.5 text-sm leading-none"
                        aria-label={'关闭'}
                      >
                        {'✕'}
                      </button>
                    </div>

                    {/* Body */}
                    <div className="overflow-y-auto px-3 py-2.5" style={{ maxHeight: '340px' }}>
                    {aiState === 'loading' && (
                      <div className="text-center py-1" aria-busy="true">
                        <p className="text-[11px] text-[#3b82f6] font-semibold mb-3">{'⏳'} {'正在分析'} README...</p>
                        <div className="bg-[#f3f4f6] rounded-full h-1 mb-3 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: '60%', background: 'linear-gradient(90deg, #3b82f6, #60a5fa)', animation: 'loadingBar 1.5s ease-in-out infinite' }}
                          />
                        </div>
                        <div className="space-y-2">
                          <div className="h-2.5 bg-[#e5e7eb] rounded w-full" />
                          <div className="h-2.5 bg-[#e5e7eb] rounded w-5/6" />
                          <div className="h-2.5 bg-[#e5e7eb] rounded w-4/6" />
                        </div>
                      </div>
                    )}

                    {aiState === 'notConfigured' && (
                      <div className="text-center py-2">
                        <div className="text-2xl mb-1.5">{'\u{1F511}'}</div>
                        <p className="text-[11px] font-semibold text-[#6b7280] mb-1">{t('aiSummaryNotConfigured')}</p>
                        <p className="text-[10px] text-[#9ca3af] mb-3">{'在'} Options {'页配置'} API Key {'后即可使用'}</p>
                        <button
                          onClick={() => chrome.runtime.openOptionsPage()}
                          className="text-[11px] font-semibold text-[#3b82f6] bg-[#eff6ff] hover:bg-[#dbeafe] px-4 py-1.5 rounded-md transition-colors"
                        >
                          {t('aiSummaryGoConfig')}
                        </button>
                      </div>
                    )}

                    {aiState === 'error' && (
                      <div className="text-center py-2">
                        <div className="text-2xl mb-1.5">{'⚠️'}</div>
                        <p className="text-[11px] font-semibold text-[#dc2626] mb-1">{aiErrorMessage(aiText)}</p>
                        <p className="text-[10px] text-[#6b7280] mb-3">{'请检查'} Options {'页中的'} API Key {'配置'}</p>
                        <button
                          onClick={() => chrome.runtime.openOptionsPage()}
                          className="text-[11px] font-semibold text-[#3b82f6] bg-[#eff6ff] hover:bg-[#dbeafe] px-4 py-1.5 rounded-md transition-colors"
                        >
                          {t('aiSummaryGoConfig')}
                        </button>
                      </div>
                    )}

                    {aiState === 'success' && (
                      <>
                        <div className="space-y-2">
                          {aiSectionHtmls.length > 0 ? (
                            aiSectionHtmls.map((s, i) => {
                              const isFunc = s.label === '功能' || s.label === 'Function';
                              const isScene = s.label === '场景' || s.label === 'Use cases';
                              const isHigh = s.label === '特点' || s.label === 'Highlights';
                              const bgColor = isHigh ? 'bg-[#fffbeb]' : isScene ? 'bg-[#f0fdf4]' : 'bg-[#eff6ff]';
                              const icon = isFunc ? '\u{1F4CC}' : isScene ? '\u{1F3AF}' : isHigh ? '\u{1F4A1}' : '';

                              return (
                                <div key={i} className={`${bgColor} rounded-md px-3 py-2.5`}>
                                  {s.label && (
                                    <div className="text-[11px] font-bold text-[#1e1b4b] mb-1 flex items-center gap-1.5">
                                      <span>{icon}</span>
                                      <span>{s.label}</span>
                                    </div>
                                  )}
                                  <div
                                    className="text-[12px] text-[#374151] leading-relaxed prose prose-sm max-w-none prose-a:text-[#3b82f6]"
                                    dangerouslySetInnerHTML={{ __html: s.html }}
                                  />
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-1">
                              <div className="h-2.5 bg-[#e5e7eb] rounded w-full mb-2" />
                              <div className="h-2.5 bg-[#e5e7eb] rounded w-5/6 mb-2" />
                              <div className="h-2.5 bg-[#e5e7eb] rounded w-4/6" />
                            </div>
                          )}
                        </div>
                        <button
                          onClick={handleAiRefresh}
                          className="w-full mt-2.5 py-1.5 text-[11px] font-semibold text-[#3b82f6] bg-[#eff6ff] hover:bg-[#dbeafe] rounded-md transition-colors"
                          aria-label={'重新生成概述'}
                        >
                          {'\u{1F504}'} {t('aiSummaryRefresh')}
                        </button>
                        {aiCachedTs && (
                          <p className="text-[10px] text-[#9ca3af] text-center mt-1">{aiCachedLabel(aiCachedTs)}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
            <TocOverlay
              containerSelector="#readme-content"
              visible={tocVisible}
              onClose={() => setTocVisible(false)}
            />
          </>
        ) : (
          <>
            <div ref={repoHeaderRef}>
            <RepoHeader
              repo={detail}
              isFavorite={loaded && (favorites || []).includes(detail.full_name)}
              onToggleFavorite={toggleFavorite}
              isStarred={isStarred}
              onToggleStar={handleToggleStar}
              starLoading={starLoading}
              hasToken={hasToken}
            />
            </div>
            <div className="mt-2">
              {readmeSection}
            </div>

            <div ref={detailsRef} className="mt-2 rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-3">
              <button
                onClick={() => setDetailsExpanded(v => !v)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-[#374151]"
              >
                <span>{'\u{1F4CB}'} {t('projectDetails')}</span>
                <span className="text-[10px] text-[#9ca3af]">{detailsExpanded ? '▴' : '▾'}</span>
              </button>
              {detailsExpanded && (
                <>
                  <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                    <div className="text-[11px]">
                      <span className="text-[#9ca3af]">{'\u{1F4C5}'} {t('created')}</span><br />
                      <span className="text-[#1e1b4b] font-medium">
                        {new Date(detail.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-[#9ca3af]">{'\u{1F504}'} {t('updated')}</span><br />
                      <span className="text-[#1e1b4b] font-medium">
                        {new Date(detail.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-[#9ca3af]">{'\u{1F4C4}'} {t('license')}</span><br />
                      <span className="text-[#1e1b4b] font-medium">{detail.license?.name || '—'}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-[#9ca3af]">{'\u{1F524}'} {t('languageLabel')}</span><br />
                      <span className="text-[#1e1b4b] font-medium">{detail.language || '—'}</span>
                    </div>
                  </div>
                  {detail.topics && detail.topics.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5">
                      {detail.topics.slice(0, 8).map(topic => (
                        <span key={topic} className="text-[10px] bg-[#eff6ff] text-[#3b82f6] px-2 py-0.5 rounded-full">{topic}</span>
                      ))}
                      {detail.topics.length > 8 && (
                        <span className="text-[10px] text-[#9ca3af]">+{detail.topics.length - 8}</span>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
      )}
    </div>
  );
}
