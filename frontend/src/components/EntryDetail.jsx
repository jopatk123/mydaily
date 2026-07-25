import { Calendar, Pencil, Trash2, Pin, PinOff, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

function parseEntryDate(rawValue) {
  if (!rawValue) return null;
  if (rawValue instanceof Date) return rawValue;

  if (typeof rawValue === 'string') {
    const hasTimezoneSuffix = /([zZ]|[+-]\d{2}:\d{2})$/.test(rawValue);
    return new Date(hasTimezoneSuffix ? rawValue : `${rawValue}Z`);
  }

  return new Date(rawValue);
}

function EntryDetail({ entry, onBack, onEdit, onDelete, onPin }) {
  const createdAt = parseEntryDate(entry?.created_at);
  const createdAtLabel =
    createdAt && !Number.isNaN(createdAt.getTime())
      ? format(createdAt, 'yyyy年MM月dd日 HH:mm', { locale: zhCN })
      : '-';

  return (
    <article
      className={`group bg-white rounded-2xl border overflow-hidden shadow-sm ${
        entry.is_pinned ? 'border-amber-300 ring-1 ring-amber-200' : 'border-gray-100'
      }`}
    >
      <div className="p-6 sm:px-8 py-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            返回列表
          </button>
        </div>

        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-gray-900 tracking-wide break-words">
                {entry.title}
              </h2>
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
              onClick={() => onPin(entry.id)}
              className={`p-2 rounded-full transition-all duration-200 ${
                entry.is_pinned
                  ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-50'
                  : 'text-gray-300 hover:text-amber-500 hover:bg-amber-50'
              }`}
              title={entry.is_pinned ? '取消置顶' : '置顶日记'}
              aria-label={entry.is_pinned ? '取消置顶' : '置顶日记'}
            >
              {entry.is_pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
            </button>
            <button
              onClick={() => onEdit(entry)}
              className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-200"
              title="编辑日记"
              aria-label="编辑日记"
            >
              <Pencil className="h-5 w-5" />
            </button>
            <button
              onClick={() => onDelete(entry.id)}
              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
              title="删除日记"
              aria-label="删除日记"
            >
              <Trash2 className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <div className="prose prose-sm prose-indigo max-w-none text-gray-700 leading-relaxed whitespace-pre-wrap font-medium">
            {entry.content}
          </div>
        </div>
      </div>
    </article>
  );
}

export default EntryDetail;
