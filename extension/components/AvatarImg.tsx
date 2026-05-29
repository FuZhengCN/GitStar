import { useState, useEffect } from 'react';

const blobCache = new Map<string, string>();

interface Props {
  src: string;
  alt: string;
  className?: string;
}

export default function AvatarImg({ src, alt, className }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(() => blobCache.get(src) || null);

  useEffect(() => {
    if (blobCache.has(src)) {
      setBlobUrl(blobCache.get(src)!);
      return;
    }

    let cancelled = false;
    fetch(src)
      .then(r => r.blob())
      .then(blob => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobCache.set(src, url);
        setBlobUrl(url);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [src]);

  if (!blobUrl) {
    return <div className={className} />;
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
