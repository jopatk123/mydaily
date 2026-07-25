import { Calendar, PenTool, Pencil, Trash2, Pin, PinOff, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import EntrySkeleton from './EntrySkeleton';

function parseEntryDate(rawValue) {
  if (!rawValue) return null;
  if (rawValue instanceof Date) return rawValue;

  if (typeof rawValue === 'string') {
    const hasTimezoneSuffix = /([zZ]|[+-]\d{2}:\d{2})$/.test(rawValue);
    return new Date(hasTimezoneSuffix ? rawValue : `${rawValue}Z`);
  }

  return new Date(rawValue);
}

function EntryList({
  entries,
  isLoadingEntries,
  selectedDate,
  searchQuery,
  onEdit,
  onDelete,
  onPin,
  onView,
  onCreate,
}) {
  if (isLoadingEntries) {
    return (
      <div className="space-y-6">
        <EntrySkeleton />
        <EntrySkeleton />
      </div>
    );
  }

  if (!isLoadingEntries && entries.length > 0) {
    return (
      <div className="space-y-8">
        {entries.map((entry) => {
          const createdAt = parseEntryDate(entry.created_at);
          const createdAtLabel =
            createdAt && !Number.isNaN(createdAt.getTime())
              ? format(createdAt, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
              : '-';

          const handleCardClick = () => onView?.(entry);
          const stopPropagation = (e) => e.stopPropagation();

          return (
            <article
              key={entry.id}
              onClick={handleCardClick}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onView?.(entry);
                }
              }}
              className={`group cursor-pointer bg-white rounded-2xl border overflow-hidden shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-300 ${
                entry.is_pinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-100'
              }`}
            >
              <div className="p-6 sm:px-8 py-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors tracking-wide break-words">
                        {entry.title}
                      </h3>
                      {entry.is_pinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-600">
                          <Pin className="h-3 w-3" />
                          置顶
                        </span>
                      )}
                    </div>
                    <div className="flex items-center text-xs font-medium text-gray-400">
                      <Calendar className="h-3.5 w-3.5 mr-1.5" />
                      {createdAtLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        stopPropagation(e);
                        onPin(entry.id);
                      }}
                      className={`p-2 rounded-full transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100 ${
                        entry.is_pinned
                          ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50 lg:opacity-100'
                          : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'
                      }`}
                      title={entry.is_pinned ? '取消置顶' : '置顶日记'}
                      aria-label={entry.is_pinned ? '取消置顶' : '置顶日记'}
                    >
                      {entry.is_pinned ? (
                        <PinOff className="h-5 w-5" />
                      ) : (
                        <Pin className="h-5 w-5" />
                      )}
                    </button>
                    <button
                      onClick={(e) => {
                        stopPropagation(e);
                        onEdit(entry);
                      }}
                      className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                      title="编辑日记"
                      aria-label="编辑日记"
                    >
                      <Pencil className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => {
                        stopPropagation(e);
                        onDelete(entry.id);
                      }}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                      title="删除日记"
                      aria-label="删除日记"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                <div className="mt-5">
                  <p className="prose prose-sm prose-indigo max-w-none text-gray-600 leading-relaxed font-medium line-clamp-2 break-words">
                    {entry.content}
                  </p>
                  <div className="mt-3 flex items-center text-xs font-semibold text-indigo-500 group-hover:text-indigo-600 transition-colors">
                    查看全文
                    <ChevronRight className="h-3.5 w-3.5 ml-0.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  return (
    <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-inner">
      <div className="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-full mb-4">
        <PenTool className="h-8 w-8 text-indigo-300" />
      </div>
      <p className="text-gray-400 text-lg font-medium">
        {selectedDate
          ? '这一天还没有日记。写一篇记录下吧！'
          : searchQuery.trim()
            ? '没有搜索到匹配的日记。换个关键词试试？'
            : '还没有日记呢。开始写下第一篇吧！'}
      </p>
      <button
        onClick={onCreate}
        className="mt-4 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
      >
        马上动笔 →
      </button>
    </div>
  );
}

export default EntryList;
