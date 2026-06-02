import type { LayerConfig, LayerId } from '@/types';

// Motor de layout de la galería (t17). Define mosaicos editoriales CURADOS por cantidad
// de fotos, con variedad de tamaños (alguna celda más ancha) para que no quede plano.
// La geometría que devuelve es la BASE: las celdas siguen siendo editables a mano
// (los overrides del usuario mandan sobre esta base — ver getEffectiveLayer en store).

export const MAX_GALLERY_CELLS = 6;

export type Rect = { x: number; y: number; w: number; h: number };

// Coordenadas en % del placa, dentro del área entre el encabezado (~y14) y el pie (~y88).
// Columnas: izquierda x7.41 / derecha x51.0, ancho 41.59. Full-width: x7.41 w85.18.
export const GALLERY_LAYOUTS: Record<number, Rect[]> = {
  1: [{ x: 7.41, y: 14, w: 85.18, h: 74 }],
  // 2: una grande arriba + una más baja abajo
  2: [
    { x: 7.41, y: 14, w: 85.18, h: 44 },
    { x: 7.41, y: 59.15, w: 85.18, h: 28.85 },
  ],
  // 3: hero ancho + dos abajo
  3: [
    { x: 7.41, y: 14, w: 85.18, h: 40 },
    { x: 7.41, y: 55.15, w: 41.59, h: 32.85 },
    { x: 51.0, y: 55.15, w: 41.59, h: 32.85 },
  ],
  // 4: ancho arriba + dos al medio + ancho abajo
  4: [
    { x: 7.41, y: 14, w: 85.18, h: 34 },
    { x: 7.41, y: 49.15, w: 41.59, h: 18 },
    { x: 51.0, y: 49.15, w: 41.59, h: 18 },
    { x: 7.41, y: 68.3, w: 85.18, h: 19.7 },
  ],
  // 5: hero ancho + 2 + 2
  5: [
    { x: 7.41, y: 14, w: 85.18, h: 30 },
    { x: 7.41, y: 45.15, w: 41.59, h: 20 },
    { x: 51.0, y: 45.15, w: 41.59, h: 20 },
    { x: 7.41, y: 66.3, w: 41.59, h: 21.7 },
    { x: 51.0, y: 66.3, w: 41.59, h: 21.7 },
  ],
  // 6: anchos arriba y abajo enmarcando un 2×2 (variedad de tamaños, no grilla plana)
  6: [
    { x: 7.41, y: 14, w: 85.18, h: 20 },
    { x: 7.41, y: 35.15, w: 41.59, h: 15 },
    { x: 51.0, y: 35.15, w: 41.59, h: 15 },
    { x: 7.41, y: 51.3, w: 41.59, h: 15 },
    { x: 51.0, y: 51.3, w: 41.59, h: 15 },
    { x: 7.41, y: 67.45, w: 85.18, h: 20.55 },
  ],
};

// Cuántas celdas mostrar según la cantidad de fotos. Saltea la portada (foto 0);
// si no hay fotos extra, 4 celdas vacías como guía visual en el editor.
export function galleryCount(photosLength: number): number {
  const rest = Math.max(0, photosLength - 1);
  return rest > 0 ? Math.min(rest, MAX_GALLERY_CELLS) : 4;
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
