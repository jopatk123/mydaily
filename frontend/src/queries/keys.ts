import type { EntryFilter } from '../api/types';

export const entryKeys = {
  all: ['entries'] as const,
  lists: () => ['entries', 'list'] as const,
  list: (filter: EntryFilter) => ['entries', 'list', filter] as const,
  detail: (id: number) => ['entries', 'detail', id] as const,
  dates: () => ['entries', 'dates'] as const,
};

export const todoKeys = {
  all: ['todos'] as const,
};
