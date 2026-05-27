import Link from 'next/link';

interface Props {
  title?: string;
  message?: string;
}

export default function ErrorState({
  title = '出错了',
  message = '请稍后重试',
}: Props) {
  return (
    <div className="text-center py-16">
      <p className="text-gray-400 text-lg mb-2">{title}</p>
      <p className="text-gray-300 text-sm mb-4">{message}</p>
      <Link href="/" className="text-sm text-blue-600 hover:underline">← 返回首页</Link>
    </div>
  );
}
