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

export default function FilterBar({ language, onLanguageChange, timeRange, onTimeRangeChange, sort, onSortChange }: Props) {
  const timeRanges = useMemo(() => getTimeRanges(), []);

  const activeClass = 'bg-[#eff6ff] text-[#3b82f6]';
  const inactiveClass = 'bg-[#f5f5f5] text-gray-600 hover:bg-gray-200';

  function Pill({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
    return (
      <button
        onClick={onClick}
        className={`px-3 py-1.5 text-xs rounded-full transition-colors ${active ? activeClass : inactiveClass}`}
      >
        {label}
      </button>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {LANGUAGES.map(l => (
        <Pill key={l.value} active={language === l.value} onClick={() => onLanguageChange(l.value)} label={l.label} />
      ))}
      <span className="mx-0.5" />
      {timeRanges.map(t => (
        <Pill key={t.value} active={timeRange === t.value} onClick={() => onTimeRangeChange(t.value)} label={t.label} />
      ))}
      <span className="mx-0.5" />
      {SORTS.map(s => (
        <Pill key={s.value} active={sort === s.value} onClick={() => onSortChange(s.value)} label={s.label} />
      ))}
    </div>
  );
}
