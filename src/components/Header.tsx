import Link from 'next/link';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#24292f] border-b border-[#30363d]">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-sm font-semibold text-[#2da44e] hover:text-white transition-colors">
          ◈ GitStar
        </Link>
        <span className="text-[11px] text-white/70">发现优质开源项目</span>
      </div>
    </header>
  );
}
