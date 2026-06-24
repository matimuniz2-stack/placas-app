import { get } from 'idb-keyval';
import { usePlacaStore } from './store';
import type { PlacaData } from '@/types';

export interface AssemblyExtras {
  permuta?: boolean;
  aptoCredito?: boolean;
  notes?: string;
}

export interface AssemblyResult {
  titulo?: string;
  note?: string;
}

// Pide a Claude el título-diferencial + tipo/operación a partir de los datos del aviso
// (texto, sin fotos: la portada la elige el usuario). Aplica los textos al store.
// Lanza Error('NO_API_KEY') si falta la key; Error con mensaje si la API falla.
export async function assembleWithAI(extras: AssemblyExtras): Promise<AssemblyResult> {
  const apiKey = (await get<string>('anthropic_api_key')) || '';
  if (!apiKey.trim()) throw new Error('NO_API_KEY');

  const state = usePlacaStore.getState();
  const data = state.data as PlacaData;

  const res = await fetch('/api/assemble', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey: apiKey.trim(), data, extras }),
  });
  if (!res.ok) {
    let detail = '';
    try {
      const j = await res.json();
      detail = j.detail || j.error || '';
    } catch {
      /* ignore */
    }
    throw new Error(`La IA no pudo armar el aviso (${res.status}). ${detail}`.trim());
  }

  const plan = (await res.json()) as any;

  // Datos: título-diferencial + tipo/operación (no tocamos dirección, precio ni fotos).
  const patch: Partial<PlacaData> = {};
  if (plan.titulo) patch.titulo = String(plan.titulo);
  if (plan.tipoPropiedad) patch.tipoPropiedad = String(plan.tipoPropiedad);
  if (plan.op === 'Venta' || plan.op === 'Alquiler') patch.op = plan.op;
  if (extras.aptoCredito) patch.aptoCredito = true;
  if (Object.keys(patch).length) state.patchData(patch);

  // Badge "TOMA PERMUTA" solo si el usuario lo marcó (lo demás queda limpio como el ref).
  if (extras.permuta) {
    const cur = usePlacaStore.getState().badges;
    if (!cur.includes('permuta')) usePlacaStore.setState({ badges: [...cur, 'permuta'] });
  }

  return { titulo: plan.titulo, note: plan.titulo ? `Título: "${plan.titulo}"` : undefined };
}
