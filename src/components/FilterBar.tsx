'use client';
import { useMemo } from 'react';

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

function getTimeRanges() {
  const now = new Date();
  const week = new Date(now); week.setDate(week.getDate() - 7);
  const month = new Date(now); month.setMonth(month.getMonth() - 1);
  const year = new Date(now); year.setFullYear(year.getFullYear() - 1);
  const fmt = (d: Date) => d.toISOString().split('T')[0];
  return [
    { value: '', label: '全部时间' },
    { value: `>${fmt(week)}`, label: '本周' },
    { value: `>${fmt(month)}`, label: '本月' },
    { value: `>${fmt(year)}`, label: '今年' },
  ];
}

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
        className="appearance-none px-3 py-2 pr-8 border border-[#d0d7de] rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#0969da] cursor-pointer"
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
  const timeRanges = useMemo(() => getTimeRanges(), []);

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={language} onChange={onLanguageChange} options={LANGUAGES} label="语言筛选" />
      <Select value={timeRange} onChange={onTimeRangeChange} options={timeRanges} label="时间范围" />
      <Select value={sort} onChange={onSortChange} options={SORTS} label="排序方式" />
    </div>
  );
}
