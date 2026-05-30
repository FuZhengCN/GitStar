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
  const base = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  const html = raw.replace(/src="(?!https?:\/\/|data:)([^"]+)"/g, (_, path: string) => {
    const cleanPath = path.replace(/^\/+/, '');
    return `src="${base}${cleanPath}"`;
  });
  self.postMessage({ html });
};
