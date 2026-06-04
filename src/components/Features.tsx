const FEATURES = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
    title: '三种发现模式',
    desc: '热门看经典、崛起抓爆款、活跃找维护中的项目，一键切换视角',
    glow: '#3b82f6',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
      </svg>
    ),
    title: '零语法筛选',
    desc: '语言、时间、排序全用下拉框选，不用记 stars:&gt;1000 这种咒语',
    glow: '#8b5cf6',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    ),
    title: '弹窗看 README',
    desc: '直接在弹窗里渲染 Markdown，支持目录导航，大文件自动分段加载',
    glow: '#06b6d4',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
    title: 'AI 智能概述',
    desc: '一键生成功能 / 特点 / 场景三字段摘要，一张卡片看懂一个项目',
    glow: '#f59e0b',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
      </svg>
    ),
    title: '本地收藏 + 一键 Star',
    desc: '收藏独立于 GitHub Star 体系，存本地。配好 Token 还能在弹窗里直接 Star',
    glow: '#f59e0b',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 21l5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 016-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.79.147 2.678.25m-5.999 5.999h.008v.008h-.008v-.008z" />
      </svg>
    ),
    title: '中英文双语',
    desc: 'UI 界面和 AI 概述输出语言都可切换，语言偏好即时同步',
    glow: '#22c55e',
  },
];

export default function Features() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center mb-14">
        <p className="text-sm text-[#3b82f6] tracking-wider mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
          WHY GITSTAR
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
          为什么用 <span className="text-[#3b82f6]">星探</span>
        </h2>
        <p className="mt-3 text-white/55">好的项目像星星一样散落在 GitHub 上，GitStar 是你的望远镜</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {FEATURES.map((f) => (
          <div
            key={f.title}
            className="group relative bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:bg-white/[0.05] hover:border-white/[0.1] transition-all duration-300"
            style={{
              boxShadow: `0 0 0 1px ${f.glow}0d inset`,
            }}
          >
            <div className="w-9 h-9 rounded-lg flex items-center justify-center mb-3 bg-white/[0.04]" style={{ color: f.glow }}>
              {f.icon}
            </div>
            <h3 className="font-semibold text-sm mb-1" style={{ fontFamily: "'Poppins', sans-serif" }}>{f.title}</h3>
            <p className="text-sm text-white/55 leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
