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

// ── t20: Aviso Pro (Story 1080×1920). Foto hero arriba a sangre + foto secundaria
// solapada a la derecha; franja blanca central con título/precio/specs/CTA/marca;
// foto inferior a sangre. Coordenadas en % de 1080×1920. Mismo motor/ids que el Meta Ad. ──
export const META2_BASE: Record<string, LayerConfig> = {
  // Foto hero (mitad superior, a sangre)
  maPhoto1: { id: 'maPhoto1', x: 0, y: 0, w: 100, h: 45.5, z: 0, visible: true },
  // Badge EN VENTA arriba a la derecha, sobre la foto
  maStatus: { id: 'maStatus', x: 70, y: 14, w: 25, h: 4, z: 10, visible: true },
  // Foto secundaria solapada (baño): pisa la esquina inferior derecha del hero y baja a la franja blanca
  maPhoto2: { id: 'maPhoto2', x: 52, y: 30, w: 46, h: 31, radius: 24, z: 6, visible: true },
  // Título: "CASA EN" (rojo chico) + barrio negro grande + barra roja
  maHead: { id: 'maHead', x: 3.5, y: 46, w: 46, h: 16, font: 'Outfit', size: 96, color: '#111827', weight: 800, lineHeight: 1.0, z: 5, visible: true },
  // Descripción: oculta por defecto (este layout no la usa; se activa desde Capas si se quiere)
  maSub: { id: 'maSub', x: 3.5, y: 62, w: 46, h: 5, font: 'Inter', size: 27, color: '#6B7280', weight: 500, lineHeight: 1.3, z: 5, visible: false },
  // Precio en bloque rojo (columna izquierda)
  maPrice: { id: 'maPrice', x: 3.5, y: 64, w: 48, h: 7.5, font: 'Outfit', size: 92, color: '#ffffff', weight: 800, z: 5, visible: true },
  // Specs con íconos a la derecha, en la fila del precio (tanda 1; tanda 2 arriba si se divide)
  maFeats: { id: 'maFeats', x: 55, y: 63.5, w: 43, h: 8, z: 5, visible: true },
  maFeats2: { id: 'maFeats2', x: 55, y: 55.5, w: 43, h: 6, z: 5, visible: true },
  // CTA WhatsApp (tarjeta blanca con borde) abajo a la izquierda
  maCta: { id: 'maCta', x: 3.5, y: 74.5, w: 44, h: 7.5, z: 5, visible: true },
  // Apto crédito (solo si la propiedad lo es)
  maBenefit: { id: 'maBenefit', x: 55, y: 73, w: 24, h: 5, z: 5, visible: true },
  // Marca Z + ZAMBONI abajo a la derecha
  maBrand: { id: 'maBrand', x: 79.5, y: 71, w: 18, h: 10, z: 5, visible: true },
  // Foto inferior a sangre (cocina) hasta el borde
  maPhoto3: { id: 'maPhoto3', x: 0, y: 82.5, w: 100, h: 17.5, radius: 0, z: 1, visible: true },
  // Footer: oculto (este layout llega a sangre con la foto inferior)
  maFooter: { id: 'maFooter', x: 0, y: 95.2, w: 100, h: 4.8, z: 8, visible: false },
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

// ── t22: Story Ads (vertical 1080×1920). Top y bottom vacíos (safe zones de Meta);
// contenido centrado: foto grande + datos cortos. Una sola foto, sin CTA ni footer. ──
export const META4_BASE: Record<string, LayerConfig> = {
  // Foto hero A SANGRE (full-bleed) cubriendo la zona superior (incluye el safe-zone
  // de Meta, que sobre foto está OK). El texto vive debajo, en la franja segura.
  maPhoto1: { id: 'maPhoto1', x: 0, y: 0, w: 100, h: 48, z: 0, visible: true },
  // Badge EN VENTA sobre la foto, por debajo del UI superior de Stories
  maStatus: { id: 'maStatus', x: 6, y: 13.5, w: 27, h: 4, z: 10, visible: true },
  // Título: tipo (rojo) + barrio (negro grande) + barra roja
  maHead: { id: 'maHead', x: 6, y: 50, w: 66, h: 10, font: 'Outfit', size: 92, color: '#111827', weight: 800, lineHeight: 1.0, z: 5, visible: true },
  // Marca arriba a la derecha del bloque de info
  maBrand: { id: 'maBrand', x: 74, y: 50, w: 21, h: 7, z: 5, visible: true },
  // Precio en bloque rojo (más chico que el barrio, para no competir)
  maPrice: { id: 'maPrice', x: 6, y: 63.5, w: 46, h: 6.5, font: 'Outfit', size: 74, color: '#ffffff', weight: 800, z: 5, visible: true },
  // Apto crédito al lado del precio
  maBenefit: { id: 'maBenefit', x: 55, y: 64.5, w: 24, h: 5, z: 5, visible: true },
  // Specs (íconos) en una sola fila — sin partir en t22
  maFeats: { id: 'maFeats', x: 6, y: 72.5, w: 88, h: 6, z: 5, visible: true },
};
export const META4_BLOCK_IDS = Object.keys(META4_BASE);

// ── t27: Meta Ad Card (Story 1080×1920). Foto hero a sangre arriba + TARJETA BLANCA
// redondeada que ocupa los 2/3 inferiores: título bicolor (gancho negro + barrio rojo),
// barra roja, precio USD grande, fila de specs con íconos y divisores, dos fotos
// secundarias lado a lado y pie con "APTO CRÉDITO" + marca Z. Coordenadas en % de 1080×1920. ──
export const META5_BASE: Record<string, LayerConfig> = {
  // Foto hero a sangre (arriba)
  maPhoto1: { id: 'maPhoto1', x: 0, y: 0, w: 100, h: 39, z: 0, visible: true },
  // Badges flotando sobre la foto
  maStatus: { id: 'maStatus', x: 3.2, y: 2.5, w: 29, h: 4.4, z: 10, visible: true },
  maLoc: { id: 'maLoc', x: 68.5, y: 2.5, w: 28, h: 4.2, z: 10, visible: true },
  // Tarjeta blanca (fondo de todo el bloque de info)
  maCard: { id: 'maCard', x: 1.3, y: 38, w: 97.4, h: 62, radius: 46, z: 1, visible: true },
  // Título: línea 1 negra (gancho) + línea 2 roja (barrio)
  maHead: { id: 'maHead', x: 6.9, y: 40.2, w: 86, h: 10, font: 'Outfit', size: 88, color: '#111827', weight: 800, lineHeight: 1.02, z: 5, visible: true },
  // Subtítulo: apagado por defecto (este layout va directo al precio)
  maSub: { id: 'maSub', x: 6.9, y: 49, w: 60, h: 4.5, font: 'Inter', size: 28, color: '#6B7280', weight: 500, lineHeight: 1.3, z: 5, visible: false },
  // Precio (barra roja + USD negro + número rojo)
  maPrice: { id: 'maPrice', x: 6.9, y: 50.8, w: 62, h: 8, font: 'Outfit', size: 132, color: '#EF2B2A', weight: 800, z: 5, visible: true },
  // Specs en una sola fila con divisores
  maFeats: { id: 'maFeats', x: 2, y: 59.8, w: 96, h: 5.4, z: 5, visible: true },
  // Dos fotos secundarias lado a lado
  maPhoto2: { id: 'maPhoto2', x: 1.5, y: 65.8, w: 48, h: 20.6, radius: 20, z: 6, visible: true },
  maPhoto3: { id: 'maPhoto3', x: 50.5, y: 65.8, w: 48, h: 20.6, radius: 20, z: 6, visible: true },
  // Pie: apto crédito (tarjeta con borde) + marca
  maBenefit: { id: 'maBenefit', x: 6.6, y: 88.4, w: 39, h: 5.8, z: 5, visible: true },
  maBrand: { id: 'maBrand', x: 62, y: 86.8, w: 26, h: 9.5, z: 5, visible: true },
  // CTA y footer: apagados (este layout cierra con marca)
  maCta: { id: 'maCta', x: 6.6, y: 95, w: 40, h: 6, z: 5, visible: false },
  maFooter: { id: 'maFooter', x: 0, y: 95.2, w: 100, h: 4.8, z: 8, visible: false },
};
export const META5_BLOCK_IDS = Object.keys(META5_BASE);

export function isMetaTemplate(id: string): boolean {
  return id === 't19' || id === 't20' || id === 't21' || id === 't22' || id === 't27';
}

// Versión del schema de layout de los templates meta. Subir este número cuando se
// rediseñan las posiciones por defecto (META*_BASE): los borradores guardados con una
// versión vieja descartan sus overrides de layout al cargar, así toman el diseño nuevo
// (se conservan datos, fotos, tema). Ver loadLastState en App.tsx.
export const META_LAYOUT_VERSION = 3;

// Formato FIJO de cada template meta: sus capas están diseñadas en % para una
// relación de aspecto concreta, así que cambiar de formato rompe el layout.
// Meta Ad (t19) = Post 4:5; Aviso Pro/Premium (t20/t21) y Story Ads (t22) = Story 9:16.
// `null` = el template no impone formato (el usuario elige libremente).
export function metaFixedFormat(id: string): 'post' | 'story' | null {
  if (id === 't19') return 'post';
  if (id === 't20' || id === 't21' || id === 't22' || id === 't27') return 'story';
  return null;
}
export function metaBaseFor(templateId: string): Record<string, LayerConfig> {
  if (templateId === 't20') return META2_BASE;
  if (templateId === 't21') return META3_BASE;
  if (templateId === 't22') return META4_BASE;
  if (templateId === 't27') return META5_BASE;
  return META_BASE;
}
export function metaBlockIdsFor(templateId: string): string[] {
  if (templateId === 't20') return META2_BLOCK_IDS;
  if (templateId === 't21') return META3_BLOCK_IDS;
  if (templateId === 't22') return META4_BLOCK_IDS;
  if (templateId === 't27') return META5_BLOCK_IDS;
  return META_BLOCK_IDS;
}

// Etiquetas para la lista de capas / inspector
export const META_LABELS: Record<string, string> = {
  maPhoto1: 'Foto principal',
  maPhoto2: 'Foto secundaria 1',
  maPhoto3: 'Foto secundaria 2',
  maCard: 'Tarjeta blanca',
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
  return id in META_BASE || id in META5_BASE || /^maC\d$/.test(id);
}

// Base por defecto de un elemento custom recién agregado (caja centrada).
export function customElBase(id: string, type: 'text' | 'photo'): LayerConfig {
  if (type === 'photo') {
    return { id: id as any, x: 32, y: 30, w: 36, h: 24, radius: 20, z: 7, visible: true };
  }
  return { id: id as any, x: 28, y: 42, w: 44, h: 7, font: 'Outfit', size: 44, color: '#111827', weight: 700, align: 'left', z: 12, visible: true };
}
