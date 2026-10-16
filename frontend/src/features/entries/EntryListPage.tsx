import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Search, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import type { DiaryEntry } from '../../api/types';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { useDeleteEntry, useEntries, usePinEntry } from '../../queries/entries';
import EntryList from './EntryList';

export default function EntryListPage() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const selectedDate = params.get('date');
  const navigate = useNavigate();
  const confirm = useConfirm();
  const deleteEntry = useDeleteEntry();
  const pinEntry = usePinEntry();
  const entries = useEntries({ q, date: selectedDate });

  const [input, setInput] = useState(q);
  const [seenQ, setSeenQ] = useState(q);
  if (q !== seenQ) {
    setSeenQ(q);
    if (input.trim() !== q) setInput(q);
  }

  const timer = useRef<number | null>(null);
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    [],
  );

  const commit = (value: string) => {
    const trimmed = value.trim();
    setParams(
      (current) => {
        const next = new URLSearchParams(current);
        if (trimmed) next.set('q', trimmed);
        else next.delete('q');
        return next;
      },
      { replace: true },
    );
  };

  const onChange = (value: string) => {
    setInput(value);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => commit(value), 250);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (timer.current) window.clearTimeout(timer.current);
    commit(input);
  };

  const remove = async (entry: DiaryEntry) => {
    const ok = await confirm({
      title: '删除日记',
      message: '确定要删除这篇日记吗？',
      confirmLabel: '删除',
      danger: true,
    });
    if (ok) deleteEntry.mutate(entry.id);
  };

  return (
    <div>
      <form onSubmit={onSubmit} className="mb-6">
        <div className="flex gap-3 rounded-2xl border border-rule bg-card p-3">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              value={input}
              onChange={(event) => onChange(event.target.value)}
              aria-label="搜索"
              placeholder="搜索标题或内容..."
              className="w-full rounded-xl border border-rule bg-paper py-3 pr-4 pl-10 text-sm outline-none focus:border-accent"
            />
          </div>
          <button
            type="submit"
            className="rounded-xl bg-accent px-5 text-sm font-semibold text-accent-ink"
          >
            搜索
          </button>
        </div>
      </form>

      {(selectedDate || q.trim()) && (
        <div className="mb-4 flex flex-wrap gap-2">
          {selectedDate && (
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              日期：{format(parseISO(selectedDate), 'yyyy年MM月dd日', { locale: zhCN })}
              <button
                type="button"
                aria-label="清除日期筛选"
                onClick={() =>
                  setParams(
                    (current) => {
                      const next = new URLSearchParams(current);
                      next.delete('date');
                      return next;
                    },
                    { replace: true },
                  )
                }
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
          {q.trim() && (
            <span className="inline-flex items-center gap-2 rounded-full bg-rule/80 px-3 py-1 text-xs font-semibold text-ink">
              关键词：{q.trim()}
              <button
                type="button"
                aria-label="清除搜索关键词"
                onClick={() => {
                  setInput('');
                  commit('');
                }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          )}
        </div>
      )}

      <EntryList
        entries={entries.data ?? []}
        isLoading={entries.isLoading}
        selectedDate={selectedDate}
        searchQuery={q}
        onCreate={() => navigate('/new')}
        onEdit={(entry) => navigate(`/diary/${entry.id}/edit`)}
        onDelete={(entry) => void remove(entry)}
        onPin={(id) => pinEntry.mutate(id)}
      />
    </div>
  );
}
