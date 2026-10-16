const DRAFT_KEY = 'mydaily_draft_new';

export interface EntryDraft {
  title: string;
  content: string;
}

export function readDraft(): EntryDraft | null {
  const raw = localStorage.getItem(DRAFT_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as EntryDraft;
    if (typeof parsed.title !== 'string' || typeof parsed.content !== 'string') return null;
    if (!parsed.title.trim() && !parsed.content.trim()) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeDraft(draft: EntryDraft) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  localStorage.removeItem(DRAFT_KEY);
}
