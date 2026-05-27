import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-[#f3f4f6]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-[#6366f1] hover:text-[#4f46e5] transition-colors">
          ◈ GitStar
        </Link>
        <span className="text-sm font-semibold text-[#9ca3af]">发现优质开源项目</span>
      </div>
    </header>
  );
}
