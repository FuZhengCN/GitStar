import { useState, useEffect } from 'react';

interface Props {
  src: string;
  alt: string;
  className?: string;
}

export default function AvatarImg({ src, alt, className }: Props) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(src)
      .then(r => r.blob())
      .then(blob => {
        if (!cancelled) setBlobUrl(URL.createObjectURL(blob));
      })
      .catch(() => {
        // 降级：fetch 失败时直接用原始 URL（已经声明了 host_permissions，正常情况可到达）
      });
    return () => { cancelled = true; };
  }, [src]);

  if (!blobUrl) {
    return <div className={className} />;
  }

  return <img src={blobUrl} alt={alt} className={className} />;
}
