import { useI18n } from '../lib/i18n';
import type { DiscoveryMode } from '../lib/types';

interface Props {
  mode?: DiscoveryMode;
}

export default function EmptyState({ mode }: Props) {
  const { t } = useI18n();

  const hint = mode === 'rising'
    ? t('empty.rising')
    : mode === 'active'
      ? t('empty.active')
      : t('noResultsHint');

  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">{t('noResults')}</p>
      <p className="text-gray-300 text-sm">{hint}</p>
    </div>
  );
}
