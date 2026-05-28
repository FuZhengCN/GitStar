import { marked } from 'marked';

interface ParseRequest {
  type: 'parse';
  content: string;
  owner: string;
  repo: string;
  branch: string;
}

self.onmessage = (e: MessageEvent<ParseRequest>) => {
  if (e.data.type !== 'parse') return;
  const { content, owner, repo, branch } = e.data;
  const raw = marked.parse(content, { gfm: true, breaks: true }) as string;
  const base = `https://github.com/${owner}/${repo}/blob/${branch}/`;
  const html = raw.replace(/src="(?!https?:\/\/|data:)([^"]+)"/g, (_, path: string) => `src="${base}${path}"`);
  self.postMessage({ html });
};
