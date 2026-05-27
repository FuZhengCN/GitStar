import type { Metadata } from 'next';
import { Suspense } from 'react';
import Header from '@/components/Header';
import PageTransition from '@/components/PageTransition';
import './globals.css';

export const metadata: Metadata = {
  title: 'GitStar - 发现优质开源项目',
  description: '浏览 GitHub 上最受欢迎的开源项目，按语言、时间筛选，查看项目详情',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <Header />
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Suspense fallback={null}>
            <PageTransition>{children}</PageTransition>
          </Suspense>
        </main>
      </body>
    </html>
  );
}
