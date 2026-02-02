import { X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

function FilterChips({ selectedDate, setSelectedDate, searchQuery, setSearchQuery }) {
  if (!selectedDate && !searchQuery.trim()) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      {selectedDate && (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
          日期：{format(parseISO(selectedDate), 'yyyy年MM月dd日', { locale: zhCN })}
          <button
            type="button"
            onClick={() => setSelectedDate(null)}
            className="text-indigo-700/70 hover:text-indigo-800"
            aria-label="清除日期筛选"
            title="清除日期筛选"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
      {searchQuery.trim() && (
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-xs font-semibold">
          关键词：{searchQuery.trim()}
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="text-gray-500 hover:text-gray-700"
            aria-label="清除搜索关键词"
            title="清除搜索关键词"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </span>
      )}
    </div>
  );
}

export default FilterChips;
