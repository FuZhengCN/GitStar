import { useMemo, useState } from 'react';
import { marked } from 'marked';

interface Props {
  content: string;
  owner: string;
  repo: string;
  branch: string;
}

const PREVIEW_LENGTH = 60000;

export default function ReadmeViewer({ content, owner, repo, branch }: Props) {
  const [expanded, setExpanded] = useState(false);

  const needsTruncation = content.length > PREVIEW_LENGTH;
  const src = needsTruncation && !expanded ? content.slice(0, PREVIEW_LENGTH) : content;

  const html = useMemo(() => {
    console.log('[ReadmeViewer] parse start, content:', Math.round(src.length / 1024), 'KB');
    const t0 = performance.now();
    const raw = marked.parse(src, { gfm: true, breaks: true });
    console.log('[ReadmeViewer] parse:', (performance.now() - t0).toFixed(0), 'ms, html:', Math.round(raw.length / 1024), 'KB');

    const base = `https://github.com/${owner}/${repo}/blob/${branch}/`;
    return raw.replace(/src="(?!https?:\/\/|data:)([^"]+)"/g, (_, path: string) => `src="${base}${path}"`);
  }, [src, owner, repo, branch]);

  return (
    <div className="border border-[#f3f4f6] rounded-lg bg-white">
      <div className="px-4 py-3 border-b border-[#f3f4f6] bg-[#fafafa]">
        <h2 className="text-sm font-semibold text-gray-700">📖 README.md</h2>
      </div>
      <div
        className="px-6 py-4 text-sm prose prose-sm max-w-none max-h-[60vh] overflow-y-auto"
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {needsTruncation && !expanded && (
        <div className="px-6 pb-4 text-center">
          <button
            onClick={() => setExpanded(true)}
            className="text-xs text-[#3b82f6] hover:text-[#2563eb] cursor-pointer"
          >
            展开全部 README（{Math.round(content.length / 1024)}KB，可能较慢）
          </button>
        </div>
      )}
    </div>
  );
}
