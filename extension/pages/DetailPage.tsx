import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import type { DiscoveryMode } from '../lib/types';
import { AppError } from '../lib/types';
import { README_PREVIEW_BYTES, README_CACHE_PREFIX, CACHE_TTL } from '../lib/constants';
import { getRepoInfo, getRepoReadme, checkStarred, starRepo, unstarRepo } from '../lib/github';
import { parseMarkdown } from '../lib/markdown';
import { useFavorites } from '../hooks/useFavorites';
import { useStaleCache } from '../hooks/useStaleCache';
import { useI18n } from '../lib/i18n';
import { errorMessageText } from '../lib/errors';
import LoadingBar from '../components/LoadingBar';
import RepoHeader from '../components/RepoHeader';
import ReadmeViewer from '../components/ReadmeViewer';
import MiniBar from '../components/MiniBar';
import TocOverlay from '../components/TocOverlay';
import ErrorState from '../components/ErrorState';
import SkeletonRepoCard from '../components/SkeletonRepoCard';

interface Props {
  params: { owner: string; repo: string };
  hasToken: boolean;
}

export default function DetailPage({ params, hasToken }: Props) {
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
    CACHE_TTL.REPO_INFO
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
    readmeCacheKey, readmeFetcher, CACHE_TTL.README
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
    setDetailsExpanded(false);
    setTocVisible(false);
    setDisplayHtml('');
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
    expandRef.current = true;
    setReadmeExpanded(true);
    parseMarkdown(readmeContent, owner, repo, detail?.default_branch || 'main').then(html => {
      if (expandRef.current) setDisplayHtml(html);
    });
  };

  const handleCollapse = () => {
    expandRef.current = false;
    setReadmeExpanded(false);
    window.scrollTo(0, 0);
  };

  const handleToggleToc = () => {
    setTocVisible(v => !v);
  };

  // Extracted README rendering (shared between preview and reading modes)
  const readmeSection = readmeContent ? (
    <ReadmeViewer
      content={readmeContent}
      html={displayHtml}
      expanded={readmeExpanded}
      onExpand={handleExpand}
      onCollapse={handleCollapse}
      loading={readmeLoading}
      onToggleToc={handleToggleToc}
      tocVisible={tocVisible}
    />
  ) : readmeLoading ? (
    <div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
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
            <SkeletonRepoCard />
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
              repo={repo}
              fullName={detail.full_name}
              avatar={detail.owner_avatar}
              isStarred={isStarred}
              onToggleStar={handleToggleStar}
              starLoading={starLoading}
              isFavorite={loaded && (favorites || []).includes(detail.full_name)}
              onToggleFavorite={toggleFavorite}
              hasToken={hasToken}
            />
            <div className="relative">
              {readmeSection}
              <TocOverlay
                containerSelector="#readme-content"
                visible={tocVisible}
                onClose={() => setTocVisible(false)}
              />
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
              hasToken={hasToken}
            />
            <div className="mt-2">
              {readmeSection}
            </div>

            <div className="mt-2 rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)] p-3">
              <button
                onClick={() => setDetailsExpanded(v => !v)}
                className="w-full flex items-center justify-between text-[11px] font-semibold text-[#374151]"
              >
                <span>📋 {t('projectDetails')}</span>
                <span className="text-[10px] text-[#9ca3af]">{detailsExpanded ? '▴' : '▾'}</span>
              </button>
              {detailsExpanded && (
                <>
                  <div className="grid grid-cols-2 gap-1.5 mt-2.5">
                    <div className="text-[11px]">
                      <span className="text-[#9ca3af]">📅 {t('created')}</span><br />
                      <span className="text-[#1e1b4b] font-medium">
                        {new Date(detail.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-[#9ca3af]">🔄 {t('updated')}</span><br />
                      <span className="text-[#1e1b4b] font-medium">
                        {new Date(detail.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-[#9ca3af]">📄 {t('license')}</span><br />
                      <span className="text-[#1e1b4b] font-medium">{detail.license?.name || '—'}</span>
                    </div>
                    <div className="text-[11px]">
                      <span className="text-[#9ca3af]">🔤 {t('languageLabel')}</span><br />
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
