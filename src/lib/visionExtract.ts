import { get } from 'idb-keyval';
import type { ExtractedListing } from './urlExtract';

export interface VisionExtracted extends ExtractedListing {
  layoutNote?: string;
}

// Lee una foto/captura borrador de la placa y extrae los datos vía Claude visión.
// Reusa la misma API key que el generador de captions (idb-keyval 'anthropic_api_key').
// Devuelve null si no hay key o falla; lanza con mensaje si la API responde error.
export async function extractFromImage(dataUrl: string): Promise<VisionExtracted | null> {
  if (!dataUrl) return null;
  const apiKey = (await get<string>('anthropic_api_key')) || '';
  if (!apiKey.trim()) {
    throw new Error('NO_API_KEY');
  }
  const res = await fetch('/api/vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: apiKey.trim(), image: dataUrl }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j.detail || j.error || '';
    } catch {
      /* ignore */
    }
    throw new Error(`Claude no pudo leer la imagen (${res.status}). ${detail}`.trim());
  }
  return (await res.json()) as VisionExtracted;
}
