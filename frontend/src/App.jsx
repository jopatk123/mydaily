import { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import AuthScreen from './components/AuthScreen';
import CalendarPanel from './components/CalendarPanel';
import TodoPanel from './components/TodoPanel';
import EntryForm from './components/EntryForm';
import EntryList from './components/EntryList';
import FilterChips from './components/FilterChips';
import HeaderBar from './components/HeaderBar';
import MobileFab from './components/MobileFab';
import SearchBar from './components/SearchBar';
import * as api from './api';

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
  const [isAuthed, setIsAuthed] = useState(() => Boolean(api.getStoredAuth()));
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const lastFetchSeq = useRef(0);
  const isEditing = editingEntryId !== null;

  const handleAuthExpired = useCallback(() => {
    api.clearAuth();
    setIsAuthed(false);
  }, []);

  const fetchEntries = useCallback(async ({ q = null, date = null } = {}) => {
    const fetchSeq = ++lastFetchSeq.current;
    setIsLoadingEntries(true);
    try {
      const path = q
        ? `/entries/search/?q=${encodeURIComponent(q)}${date ? `&date=${encodeURIComponent(date)}` : ''}`
        : `/entries/${date ? `?date=${encodeURIComponent(date)}` : ''}`;

      const data = await api.get(path);
      if (fetchSeq === lastFetchSeq.current) {
        setEntries(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      if (error.status === 401) return handleAuthExpired();
      console.error('Error fetching entries:', error);
      if (fetchSeq === lastFetchSeq.current) {
        setEntries([]);
      }
    } finally {
      if (fetchSeq === lastFetchSeq.current) {
        setIsLoadingEntries(false);
      }
    }
  }, [handleAuthExpired]);

  const fetchMarkedDates = useCallback(async () => {
    try {
      const data = await api.get('/entries/dates/');
      setMarkedDates(Array.isArray(data) ? data : []);
    } catch (error) {
      if (error.status === 401) return handleAuthExpired();
      console.error('Error fetching marked dates:', error);
    }
  }, [handleAuthExpired]);

  useEffect(() => {
    if (!isAuthed) return;
    fetchMarkedDates();
  }, [isAuthed, fetchMarkedDates]);

  useEffect(() => {
    if (!isAuthed) return;
    const q = searchQuery.trim();
    const handle = window.setTimeout(() => {
      fetchEntries({ q: q || null, date: selectedDate });
    }, 250);

    return () => window.clearTimeout(handle);
  }, [searchQuery, selectedDate, isAuthed, fetchEntries]);

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
      if (isEditing) {
        await api.put(`/entries/${editingEntryId}`, { title, content });
      } else {
        await api.post('/entries/', { title, content });
      }
      setTitle('');
      setContent('');
      setIsCreating(false);
      setEditingEntryId(null);
      setSearchQuery('');
      fetchEntries({ q: null, date: selectedDate });
      fetchMarkedDates();
    } catch (error) {
      if (error.status === 401) return handleAuthExpired();
      console.error('Error saving entry:', error);
      window.alert('保存失败，请稍后重试。');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('确定要删除这篇日记吗？')) return;
    try {
      await api.del(`/entries/${id}`);
      fetchEntries({ q: searchQuery.trim() || null, date: selectedDate });
      fetchMarkedDates();
    } catch (error) {
      if (error.status === 401) return handleAuthExpired();
      console.error('Error deleting entry:', error);
      window.alert('删除失败，请稍后重试。');
    }
  };

  const handlePin = async (id) => {
    try {
      const updated = await api.pinEntry(id);
      setEntries((prev) =>
        prev
          .map((e) => (e.id === id ? updated : e))
          .sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
            return new Date(b.created_at) - new Date(a.created_at);
          })
      );
    } catch (error) {
      if (error.status === 401) return handleAuthExpired();
      console.error('Error pinning entry:', error);
      window.alert('操作失败，请稍后重试。');
    }
  };

  const handleExportAll = async () => {
    if (!isAuthed || isExporting) return;
    setIsExporting(true);
    try {
      const data = await api.get('/entries/export/');
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
      if (error.status === 401) return handleAuthExpired();
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

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const { token } = await api.login(passwordInput);
      api.storeAuth(token);
      setIsAuthed(true);
      setPasswordInput('');
    } catch (error) {
      setAuthError(error.message || '密码不正确，请重试。');
    }
  };

  const markedDateSet = useMemo(() => new Set(markedDates), [markedDates]);

  if (!isAuthed) {
    return (
      <AuthScreen
        passwordInput={passwordInput}
        setPasswordInput={setPasswordInput}
        authError={authError}
        handleAuthSubmit={handleAuthSubmit}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className={`mx-auto transition-all duration-300 ${isCreating ? 'max-w-4xl' : 'max-w-6xl'}`}>
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {!isCreating && (
            <aside className="lg:w-80 flex-shrink-0 space-y-6 lg:sticky lg:top-8 z-10">
              <CalendarPanel
                calendarMonth={calendarMonth}
                setCalendarMonth={setCalendarMonth}
                markedDateSet={markedDateSet}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
              />
              <TodoPanel />
            </aside>
          )}

          <main className="flex-1 w-full min-w-0">
            <HeaderBar
              isCreating={isCreating}
              isEditing={isEditing}
              onToggleCreate={() => (isCreating ? cancelCompose() : startCreate())}
              onExportAll={handleExportAll}
              isExporting={isExporting}
            />


            {!isCreating && (
              <>
                <SearchBar
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  handleSearch={handleSearch}
                />

                <FilterChips
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                />
              </>
            )}

            {isCreating && (
              <EntryForm
                isEditing={isEditing}
                title={title}
                setTitle={setTitle}
                content={content}
                setContent={setContent}
                handleSubmit={handleSubmit}
              />
            )}


            {!isCreating && (
              <EntryList
                entries={entries}
                isLoadingEntries={isLoadingEntries}
                selectedDate={selectedDate}
                searchQuery={searchQuery}
                onEdit={startEdit}
                onDelete={handleDelete}
                onPin={handlePin}
                onCreate={startCreate}
              />
            )}
            
            <footer className="mt-20 text-center text-gray-400 text-sm pb-10">
              <p>© {new Date().getFullYear()} MyDaily · 记录生活每一刻</p>
            </footer>

            {/* Mobile Floating Action Button */}
            {!isCreating && (
              <MobileFab
                onCreate={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                  startCreate();
                }}
              />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;

