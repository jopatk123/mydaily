import { Bold, Heading2, Link2, List, PenTool, Quote } from 'lucide-react';
import { lazy, Suspense, useEffect, useRef, useState, type FormEvent } from 'react';
import { useBlocker, useNavigate, useParams } from 'react-router';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { clearDraft, readDraft, writeDraft } from '../../lib/draft';
import { useCreateEntry, useEntry, useUpdateEntry } from '../../queries/entries';

const MarkdownView = lazy(() => import('./MarkdownView'));

const TITLE_MAX = 200;
const CONTENT_MAX = 100_000;

function insertAround(value: string, start: number, end: number, before: string, after: string) {
  const selected = value.slice(start, end) || '文本';
  const next = value.slice(0, start) + before + selected + after + value.slice(end);
  const cursor = start + before.length + selected.length + after.length;
  return { next, cursor };
}

export default function EntryEditorPage() {
  const params = useParams();
  const editingId = params.id ? Number(params.id) : null;
  const isEditing = editingId !== null;
  const navigate = useNavigate();
  const confirm = useConfirm();
  const existing = useEntry(isEditing ? editingId : null);
  const createEntry = useCreateEntry();
  const updateEntry = useUpdateEntry();
  const entry = isEditing ? existing.data : undefined;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const bypassRef = useRef(false);
  const askedDraft = useRef(false);
  // 记录已回填的表单来源，避免在渲染阶段调用 setState 造成重复渲染。
  const hydratedIdRef = useRef<number | 'new' | null>(null);

  useEffect(() => {
    if (isEditing) {
      if (entry && hydratedIdRef.current !== entry.id) {
        hydratedIdRef.current = entry.id;
        setTitle(entry.title);
        setContent(entry.content);
      }
      return;
    }
    if (hydratedIdRef.current !== 'new') {
      hydratedIdRef.current = 'new';
      setTitle('');
      setContent('');
    }
  }, [entry, isEditing]);

  const dirty = isEditing
    ? Boolean(entry) && (title !== entry?.title || content !== entry?.content)
    : title.trim() !== '' || content.trim() !== '';

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      !bypassRef.current && dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  const prompting = useRef(false);
  useEffect(() => {
    if (blocker.state !== 'blocked' || prompting.current) return;
    prompting.current = true;
    void confirm({
      title: '离开编辑',
      message: '有未保存的内容，确定离开吗？',
      confirmLabel: '离开',
      danger: true,
    }).then((ok) => {
      prompting.current = false;
      if (ok) blocker.proceed();
      else blocker.reset();
    });
  }, [blocker, confirm]);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onLeave);
    return () => window.removeEventListener('beforeunload', onLeave);
  }, [dirty]);

  useEffect(() => {
    if (isEditing || askedDraft.current) return;
    askedDraft.current = true;
    const draft = readDraft();
    if (!draft) return;
    void confirm({
      title: '恢复草稿',
      message: '发现未发布的草稿，要恢复吗？',
      confirmLabel: '恢复',
    }).then((ok) => {
      if (ok) {
        setTitle(draft.title);
        setContent(draft.content);
      } else {
        clearDraft();
      }
    });
  }, [confirm, isEditing]);

  useEffect(() => {
    if (isEditing) return;
    const handle = window.setTimeout(() => {
      if (!title.trim() && !content.trim()) clearDraft();
      else writeDraft({ title, content });
    }, 300);
    return () => window.clearTimeout(handle);
  }, [content, isEditing, title]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const applyMarkup = (before: string, after = before) => {
    const field = textareaRef.current;
    const start = field?.selectionStart ?? content.length;
    const end = field?.selectionEnd ?? content.length;
    const { next, cursor } = insertAround(content, start, end, before, after);
    setContent(next);
    requestAnimationFrame(() => {
      field?.focus();
      field?.setSelectionRange(cursor, cursor);
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextTitle = title.trim();
    const nextContent = content.trim();
    if (!nextTitle || !nextContent) return;
    bypassRef.current = true;
    try {
      if (isEditing && editingId) {
        const saved = await updateEntry.mutateAsync({
          id: editingId,
          title: nextTitle,
          content: nextContent,
        });
        navigate(`/diary/${saved.id}`);
        return;
      }
      const saved = await createEntry.mutateAsync({ title: nextTitle, content: nextContent });
      clearDraft();
      navigate(`/diary/${saved.id}`);
    } catch {
      bypassRef.current = false;
    }
  };

  if (isEditing && existing.isLoading && !entry) {
    return <p className="text-muted">正在打开原稿…</p>;
  }

  if (isEditing && !entry && existing.isError) {
    return <p className="text-muted">找不到要编辑的日记。</p>;
  }

  return (
    <div className="rounded-2xl border border-rule bg-card px-6 py-8 sm:px-10">
      <div className="mb-6 flex items-center gap-2">
        <PenTool className="h-5 w-5 text-accent" />
        <h2 className="font-serif text-2xl">{isEditing ? '编辑日记' : '记下此刻的想法'}</h2>
      </div>
      <div className="mb-4 flex gap-2 text-sm">
        <button
          type="button"
          onClick={() => setTab('edit')}
          className={`rounded-full px-3 py-1 ${tab === 'edit' ? 'bg-accent text-accent-ink' : 'text-muted'}`}
        >
          编辑
        </button>
        <button
          type="button"
          onClick={() => setTab('preview')}
          className={`rounded-full px-3 py-1 ${tab === 'preview' ? 'bg-accent text-accent-ink' : 'text-muted'}`}
        >
          预览
        </button>
      </div>
      <form ref={formRef} onSubmit={(event) => void onSubmit(event)} className="space-y-5">
        <div>
          <label htmlFor="title" className="mb-2 block text-sm font-semibold">
            标题
          </label>
          <input
            id="title"
            value={title}
            maxLength={TITLE_MAX}
            required
            onChange={(event) => setTitle(event.target.value)}
            placeholder="今天想写点什么？"
            className="w-full rounded-xl border border-rule bg-paper px-4 py-3 font-serif text-lg outline-none focus:border-accent"
          />
        </div>
        {tab === 'edit' ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label htmlFor="content" className="text-sm font-semibold">
                内容
              </label>
              <div className="flex gap-1 text-muted">
                <button
                  type="button"
                  aria-label="加粗"
                  onClick={() => applyMarkup('**')}
                  className="rounded p-1 hover:text-accent"
                >
                  <Bold className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="插入标题"
                  onClick={() => applyMarkup('## ', '')}
                  className="rounded p-1 hover:text-accent"
                >
                  <Heading2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="列表"
                  onClick={() => applyMarkup('- ', '')}
                  className="rounded p-1 hover:text-accent"
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="引用"
                  onClick={() => applyMarkup('> ', '')}
                  className="rounded p-1 hover:text-accent"
                >
                  <Quote className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label="链接"
                  onClick={() => applyMarkup('[', '](https://)')}
                  className="rounded p-1 hover:text-accent"
                >
                  <Link2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <textarea
              id="content"
              ref={textareaRef}
              rows={14}
              required
              maxLength={CONTENT_MAX}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              placeholder="在此记录下今天的点滴..."
              className="ruled w-full resize-y rounded-xl border border-rule bg-paper px-4 py-2 outline-none focus:border-accent"
            />
          </div>
        ) : (
          <div className="min-h-64 rounded-xl border border-rule bg-paper px-4 py-4">
            <Suspense fallback={<p className="text-sm text-muted">正在排版…</p>}>
              <MarkdownView content={content || '还没有内容。'} />
            </Suspense>
          </div>
        )}
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-muted">支持 Markdown · Command 或 Ctrl + Enter 保存</p>
          <button
            type="submit"
            className="rounded-full bg-accent px-8 py-3 text-sm font-semibold text-accent-ink"
          >
            {isEditing ? '保存修改' : '发布日记'}
          </button>
        </div>
      </form>
    </div>
  );
}
