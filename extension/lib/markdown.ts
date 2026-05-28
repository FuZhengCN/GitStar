const WORKER_MIN_SIZE = 10240;

let workerCtorFailed = false;

import { marked } from 'marked';

function parseInMainThread(content: string, owner: string, repo: string, branch: string): string {
  const raw = marked.parse(content, { gfm: true, breaks: true }) as string;
  const base = `https://github.com/${owner}/${repo}/blob/${branch}/`;
  return raw.replace(/src="(?!https?:\/\/|data:)([^"]+)"/g, (_, path: string) => `src="${base}${path}"`);
}

export function parseMarkdown(
  content: string,
  owner: string,
  repo: string,
  branch: string,
): Promise<string> {
  if (workerCtorFailed || content.length < WORKER_MIN_SIZE) {
    return Promise.resolve(parseInMainThread(content, owner, repo, branch));
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
      resolve(parseInMainThread(content, owner, repo, branch));
      return;
    }

    worker.onmessage = (e: MessageEvent<{ html: string }>) => {
      resolve(e.data.html);
      worker.terminate();
    };
    worker.onerror = () => {
      workerCtorFailed = true;
      resolve(parseInMainThread(content, owner, repo, branch));
      worker.terminate();
    };
    worker.postMessage({ type: 'parse', content, owner, repo, branch });
  });
}
