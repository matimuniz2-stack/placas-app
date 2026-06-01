import { get, set, del, keys } from 'idb-keyval';
import type { DesignPreset } from '@/types';

const PRESET_PREFIX = 'preset:';

export async function savePreset(preset: DesignPreset): Promise<void> {
  await set(PRESET_PREFIX + preset.id, preset);
}

export async function deletePreset(id: string): Promise<void> {
  await del(PRESET_PREFIX + id);
}

export async function listPresets(): Promise<DesignPreset[]> {
  const allKeys = await keys();
  const presetKeys = allKeys.filter((k) => typeof k === 'string' && k.startsWith(PRESET_PREFIX));
  const out: DesignPreset[] = [];
  for (const k of presetKeys) {
    const p = await get(k);
    if (p) out.push(p as DesignPreset);
  }
  return out.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
}
