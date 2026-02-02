import { Search } from 'lucide-react';

function SearchBar({ searchQuery, setSearchQuery, handleSearch }) {
  return (
    <form onSubmit={handleSearch} className="mb-8">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-11 pr-4 py-3 border transition-colors"
              placeholder="搜索标题或内容..."
              aria-label="搜索"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center px-5 py-3 rounded-xl text-sm font-semibold shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
          >
            搜索
          </button>
        </div>
      </div>
    </form>
  );
}

export default SearchBar;
