import { get, set, del, keys } from 'idb-keyval';
import type { Draft } from '@/types';

const DRAFT_PREFIX = 'draft:';

export async function saveDraft(draft: Draft): Promise<void> {
  await set(DRAFT_PREFIX + draft.id, draft);
}

export async function loadDraft(id: string): Promise<Draft | undefined> {
  return get(DRAFT_PREFIX + id);
}

export async function deleteDraft(id: string): Promise<void> {
  await del(DRAFT_PREFIX + id);
}

export async function listDrafts(): Promise<Draft[]> {
  const allKeys = await keys();
  const draftKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(DRAFT_PREFIX));
  const out: Draft[] = [];
  for (const k of draftKeys) {
    const d = await get(k);
    if (d) out.push(d as Draft);
  }
  return out.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}

const LAST_KEY = 'last_state';
export async function saveLastState(state: any): Promise<void> {
  await set(LAST_KEY, state);
}
export async function loadLastState(): Promise<any> {
  return get(LAST_KEY);
}
