import Hero from '@/components/Hero';
import Features from '@/components/Features';
import Screenshots from '@/components/Screenshots';

export const revalidate = 3600;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <Screenshots />

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-white/30">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <a href="https://github.com/FuZhengCN/GitStar" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
            GitHub
          </a>
          <a href="https://github.com/FuZhengCN/GitStar/releases" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
            Releases
          </a>
          <a href="https://fuzhengcn.github.io/GitStar/store-listing/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
            隐私政策
          </a>
          <a href="https://github.com/FuZhengCN/GitStar/issues" target="_blank" rel="noopener noreferrer" className="hover:text-white/60 transition-colors">
            反馈
          </a>
          <span>v1.2.1</span>
        </div>
        <p className="mt-4 text-xs text-[#334155]">Token 仅存储在本地，不上传任何服务器 · Manifest V3 · 最小权限</p>
      </footer>
    </>
  );
}
