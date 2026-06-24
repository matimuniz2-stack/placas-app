import { get } from 'idb-keyval';
import { usePlacaStore, setCoverPhoto } from './store';
import { thumbnail } from './imgThumb';

export interface PickCoverResult {
  coverIdx: number;
  reason?: string;
}

// Botón "Elegir portada con IA": manda las primeras ~12 fotos (thumbnails chicos) a
// Claude, que elige la del FRENTE/fachada; reordena para que quede de portada (índice 0).
// Lanza Error('NO_API_KEY') si falta la key; Error con mensaje si la API falla.
export async function pickCoverWithAI(): Promise<PickCoverResult> {
  const apiKey = (await get<string>('anthropic_api_key')) || '';
  if (!apiKey.trim()) throw new Error('NO_API_KEY');

  const photos = usePlacaStore.getState().photos;
  if (photos.length < 2) return { coverIdx: 0, reason: 'Hay una sola foto.' };

  // Solo las primeras 12 (la portada suele estar entre las primeras), en thumbnails chicos.
  const subset = photos.slice(0, 12);
  const payload = await Promise.all(subset.map(async (p, idx) => ({ idx, image: await thumbnail(p.url) })));

  const res = await fetch('/api/pickCover', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: apiKey.trim(), photos: payload }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j.detail || j.error || '';
    } catch {
      /* ignore */
    }
    throw new Error(`No se pudo elegir portada (${res.status}). ${detail}`.trim());
  }

  const out = (await res.json()) as any;
  const coverIdx = Number.isInteger(out.coverIdx) ? out.coverIdx : 0;
  if (coverIdx > 0) setCoverPhoto(coverIdx); // reordena: portada al índice 0
  return { coverIdx, reason: out.reason };
}
