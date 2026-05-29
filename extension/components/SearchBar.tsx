import { useState, useEffect } from 'react';
import { useDebounce } from '../hooks/useDebounce';
import { useI18n } from '../lib/i18n';

interface Props {
  value: string;
  onChange: (value: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  const { t } = useI18n();
  const [input, setInput] = useState(value);
  useEffect(() => { setInput(value); }, [value]);
  const debounced = useDebounce(input, 300);

  useEffect(() => {
    onChange(debounced);
  }, [debounced]);

  function handleSearch() {
    onChange(input);
  }

  return (
    <div className="relative flex-1">
      <input
        type="search"
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter') handleSearch(); }}
        placeholder={t('searchPlaceholder')}
        className="w-full px-2.5 py-1.5 pl-8 border border-[#e5e7eb] rounded-md focus:outline-none focus:ring-2 focus:ring-[#3b82f6] focus:border-transparent text-[13px] shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
      />
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}
