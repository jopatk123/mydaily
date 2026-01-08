import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Book, PenTool, X } from 'lucide-react';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

const API_URL = 'http://localhost:8000';

function App() {
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const response = await fetch(`${API_URL}/entries/`);
      const data = await response.json();
      setEntries(data);
    } catch (error) {
      console.error('Error fetching entries:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/entries/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });
      if (response.ok) {
        setTitle('');
        setContent('');
        setIsCreating(false);
        fetchEntries();
      }
    } catch (error) {
      console.error('Error creating entry:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这篇日记吗？')) return;
    try {
      await fetch(`${API_URL}/entries/${id}`, {
        method: 'DELETE',
      });
      fetchEntries();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto">
        <header className="flex justify-between items-center mb-12 border-b border-gray-200 pb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
              <Book className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">MyDaily</h1>
              <p className="text-sm text-gray-500 mt-1 font-medium">写下你的每一天</p>
            </div>
          </div>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className={`inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isCreating 
                ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500' 
                : 'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
            }`}
          >
            {isCreating ? (
              <><X className="h-4 w-4 mr-2" /> 取消</>
            ) : (
              <><Plus className="h-4 w-4 mr-2" /> 新建日记</>
            )}
          </button>
        </header>

        {isCreating && (
          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-10 overflow-hidden transform transition-all animate-in fade-in slide-in-from-top-4">
            <div className="p-6 sm:p-8">
              <div className="flex items-center space-x-2 mb-6">
                <PenTool className="h-5 w-5 text-indigo-500" />
                <h2 className="text-lg font-bold text-gray-800">记下此刻的想法</h2>
              </div>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-1">标题</label>
                  <input
                    type="text"
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border transition-colors"
                    placeholder="今天想写点什么？"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-1">内容</label>
                  <textarea
                    id="content"
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border transition-colors resize-none"
                    placeholder="在此记录下今天的点滴..."
                    required
                  />
                </div>
                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-full shadow-md text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                  >
                    发布日记
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="space-y-8">
          {entries.length > 0 ? (
            entries.map((entry) => (
              <article key={entry.id} className="group bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
                <div className="p-6 sm:px-8 py-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors tracking-wide">{entry.title}</h3>
                      <div className="flex items-center text-xs font-medium text-gray-400">
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        {format(new Date(entry.created_at), 'yyyy年MM月dd日 HH:mm', { locale: zhCN })}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200"
                      title="删除日记"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="mt-5">
                    <div className="prose prose-sm prose-indigo max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">
                      {entry.content}
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : !isCreating && (
            <div className="text-center py-20 bg-white rounded-2xl border-2 border-dashed border-gray-200 shadow-inner">
              <div className="inline-flex items-center justify-center p-4 bg-indigo-50 rounded-full mb-4">
                <PenTool className="h-8 w-8 text-indigo-300" />
              </div>
              <p className="text-gray-400 text-lg font-medium">还没有日记呢。开始写下第一篇吧！</p>
              <button
                onClick={() => setIsCreating(true)}
                className="mt-4 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
              >
                马上动笔 →
              </button>
            </div>
          )}
        </div>
        
        <footer className="mt-20 text-center text-gray-400 text-sm pb-10">
          <p>© {new Date().getFullYear()} MyDaily · 记录生活每一刻</p>
        </footer>
      </div>
    </div>
  );
}

export default App;

