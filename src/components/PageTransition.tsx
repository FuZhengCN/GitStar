'use client';
import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import LoadingBar from './LoadingBar';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <Suspense key={pathname} fallback={<LoadingBar loading />}>
      {children}
    </Suspense>
  );
}
