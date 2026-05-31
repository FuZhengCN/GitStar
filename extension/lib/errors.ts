import { AppError } from './types';

export function errorMessageText(e: Error, t: (key: string) => string): string {
  if (e instanceof AppError) {
    const map: Record<string, string> = {
      RATE_LIMIT: 'rateLimitError',
      REPO_NOT_FOUND: 'repoNotFound',
      NETWORK_ERROR: 'tokenNetworkError',
      LOAD_FAILED: 'loadFailed',
    };
    return t(map[e.code] || 'loadFailed');
  }
  return e.message;
}
