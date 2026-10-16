import { QueryClientProvider } from '@tanstack/react-query';
import { render, type RenderOptions } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { ConfirmProvider } from '../components/ui/ConfirmDialog';
import { createQueryClient } from '../queries/client';

export function renderWithProviders(ui: ReactElement, options?: RenderOptions) {
  const client = createQueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        <ConfirmProvider>{children}</ConfirmProvider>
      </QueryClientProvider>
    );
  }
  return render(ui, { wrapper: Wrapper, ...options });
}
