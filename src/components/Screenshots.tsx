const SCREENSHOTS = [
  {
    src: '/screenshot-discover.png',
    alt: '弹窗首页 — 三种发现模式 + 项目卡片列表',
    title: '三种发现模式',
    points: ['热门 / 崛起 / 活跃，一键切换浏览视角', '语言、时间、排序，下拉框搞定筛选', '日均 Star 增长率徽章，一眼识别爆款项目'],
  },
  {
    src: '/screenshot-detail.png',
    alt: '项目详情页 — 仓库信息 + Star 操作',
    title: '项目详情 & 收藏',
    points: ['仓库信息一目了然：Star、Fork、语言、协议', '配好 Token 直接在弹窗里 Star / Unstar', '本地收藏夹，数据完全独立于 GitHub Star'],
  },
  {
    src: '/screenshot-readme.png',
    alt: 'README 展开 — 完整阅读 + 目录导航',
    title: '弹窗内阅读 README',
    points: ['完整 Markdown 渲染，代码高亮、表格、图片', '浮动目录导航，点击标题直达对应段落', '大文件后台 Worker 解析，不卡主线程'],
  },
  {
    src: '/screenshot-ai.png',
    alt: 'AI 概述 — 功能/特点/场景三色卡片',
    title: 'AI 智能概述',
    points: ['一键生成结构化摘要：功能 / 特点 / 场景', '支持自定义 API 端点、模型和输出语言', '缓存命中秒出，不重复消费 API 配额'],
  },
];

export default function Screenshots() {
  return (
    <section className="max-w-5xl mx-auto px-4 py-20">
      <div className="text-center mb-14">
        <p className="text-sm text-[#3b82f6] tracking-wider mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
          PREVIEW
        </p>
        <h2 className="text-3xl sm:text-4xl font-bold" style={{ fontFamily: "'Poppins', sans-serif" }}>
          透过镜头看一眼
        </h2>
      </div>

      <div className="space-y-12">
        {SCREENSHOTS.map((s, i) => (
          <div key={s.src} className={`flex flex-col ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-6 items-center`}>
            {/* Screenshot */}
            <div className="w-full md:w-1/2 bg-white/[0.03] border border-white/[0.06] rounded-xl overflow-hidden hover:border-white/[0.12] transition-all duration-500">
              <img src={s.src} alt={s.alt} className="w-full aspect-[400/600]" loading="lazy" />
            </div>
            {/* Feature points */}
            <div className="w-full md:w-1/2 md:px-4">
              <h3 className="text-xl font-bold mb-4" style={{ fontFamily: "'Poppins', sans-serif" }}>{s.title}</h3>
              <ul className="space-y-3">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-3 text-sm text-white/60">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0 text-[#3b82f6]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
