import { Calendar, ChevronRight, PenTool, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { Link } from 'react-router';
import type { DiaryEntry } from '../../api/types';
import { formatEntryDate } from '../../lib/dates';
import { toPlainExcerpt } from '../../lib/markdown';

interface EntryListProps {
  entries: DiaryEntry[];
  isLoading: boolean;
  selectedDate: string | null;
  searchQuery: string;
  onEdit: (entry: DiaryEntry) => void;
  onDelete: (entry: DiaryEntry) => void;
  onPin: (id: number) => void;
  onCreate: () => void;
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-4 rounded-2xl border border-rule bg-card p-6">
      <div className="h-6 w-1/3 rounded bg-rule" />
      <div className="h-4 w-1/4 rounded bg-rule/70" />
      <div className="h-4 w-full rounded bg-rule/70" />
      <div className="h-4 w-2/3 rounded bg-rule/70" />
    </div>
  );
}

export default function EntryList({
  entries,
  isLoading,
  selectedDate,
  searchQuery,
  onEdit,
  onDelete,
  onPin,
  onCreate,
}: EntryListProps) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton />
        <Skeleton />
      </div>
    );
  }

  if (entries.length === 0) {
    const message = selectedDate
      ? '这一天还没有日记。写一篇记录下吧！'
      : searchQuery.trim()
        ? '没有搜索到匹配的日记。换个关键词试试？'
        : '还没有日记呢。开始写下第一篇吧！';
    return (
      <div className="rounded-2xl border border-dashed border-rule bg-card px-6 py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 text-accent">
          <PenTool className="h-7 w-7" />
        </div>
        <p className="text-lg text-muted">{message}</p>
        <button type="button" onClick={onCreate} className="mt-4 font-semibold text-accent">
          马上动笔 →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {entries.map((entry) => {
        const excerpt = toPlainExcerpt(entry.content) || entry.content;
        return (
          <article
            key={entry.id}
            className={`relative rounded-2xl border bg-card shadow-sm transition hover:border-accent/40 ${
              entry.is_pinned ? 'border-pin/50' : 'border-rule'
            }`}
          >
            {entry.is_pinned && (
              <span className="absolute top-4 right-4 hidden items-center gap-1 rounded-full bg-pin/15 px-2 py-0.5 text-xs font-semibold text-pin sm:inline-flex">
                <Pin className="h-3 w-3" />
                置顶
              </span>
            )}
            <Link to={`/diary/${entry.id}`} className="block px-6 py-6 sm:px-8">
              <h3 className="pr-16 font-serif text-2xl leading-snug text-ink">{entry.title}</h3>
              <p className="mt-2 flex items-center text-xs text-muted">
                <Calendar className="mr-1.5 h-3.5 w-3.5" />
                {formatEntryDate(entry.created_at)}
              </p>
              <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-ink/80">{excerpt}</p>
              <span className="mt-3 inline-flex items-center text-xs font-semibold text-accent">
                查看全文
                <ChevronRight className="h-3.5 w-3.5" />
              </span>
            </Link>
            <div className="absolute top-4 right-4 flex gap-1 sm:top-14">
              <button
                type="button"
                onClick={() => onPin(entry.id)}
                className={`rounded-full p-2 ${entry.is_pinned ? 'text-pin' : 'text-muted hover:text-pin'}`}
                aria-label={entry.is_pinned ? '取消置顶' : '置顶日记'}
              >
                {entry.is_pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
              </button>
              <button
                type="button"
                onClick={() => onEdit(entry)}
                className="rounded-full p-2 text-muted hover:text-accent"
                aria-label="编辑日记"
              >
                <Pencil className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => onDelete(entry)}
                className="rounded-full p-2 text-muted hover:text-danger"
                aria-label="删除日记"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
