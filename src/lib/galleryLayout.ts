import type { LayerConfig, LayerId } from '@/types';

// Motor de layout de la galería (t17). Formato 2026-06-11 (armado por el usuario en
// el editor y horneado acá): fotos GRANDES apiladas a lo alto, casi a sangre
// (margen 1.2%), sin encabezado; el pie (pin ubicación + logo) vive debajo.
// La geometría que devuelve es la BASE: las celdas siguen siendo editables a mano
// (los overrides del usuario mandan sobre esta base — ver getEffectiveLayer en store).

export const MAX_GALLERY_CELLS = 3;

export type Rect = { x: number; y: number; w: number; h: number };

// Coordenadas en % del placa. Área de fotos: y0.45 → y90.55; pie debajo (~y92+).
export const GALLERY_LAYOUTS: Record<number, Rect[]> = {
  1: [{ x: 1.2, y: 0.45, w: 97.6, h: 90.1 }],
  // 2: dos grandes apiladas
  2: [
    { x: 1.2, y: 0.45, w: 97.6, h: 44.3 },
    { x: 1.2, y: 45.6, w: 97.6, h: 44.95 },
  ],
  // 3: tres apiladas (el formato de referencia)
  3: [
    { x: 1.2, y: 0.45, w: 97.6, h: 29.5 },
    { x: 1.2, y: 30.6, w: 97.6, h: 28.3 },
    { x: 1.2, y: 59.5, w: 97.6, h: 31.05 },
  ],
};

// Cuántas celdas mostrar según la cantidad de fotos. Saltea la portada (foto 0);
// si no hay fotos extra, 3 celdas vacías como guía visual en el editor.
// Con más fotos que celdas, la última muestra el badge "+N".
export function galleryCount(photosLength: number): number {
  const rest = Math.max(0, photosLength - 1);
  return rest > 0 ? Math.min(rest, MAX_GALLERY_CELLS) : 3;
}

export function galleryCellIds(photosLength: number): LayerId[] {
  return Array.from({ length: galleryCount(photosLength) }, (_, i) => `g${i}` as LayerId);
}

// Geometría BASE de una celda (sin overrides) según la cantidad de fotos.
export function galleryCellBase(cellId: string, photosLength: number): LayerConfig | undefined {
  const i = parseInt(cellId.slice(1), 10);
  const rect = GALLERY_LAYOUTS[galleryCount(photosLength)]?.[i];
  if (!rect) return undefined;
  return { id: cellId as LayerId, visible: true, z: 2, radius: 22, rotation: 0, ...rect };
}
