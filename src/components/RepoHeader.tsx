'use client';
import Link from 'next/link';
import { RepoDetail } from '@/lib/types';

interface Props {
  repo: RepoDetail;
  isFavorite: boolean;
  onToggleFavorite: (fullName: string) => void;
}

export default function RepoHeader({ repo, isFavorite, onToggleFavorite }: Props) {
  return (
    <div>
      <Link href="/" className="text-sm text-[#0969da] hover:underline mb-4 inline-block">← 返回</Link>
      <div className="flex gap-4 items-start">
        <img src={repo.owner_avatar} alt={repo.owner} className="w-12 h-12 rounded-full flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold text-gray-900">{repo.full_name}</h1>
          <p className="text-sm text-gray-500 mt-1">{repo.description || '暂无描述'}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-sm">
            <span>⭐ <strong>{repo.stargazers_count.toLocaleString()}</strong></span>
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
              className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#24292f] text-white text-sm rounded-lg hover:bg-[#1b1f23] transition-colors"
            >
              ⭐ Star
            </a>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-1.5 border border-gray-300 text-sm rounded-lg hover:bg-gray-50 transition-colors"
            >
              🔗 打开 GitHub
            </a>
            <button
              onClick={() => onToggleFavorite(repo.full_name)}
              className={`inline-flex items-center gap-1 px-4 py-1.5 border text-sm rounded-lg transition-colors ${isFavorite ? 'border-yellow-400 bg-yellow-50 text-yellow-700' : 'border-gray-300 hover:bg-gray-50'}`}
            >
              {isFavorite ? '★ 已收藏' : '☆ 收藏'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
