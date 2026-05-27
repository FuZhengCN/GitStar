'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import LoadingBar from './LoadingBar';

export default function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
  }, [pathname]);

  useEffect(() => {
    setLoading(false);
  }, [children]);

  return (
    <>
      <LoadingBar loading={loading} />
      {children}
    </>
  );
}
