import { Repo } from '../lib/types';
import { useI18n } from '../lib/i18n';

interface Props {
  repo: Repo;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
}

export default function RepoCard({ repo, isFavorite, onToggleFavorite }: Props) {
  const { t } = useI18n();

  return (
    <div className="rounded-xl p-3 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_2px_8px_rgba(0,0,0,0.1)] transition-shadow flex gap-2.5 items-start">
      <img src={repo.owner_avatar} alt={repo.owner} className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <a
          href={`#/project/${repo.full_name}`}
          className="text-[13px] font-semibold text-[#3b82f6] hover:underline cursor-pointer"
        >
          {repo.full_name}
        </a>
        <p className="text-xs text-[#6b7280] mt-0.5 line-clamp-2">{repo.description || t('noDescription')}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-[#9ca3af]">
          <span className="text-[#f59e0b]">★ {repo.stargazers_count.toLocaleString()}</span>
          {repo.language && <span>🔤 {repo.language}</span>}
          {repo.license && <span>📄 {repo.license.name}</span>}
        </div>
      </div>
      <button
        onClick={() => onToggleFavorite(repo.full_name)}
        className={`flex-shrink-0 text-xs border rounded-md px-1.5 py-0.5 mt-0.5 transition-colors flex items-center gap-0.5 ${isFavorite ? 'border-[#f59e0b] bg-[#fffbeb] text-[#f59e0b]' : 'border-[#e5e7eb] text-[#9ca3af] hover:text-[#f59e0b] hover:border-[#f59e0b]'}`}
      >
        {isFavorite ? t('favorited') : t('favorite')}
      </button>
    </div>
  );
}
