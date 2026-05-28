interface Props {
  loading: boolean;
}

export default function LoadingBar({ loading }: Props) {
  return (
    <div className="h-0.5 overflow-hidden">
      {loading && (
        <div className="h-full w-1/3 bg-[#3b82f6] animate-[loadingBar_1s_ease-in-out_infinite]" />
      )}
    </div>
  );
}
