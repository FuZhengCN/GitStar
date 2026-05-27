import { RepoDetail } from '../lib/types';

interface Props {
  repo: RepoDetail;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
}

export default function RepoHeader({ repo, isFavorite, onToggleFavorite }: Props) {
  return (
    <div>
      <nav className="flex items-center gap-1.5 text-xs mb-4 pb-3 border-b border-[#f3f4f6]">
        <a href="#/" className="text-[#3b82f6] hover:underline cursor-pointer">← 首页</a>
        <span className="text-[#9ca3af]">/</span>
        <span className="text-[#1e1b4b] font-semibold">{repo.owner}</span>
        <span className="text-[#9ca3af]">/</span>
        <span className="text-[#1e1b4b] font-semibold">{repo.name}</span>
      </nav>
      <div className="flex gap-4 items-start">
        <img src={repo.owner_avatar} alt={repo.owner} className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-[#1e1b4b]">{repo.full_name}</h1>
          <p className="text-sm text-[#6b7280] mt-1">{repo.description || '暂无描述'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
            <span className="text-[#f59e0b]">★ <strong>{repo.stargazers_count.toLocaleString()}</strong></span>
            <span>🍴 <strong>{repo.forks_count.toLocaleString()}</strong></span>
            <span>👀 <strong>{repo.watchers_count.toLocaleString()}</strong></span>
            {repo.language && <span>🔤 {repo.language}</span>}
            {repo.license && <span>📄 {repo.license.name}</span>}
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#3b82f6] text-white text-sm rounded-lg hover:bg-[#2563eb] transition-colors"
            >
              ⭐ Star
            </a>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-1.5 border border-[#e5e7eb] text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              🔗 打开 GitHub
            </a>
            <button
              onClick={() => onToggleFavorite(repo.full_name)}
              className={`inline-flex items-center gap-1 px-4 py-1.5 border text-sm rounded-lg transition-colors ${isFavorite ? 'border-[#3b82f6] bg-[#eff6ff] text-[#2563eb]' : 'border-[#e5e7eb] hover:bg-gray-50'}`}
            >
              {isFavorite ? '★ 已收藏' : '☆ 收藏'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
