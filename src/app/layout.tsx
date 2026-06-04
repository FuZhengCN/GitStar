import type { Metadata } from 'next';
import Header from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'GitStar — 星探 · 发现 GitHub 优质开源项目',
  description: 'Chrome 扩展，像望远镜一样在 GitHub 星空中发现高 Star 优质项目。三种发现模式、AI 概述、弹窗看 README。',
  keywords: 'GitHub,开源项目,Chrome扩展,项目发现,开发者工具,开源,星探',
  openGraph: {
    title: 'GitStar — 星探 · 发现 GitHub 优质开源项目',
    description: '像望远镜一样在 GitHub 星空中发现好项目',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body className="relative">
        <Header />
        <div className="relative z-[1]">
          {children}
        </div>
      </body>
    </html>
  );
}
