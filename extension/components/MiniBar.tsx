import { useState } from 'react';
import type { RepoDetail } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  owner: string;
  repo: string;
  fullName: string;
  avatar: string;
  detail: RepoDetail;
  isStarred: boolean;
  onToggleStar: () => void;
  starLoading: boolean;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
  hasToken: boolean;
}

export default function MiniBar({ owner, repo, fullName, avatar, detail, isStarred, onToggleStar, starLoading, isFavorite, onToggleFavorite, hasToken }: Props) {
  const { t } = useI18n();
  const [detailsExpanded, setDetailsExpanded] = useState(false);

  return (
    <div className="sticky top-[60px] z-20 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
      {/* Row 1: identity + key actions */}
      <div className="px-3 py-2 flex items-center gap-2">
        <img src={avatar} alt={owner} className="w-6 h-6 rounded-md flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <span className="text-[12px] font-bold text-[#1e1b4b] truncate block">{fullName}</span>
          <span className="text-[10px] font-semibold text-[#f59e0b]">{'★'} {detail.stargazers_count.toLocaleString()}</span>
        </div>
        <button
          onClick={onToggleStar}
          disabled={starLoading || !hasToken}
          className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-colors disabled:opacity-50 shrink-0 ${
            hasToken
              ? isStarred
                ? 'bg-[#f0fdf4] border border-[#16a34a] text-[#16a34a]'
                : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
              : 'bg-[#f3f4f6] text-[#9ca3af] border border-dashed border-[#d1d5db] cursor-not-allowed'
          }`}
        >
          {starLoading ? '...' : isStarred && hasToken ? t('starredButton') : t('starButton')}
        </button>
        <button
          onClick={() => onToggleFavorite(fullName)}
          className={`px-2 py-1 text-[11px] border rounded-md transition-colors shrink-0 ${
            isFavorite
              ? 'border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]'
              : 'border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50'
          }`}
        >
          {isFavorite ? t('favorited') : t('favorite')}
        </button>
        <a
          href={detail.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#6b7280] hover:text-[#3b82f6] shrink-0 leading-none"
          title={t('openOnGitHub')}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
        </a>
        <button
          onClick={() => setDetailsExpanded(v => !v)}
          className="text-[#9ca3af] hover:text-[#374151] shrink-0 leading-none"
          aria-label={t('projectDetails')}
          aria-expanded={detailsExpanded}
        >
          {detailsExpanded ? '▴' : '▾'}
        </button>
      </div>

      {/* Row 2: details (expandable) */}
      {detailsExpanded && (
        <div className="px-3 pb-2 border-t border-[#f3f4f6]">
          {detail.description && (
            <p className="text-[10px] text-[#6b7280] truncate mt-1.5">{detail.description}</p>
          )}
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[10px] text-[#6b7280]">
            <span>{'📅'} {new Date(detail.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span>{'🔄'} {new Date(detail.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
            <span>{'📄'} {detail.license?.name || '—'}</span>
            <span>{'🔤'} {detail.language || '—'}</span>
          </div>
          {detail.topics && detail.topics.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {detail.topics.slice(0, 8).map(topic => (
                <span key={topic} className="text-[9px] bg-[#eff6ff] text-[#3b82f6] px-1.5 py-0.5 rounded-full">{topic}</span>
              ))}
              {detail.topics.length > 8 && (
                <span className="text-[9px] text-[#9ca3af]">+{detail.topics.length - 8}</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
