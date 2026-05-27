import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  content: string;
}

export default function ReadmeViewer({ content }: Props) {
  return (
    <div className="border border-[#f3f4f6] rounded-lg bg-white">
      <div className="px-4 py-3 border-b border-[#f3f4f6] bg-[#fafafa]">
        <h2 className="text-sm font-semibold text-gray-700">📖 README.md</h2>
      </div>
      <div className="px-6 py-4 text-sm">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
