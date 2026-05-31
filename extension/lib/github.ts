import { Repo, RepoDetail, SearchParams, SearchResponse } from './types';

const GITHUB_API = 'https://api.github.com';

let cachedToken: string | null = null;

export function setToken(token: string | null): void {
  cachedToken = token;
}

export function getToken(): string | null {
  return cachedToken;
}

// Initialize from chrome.storage.sync
export async function loadToken(): Promise<void> {
  try {
    const result = await chrome.storage.local.get('githubToken');
    cachedToken = result.githubToken || null;
  } catch {
    cachedToken = null;
  }
}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };
  if (cachedToken) {
    h.Authorization = `Bearer ${cachedToken}`;
  }
  return h;
}

function decodeBase64Utf8(base64: string): string {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

const VALID_OWNER_REPO = /^[a-zA-Z0-9._-]+$/;

function buildSearchQuery(params: SearchParams): string {
  const parts: string[] = [];
  if (params.q) parts.push(params.q);
  if (params.language) parts.push(`language:"${params.language}"`);
  if (params.created && /^>\d{4}-\d{2}-\d{2}$/.test(params.created)) parts.push(`created:${params.created}`);
  // 过滤掉 <=100 stars 的低热度仓库，减少噪音
  parts.push('stars:>100');
  return parts.join(' ');
}

export async function searchRepos(params: SearchParams): Promise<SearchResponse> {
  const query = buildSearchQuery(params);
  const sort = params.sort || 'stars';
  const order = params.order || 'desc';
  const per_page = Math.min(params.per_page || 30, 50);
  const page = Math.min(params.page || 1, 34);

  const qs = new URLSearchParams({ q: query, sort, order, per_page: String(per_page), page: String(page) });

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
    created_at: item.created_at as string,
  }));

  return { items, total_count: raw.total_count as number };
}

export async function getRepoInfo(owner: string, repo: string): Promise<RepoDetail> {
  if (!VALID_OWNER_REPO.test(owner) || !VALID_OWNER_REPO.test(repo)) {
    throw Object.assign(new Error('Invalid owner or repo name'), { status: 400 });
  }

  const repoRes = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: headers() });

  if (!repoRes.ok) {
    if (repoRes.status === 404) throw Object.assign(new Error('Repository not found'), { status: 404 });
    throw Object.assign(new Error('GitHub API error'), { status: repoRes.status });
  }

  const raw = await repoRes.json() as Record<string, unknown>;

  return {
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
    created_at: raw.created_at as string,
    readme: '',
    default_branch: raw.default_branch as string,
  };
}

export async function getRepoDetail(owner: string, repo: string): Promise<RepoDetail> {
  if (!VALID_OWNER_REPO.test(owner) || !VALID_OWNER_REPO.test(repo)) {
    throw Object.assign(new Error('Invalid owner or repo name'), { status: 400 });
  }

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
    if (typeof readmeRaw.content === 'string') readme = decodeBase64Utf8(readmeRaw.content);
  }

  return {
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
    created_at: raw.created_at as string,
    readme,
    default_branch: raw.default_branch as string,
  };
}

export async function getRepoReadme(owner: string, repo: string): Promise<string> {
  const res = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/readme`, { headers: headers() });
  if (!res.ok) return '';
  const raw = await res.json() as Record<string, unknown>;
  return typeof raw.content === 'string' ? decodeBase64Utf8(raw.content) : '';
}

// GitHub Star API

export async function checkStarred(owner: string, repo: string): Promise<boolean> {
  const res = await fetch(`${GITHUB_API}/user/starred/${owner}/${repo}`, { headers: headers() });
  return res.status === 204;
}

export async function starRepo(owner: string, repo: string): Promise<void> {
  const res = await fetch(`${GITHUB_API}/user/starred/${owner}/${repo}`, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Length': '0' },
  });
  if (!res.ok && res.status !== 204) {
    throw Object.assign(new Error('Star failed'), { status: res.status });
  }
}

export async function unstarRepo(owner: string, repo: string): Promise<void> {
  const res = await fetch(`${GITHUB_API}/user/starred/${owner}/${repo}`, {
    method: 'DELETE',
    headers: headers(),
  });
  if (!res.ok && res.status !== 204) {
    throw Object.assign(new Error('Unstar failed'), { status: res.status });
  }
}
