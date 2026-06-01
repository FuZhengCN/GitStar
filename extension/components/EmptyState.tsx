import { useI18n } from '../lib/i18n';

export default function EmptyState() {
  const { t } = useI18n();

  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">{t('noResults')}</p>
      <p className="text-gray-300 text-sm">{t('noResultsHint')}</p>
    </div>
  );
}
