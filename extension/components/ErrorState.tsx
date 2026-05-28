interface Props {
  title?: string;
  message?: string;
  onBack?: () => void;
}

export default function ErrorState({
  title = '出错了',
  message = '请稍后重试',
  onBack,
}: Props) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">{title}</p>
      <p className="text-gray-300 text-sm mb-4">{message}</p>
      {onBack && (
        <button onClick={onBack} className="text-sm text-[#3b82f6] hover:underline">
          ← 返回首页
        </button>
      )}
    </div>
  );
}
