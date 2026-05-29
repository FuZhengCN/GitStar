import type { CSSProperties } from 'react';

interface Props {
  size?: number;
  style?: CSSProperties;
  className?: string;
}

export default function GitStarIcon({ size = 24, style, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      style={{ ...style, flexShrink: 0 }}
      className={className}
    >
      <circle cx="64" cy="64" r="64" fill="#ffffff" />
      <text x="54" y="104" textAnchor="middle" fontFamily="Arial,Helvetica,sans-serif" fontSize="88" fontWeight="900" fill="#3b82f6" letterSpacing="-2">G</text>
      <polygon points="101,13 106.5,25.5 120,27.5 109.5,37.5 112,51 101,45 90,51 92.5,37.5 82,27.5 95.5,25.5" fill="#f59e0b" />
    </svg>
  );
}
