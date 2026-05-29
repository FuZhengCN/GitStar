interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  const pages: number[] = [];
  const start = Math.max(1, page - 1);
  const end = Math.min(totalPages, page + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-2.5 py-1 text-xs border rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
      >
        ←
      </button>
      {pages[0] > 1 && (
        <>
          <button onClick={() => onChange(1)} className="px-2.5 py-1 text-xs border rounded-md hover:bg-gray-100">1</button>
          {pages[0] > 2 && <span className="px-0.5 text-gray-400 text-xs">...</span>}
        </>
      )}
      {pages.map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`px-2.5 py-1 text-xs border rounded-md transition-colors ${p === page ? 'bg-[#3b82f6] text-white border-[#3b82f6]' : 'hover:bg-gray-100'}`}
        >
          {p}
        </button>
      ))}
      {pages[pages.length - 1] < totalPages && (
        <>
          {pages[pages.length - 1] < totalPages - 1 && <span className="px-0.5 text-gray-400 text-xs">...</span>}
          <button onClick={() => onChange(totalPages)} className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-100">{totalPages}</button>
        </>
      )}
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        className="px-2.5 py-1 text-xs border rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
      >
        →
      </button>
    </div>
  );
}
