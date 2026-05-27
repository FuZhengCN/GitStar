import { searchRepos } from '@/lib/github';
import { Repo } from '@/lib/types';
import HomePageClient from './HomePageClient';

export const revalidate = 3600; // ISR every hour

export default async function HomePage() {
  let initialRepos: Repo[] = [];
  let totalCount = 0;
  let error: string | null = null;

  try {
    const data = await searchRepos({ sort: 'stars', order: 'desc', per_page: 30, page: 1 });
    initialRepos = data.items;
    totalCount = data.total_count;
  } catch (err: unknown) {
    error = (err as { message?: string }).message || 'Failed to load repositories';
  }

  return <HomePageClient initialRepos={initialRepos} totalCount={totalCount} error={error} />;
}
