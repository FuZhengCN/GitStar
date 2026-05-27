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
      <div className="px-6 py-4 prose prose-sm max-w-none prose-headings:border-b prose-headings:pb-1 prose-headings:mt-6 prose-headings:mb-3 prose-img:max-w-full prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-code:text-sm prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:code:bg-transparent prose-pre:code:px-0">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
