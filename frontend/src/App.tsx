import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Toaster } from 'sonner';
import { ConfirmProvider } from './components/ui/ConfirmDialog';
import { ThemeProvider, useTheme } from './features/theme/ThemeProvider';
import { createQueryClient } from './queries/client';
import AppRouter from './router';

function ThemedToaster() {
  const { isDark } = useTheme();
  return <Toaster theme={isDark ? 'dark' : 'light'} position="top-center" richColors closeButton />;
}

export default function App() {
  const [client] = useState(createQueryClient);
  return (
    <QueryClientProvider client={client}>
      <ThemeProvider>
        <ConfirmProvider>
          <AppRouter />
          <ThemedToaster />
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
