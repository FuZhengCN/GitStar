import { useI18n } from '../lib/i18n';

interface Props {
  title?: string;
  message?: string;
  onBack?: () => void;
  onRetry?: () => void;
}

export default function ErrorState({
  title,
  message,
  onBack,
  onRetry,
}: Props) {
  const { t } = useI18n();

  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">{title || t('errorOccurred')}</p>
      <p className="text-gray-300 text-sm mb-4">{message || t('errorRetryMessage')}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-[#3b82f6] hover:underline mr-3">
          {t('retry')}
        </button>
      )}
      {onBack && (
        <button onClick={onBack} className="text-sm text-[#3b82f6] hover:underline">
          {t('backToHome')}
        </button>
      )}
    </div>
  );
}
