import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, X, Check, Pencil } from 'lucide-react';
import * as api from '../api';

function TodoPanel() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');
  const editInputRef = useRef(null);

  const fetchTodos = useCallback(async () => {
    try {
      const data = await api.get('/todos/');
      setTodos(data);
    } catch (error) {
      console.error('Error fetching todos:', error);
    }
  }, []);

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  useEffect(() => {
    if (editingId !== null && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      await api.post('/todos/', { title: newTodo.trim(), completed: false });
      setNewTodo('');
      setIsAdding(false);
      fetchTodos();
    } catch (error) {
      console.error('Error adding todo:', error);
      window.alert('添加待办失败，请稍后重试。');
    }
  };

  const toggleTodo = async (todo) => {
    if (editingId === todo.id) return;
    // 乐观更新 UI
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, completed: !t.completed } : t)));
    try {
      await api.put(`/todos/${todo.id}`, { completed: !todo.completed });
    } catch (error) {
      console.error('Error updating todo:', error);
      fetchTodos();
    }
  };

  const startEdit = (todo) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  const saveEdit = async (todo) => {
    const trimmed = editingTitle.trim();
    if (!trimmed || trimmed === todo.title) {
      cancelEdit();
      return;
    }
    // 乐观更新 UI
    setTodos((prev) => prev.map((t) => (t.id === todo.id ? { ...t, title: trimmed } : t)));
    setEditingId(null);
    setEditingTitle('');
    try {
      await api.put(`/todos/${todo.id}`, { title: trimmed });
    } catch (error) {
      console.error('Error updating todo:', error);
      fetchTodos();
    }
  };

  const deleteTodo = async (id) => {
    const todo = todos.find((t) => t.id === id);
    if (!window.confirm(`确定要删除 "${todo?.title ?? ''}" 吗？`)) return;
    // 乐观更新 UI
    setTodos((prev) => prev.filter((t) => t.id !== id));
    try {
      await api.del(`/todos/${id}`);
    } catch (error) {
      console.error('Error deleting todo:', error);
      fetchTodos();
    }
  };

  const clearCompleted = async () => {
    const completedTodos = todos.filter((t) => t.completed);
    if (completedTodos.length === 0) return;
    if (!window.confirm(`确定要清除 ${completedTodos.length} 个已完成的待办吗？`)) return;
    // 乐观更新 UI
    setTodos((prev) => prev.filter((t) => !t.completed));
    try {
      await Promise.all(completedTodos.map((t) => api.del(`/todos/${t.id}`)));
    } catch (error) {
      console.error('Error clearing completed todos:', error);
      fetchTodos();
    }
  };

  // 分离完成和未完成的事项，让未完成的排在前面
  const activeTodos = todos.filter((t) => !t.completed);
  const completedTodos = todos.filter((t) => t.completed);
  const displayTodos = [...activeTodos, ...completedTodos];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col mt-6">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-800">待办事项</h3>
        <div className="flex items-center gap-2">
          {completedTodos.length > 0 && (
            <button
              onClick={clearCompleted}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
              title="清除已完成的待办"
            >
              清除已完成
            </button>
          )}
          <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-full">
            {activeTodos.length} 待办
          </span>
        </div>
      </div>

      <div className="flex-1 max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {displayTodos.length === 0 && (
          <div className="text-center py-8 text-gray-400 text-sm">
            还没有待办事项，
            <br />
            添加一个吧！
          </div>
        )}
        {displayTodos.map((todo) => (
          <div
            key={todo.id}
            className="group flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <button
              onClick={() => toggleTodo(todo)}
              className={`flex-shrink-0 mr-3 transition-colors ${
                todo.completed ? 'text-indigo-600' : 'text-gray-300 hover:text-indigo-500'
              }`}
            >
              {todo.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            </button>

            {editingId === todo.id ? (
              <form
                className="flex-1 flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  saveEdit(todo);
                }}
              >
                <input
                  ref={editInputRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') cancelEdit();
                  }}
                  className="flex-1 text-sm border-gray-200 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-2 py-0.5"
                />
                <button
                  type="submit"
                  disabled={!editingTitle.trim()}
                  className="p-1 text-indigo-600 hover:bg-indigo-50 disabled:text-gray-300 disabled:cursor-not-allowed rounded transition-colors"
                  title="保存 (Enter)"
                >
                  <Check size={15} />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded transition-colors"
                  title="取消 (Esc)"
                >
                  <X size={15} />
                </button>
              </form>
            ) : (
              <>
                <span
                  className={`flex-1 text-sm truncate transition-all ${
                    todo.completed
                      ? 'text-gray-400 line-through decoration-gray-300'
                      : 'text-gray-700 cursor-text'
                  }`}
                  onDoubleClick={() => !todo.completed && startEdit(todo)}
                  title={!todo.completed ? '双击编辑' : undefined}
                >
                  {todo.title}
                </span>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!todo.completed && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        startEdit(todo);
                      }}
                      className="text-gray-300 hover:text-indigo-500 p-1.5 hover:bg-indigo-50 rounded-md transition-colors"
                      title="编辑"
                    >
                      <Pencil size={13} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTodo(todo.id);
                    }}
                    className="text-gray-300 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-md transition-colors"
                    title="删除"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-gray-100 bg-gray-50/50">
        {isAdding ? (
          <form onSubmit={handleAddTodo} className="flex gap-2 items-center">
            <input
              type="text"
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              placeholder="输入待办事项..."
              className="flex-1 text-sm border-gray-200 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 px-3 py-2 shadow-sm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setIsAdding(false);
                  setNewTodo('');
                }
              }}
            />
            <button
              type="submit"
              disabled={!newTodo.trim()}
              className="p-2 text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
              title="确认添加 (Enter)"
            >
              <Check size={18} />
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setNewTodo('');
              }}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
              title="取消 (Esc)"
            >
              <X size={18} />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-indigo-600 hover:bg-indigo-50/50 border border-dashed border-gray-300 hover:border-indigo-200 rounded-xl py-2.5 transition-all"
          >
            <Plus size={16} />
            <span>添加新事项</span>
          </button>
        )}
      </div>
    </div>
  );
}

export default TodoPanel;
