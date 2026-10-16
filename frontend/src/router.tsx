import { useState, useSyncExternalStore } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import { getStoredAuth, subscribeAuth } from './api/auth';
import LoginPage from './features/auth/LoginPage';
import EntryDetailPage from './features/entries/EntryDetailPage';
import EntryEditorPage from './features/entries/EntryEditorPage';
import EntryListPage from './features/entries/EntryListPage';
import AppLayout from './layouts/AppLayout';

export const APP_ROUTE_PATHS = ['/login', '/', '/new', '/diary/:id', '/diary/:id/edit'] as const;

function RequireAuth() {
  const auth = useSyncExternalStore(subscribeAuth, getStoredAuth, () => null);
  if (!auth) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-paper text-ink">
      <p className="font-serif text-3xl">这一页是空白的</p>
      <a href="/" className="text-accent">
        回到今天
      </a>
    </div>
  );
}

export function createAppRouter() {
  return createBrowserRouter([
    { path: '/login', element: <LoginPage /> },
    {
      element: <RequireAuth />,
      children: [
        {
          element: <AppLayout />,
          children: [
            { path: '/', element: <EntryListPage /> },
            { path: '/new', element: <EntryEditorPage /> },
            { path: '/diary/:id', element: <EntryDetailPage /> },
            { path: '/diary/:id/edit', element: <EntryEditorPage /> },
          ],
        },
      ],
    },
    { path: '*', element: <NotFoundPage /> },
  ]);
}

export default function AppRouter() {
  const [router] = useState(createAppRouter);
  return <RouterProvider router={router} />;
}
