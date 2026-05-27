export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Breadcrumb skeleton */}
      <div className="flex items-center gap-1.5 pb-3 border-b border-[#d0d7de] animate-pulse">
        <div className="h-3 bg-gray-200 rounded w-16" />
        <div className="h-3 bg-gray-200 rounded w-2" />
        <div className="h-3 bg-gray-200 rounded w-20" />
      </div>

      {/* Repo header skeleton */}
      <div className="flex gap-4 items-start">
        <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-full" />
          <div className="h-4 bg-gray-200 rounded w-1/3" />
          <div className="flex gap-2 mt-2">
            <div className="h-8 bg-gray-200 rounded w-20" />
            <div className="h-8 bg-gray-200 rounded w-28" />
          </div>
        </div>
      </div>

      {/* README skeleton */}
      <div className="border border-[#d0d7de] rounded-lg">
        <div className="px-4 py-3 border-b border-[#d0d7de] bg-[#f6f8fa]">
          <div className="h-4 bg-gray-200 rounded w-24" />
        </div>
        <div className="px-6 py-4 space-y-2">
          <div className="h-4 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-200 rounded w-1/2 mt-4" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-4/5" />
        </div>
      </div>
    </div>
  );
}
