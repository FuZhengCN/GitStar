import { useState, useEffect, useCallback, useRef } from 'react';
import { useI18n } from '../lib/i18n';

interface TocItem {
  id: string;
  text: string;
  level: 2 | 3;
}

interface Props {
  containerSelector: string;
  visible: boolean;
  onClose: () => void;
}

export default function TocOverlay({ containerSelector, visible, onClose }: Props) {
  const { t } = useI18n();
  const [items, setItems] = useState<TocItem[]>([]);
  const assignedElsRef = useRef<{ el: HTMLElement; originalId: string }[]>([]);

  const extractHeadings = useCallback(() => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const headings = container.querySelectorAll('h2, h3');
    const result: TocItem[] = [];

    // Clear previous assignments before re-extracting
    assignedElsRef.current.forEach(({ el, originalId }) => {
      el.id = originalId;
    });
    assignedElsRef.current = [];

    headings.forEach((heading, i) => {
      const el = heading as HTMLElement;
      const level = el.tagName === 'H3' ? (3 as const) : (2 as const);
      const id = `toc-${i}`;
      assignedElsRef.current.push({ el, originalId: el.id });
      el.id = id;
      result.push({ id, text: el.textContent || '', level });
    });

    setItems(result);
  }, [containerSelector]);

  // Extract headings when overlay becomes visible
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      extractHeadings();
    }, 100);

    return () => clearTimeout(timer);
  }, [visible, extractHeadings]);

  // Restore original heading IDs on unmount
  useEffect(() => {
    return () => {
      assignedElsRef.current.forEach(({ el, originalId }) => {
        el.id = originalId;
      });
      assignedElsRef.current = [];
    };
  }, []);

  const handleItemClick = useCallback(
    (itemId: string) => {
      const el = document.getElementById(itemId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      }
      onClose();
    },
    [onClose],
  );

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="absolute right-0 top-8 z-50 bg-white rounded-lg shadow-[0_4px_12px_rgba(0,0,0,0.1)] border border-[#e5e7eb] overflow-hidden min-w-[160px] max-w-[200px] max-h-[280px] overflow-y-auto">
        {/* Header */}
        <div className="px-3 py-2 text-[11px] font-semibold text-[#374151] border-b border-[#f3f4f6] bg-[#f9fafb] sticky top-0">
          {'📋 '}
          {t('tocTitle')}
        </div>

        {/* Empty state */}
        {items.length === 0 ? (
          <div className="px-3 py-4 text-[11px] text-[#9ca3af] text-center">
            {t('tocEmpty')}
          </div>
        ) : (
          /* Heading items */
          items.map((item) => (
            <div
              key={item.id}
              className={`px-3 py-1.5 text-[11px] font-medium cursor-pointer hover:bg-[#f3f4f6] truncate ${
                item.level === 3 ? 'pl-6 text-[#6b7280]' : 'text-[#1e1b4b]'
              }`}
              onClick={() => handleItemClick(item.id)}
            >
              {item.text}
            </div>
          ))
        )}
      </div>
    </>
  );
}
