import { Link } from 'wouter';
import { Repo } from '../lib/types';

interface Props {
  repo: Repo;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
}

export default function RepoCard({ repo, isFavorite, onToggleFavorite }: Props) {
  return (
    <div className="border border-[#f3f4f6] rounded-xl p-4 bg-white shadow-sm hover:shadow-md transition-shadow flex gap-3 items-start">
      <img src={repo.owner_avatar} alt={repo.owner} className="w-10 h-10 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <Link
          href={`/project/${repo.full_name}`}
          className="text-sm font-semibold text-[#4f46e5] hover:underline cursor-pointer"
        >
          {repo.full_name}
        </Link>
        <p className="text-xs text-[#6b7280] mt-0.5 line-clamp-2">{repo.description || '暂无描述'}</p>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5 text-xs text-[#9ca3af]">
          <span>⭐ {repo.stargazers_count.toLocaleString()}</span>
          {repo.language && <span>🔤 {repo.language}</span>}
          {repo.license && <span>📄 {repo.license.name}</span>}
        </div>
      </div>
      <button
        onClick={() => onToggleFavorite(repo.full_name)}
        className={`flex-shrink-0 text-lg leading-none mt-0.5 transition-colors ${isFavorite ? 'text-[#6366f1]' : 'text-[#e5e7eb] hover:text-[#6366f1]'}`}
        aria-label={isFavorite ? '取消收藏' : '收藏'}
      >
        {isFavorite ? '★' : '☆'}
      </button>
    </div>
  );
}
