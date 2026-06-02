import { useI18n } from '../lib/i18n';

function estimateReadTime(content: string): string {
  const mins = Math.max(1, Math.round((content.length / 5) / 200));
  return `${mins} min`;
}

interface Props {
  content: string;
  html: string;
  expanded: boolean;
  onExpand: () => void;
  loading: boolean;
  maxPreviewHeight?: number;
}

export default function ReadmeViewer({ content, html, expanded, onExpand, loading, maxPreviewHeight = 160 }: Props) {
  const { t } = useI18n();
  const needsTruncation = !expanded;

  return (
    <div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {/* Header bar — static when expanded, shows light blue anchor */}
      <div
        className={`px-4 py-3 border-b border-[#f3f4f6] flex items-center justify-between ${
          expanded ? 'bg-[#eff6ff]' : 'bg-[#f9fafb]'
        }`}
      >
        <div className="flex items-center gap-1.5">
          <h2 className="text-xs font-semibold text-gray-700">📖 README.md</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{(content.length / 1024).toFixed(1)} KB · {estimateReadTime(content)}</span>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-8 animate-pulse space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
        </div>
      ) : (
        <div className="relative">
          <div
            id="readme-content"
            className={`px-6 py-4 text-sm prose prose-sm max-w-none overflow-y-auto ${
              needsTruncation ? '' : 'pb-16'
            }`}
            style={needsTruncation ? { maxHeight: maxPreviewHeight } : undefined}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {needsTruncation && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>
      )}

      {/* Bottom actions — expand button only (collapse moved to floating button) */}
      {needsTruncation && (
        <div className="px-6 pb-4 text-center">
          <button
            onClick={onExpand}
            className="text-xs text-[#3b82f6] hover:text-[#2563eb] cursor-pointer"
          >
            {t('expandReadmeFull')} ↓ · {estimateReadTime(content)}
          </button>
        </div>
      )}
    </div>
  );
}
