import { Metadata } from 'next';
import { getRepoDetail } from '@/lib/github';
import { RepoDetail } from '@/lib/types';
import DetailPageClient from './DetailPageClient';

export const revalidate = 3600;
export const dynamicParams = true;

export async function generateMetadata({ params }: { params: { owner: string; repo: string } }): Promise<Metadata> {
  try {
    const repo = await getRepoDetail(params.owner, params.repo);
    const desc = repo.description || `${repo.full_name} - GitHub 高星项目`;
    return {
      title: `${repo.full_name} - GitStar`,
      description: desc,
      openGraph: {
        title: repo.full_name,
        description: desc,
        type: 'website',
        images: [repo.owner_avatar],
      },
      twitter: {
        card: 'summary',
        title: repo.full_name,
        description: desc,
        images: [repo.owner_avatar],
      },
    };
  } catch {
    return { title: '项目未找到 - GitStar' };
  }
}

export default async function DetailPage({ params }: { params: { owner: string; repo: string } }) {
  let repo: RepoDetail | null = null;
  let error: { title: string; message: string } | null = null;

  try {
    repo = await getRepoDetail(params.owner, params.repo);
  } catch (err: unknown) {
    const e = err as { status?: number; message?: string };
    if (e.status === 404) {
      error = { title: '项目未找到', message: `仓库 ${params.owner}/${params.repo} 不存在` };
    } else if (e.status === 403) {
      error = { title: 'API 限流', message: 'GitHub API 请求次数已达上限，请稍后再来' };
    } else {
      error = { title: '加载失败', message: e.message || '请稍后重试' };
    }
  }

  return <DetailPageClient repo={repo} error={error} />;
}
