export default function Hero() {
  return (
    <section className="relative max-w-4xl mx-auto px-4 pt-28 pb-24 text-center overflow-hidden">
      {/* Telescope beam effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-gradient-to-b from-[#3b82f6]/8 via-[#3b82f6]/3 to-transparent rounded-[50%] blur-3xl pointer-events-none" />

      <div className="relative">
        {/* Small badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[13px] text-white/60 mb-8 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 bg-[#22c55e] rounded-full" />
          Chrome 扩展 &middot; 免费 &middot; 开源
        </div>

        {/* Main headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]" style={{ fontFamily: "'Poppins', sans-serif" }}>
          <span className="text-white/90">在 GitHub 星空中</span>
          <br />
          <span className="bg-gradient-to-r from-[#3b82f6] via-[#8b5cf6] to-[#f59e0b] bg-clip-text text-transparent">
            探索好项目
          </span>
        </h1>

        {/* Telescope illustration */}
        <div className="mt-10 flex justify-center">
          <svg className="w-20 h-20" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Telescope tube */}
            <g transform="rotate(-35, 40, 50)">
              <rect x="8" y="44" width="50" height="12" rx="6" fill="white" fillOpacity="0.08" stroke="white" strokeWidth="1.5" strokeOpacity="0.15"/>
              {/* Lens hood */}
              <rect x="2" y="42" width="10" height="16" rx="3" fill="white" fillOpacity="0.05" stroke="white" strokeWidth="1.5" strokeOpacity="0.15"/>
              {/* Lens glass */}
              <ellipse cx="7" cy="50" rx="2.5" ry="5.5" fill="#3b82f6" opacity="0.3" stroke="#3b82f6" strokeWidth="1"/>
              {/* Eyepiece */}
              <rect x="56" y="45" width="8" height="10" rx="2" fill="white" fillOpacity="0.05" stroke="white" strokeWidth="1.5" strokeOpacity="0.15"/>
            </g>
            {/* Tripod */}
            <line x1="40" y1="56" x2="28" y2="76" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.12"/>
            <line x1="40" y1="56" x2="52" y2="76" stroke="white" strokeWidth="2" strokeLinecap="round" strokeOpacity="0.12"/>
            <line x1="40" y1="56" x2="40" y2="72" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeOpacity="0.08"/>
            {/* Stars */}
            <circle cx="12" cy="15" r="1.2" fill="white" opacity="0.3"/>
            <circle cx="68" cy="22" r="1" fill="white" opacity="0.25"/>
            <circle cx="58" cy="65" r="0.8" fill="white" opacity="0.2"/>
            {/* Twinkling star */}
            <polygon points="70,14 71.5,18 76,18.5 72.5,21 73.5,25.5 70,23 66.5,25.5 67.5,21 64,18.5 68.5,18" fill="#f59e0b" opacity="0.5"/>
          </svg>
        </div>

        <p className="mt-6 text-lg text-white/65 max-w-xl mx-auto leading-relaxed">
          像望远镜一样，在 GitHub 的浩瀚星空中
          <br />
          发现真正值得关注的好项目
        </p>

        <div className="mt-10">
          <a
            href="https://chromewebstore.google.com/detail/gitstar"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex px-8 py-3.5 bg-[#3b82f6] text-white font-semibold rounded-xl hover:bg-[#2563eb] transition-all text-base shadow-[0_0_40px_rgba(59,130,246,0.3)] hover:shadow-[0_0_60px_rgba(59,130,246,0.5)]"
          >
            安装 GitStar 扩展
          </a>
        </div>

        <p className="mt-5 text-xs text-white/25">
          支持 Chrome · Edge · 及其他 Chromium 内核浏览器
        </p>
      </div>

      {/* Floating stars decoration */}
      <svg className="absolute top-10 right-10 w-2 h-2 text-[#f59e0b]/60 animate-pulse" viewBox="0 0 8 8" fill="currentColor">
        <polygon points="4,0 5,3 8,4 5,5 4,8 3,5 0,4 3,3" />
      </svg>
      <svg className="absolute bottom-20 left-16 w-1.5 h-1.5 text-white/30" viewBox="0 0 8 8" fill="currentColor">
        <polygon points="4,0 5,3 8,4 5,5 4,8 3,5 0,4 3,3" />
      </svg>
    </section>
  );
}
