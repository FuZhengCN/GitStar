import { useI18n } from '../lib/i18n';
import { getTimeRangeValue } from '../lib/constants';
import type { DiscoveryMode } from '../lib/types';

const LANGUAGES = [
  { value: '', labelKey: 'allLanguages' },
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

function getTimeRanges(t: (key: string) => string) {
  return [
    { value: '', label: t('allTime') },
    { value: getTimeRangeValue('week'), label: t('thisWeek') },
    { value: getTimeRangeValue('month'), label: t('thisMonth') },
    { value: getTimeRangeValue('year'), label: t('thisYear') },
  ];
}

const SORTS = [
  { value: 'stars', labelKey: 'sortByStars' },
  { value: 'forks', labelKey: 'sortByForks' },
  { value: 'updated', labelKey: 'sortByUpdated' },
];

interface Props {
  language: string;
  onLanguageChange: (v: string) => void;
  timeRange: string;
  onTimeRangeChange: (v: string) => void;
  sort: string;
  onSortChange: (v: string) => void;
  flashMode?: DiscoveryMode | null;  // New: triggers border flash on mode switch
}

const FLASH_COLORS: Record<string, string> = {
  rising: '#8b5cf6',
  active: '#10b981',
};

const selectClass = 'w-full text-[11px] border border-[#e5e7eb] rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-[#3b82f6] focus:ring-1 focus:ring-[#3b82f6] appearance-none cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.03)]';

const Chevron = () => (
  <svg className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" width="8" height="5" viewBox="0 0 8 5" fill="none">
    <path d="M1 1l3 3 3-3" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function FilterBar({ language, onLanguageChange, timeRange, onTimeRangeChange, sort, onSortChange, flashMode }: Props) {
  const { t } = useI18n();
  const timeRanges = getTimeRanges(t);
  const flashColor = flashMode ? FLASH_COLORS[flashMode] : undefined;

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <select value={language} onChange={e => onLanguageChange(e.target.value)} className={selectClass}>
          {LANGUAGES.map(l => (
            <option key={l.value} value={l.value}>{l.labelKey ? t(l.labelKey) : l.label}</option>
          ))}
        </select>
        <Chevron />
      </div>
      <div className="relative flex-1">
        <select
          value={timeRange}
          onChange={e => onTimeRangeChange(e.target.value)}
          className={selectClass}
          style={flashColor ? { borderColor: flashColor, boxShadow: `0 0 0 1px ${flashColor}`, transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out' } : { transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out' }}
        >
          {timeRanges.map(tr => (
            <option key={tr.value} value={tr.value}>{tr.label}</option>
          ))}
        </select>
        <Chevron />
      </div>
      <div className="relative flex-1">
        <select
          value={sort}
          onChange={e => onSortChange(e.target.value)}
          className={selectClass}
          style={flashColor ? { borderColor: flashColor, boxShadow: `0 0 0 1px ${flashColor}`, transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out' } : { transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out' }}
        >
          {SORTS.map(s => (
            <option key={s.value} value={s.value}>{t(s.labelKey)}</option>
          ))}
        </select>
        <Chevron />
      </div>
    </div>
  );
}
