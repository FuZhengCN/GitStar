export interface Repo {
  id: number;
  owner: string;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  language: string | null;
  license: { name: string } | null;
  owner_avatar: string;
  topics: string[];
  updated_at: string;
}

export interface RepoDetail extends Repo {
  readme: string;
  default_branch: string;
}

export interface SearchParams {
  q?: string;
  language?: string;
  sort?: 'stars' | 'forks' | 'updated';
  order?: 'desc' | 'asc';
  page?: number;
  per_page?: number;
  created?: string;
}

export interface SearchResponse {
  items: Repo[];
  total_count: number;
}

export class AppError extends Error {
  code: 'RATE_LIMIT' | 'REPO_NOT_FOUND' | 'NETWORK_ERROR' | 'LOAD_FAILED';
  constructor(code: 'RATE_LIMIT' | 'REPO_NOT_FOUND' | 'NETWORK_ERROR' | 'LOAD_FAILED') {
    super(code);
    this.code = code;
  }
}


