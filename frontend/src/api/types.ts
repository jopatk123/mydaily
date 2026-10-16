export interface DiaryEntry {
  id: number;
  title: string;
  content: string;
  created_at: string;
  updated_at?: string;
  is_pinned?: boolean;
  pinned_at?: string | null;
}

export interface Todo {
  id: number;
  title: string;
  completed: boolean;
  created_at?: string;
}

export interface EntryFilter {
  q: string;
  date: string | null;
}

export function isDiaryEntry(value: unknown): value is DiaryEntry {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const entry = value as Partial<DiaryEntry>;
  return (
    typeof entry.id === 'number' &&
    typeof entry.title === 'string' &&
    typeof entry.content === 'string'
  );
}
