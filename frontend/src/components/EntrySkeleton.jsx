function EntrySkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:px-8 py-6 shadow-sm animate-pulse space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 w-3/4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-100 rounded w-1/4"></div>
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-4 bg-gray-100 rounded w-full"></div>
        <div className="h-4 bg-gray-100 rounded w-full"></div>
        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
      </div>
    </div>
  );
}

export default EntrySkeleton;
