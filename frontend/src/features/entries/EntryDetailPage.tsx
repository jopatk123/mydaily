import { ArrowLeft, Calendar, Pencil, Pin, PinOff, Trash2 } from 'lucide-react';
import { lazy, Suspense, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { formatEntryDate } from '../../lib/dates';
import { useDeleteEntry, useEntry, usePinEntry } from '../../queries/entries';

const MarkdownView = lazy(() => import('./MarkdownView'));

export default function EntryDetailPage() {
  const params = useParams();
  const id = Number(params.id);
  const navigate = useNavigate();
  const confirm = useConfirm();
  const entryQuery = useEntry(id);
  const remove = useDeleteEntry();
  const pin = usePinEntry();
  const entry = entryQuery.data;

  useEffect(() => {
    document.title = entry ? `${entry.title} · MyDaily` : 'MyDaily';
    return () => {
      document.title = 'MyDaily - 个人日记';
    };
  }, [entry]);

  if (!Number.isFinite(id)) {
    return <p className="text-muted">找不到这篇日记。</p>;
  }

  if (entryQuery.isLoading && !entry) {
    return <p className="text-muted">正在翻开这一页…</p>;
  }

  if (!entry) {
    return (
      <div className="rounded-2xl border border-dashed border-rule bg-card px-6 py-16 text-center">
        <p className="text-muted">这篇日记不存在，或已被删除。</p>
        <Link to="/" className="mt-4 inline-block font-semibold text-accent">
          返回列表
        </Link>
      </div>
    );
  }

  const onDelete = async () => {
    const ok = await confirm({
      title: '删除日记',
      message: '确定要删除这篇日记吗？',
      confirmLabel: '删除',
      danger: true,
    });
    if (!ok) return;
    await remove.mutateAsync(entry.id);
    navigate('/');
  };

  return (
    <article
      className={`rounded-2xl border bg-card px-6 py-6 sm:px-10 sm:py-8 ${entry.is_pinned ? 'border-pin/50' : 'border-rule'}`}
    >
      <Link
        to="/"
        className="inline-flex items-center gap-1 text-sm font-medium text-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        返回列表
      </Link>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-3xl leading-tight text-ink">{entry.title}</h2>
            {entry.is_pinned && (
              <span className="inline-flex items-center gap-1 rounded-full bg-pin/15 px-2 py-0.5 text-xs font-semibold text-pin">
                <Pin className="h-3 w-3" />
                置顶
              </span>
            )}
          </div>
          <p className="mt-2 flex items-center text-xs text-muted">
            <Calendar className="mr-1.5 h-3.5 w-3.5" />
            {formatEntryDate(entry.created_at)}
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            onClick={() => pin.mutate(entry.id)}
            className={`rounded-full p-2 ${entry.is_pinned ? 'text-pin' : 'text-muted hover:text-pin'}`}
            aria-label={entry.is_pinned ? '取消置顶' : '置顶日记'}
          >
            {entry.is_pinned ? <PinOff className="h-5 w-5" /> : <Pin className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/diary/${entry.id}/edit`)}
            className="rounded-full p-2 text-muted hover:text-accent"
            aria-label="编辑日记"
          >
            <Pencil className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => void onDelete()}
            className="rounded-full p-2 text-muted hover:text-danger"
            aria-label="删除日记"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        </div>
      </div>
      <div className="mt-6 border-t border-rule pt-6">
        <Suspense fallback={<p className="text-sm text-muted">正在排版…</p>}>
          <MarkdownView content={entry.content} />
        </Suspense>
      </div>
    </article>
  );
}
