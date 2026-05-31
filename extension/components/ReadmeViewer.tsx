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
  onCollapse: () => void;
  loading: boolean;
  onToggleToc: () => void;
  tocVisible: boolean;
}

export default function ReadmeViewer({ content, html, expanded, onExpand, onCollapse, loading, onToggleToc, tocVisible }: Props) {
  const { t } = useI18n();
  const needsTruncation = !expanded;

  return (
    <div className="rounded-lg bg-white shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-[#f3f4f6] bg-[#f9fafb] flex items-center justify-between">
        <h2 className="text-xs font-semibold text-gray-700">📖 README.md</h2>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>{(content.length / 1024).toFixed(1)} KB · {estimateReadTime(content)}</span>
          {expanded && (
            <button
              onClick={onToggleToc}
              className={`px-2 py-0.5 rounded text-xs cursor-pointer ${
                tocVisible ? 'bg-[#eff6ff] text-[#3b82f6]' : 'hover:bg-gray-100'
              }`}
            >
              📋 {t('toc')}
            </button>
          )}
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
              needsTruncation ? 'max-h-[200px]' : ''
            }`}
            dangerouslySetInnerHTML={{ __html: html }}
          />
          {needsTruncation && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>
      )}

      {/* Bottom actions */}
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
      {expanded && (
        <div className="border-t border-[#f3f4f6] px-6 pb-4 pt-4 text-center">
          <button
            onClick={onCollapse}
            className="text-xs text-[#3b82f6] hover:text-[#2563eb] cursor-pointer"
          >
            {t('collapseReadme')} ▴
          </button>
        </div>
      )}
    </div>
  );
}
