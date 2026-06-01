import { useI18n } from '../lib/i18n';

interface Props {
  owner: string;
  fullName: string;
  avatar: string;
  stargazersCount: number;
  isStarred: boolean;
  onToggleStar: () => void;
  starLoading: boolean;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
  hasToken: boolean;
}

export default function MiniBar({ owner, fullName, avatar, stargazersCount, isStarred, onToggleStar, starLoading, isFavorite, onToggleFavorite, hasToken }: Props) {
  const { t } = useI18n();

  return (
    <div className="sticky top-[60px] z-20 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-3 py-2 flex items-center gap-2">
      <img src={avatar} alt={owner} className="w-6 h-6 rounded-md flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-[12px] font-bold text-[#1e1b4b] truncate block">{fullName}</span>
        <span className="text-[10px] font-semibold text-[#f59e0b]">★ {stargazersCount.toLocaleString()}</span>
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
    </div>
  );
}
