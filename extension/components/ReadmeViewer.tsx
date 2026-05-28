interface Props {
  content: string;
  html: string;
  expanded: boolean;
  onExpand: () => void;
  loading: boolean;
}

const PREVIEW_LENGTH = 60000;

export default function ReadmeViewer({ content, html, expanded, onExpand, loading }: Props) {
  const needsTruncation = content.length > PREVIEW_LENGTH && !expanded;

  return (
    <div className="border border-[#f3f4f6] rounded-lg bg-white">
      <div className="px-4 py-3 border-b border-[#f3f4f6] bg-[#f9fafb]">
        <h2 className="text-xs font-semibold text-gray-700">📖 README.md</h2>
      </div>
      {loading ? (
        <div className="px-6 py-8 animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
        </div>
      ) : (
        <div
          className="px-6 py-4 text-sm prose prose-sm max-w-none max-h-[60vh] overflow-y-auto"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
      {needsTruncation && (
        <div className="px-6 pb-4 text-center">
          <button
            onClick={onExpand}
            className="text-xs text-[#3b82f6] hover:text-[#2563eb] cursor-pointer"
          >
            展开全部 README（{Math.round(content.length / 1024)}KB，可能较慢）
          </button>
        </div>
      )}
    </div>
  );
}
