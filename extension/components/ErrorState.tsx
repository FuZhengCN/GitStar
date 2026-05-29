interface Props {
  title?: string;
  message?: string;
  onBack?: () => void;
  onRetry?: () => void;
}

export default function ErrorState({
  title = '出错了',
  message = '请稍后重试',
  onBack,
  onRetry,
}: Props) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">{title}</p>
      <p className="text-gray-300 text-sm mb-4">{message}</p>
      {onRetry && (
        <button onClick={onRetry} className="text-sm text-[#3b82f6] hover:underline mr-3">
          重试
        </button>
      )}
      {onBack && (
        <button onClick={onBack} className="text-sm text-[#3b82f6] hover:underline">
          ← 返回首页
        </button>
      )}
    </div>
  );
}
