import { RepoDetail } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  repo: RepoDetail;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
  isStarred: boolean;
  onToggleStar: () => void;
  starLoading: boolean;
}

export default function RepoHeader({ repo, isFavorite, onToggleFavorite, isStarred, onToggleStar, starLoading }: Props) {
  const { t } = useI18n();

  return (
    <div>
      <nav className="flex items-center gap-1.5 text-xs mb-4 pb-3 border-b border-[#f3f4f6]">
        <a href="#" onClick={(e) => { e.preventDefault(); window.history.back(); }} className="text-[#3b82f6] hover:underline cursor-pointer">{t('back')}</a>
        <span className="text-[#9ca3af]">/</span>
        <span className="text-[#1e1b4b] font-semibold">{repo.owner}</span>
        <span className="text-[#9ca3af]">/</span>
        <span className="text-[#1e1b4b] font-semibold">{repo.name}</span>
      </nav>
      <div className="flex gap-4 items-start">
        <img src={repo.owner_avatar} alt={repo.owner} className="w-10 h-10 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-[15px] font-bold text-[#1e1b4b] truncate">{repo.full_name}</h1>
            <div className="flex gap-1.5 ml-auto flex-shrink-0">
              <a
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2 py-0.5 text-[11px] border border-[#e5e7eb] rounded-md text-[#6b7280] hover:bg-gray-50 transition-colors"
              >
                {t('openOnGitHub')}
              </a>
              <button
                onClick={() => onToggleFavorite(repo.full_name)}
                className={`px-2 py-0.5 text-[11px] border rounded-md transition-colors ${isFavorite ? 'border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]' : 'border-[#e5e7eb] text-[#6b7280] hover:bg-gray-50'}`}
              >
                {isFavorite ? t('favorited') : t('favorite')}
              </button>
            </div>
          </div>
          <p className="text-xs text-[#6b7280] mt-1">{repo.description || t('noDescription')}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 mt-3 py-2.5 px-3 bg-[#f9fafb] border border-[#f3f4f6] rounded-lg">
        <button
          onClick={onToggleStar}
          disabled={starLoading}
          className={`px-5 py-1.5 text-[13px] font-semibold rounded-md transition-colors disabled:opacity-50 ${isStarred ? 'bg-[#f0fdf4] border border-[#16a34a] text-[#16a34a]' : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'}`}
        >
          {starLoading ? '...' : isStarred ? '★ Starred' : '⭐ Star'}
        </button>
        <div>
          <div className="text-[13px] text-[#f59e0b] font-semibold">★ {repo.stargazers_count.toLocaleString()} stars</div>
          <div className="text-xs text-[#6b7280] mt-0.5">
            🍴 {repo.forks_count.toLocaleString()} · 👀 {repo.watchers_count.toLocaleString()}
            {repo.language && <span> · 🔤 {repo.language}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
