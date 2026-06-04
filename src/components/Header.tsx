import Link from 'next/link';

function LogoSVG() {
  return (
    <svg width="32" height="32" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="128" height="128" rx="28" fill="#3b82f6"/>
      <text x="54" y="104" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontSize="88" fontWeight="900" fill="#ffffff" letterSpacing="-2">G</text>
      <polygon points="101,13 106.5,25.5 120,27.5 109.5,37.5 112,51 101,45 90,51 92.5,37.5 82,27.5 95.5,25.5" fill="#f59e0b"/>
    </svg>
  );
}

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-[#0a0a1a]/70 backdrop-blur-md border-b border-white/5">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <LogoSVG />
          <span className="text-lg font-bold text-white">
            Git<span className="text-[#3b82f6]">Star</span>
          </span>
        </Link>
      </div>
    </header>
  );
}
