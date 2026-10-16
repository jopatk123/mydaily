import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../api/client';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        staleTime: 5_000,
        retry:
          import.meta.env.MODE === 'test'
            ? false
            : (count, error) => {
                if (error instanceof ApiError && (error.status === 401 || error.status === 404))
                  return false;
                return count < 1;
              },
      },
      mutations: { retry: false },
    },
  });
}
