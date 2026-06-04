'use client';

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

export default function Pagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className="px-2.5 py-1 text-xs border rounded-md disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
      >
        ←
      </button>
      <span className="px-1.5 text-xs text-gray-500">{page} / {totalPages}</span>
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
