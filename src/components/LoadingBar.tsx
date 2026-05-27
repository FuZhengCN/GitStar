'use client';

interface Props {
  loading: boolean;
}

export default function LoadingBar({ loading }: Props) {
  if (!loading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-0.5 overflow-hidden">
      <div className="h-full w-1/3 bg-[#6366f1] animate-[loadingBar_1.2s_ease-in-out_infinite]" />
    </div>
  );
}
