import type { LayerConfig } from '@/types';

// Editor "Canva-lite" del Meta Ad (t19). Cada bloque es una capa con base (geometría +
// estilo) que el usuario puede mover/redimensionar (override en layerOverrides) y, para
// texto, editar. Coordenadas en % de 1080×1350. `size` en px sobre el canvas 1080.

export const META_BASE: Record<string, LayerConfig> = {
  // Fotos
  maPhoto1: { id: 'maPhoto1', x: 0, y: 0, w: 100, h: 54.07, z: 0, visible: true },
  maPhoto2: { id: 'maPhoto2', x: 56.48, y: 48.59, w: 39.81, h: 30.67, radius: 26, z: 6, visible: true },
  // Badges
  maStatus: { id: 'maStatus', x: 2.2, y: 1.8, w: 26, h: 5.2, z: 10, visible: true },
  maLoc: { id: 'maLoc', x: 70, y: 1.8, w: 28, h: 6.2, z: 10, visible: true },
  // Textos de la columna izquierda
  maHead: { id: 'maHead', x: 5, y: 55.2, w: 50, h: 11, font: 'Outfit', size: 62, color: '#111827', weight: 800, lineHeight: 1.04, z: 5, visible: true },
  maSub: { id: 'maSub', x: 5, y: 65.7, w: 50, h: 4.5, font: 'Inter', size: 28, color: '#6B7280', weight: 500, lineHeight: 1.3, z: 5, visible: true },
  maPrice: { id: 'maPrice', x: 5, y: 69.2, w: 55, h: 8.5, font: 'Outfit', size: 96, color: '#EF2B2A', weight: 800, z: 5, visible: true },
  maTag: { id: 'maTag', x: 5, y: 78.1, w: 50, h: 3, font: 'Inter', size: 22, color: '#6B7280', weight: 600, uppercase: true, letterSpacing: 3, z: 5, visible: true },
  // Bloques compuestos
  maFeats: { id: 'maFeats', x: 5, y: 80.6, w: 90, h: 6, z: 5, visible: true },
  maCta: { id: 'maCta', x: 5, y: 86.2, w: 31, h: 7.5, z: 5, visible: true },
  maBenefit: { id: 'maBenefit', x: 40, y: 87.2, w: 24, h: 6, z: 5, visible: true },
  maBrand: { id: 'maBrand', x: 80, y: 84.8, w: 16, h: 9.5, z: 5, visible: true },
  maFooter: { id: 'maFooter', x: 0, y: 94.8, w: 100, h: 5.2, z: 8, visible: true },
};

export const META_BLOCK_IDS = Object.keys(META_BASE);

// Etiquetas para la lista de capas / inspector
export const META_LABELS: Record<string, string> = {
  maPhoto1: 'Foto principal',
  maPhoto2: 'Foto secundaria',
  maStatus: 'Badge estado',
  maLoc: 'Badge ubicación',
  maHead: 'Título',
  maSub: 'Subtítulo',
  maPrice: 'Precio',
  maTag: 'Tagline',
  maFeats: 'Features',
  maCta: 'Botón WhatsApp',
  maBenefit: 'Beneficio',
  maBrand: 'Marca',
  maFooter: 'Footer',
  maC0: 'Elemento 1',
  maC1: 'Elemento 2',
  maC2: 'Elemento 3',
  maC3: 'Elemento 4',
  maC4: 'Elemento 5',
  maC5: 'Elemento 6',
  maC6: 'Elemento 7',
  maC7: 'Elemento 8',
};

export const CUSTOM_SLOTS = ['maC0', 'maC1', 'maC2', 'maC3', 'maC4', 'maC5', 'maC6', 'maC7'];

export function isMetaId(id: string): boolean {
  return id in META_BASE || /^maC\d$/.test(id);
}

// Base por defecto de un elemento custom recién agregado (caja centrada).
export function customElBase(id: string, type: 'text' | 'photo'): LayerConfig {
  if (type === 'photo') {
    return { id: id as any, x: 32, y: 30, w: 36, h: 24, radius: 20, z: 7, visible: true };
  }
  return { id: id as any, x: 28, y: 42, w: 44, h: 7, font: 'Outfit', size: 44, color: '#111827', weight: 700, align: 'left', z: 12, visible: true };
}
