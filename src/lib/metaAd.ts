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

// ── t20: Aviso Pro (foto hero arriba + 2 fotos secundarias, precio en bloque rojo,
// apto crédito, footer blanco). Mismo motor/ids editables que el Meta Ad. ──
export const META2_BASE: Record<string, LayerConfig> = {
  // Foto hero (40% superior, a sangre)
  maPhoto1: { id: 'maPhoto1', x: 0, y: 0, w: 100, h: 43, z: 0, visible: true },
  // Badge EN VENTA sobre la foto
  maStatus: { id: 'maStatus', x: 2.5, y: 2.8, w: 27, h: 5, z: 10, visible: true },
  // Título: "DEPARTAMENTO EN" (rojo chico) + "PLAZA / MITRE" (negro grande)
  maHead: { id: 'maHead', x: 4.5, y: 45, w: 35, h: 18, font: 'Outfit', size: 96, color: '#111827', weight: 800, lineHeight: 1.0, z: 5, visible: true },
  // Descripción corta gris
  maSub: { id: 'maSub', x: 4.5, y: 65.5, w: 34, h: 5.5, font: 'Inter', size: 27, color: '#6B7280', weight: 500, lineHeight: 1.3, z: 5, visible: true },
  // Precio en bloque rojo
  maPrice: { id: 'maPrice', x: 4, y: 72.5, w: 41, h: 7.5, font: 'Outfit', size: 92, color: '#ffffff', weight: 800, z: 5, visible: true },
  // Dos fotos secundarias
  maPhoto2: { id: 'maPhoto2', x: 40.5, y: 43.8, w: 28.4, h: 19, radius: 24, z: 6, visible: true },
  maPhoto3: { id: 'maPhoto3', x: 70, y: 43.8, w: 27.5, h: 19, radius: 24, z: 6, visible: true },
  // Filas de características (tanda 1 abajo full-width; tanda 2 arriba si se divide)
  maFeats: { id: 'maFeats', x: 4.5, y: 81.5, w: 91, h: 7, z: 5, visible: true },
  maFeats2: { id: 'maFeats2', x: 4.5, y: 73, w: 91, h: 6, z: 5, visible: true },
  // CTA WhatsApp (tarjeta blanca con borde)
  maCta: { id: 'maCta', x: 4, y: 89.2, w: 47, h: 8, z: 5, visible: true },
  // Apto crédito
  maBenefit: { id: 'maBenefit', x: 54, y: 90.2, w: 20, h: 6, z: 5, visible: true },
  // Marca Z + ZAMBONI PROPIEDADES
  maBrand: { id: 'maBrand', x: 79, y: 87.2, w: 17, h: 10, z: 5, visible: true },
  // Footer blanco
  maFooter: { id: 'maFooter', x: 0, y: 95.2, w: 100, h: 4.8, z: 8, visible: true },
};

export const META2_BLOCK_IDS = Object.keys(META2_BASE);

// ── t21: Aviso Premium (variante refinada de Aviso Pro): fotos secundarias alineadas
// con el título, specs a la derecha en la misma fila que el precio, footer negro. ──
export const META3_BASE: Record<string, LayerConfig> = {
  maPhoto1: { id: 'maPhoto1', x: 0, y: 0, w: 100, h: 43, z: 0, visible: true },
  maStatus: { id: 'maStatus', x: 2.5, y: 2.8, w: 27, h: 5, z: 10, visible: true },
  // Título (rojo chico + barrio negro grande + barra roja)
  maHead: { id: 'maHead', x: 4, y: 46, w: 37, h: 17, font: 'Outfit', size: 92, color: '#111827', weight: 800, lineHeight: 1.0, z: 5, visible: true },
  maSub: { id: 'maSub', x: 4, y: 65.5, w: 36, h: 6, font: 'Inter', size: 28, color: '#6B7280', weight: 500, lineHeight: 1.35, z: 5, visible: true },
  // Precio en bloque rojo (columna izquierda)
  maPrice: { id: 'maPrice', x: 4, y: 72.5, w: 40, h: 8, font: 'Outfit', size: 92, color: '#ffffff', weight: 800, z: 5, visible: true },
  // Dos fotos secundarias alineadas con el título (columna derecha, arriba)
  maPhoto2: { id: 'maPhoto2', x: 43, y: 46, w: 26.7, h: 16.5, radius: 18, z: 6, visible: true },
  maPhoto3: { id: 'maPhoto3', x: 70.8, y: 46, w: 26.2, h: 16.5, radius: 18, z: 6, visible: true },
  // Specs a la derecha (tanda 1 en la fila del precio; tanda 2 arriba si se divide)
  maFeats: { id: 'maFeats', x: 44, y: 72.5, w: 53, h: 8, z: 5, visible: true },
  maFeats2: { id: 'maFeats2', x: 44, y: 64, w: 53, h: 7, z: 5, visible: true },
  // CTA WhatsApp (pill rojo, sin tarjeta)
  maCta: { id: 'maCta', x: 4, y: 85, w: 40, h: 7.5, z: 5, visible: true },
  // Apto crédito
  maBenefit: { id: 'maBenefit', x: 47, y: 86, w: 20, h: 6, z: 5, visible: true },
  // Marca
  maBrand: { id: 'maBrand', x: 77, y: 83.5, w: 19, h: 11, z: 5, visible: true },
  // Footer negro
  maFooter: { id: 'maFooter', x: 0, y: 95, w: 100, h: 5, z: 8, visible: true },
};
export const META3_BLOCK_IDS = Object.keys(META3_BASE);

export function isMetaTemplate(id: string): boolean {
  return id === 't19' || id === 't20' || id === 't21';
}
export function metaBaseFor(templateId: string): Record<string, LayerConfig> {
  if (templateId === 't20') return META2_BASE;
  if (templateId === 't21') return META3_BASE;
  return META_BASE;
}
export function metaBlockIdsFor(templateId: string): string[] {
  if (templateId === 't20') return META2_BLOCK_IDS;
  if (templateId === 't21') return META3_BLOCK_IDS;
  return META_BLOCK_IDS;
}

// Etiquetas para la lista de capas / inspector
export const META_LABELS: Record<string, string> = {
  maPhoto1: 'Foto principal',
  maPhoto2: 'Foto secundaria 1',
  maPhoto3: 'Foto secundaria 2',
  maStatus: 'Badge estado',
  maLoc: 'Badge ubicación',
  maHead: 'Título',
  maSub: 'Subtítulo',
  maPrice: 'Precio',
  maTag: 'Tagline',
  maFeats: 'Features (tanda 1)',
  maFeats2: 'Features (tanda 2)',
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
