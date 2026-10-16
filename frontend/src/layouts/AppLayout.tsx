import { format } from 'date-fns';
import { BookOpen, Download, Monitor, Moon, Plus, Sun, X } from 'lucide-react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { clearAuth, getStoredAuth, subscribeAuth } from '../api/auth';
import CalendarPanel from '../features/calendar/CalendarPanel';
import { themeLabel, useTheme } from '../features/theme/ThemeProvider';
import TodoPanel from '../features/todos/TodoPanel';
import { downloadJson } from '../lib/download';
import { useExportEntries } from '../queries/entries';

function ThemeIcon({ preference }: { preference: 'system' | 'light' | 'dark' }) {
  if (preference === 'light') return <Sun className="h-4 w-4" />;
  if (preference === 'dark') return <Moon className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

export default function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { preference, cycle } = useTheme();
  const exportEntries = useExportEntries();
  const isCreate = location.pathname === '/new';
  const isEdit = location.pathname.endsWith('/edit');
  const isDetail = /^\/diary\/[^/]+$/.test(location.pathname);
  const focus = isCreate || isEdit || isDetail;
  const onList = location.pathname === '/';

  useEffect(() => {
    return subscribeAuth(() => {
      if (!getStoredAuth()) queryClient.clear();
    });
  }, [queryClient]);

  const onExport = async () => {
    const data = await exportEntries.mutateAsync();
    downloadJson(data, `mydaily-export-${format(new Date(), 'yyyyMMdd')}.json`);
  };

  const logout = () => {
    clearAuth();
    queryClient.clear();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className={`mx-auto ${focus ? 'max-w-3xl' : 'max-w-6xl'}`}>
        <div className="flex flex-col items-start gap-8 lg:flex-row">
          {!focus && (
            <aside className="z-10 w-full space-y-6 lg:sticky lg:top-8 lg:w-80 lg:shrink-0">
              <CalendarPanel />
              <TodoPanel />
            </aside>
          )}
          <main className="w-full min-w-0 flex-1">
            <header className="mb-8 flex items-center justify-between gap-4 border-b border-rule pb-6">
              <Link to="/" className="flex items-center gap-3">
                <span className="rounded-lg bg-accent p-2 text-accent-ink shadow-sm">
                  <BookOpen className="h-6 w-6" />
                </span>
                <span>
                  <span className="block font-serif text-3xl leading-none">MyDaily</span>
                  <span className="mt-1 block text-sm text-muted">写下你的每一天</span>
                </span>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={cycle}
                  className="rounded-full border border-rule p-2 text-muted hover:text-ink"
                  aria-label={`主题：${themeLabel(preference)}，点击切换`}
                  title={themeLabel(preference)}
                >
                  <ThemeIcon preference={preference} />
                </button>
                {onList && (
                  <button
                    type="button"
                    onClick={() => void onExport()}
                    disabled={exportEntries.isPending}
                    className="hidden items-center rounded-full border border-rule bg-card px-4 py-2 text-sm font-semibold lg:inline-flex"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {exportEntries.isPending ? '导出中...' : '导出所有日记'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate(isCreate || isEdit ? '/' : '/new')}
                  className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold ${
                    isCreate || isEdit
                      ? 'border border-rule bg-card text-ink'
                      : 'bg-accent text-accent-ink'
                  }`}
                >
                  {isCreate || isEdit ? (
                    <>
                      <X className="mr-1 h-4 w-4" />
                      {isEdit ? '取消编辑' : '取消'}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-1 h-4 w-4" />
                      新建日记
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="hidden text-sm text-muted hover:text-ink sm:inline"
                >
                  退出
                </button>
              </div>
            </header>
            <Outlet />
            <footer className="mt-16 pb-10 text-center text-sm text-muted">
              <p>© {new Date().getFullYear()} MyDaily · 记录生活每一刻</p>
            </footer>
            {onList && (
              <button
                type="button"
                onClick={() => navigate('/new')}
                aria-label="新建日记"
                className="fixed right-6 bottom-6 rounded-full bg-accent p-4 text-accent-ink shadow-lg lg:hidden"
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
