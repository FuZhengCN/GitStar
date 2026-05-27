import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-gray-900 hover:text-blue-600 transition-colors">
          GitStar
        </Link>
        <span className="text-sm text-gray-500">发现优质开源项目</span>
      </div>
    </header>
  );
}
