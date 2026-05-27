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
  { value: 'stars', label: '按 Star 排' },
  { value: 'forks', label: '按 Fork 排' },
  { value: 'updated', label: '最近更新' },
];

interface Props {
  language: string;
  onLanguageChange: (v: string) => void;
  timeRange: string;
  onTimeRangeChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
}

const selectClass = 'w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] appearance-none cursor-pointer';

const Chevron = () => (
  <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="8" height="5" viewBox="0 0 8 5" fill="none">
    <path d="M1 1l3 3 3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function FilterBar({ language, onLanguageChange, timeRange, onTimeRangeChange, sort, onSortChange }: Props) {
  const timeRanges = useMemo(() => getTimeRanges(), []);

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <select value={language} onChange={e => onLanguageChange(e.target.value)} className={selectClass}>
          {LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <Chevron />
      </div>
      <div className="relative flex-1">
        <select value={timeRange} onChange={e => onTimeRangeChange(e.target.value)} className={selectClass}>
          {timeRanges.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <Chevron />
      </div>
      <div className="relative flex-1">
        <select value={sort} onChange={e => onSortChange(e.target.value)} className={selectClass}>
          {SORTS.map(s => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <Chevron />
      </div>
    </div>
  );
}
