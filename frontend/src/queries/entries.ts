import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  createEntry,
  deleteEntry,
  exportEntries,
  getEntry,
  listEntries,
  listEntryDates,
  pinEntry,
  updateEntry,
} from '../api/entries';
import { ApiError } from '../api/client';
import type { DiaryEntry, EntryFilter } from '../api/types';
import { entryKeys } from './keys';

function isUnauthorized(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

function findCachedEntry(client: ReturnType<typeof useQueryClient>, id: number) {
  const lists = client.getQueriesData<DiaryEntry[]>({ queryKey: entryKeys.lists() });
  for (const [, entries] of lists) {
    const found = entries?.find((entry) => entry.id === id);
    if (found) return found;
  }
  return undefined;
}

function sortEntries(entries: DiaryEntry[]) {
  return [...entries].sort((a, b) => {
    if (Boolean(a.is_pinned) !== Boolean(b.is_pinned)) return a.is_pinned ? -1 : 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

export function useEntries(filter: EntryFilter) {
  return useQuery({
    queryKey: entryKeys.list(filter),
    queryFn: async () => {
      const data = await listEntries(filter);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useEntryDates() {
  return useQuery({
    queryKey: entryKeys.dates(),
    queryFn: async () => {
      const data = await listEntryDates();
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useEntry(id: number | null) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: entryKeys.detail(id ?? 0),
    queryFn: () => getEntry(id as number),
    enabled: id !== null,
    placeholderData: () => (id === null ? undefined : findCachedEntry(client, id)),
  });
  const fallback = id === null ? undefined : findCachedEntry(client, id);
  return { ...query, data: query.data ?? fallback };
}

function useInvalidateEntries() {
  const client = useQueryClient();
  return () => client.invalidateQueries({ queryKey: entryKeys.all });
}

export function useCreateEntry() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: createEntry,
    onSuccess: () => {
      void invalidate();
      toast.success('日记已发布');
    },
    onError: (error) => {
      if (isUnauthorized(error)) return;
      toast.error('保存失败，请稍后重试。');
    },
  });
}

export function useUpdateEntry() {
  const client = useQueryClient();
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: ({ id, title, content }: { id: number; title: string; content: string }) =>
      updateEntry(id, { title, content }),
    onSuccess: (saved) => {
      client.setQueryData(entryKeys.detail(saved.id), saved);
      void invalidate();
      toast.success('修改已保存');
    },
    onError: (error) => {
      if (isUnauthorized(error)) return;
      toast.error('保存失败，请稍后重试。');
    },
  });
}

export function useDeleteEntry() {
  const invalidate = useInvalidateEntries();
  return useMutation({
    mutationFn: deleteEntry,
    onSuccess: () => {
      void invalidate();
      toast.success('日记已删除');
    },
    onError: (error) => {
      if (isUnauthorized(error)) return;
      toast.error('删除失败，请稍后重试。');
    },
  });
}

export function usePinEntry() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: pinEntry,
    onMutate: async (id) => {
      await client.cancelQueries({ queryKey: entryKeys.lists() });
      const snapshots = client.getQueriesData<DiaryEntry[]>({ queryKey: entryKeys.lists() });
      snapshots.forEach(([key, entries]) => {
        if (!entries) return;
        client.setQueryData(
          key,
          sortEntries(
            entries.map((entry) =>
              entry.id === id ? { ...entry, is_pinned: !entry.is_pinned } : entry,
            ),
          ),
        );
      });
      const detail = client.getQueryData<DiaryEntry>(entryKeys.detail(id));
      if (detail)
        client.setQueryData(entryKeys.detail(id), { ...detail, is_pinned: !detail.is_pinned });
      return { snapshots, detail };
    },
    onError: (error, id, context) => {
      context?.snapshots.forEach(([key, entries]) => client.setQueryData(key, entries));
      if (context?.detail) client.setQueryData(entryKeys.detail(id), context.detail);
      if (!isUnauthorized(error)) toast.error('操作失败，请稍后重试。');
    },
    onSettled: () => {
      void client.invalidateQueries({ queryKey: entryKeys.all });
    },
  });
}

export function useExportEntries() {
  return useMutation({
    mutationFn: exportEntries,
    onError: (error) => {
      if (isUnauthorized(error)) return;
      toast.error('导出失败，请稍后重试。');
    },
  });
}
