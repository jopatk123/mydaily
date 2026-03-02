import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, X, Check } from 'lucide-react';
import * as api from '../api';

function TodoPanel() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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

  const handleAddTodo = async (e) => {
    e.preventDefault();
    if (!newTodo.trim()) return;

    try {
      await api.post('/todos/', { title: newTodo, completed: false });
      setNewTodo('');
      setIsAdding(false);
      fetchTodos();
    } catch (error) {
      console.error('Error adding todo:', error);
      window.alert('添加待办失败，请稍后重试。');
    }
  };

  const toggleTodo = async (todo) => {
    // 乐观更新 UI
    const updatedTodos = todos.map(t => 
        t.id === todo.id ? { ...t, completed: !t.completed } : t
    );
    setTodos(updatedTodos);

    try {
      await api.put(`/todos/${todo.id}`, { completed: !todo.completed });
    } catch (error) {
      console.error('Error updating todo:', error);
      fetchTodos();
    }
  };

  const deleteTodo = async (id) => {
    const todo = todos.find(t => t.id === id);
    if (!window.confirm(`确定要删除 "${todo?.title ?? ''}" 吗？`)) return;

    try {
      await api.del(`/todos/${id}`);
      setTodos(prev => prev.filter(t => t.id !== id));
    } catch (error) {
      console.error('Error deleting todo:', error);
      window.alert('删除待办失败，请稍后重试。');
    }
  };

  // 分离完成和未完成的事项，让未完成的排在前面
  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);
  const displayTodos = [...activeTodos, ...completedTodos];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col mt-6">
      <div className="p-5 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-800">待办事项</h3>
        <span className="text-xs text-indigo-600 font-medium bg-indigo-50 px-2.5 py-1 rounded-full">
            {activeTodos.length} 待办
        </span>
      </div>

      <div className="flex-1 max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
        {displayTodos.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
                还没有待办事项，<br/>添加一个吧！
            </div>
        )}
        {displayTodos.map((todo) => (
          <div
            key={todo.id}
            className="group flex items-center p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
          >
            <button
              onClick={() => toggleTodo(todo)}
              className={`flex-shrink-0 mr-3 transition-colors ${
                todo.completed ? 'text-indigo-600' : 'text-gray-300 hover:text-indigo-500'
              }`}
            >
              {todo.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
            </button>
            <span
              className={`flex-1 text-sm truncate transition-all ${
                todo.completed ? 'text-gray-400 line-through decoration-gray-300' : 'text-gray-700'
              }`}
            >
              {todo.title}
            </span>
            <button
              onClick={(e) => {
                  e.stopPropagation();
                  deleteTodo(todo.id);
              }}
              className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-50 rounded-md"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
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
