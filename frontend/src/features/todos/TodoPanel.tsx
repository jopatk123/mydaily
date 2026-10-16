import { Check, CheckCircle2, Circle, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Todo } from '../../api/types';
import { useConfirm } from '../../components/ui/ConfirmDialog';
import { notifyMutationError } from '../../queries/notify';
import {
  useAddTodo,
  useClearCompletedTodos,
  useDeleteTodo,
  useTodos,
  useUpdateTodo,
} from '../../queries/todos';

export default function TodoPanel() {
  const confirm = useConfirm();
  const query = useTodos();
  const addTodo = useAddTodo();
  const updateTodo = useUpdateTodo();
  const removeTodo = useDeleteTodo();
  const clearCompletedTodos = useClearCompletedTodos();
  const [isAdding, setIsAdding] = useState(false);
  const [newTodo, setNewTodo] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const todos = query.data ?? [];

  // 加载失败统一走 Toast 提示；401 由数据层清除凭据并跳转登录，此处不再重复提示。
  useEffect(() => {
    if (query.error) notifyMutationError(query.error, '待办加载失败，请稍后重试。');
  }, [query.error]);

  useEffect(() => {
    if (editingId !== null) {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }
  }, [editingId]);

  const activeTodos = todos.filter((todo) => !todo.completed);
  const completedTodos = todos.filter((todo) => todo.completed);
  const displayTodos = [...activeTodos, ...completedTodos];

  const submitNew = async (event: FormEvent) => {
    event.preventDefault();
    const title = newTodo.trim();
    if (!title) return;
    await addTodo.mutateAsync(title);
    setNewTodo('');
    setIsAdding(false);
  };

  const toggleTodo = (todo: Todo) => {
    if (editingId === todo.id) return;
    updateTodo.mutate({ id: todo.id, patch: { completed: !todo.completed } });
  };

  const startEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveEdit = (todo: Todo) => {
    const trimmed = editingTitle.trim();
    if (!trimmed || trimmed === todo.title) {
      cancelEdit();
      return;
    }
    cancelEdit();
    updateTodo.mutate({ id: todo.id, patch: { title: trimmed } });
  };

  const remove = async (todo: Todo) => {
    const ok = await confirm({
      title: '删除待办',
      message: `确定要删除 "${todo.title}" 吗？`,
      confirmLabel: '删除',
      danger: true,
    });
    if (!ok) return;
    removeTodo.mutate(todo.id);
  };

  const clearCompleted = async () => {
    if (completedTodos.length === 0) return;
    const ok = await confirm({
      title: '清除已完成',
      message: `确定要清除 ${completedTodos.length} 个已完成的待办吗？`,
      confirmLabel: '清除',
      danger: true,
    });
    if (!ok) return;
    await clearCompletedTodos.mutateAsync(completedTodos);
  };

  return (
    <section className="flex flex-col overflow-hidden rounded-2xl border border-rule bg-card">
      <div className="flex items-center justify-between border-b border-rule px-5 py-4">
        <h2 className="font-serif text-base font-semibold">待办事项</h2>
        <div className="flex items-center gap-2">
          {completedTodos.length > 0 && (
            <button
              type="button"
              onClick={() => void clearCompleted()}
              className="text-xs text-muted hover:text-danger"
            >
              清除已完成
            </button>
          )}
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            {activeTodos.length} 待办
          </span>
        </div>
      </div>

      <div className="max-h-72 space-y-1 overflow-y-auto p-2">
        {!query.isLoading && displayTodos.length === 0 && (
          <p className="py-8 text-center text-sm text-muted">
            还没有待办事项，
            <br />
            添加一个吧！
          </p>
        )}
        {displayTodos.map((todo) => (
          <div key={todo.id} className="group flex items-center rounded-lg p-2 hover:bg-paper">
            <button
              type="button"
              onClick={() => toggleTodo(todo)}
              aria-label={todo.completed ? '标为未完成' : '标为完成'}
              className={`mr-3 shrink-0 ${todo.completed ? 'text-accent' : 'text-muted hover:text-accent'}`}
            >
              {todo.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            </button>
            {editingId === todo.id ? (
              <form
                className="flex flex-1 items-center gap-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  saveEdit(todo);
                }}
              >
                <input
                  ref={editInputRef}
                  value={editingTitle}
                  onChange={(event) => setEditingTitle(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') cancelEdit();
                  }}
                  className="flex-1 rounded-md border border-rule bg-card px-2 py-0.5 text-sm"
                />
                <button
                  type="submit"
                  disabled={!editingTitle.trim()}
                  title="保存 (Enter)"
                  className="p-1 text-accent"
                >
                  <Check size={15} />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  title="取消 (Esc)"
                  className="p-1 text-muted"
                >
                  <X size={15} />
                </button>
              </form>
            ) : (
              <>
                <span
                  className={`flex-1 truncate text-sm ${todo.completed ? 'text-muted line-through' : 'text-ink'}`}
                  onDoubleClick={() => !todo.completed && startEdit(todo)}
                  title={!todo.completed ? '双击编辑' : undefined}
                >
                  {todo.title}
                </span>
                <div className="flex items-center gap-0.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100">
                  {!todo.completed && (
                    <button
                      type="button"
                      title="编辑"
                      onClick={() => startEdit(todo)}
                      className="rounded-md p-1.5 text-muted hover:text-accent"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    title="删除"
                    onClick={() => void remove(todo)}
                    className="rounded-md p-1.5 text-muted hover:text-danger"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-rule bg-paper/60 p-4">
        {isAdding ? (
          <form onSubmit={(event) => void submitNew(event)} className="flex items-center gap-2">
            <input
              value={newTodo}
              onChange={(event) => setNewTodo(event.target.value)}
              placeholder="输入待办事项..."
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setIsAdding(false);
                  setNewTodo('');
                }
              }}
              className="flex-1 rounded-lg border border-rule bg-card px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={!newTodo.trim()}
              title="确认添加 (Enter)"
              className="rounded-lg bg-accent p-2 text-accent-ink disabled:bg-rule"
            >
              <Check size={18} />
            </button>
            <button
              type="button"
              title="取消 (Esc)"
              onClick={() => {
                setIsAdding(false);
                setNewTodo('');
              }}
              className="rounded-lg p-2 text-muted"
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-rule py-2.5 text-sm text-muted hover:border-accent hover:text-accent"
          >
            <Plus size={16} />
            <span>添加新事项</span>
          </button>
        )}
      </div>
    </section>
  );
}
