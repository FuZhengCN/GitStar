import { Repo, RepoDetail, SearchParams, SearchResponse } from './types';

const GITHUB_API = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN;

const cache = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: unknown): void {
  cache.set(key, { data, timestamp: Date.now() });
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (TOKEN) {
    h.Authorization = `Bearer ${TOKEN}`;
  }
  return h;
}

const VALID_OWNER_REPO = /^[a-zA-Z0-9._-]+$/;

function buildSearchQuery(params: SearchParams): string {
  const parts: string[] = [];
  if (params.q) parts.push(params.q);
  if (params.language) parts.push(`language:"${params.language}"`);
  // 浏览模式保留创建时间过滤，主动搜索时移除 created 限制——老仓也能被搜到
  if (!params.q && params.created && /^>\d{4}-\d{2}-\d{2}$/.test(params.created)) parts.push(`created:${params.created}`);
  // 用户有主动搜索词时不限制 Star 数，无搜索词浏览时过滤低星项目保证质量
  if (!params.q) parts.push('stars:>100');
  return parts.join(' ');
}

export async function searchRepos(params: SearchParams): Promise<SearchResponse> {
  const query = buildSearchQuery(params);
  const sort = params.sort || 'stars';
  const order = params.order || 'desc';
  const per_page = Math.min(params.per_page || 30, 50);
  const page = Math.min(params.page || 1, 34);

  const qs = new URLSearchParams({ q: query, sort, order, per_page: String(per_page), page: String(page) });
  const cacheKey = `search:${qs.toString()}`;

  const cached = getCached<SearchResponse>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${GITHUB_API}/search/repositories?${qs}`, { headers: headers() });

  if (!res.ok) {
    if (res.status === 403) throw Object.assign(new Error('Rate limited by GitHub'), { status: 403 });
    if (res.status === 422) throw Object.assign(new Error('Invalid search query'), { status: 422 });
    throw Object.assign(new Error('GitHub API error'), { status: res.status });
  }

  const raw = await res.json();
  const items: Repo[] = raw.items.map((item: Record<string, unknown>) => ({
    id: item.id as number,
    owner: (item.owner as Record<string, string>).login,
    name: item.name as string,
    full_name: item.full_name as string,
    description: item.description as string | null,
    html_url: item.html_url as string,
    stargazers_count: item.stargazers_count as number,
    forks_count: item.forks_count as number,
    watchers_count: item.watchers_count as number,
    language: item.language as string | null,
    license: item.license as { name: string } | null,
    owner_avatar: (item.owner as Record<string, string>).avatar_url,
    topics: item.topics as string[],
    updated_at: item.updated_at as string,
  }));

  const result: SearchResponse = { items, total_count: raw.total_count as number };
  setCache(cacheKey, result);
  return result;
}

export async function getRepoDetail(owner: string, repo: string): Promise<RepoDetail> {
  if (!VALID_OWNER_REPO.test(owner) || !VALID_OWNER_REPO.test(repo)) {
    throw Object.assign(new Error('Invalid owner or repo name'), { status: 400 });
  }

  const cacheKey = `repo:${owner}/${repo}`;
  const cached = getCached<RepoDetail>(cacheKey);
  if (cached) return cached;

  const [repoRes, readmeRes] = await Promise.all([
    fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: headers() }),
    fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, { headers: headers() }),
  ]);

  if (!repoRes.ok) {
    if (repoRes.status === 404) throw Object.assign(new Error('Repository not found'), { status: 404 });
    throw Object.assign(new Error('GitHub API error'), { status: repoRes.status });
  }

  const raw = await repoRes.json() as Record<string, unknown>;
  let readme = '';
  if (readmeRes.ok) {
    const readmeRaw = await readmeRes.json() as Record<string, unknown>;
    readme = Buffer.from(readmeRaw.content as string, 'base64').toString('utf-8');
  }

  const result: RepoDetail = {
    id: raw.id as number,
    owner: (raw.owner as Record<string, string>).login,
    name: raw.name as string,
    full_name: raw.full_name as string,
    description: raw.description as string | null,
    html_url: raw.html_url as string,
    stargazers_count: raw.stargazers_count as number,
    forks_count: raw.forks_count as number,
    watchers_count: raw.watchers_count as number,
    language: raw.language as string | null,
    license: raw.license as { name: string } | null,
    owner_avatar: (raw.owner as Record<string, string>).avatar_url,
    topics: raw.topics as string[],
    updated_at: raw.updated_at as string,
    readme,
    default_branch: raw.default_branch as string,
  };

  setCache(cacheKey, result);
  return result;
}
