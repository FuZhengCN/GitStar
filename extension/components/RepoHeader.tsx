import { RepoDetail } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  repo: RepoDetail;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
  isStarred: boolean;
  onToggleStar: () => void;
  starLoading: boolean;
  hasToken: boolean;
}

export default function RepoHeader({ repo, isFavorite, onToggleFavorite, isStarred, onToggleStar, starLoading, hasToken }: Props) {
  const { t } = useI18n();

  return (
    <div>
      {/* Layer 1: Breadcrumb + Identity */}
      <div className="mb-3">
        <nav className="flex items-center gap-1.5 text-xs mb-2">
          <a href="#" onClick={(e) => { e.preventDefault(); window.history.back(); }} className="text-[#3b82f6] hover:underline cursor-pointer shrink-0">{t('back')}</a>
          <span className="text-[#9ca3af]">/</span>
          <span className="text-[#1e1b4b] font-semibold truncate max-w-[90px]">{repo.owner}</span>
          <span className="text-[#9ca3af]">/</span>
          <span className="text-[#1e1b4b] font-semibold truncate max-w-[90px]">{repo.name}</span>
        </nav>
        <div className="flex gap-3 items-start">
          <img src={repo.owner_avatar} alt={repo.owner} className="w-8 h-8 rounded-lg flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <h1 className="text-[15px] font-bold text-[#1e1b4b] truncate">{repo.full_name}</h1>
            <p className="text-xs text-[#6b7280] mt-0.5 line-clamp-2">{repo.description || t('noDescription')}</p>
          </div>
        </div>
      </div>

      {/* Layer 2: Star action bar */}
      <div className="flex items-start gap-3 py-2.5 px-3 bg-white rounded-lg shadow-[0_1px_4px_rgba(0,0,0,0.04)] mb-2">
        <div className="flex flex-col items-start shrink-0">
          {hasToken ? (
            <button
              onClick={onToggleStar}
              disabled={starLoading}
              className={`px-5 py-1.5 text-[13px] font-semibold rounded-md transition-colors disabled:opacity-50 min-w-[92px] text-center ${
                isStarred
                  ? 'bg-[#f0fdf4] border border-[#16a34a] text-[#16a34a]'
                  : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
              }`}
            >
              {starLoading ? '...' : isStarred ? t('starredButton') : t('starButton')}
            </button>
          ) : (
            <>
              <button
                disabled
                className="px-5 py-1.5 text-[13px] font-semibold rounded-md border border-dashed border-[#9ca3af] text-[#9ca3af] min-w-[92px] text-center cursor-not-allowed"
              >
                {t('starButton')}
              </button>
              <span className="text-[10px] text-[#9ca3af] mt-0.5 leading-tight">{t('tokenNotConfigured')}</span>
            </>
          )}
        </div>
        <div>
          <div className="text-[13px] text-[#f59e0b] font-semibold">★ {repo.stargazers_count.toLocaleString()} stars</div>
          <div className="text-xs text-[#6b7280] mt-0.5">
            🍴 {repo.forks_count.toLocaleString()} · 👀 {repo.watchers_count.toLocaleString()}
            {repo.language && <span> · 🔤 {repo.language}</span>}
          </div>
        </div>
      </div>

      {/* Layer 3: Aux actions — two equal-width buttons */}
      <div className="flex gap-2">
        <button
          onClick={() => onToggleFavorite(repo.full_name)}
          className={`flex-1 px-2 py-1.5 text-[12px] font-medium border rounded-md transition-colors text-center ${
            isFavorite
              ? 'border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]'
              : 'border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50'
          }`}
        >
          {isFavorite ? t('favorited') : t('favorite')}
        </button>
        <a
          href={repo.html_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 px-2 py-1.5 text-[12px] font-medium border border-[#e5e7eb] rounded-md text-[#6b7280] hover:bg-gray-50 transition-colors text-center"
        >
          {t('openOnGitHub')}
        </a>
      </div>
    </div>
  );
}
