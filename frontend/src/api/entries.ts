import { del, get, patch, post, put, withTimeZone } from './client';
import { isDiaryEntry, type DiaryEntry, type EntryFilter } from './types';

export function listEntries(filter: EntryFilter) {
  const q = filter.q.trim();
  if (q) {
    const params = new URLSearchParams({ q });
    if (filter.date) params.set('date', filter.date);
    return get<DiaryEntry[]>(withTimeZone(`/entries/search/?${params.toString()}`));
  }
  const params = new URLSearchParams();
  if (filter.date) params.set('date', filter.date);
  const query = params.toString();
  return get<DiaryEntry[]>(withTimeZone(`/entries/${query ? `?${query}` : ''}`));
}

export function listEntryDates() {
  return get<string[]>(withTimeZone('/entries/dates/'));
}

export async function getEntry(id: number) {
  const data = await get<unknown>(`/entries/${id}`);
  if (!isDiaryEntry(data)) {
    throw new Error('日记数据无效');
  }
  return data;
}

export function createEntry(input: { title: string; content: string }) {
  return post<DiaryEntry>('/entries/', input);
}

export function updateEntry(id: number, input: { title: string; content: string }) {
  return put<DiaryEntry>(`/entries/${id}`, input);
}

export function deleteEntry(id: number) {
  return del<{ ok: boolean }>(`/entries/${id}`);
}

export function pinEntry(id: number) {
  return patch<DiaryEntry>(`/entries/${id}/pin`);
}

export function exportEntries() {
  return get<DiaryEntry[]>('/entries/export/');
}
