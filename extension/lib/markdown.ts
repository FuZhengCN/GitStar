const WORKER_MIN_SIZE = 10240;

let workerCtorFailed = false;

import { marked } from 'marked';
import DOMPurify from 'dompurify';

function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, { ADD_ATTR: ['class'] });
}

function parseInMainThread(content: string, owner: string, repo: string, branch: string): string {
  const raw = marked.parse(content, { gfm: true, breaks: true }) as string;
  const base = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  return raw.replace(/src="(?!https?:\/\/|data:)([^"]+)"/g, (_, path: string) => {
    const cleanPath = path.replace(/^\/+/, '');
    return `src="${base}${cleanPath}"`;
  });
}

export function parseMarkdown(
  content: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  if (workerCtorFailed || content.length < WORKER_MIN_SIZE) {
    return Promise.resolve(sanitizeHtml(parseInMainThread(content, owner, repo, branch)));
  }

  return new Promise((resolve) => {
    let worker: Worker;
    try {
      worker = new Worker(
        new URL('../workers/markdown-worker.ts', import.meta.url),
        { type: 'module' },
      );
    } catch {
      workerCtorFailed = true;
      resolve(sanitizeHtml(parseInMainThread(content, owner, repo, branch)));
      return;
    }

    worker.onmessage = (e: MessageEvent<{ html: string }>) => {
      resolve(sanitizeHtml(e.data.html));
      worker.terminate();
    };
    worker.onerror = () => {
      workerCtorFailed = true;
      resolve(sanitizeHtml(parseInMainThread(content, owner, repo, branch)));
      worker.terminate();
    };
    worker.postMessage({ type: 'parse', content, owner, repo, branch });
  });
}
