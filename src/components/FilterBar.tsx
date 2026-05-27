'use client';

const LANGUAGES = [
  { value: '', label: '全部语言' },
  { value: 'JavaScript', label: 'JavaScript' },
  { value: 'TypeScript', label: 'TypeScript' },
  { value: 'Python', label: 'Python' },
  { value: 'Go', label: 'Go' },
  { value: 'Rust', label: 'Rust' },
  { value: 'Java', label: 'Java' },
  { value: 'C++', label: 'C++' },
  { value: 'C', label: 'C' },
  { value: 'Ruby', label: 'Ruby' },
];

const TIME_RANGES = [
  { value: '', label: '全部时间' },
  { value: '>2026-05-20', label: '本周' },
  { value: '>2026-04-27', label: '本月' },
  { value: '>2025-05-27', label: '今年' },
];

const SORTS = [
  { value: 'stars', label: 'Star 数' },
  { value: 'forks', label: 'Fork 数' },
  { value: 'updated', label: '最近更新' },
];

function Select({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; label: string;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        aria-label={label}
        className="appearance-none px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

interface Props {
  language: string;
  onLanguageChange: (v: string) => void;
  timeRange: string;
  onTimeRangeChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
}

export default function FilterBar({ language, onLanguageChange, timeRange, onTimeRangeChange, sort, onSortChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      <Select value={language} onChange={onLanguageChange} options={LANGUAGES} label="语言筛选" />
      <Select value={timeRange} onChange={onTimeRangeChange} options={TIME_RANGES} label="时间范围" />
      <Select value={sort} onChange={onSortChange} options={SORTS} label="排序方式" />
    </div>
  );
}
