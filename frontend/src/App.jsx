import { useRef, useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, Book, PenTool, X, Search, ChevronLeft, ChevronRight, Download, Pencil, Lock } from 'lucide-react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

// 使用相对路径，适配单体部署
const API_URL = '';
const AUTH_PASSWORD = import.meta.env.VITE_APP_PASSWORD || 'asd123123123';
const AUTH_STORAGE_KEY = 'mydaily_auth';
const AUTH_VALID_DAYS = 30;
const AUTH_VALID_MS = AUTH_VALID_DAYS * 24 * 60 * 60 * 1000;

const getStoredAuth = () => {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.expiresAt && Number(parsed.expiresAt) > Date.now()) {
      return parsed;
    }
  } catch (error) {
    console.warn('Invalid auth cache', error);
  }
  localStorage.removeItem(AUTH_STORAGE_KEY);
  return null;
};

function App() {
  const [entries, setEntries] = useState([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [calendarMonth, setCalendarMonth] = useState(() => new Date());
  const [markedDates, setMarkedDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null); // yyyy-MM-dd
  const [isLoadingEntries, setIsLoadingEntries] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isAuthed, setIsAuthed] = useState(() => Boolean(getStoredAuth()));
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const lastFetchSeq = useRef(0);
  const isEditing = editingEntryId !== null;

  useEffect(() => {
    if (!isAuthed) return;
    fetchMarkedDates();
  }, [isAuthed]);

  useEffect(() => {
    if (!isAuthed) return;
    const q = searchQuery.trim();
    const handle = window.setTimeout(() => {
      fetchEntries({ q: q || null, date: selectedDate });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [searchQuery, selectedDate, isAuthed]);

  const fetchEntries = async ({ q = null, date = null } = {}) => {
    const fetchSeq = ++lastFetchSeq.current;
    setIsLoadingEntries(true);
    try {
      const url = q
        ? `${API_URL}/entries/search/?q=${encodeURIComponent(q)}${date ? `&date=${encodeURIComponent(date)}` : ''}`
        : `${API_URL}/entries/${date ? `?date=${encodeURIComponent(date)}` : ''}`;

      const response = await fetch(url);
      const data = await response.json();
      if (fetchSeq === lastFetchSeq.current) {
        setEntries(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching entries:', error);
      if (fetchSeq === lastFetchSeq.current) {
        setEntries([]);
      }
    } finally {
      if (fetchSeq === lastFetchSeq.current) {
        setIsLoadingEntries(false);
      }
    }
  };

  const fetchMarkedDates = async () => {
    try {
      const response = await fetch(`${API_URL}/entries/dates/`);
      const data = await response.json();
      setMarkedDates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching marked dates:', error);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!isAuthed) return;
    const q = searchQuery.trim();
    fetchEntries({ q: q || null, date: selectedDate });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthed) return;
    try {
      const endpoint = isEditing ? `${API_URL}/entries/${editingEntryId}` : `${API_URL}/entries/`;
      const response = await fetch(endpoint, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });
      if (response.ok) {
        setTitle('');
        setContent('');
        setIsCreating(false);
        setEditingEntryId(null);
        setSearchQuery('');
        fetchEntries({ q: null, date: selectedDate });
        fetchMarkedDates();
      }
    } catch (error) {
      console.error('Error saving entry:', error);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这篇日记吗？')) return;
    try {
      await fetch(`${API_URL}/entries/${id}`, {
        method: 'DELETE',
      });
      fetchEntries({ q: searchQuery.trim() || null, date: selectedDate });
      fetchMarkedDates();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  };

  const handleExportAll = async () => {
    if (!isAuthed || isExporting) return;
    setIsExporting(true);
    try {
      const response = await fetch(`${API_URL}/entries/export/`);
      if (!response.ok) throw new Error('Export failed');
      const data = await response.json();
      const formatted = JSON.stringify(data, null, 2);
      const blob = new Blob([formatted], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = format(new Date(), 'yyyyMMdd');
      link.href = url;
      link.download = `mydaily-export-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting entries:', error);
      window.alert('导出失败，请稍后重试。');
    } finally {
      setIsExporting(false);
    }
  };

  const startCreate = () => {
    setEditingEntryId(null);
    setTitle('');
    setContent('');
    setIsCreating(true);
  };

  const startEdit = (entry) => {
    setEditingEntryId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setIsCreating(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelCompose = () => {
    setIsCreating(false);
    setEditingEntryId(null);
    setTitle('');
    setContent('');
  };

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    if (passwordInput === AUTH_PASSWORD) {
      const payload = { expiresAt: Date.now() + AUTH_VALID_MS };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload));
      setIsAuthed(true);
      setPasswordInput('');
      setAuthError('');
    } else {
      setAuthError('密码不正确，请重试。');
    }
  };

  const markedDateSet = new Set(markedDates);

  const handleSelectDate = (day) => {
    const dayIso = format(day, 'yyyy-MM-dd');
    setSelectedDate((prev) => (prev === dayIso ? null : dayIso));

    // 如果点的是上/下月的格子，顺便切换月份，交互更直观
    if (!isSameMonth(day, calendarMonth)) {
      setCalendarMonth(day);
    }
  };


  const renderCalendar = () => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    // ... Calendar code remains same ...
    const days = [];
    let day = gridStart;
    while (day <= gridEnd) {
      const dayForCell = day;
      const dayIso = format(dayForCell, 'yyyy-MM-dd');
      const inMonth = isSameMonth(dayForCell, monthStart);
      const isMarked = markedDateSet.has(dayIso);
      const today = isToday(dayForCell);
      const selected = selectedDate === dayIso;

      days.push(
        <div key={dayIso} className="flex justify-center">
          <div className="relative w-9 h-9">
            <button
              type="button"
              onClick={() => handleSelectDate(dayForCell)}
              className={[
                'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                selected
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : inMonth
                    ? 'text-gray-800 hover:bg-indigo-50'
                    : 'text-gray-300 hover:bg-gray-50',
                today && !selected ? 'ring-2 ring-indigo-200' : '',
              ].join(' ')}
              title={dayIso}
              aria-label={`选择日期 ${dayIso}`}
              aria-pressed={selected}
            >
              {format(dayForCell, 'd')}
            </button>
            {isMarked && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-600" />
              </div>
            )}
          </div>
        </div>
      );

      day = addDays(day, 1);
    }

    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setCalendarMonth((d) => subMonths(d, 1))}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
              aria-label="上个月"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="text-sm font-bold text-gray-800">
              {format(calendarMonth, 'yyyy年MM月', { locale: zhCN })}
            </div>
            <button
              type="button"
              onClick={() => setCalendarMonth((d) => addMonths(d, 1))}
              className="p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
              aria-label="下个月"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mt-4 text-xs font-semibold text-gray-400">
            {['一', '二', '三', '四', '五', '六', '日'].map((w) => (
              <div key={w} className="text-center">{w}</div>
            ))}
          </div>

          {selectedDate && (
            <div className="mt-3 flex items-center justify-between">
              <div className="text-xs font-medium text-gray-500">
                已选：{format(parseISO(selectedDate), 'MM月dd日', { locale: zhCN })}
              </div>
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                显示全部
              </button>
            </div>
          )}
        </div>

        <div className="p-4">
          <div className="grid grid-cols-7 gap-1">{days}</div>
        </div>
      </div>
    );
  };
  
  // Skeleton Loader Component
  const EntrySkeleton = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:px-8 py-6 shadow-sm animate-pulse space-y-4">
      <div className="flex justify-between items-start">
        <div className="space-y-2 w-3/4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-4 bg-gray-100 rounded w-1/4"></div>
        </div>
      </div>
      <div className="space-y-2 pt-2">
        <div className="h-4 bg-gray-100 rounded w-full"></div>
        <div className="h-4 bg-gray-100 rounded w-full"></div>
        <div className="h-4 bg-gray-100 rounded w-2/3"></div>
      </div>
    </div>
  );

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 shadow-lg p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-indigo-600 p-2 rounded-lg shadow">
              <Lock className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">MyDaily</h1>
              <p className="text-sm text-gray-500">请输入密码继续</p>
            </div>
          </div>
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-1">密码</label>
              <input
                id="password"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-3 border transition-colors"
                placeholder="请输入访问密码"
                required
              />
            </div>
            {authError && (
              <p className="text-sm text-red-500 font-medium">{authError}</p>
            )}
            <button
              type="submit"
              className="w-full inline-flex items-center justify-center px-6 py-2.5 border border-transparent text-sm font-semibold rounded-full shadow-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            >
              进入
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className={`mx-auto transition-all duration-300 ${isCreating ? 'max-w-4xl' : 'max-w-6xl'}`}>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {!isCreating && (
            <aside className="lg:w-80 flex-shrink-0 space-y-6 lg:sticky lg:top-8 z-10">
              {renderCalendar()}
            </aside>
          )}

          <main className="flex-1 w-full min-w-0">
            <header className="flex justify-between items-center mb-8 border-b border-gray-200 pb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-indigo-600 p-2 rounded-lg shadow-lg">
                  <Book className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">MyDaily</h1>
                  <p className="text-sm text-gray-500 mt-1 font-medium">写下你的每一天</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {!isCreating && (
                  <button
                    onClick={handleExportAll}
                    disabled={isExporting}
                    className="hidden lg:inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500 disabled:opacity-60"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isExporting ? '导出中...' : '导出所有日记'}
                  </button>
                )}
                <button
                  onClick={() => (isCreating ? cancelCompose() : startCreate())}
                  className={`inline-flex items-center px-5 py-2.5 rounded-full text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                    isCreating 
                      ? 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 focus:ring-gray-500' 
                      : 'text-white bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500'
                  }`}
                >
                  {isCreating ? (
                    <><X className="h-4 w-4 mr-2" /> {isEditing ? '取消编辑' : '取消'}</>
                  ) : (
                    <><Plus className="h-4 w-4 mr-2" /> 新建日记</>
                  )}
                </button>
              </div>
            </header>


            {!isCreating && (
              <>
                <form onSubmit={handleSearch} className="mb-8">
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                    <div className="flex gap-3">
                      <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pl-11 pr-4 py-3 border transition-colors"
                          placeholder="搜索标题或内容..."
                          aria-label="搜索"
                        />
                      </div>
                      <button
                        type="submit"
                        className="inline-flex items-center px-5 py-3 rounded-xl text-sm font-semibold shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                      >
                        搜索
                      </button>
                    </div>
                  </div>
                </form>

                {(selectedDate || searchQuery.trim()) && (
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    {selectedDate && (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        日期：{format(parseISO(selectedDate), 'yyyy年MM月dd日', { locale: zhCN })}
                        <button
                          type="button"
                          onClick={() => setSelectedDate(null)}
                          className="text-indigo-700/70 hover:text-indigo-800"
                          aria-label="清除日期筛选"
                          title="清除日期筛选"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                    {searchQuery.trim() && (
                      <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-50 text-gray-700 text-xs font-semibold">
                        关键词：{searchQuery.trim()}
                        <button
                          type="button"
                          onClick={() => setSearchQuery('')}
                          className="text-gray-500 hover:text-gray-700"
                          aria-label="清除搜索关键词"
                          title="清除搜索关键词"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}

            {isCreating && (
              <div className="bg-white rounded-2xl shadow-xl border border-gray-100 mb-10 overflow-hidden transform transition-all animate-in fade-in slide-in-from-top-4">
                <div className="p-6 sm:p-10">
                  <div className="flex items-center space-x-2 mb-8">
                    <PenTool className="h-6 w-6 text-indigo-500" />
                    <h2 className="text-2xl font-bold text-gray-800">
                      {isEditing ? '编辑日记' : '记下此刻的想法'}
                    </h2>
                  </div>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">标题</label>
                      <input
                        type="text"
                        id="title"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-lg p-4 border transition-colors"
                        placeholder="今天想写点什么？"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="content" className="block text-sm font-semibold text-gray-700 mb-2">内容</label>
                      <textarea
                        id="content"
                        rows={15}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="block w-full rounded-xl border-gray-200 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base p-4 border transition-colors resize-none leading-relaxed"
                        placeholder="在此记录下今天的点滴..."
                        required
                      />
                    </div>
                    <div className="flex justify-end pt-4">
                      <button
                        type="submit"
                        className="inline-flex items-center px-8 py-3 border border-transparent text-base font-semibold rounded-full shadow-md text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
                      >
                        {isEditing ? '保存修改' : '发布日记'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}


            {!isCreating && (
              <div className="space-y-8">
                {isLoadingEntries && (
                   <div className="space-y-6">
                     <EntrySkeleton />
                     <EntrySkeleton /> 
                   </div>
                )}
                {!isLoadingEntries && entries.length > 0 ? (
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
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(entry)}
                              className="p-2 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                              title="编辑日记"
                              aria-label="编辑日记"
                            >
                              <Pencil className="h-5 w-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(entry.id)}
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 lg:opacity-0 lg:group-hover:opacity-100 focus:opacity-100"
                              title="删除日记"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="prose prose-sm prose-indigo max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap font-medium">
                            {entry.content}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))
                ) : !isLoadingEntries && (
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
                      onClick={() => startCreate()}
                      className="mt-4 text-indigo-600 font-semibold hover:text-indigo-700 transition-colors"
                    >
                      马上动笔 →
                    </button>
                  </div>
                )}
              </div>
            )}
            
            <footer className="mt-20 text-center text-gray-400 text-sm pb-10">
              <p>© {new Date().getFullYear()} MyDaily · 记录生活每一刻</p>
            </footer>

            {/* Mobile Floating Action Button */}
            {!isCreating && (
              <button
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  startCreate();
                }}
                className="lg:hidden fixed bottom-6 right-6 p-4 rounded-full bg-indigo-600 text-white shadow-xl hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all z-50 active:scale-95"
                aria-label="新建日记"
              >
                <Plus className="h-6 w-6" />
              </button>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;

