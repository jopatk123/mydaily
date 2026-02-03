import { useRef, useState, useEffect } from 'react';
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
              <TodoPanel apiUrl={API_URL} />
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

