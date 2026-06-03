import type { TemplateDef, LayerConfig, LayerId } from '@/types';

const L = (cfg: Partial<LayerConfig> & { id: LayerId }): LayerConfig =>
  ({
    visible: true,
    x: 0,
    y: 0,
    w: 100,
    h: 0,
    z: 5,
    ...cfg,
  }) as LayerConfig;

export const ALL_TEMPLATES_DATA: TemplateDef[] = [
  // ============== t16: ZAMBONI EDITORIAL (foto top + panel crema premium) ==============
  {
    id: 't16',
    name: 'Zamboni Pro',
    category: 'premium',
    bgColor: '#f4ebdd',
    textColor: '#2b1a14',
    // Fundido al borde inferior de la foto (easing en varios pasos para que no sea lineal)
    overlay:
      'linear-gradient(180deg, rgba(244,235,221,0) 0%, rgba(244,235,221,0) 49%, rgba(244,235,221,0.15) 52.5%, rgba(244,235,221,0.4) 55.5%, rgba(244,235,221,0.68) 58%, rgba(244,235,221,0.9) 60%, #f4ebdd 61%, #f4ebdd 100%)',
    defaultLayers: {
      photo: L({ id: 'photo', x: 0, y: 0, w: 100, h: 61, z: 0 }),
      // Sticker "EN VENTA" arriba a la derecha, separado del borde (no choca con los 3 puntitos de IG)
      op: L({ id: 'op', x: 75.5, y: 6.3, w: 22, h: 0, bg: '#d9221f', color: '#ffffff', font: 'Inter', size: 24, weight: 700, align: 'center', letterSpacing: 2, uppercase: true, padding: 16, radius: 32, border: '2px solid rgba(255,255,255,0.9)', z: 30 }),
      // Etiqueta "— en venta"
      lbl: L({ id: 'lbl', x: 7.4, y: 60.4, w: 50, font: 'Cormorant Garamond', size: 32, color: '#a78b61', italic: true, letterSpacing: 1 }),
      // Logo a la derecha del panel
      logo: L({ id: 'logo', x: 76.5, y: 60.5, w: 17, h: 0 }),
      // Título grande (ej: "Departamento en Playa Grande")
      addr: L({ id: 'addr', x: 7.4, y: 63.5, w: 62, font: 'Playfair Display', size: 84, color: '#2b1a14', weight: 700, lineHeight: 1.0 }),
      // Divisor con rombo
      line: L({ id: 'line', x: 7.4, y: 74.5, w: 57, h: 0.1, bg: 'rgba(199,168,107,0.55)', z: 4 }),
      dot: L({ id: 'dot', x: 35.5, y: 73.9, w: 2, h: 1.13, bg: '#c7a86b', rotation: 45, z: 6 }),
      // Precio en rojo
      price: L({ id: 'price', x: 7.4, y: 77, w: 85, font: 'Playfair Display', size: 106, color: '#d9221f', weight: 700, lineHeight: 1 }),
      // Línea de detalles
      amen: L({ id: 'amen', x: 7.4, y: 86, w: 85, font: 'Inter', size: 36, color: '#2b1a14', letterSpacing: 0.5 }),
      // Ubicación con pin (ej: "📍 Mar del Plata"), con divisor fino arriba
      barrio: L({ id: 'barrio', x: 7.4, y: 90, w: 57, font: 'Inter', size: 34, color: '#2b1a14', weight: 500, borderTop: '1px solid rgba(199,168,107,0.6)', padding: 20 }),
    },
  },

  // ============== t17: ZAMBONI GALERÍA (continuación de t16, grilla de fotos) ==============
  {
    id: 't17',
    name: 'Galería',
    category: 'premium',
    bgColor: '#f4ebdd',
    textColor: '#2b1a14',
    gallery: true,
    defaultLayers: {
      // La grilla de fotos la dibuja GalleryGrid: mosaico adaptativo según la cantidad de fotos.
      // Encabezado: título + subtítulo
      addr: L({ id: 'addr', x: 7.4, y: 3.6, w: 68, font: 'Playfair Display', size: 72, color: '#2b1a14', weight: 700, lineHeight: 1.0 }),
      lbl: L({ id: 'lbl', x: 7.4, y: 12, w: 60, font: 'Inter', size: 30, color: '#a78b61', weight: 400 }),
      // Sticker "GALERÍA" arriba a la derecha
      op: L({ id: 'op', x: 73, y: 4, w: 22, h: 0, bg: '#d9221f', color: '#ffffff', font: 'Inter', size: 24, weight: 700, align: 'center', letterSpacing: 2, uppercase: true, padding: 16, radius: 32, border: '2px solid rgba(255,255,255,0.9)', z: 30 }),
      // Pie: ubicación con pin, divisor, detalles, logo
      barrio: L({ id: 'barrio', x: 7.4, y: 90, w: 55, font: 'Inter', size: 32, color: '#2b1a14', weight: 500 }),
      line: L({ id: 'line', x: 7.4, y: 93.4, w: 50, h: 0.08, bg: 'rgba(199,168,107,0.6)', z: 4 }),
      amen: L({ id: 'amen', x: 7.4, y: 94.2, w: 60, font: 'Inter', size: 28, color: '#2b1a14' }),
      logo: L({ id: 'logo', x: 81, y: 90, w: 11, h: 0 }),
    },
  },

  // ============== t18: GALERÍA 2 (versión del usuario — logo arriba, sticker EN VENTA, celdas custom) ==============
  {
    id: 't18',
    name: 'Galería 2',
    category: 'premium',
    bgColor: '#f4ebdd',
    textColor: '#2b1a14',
    gallery: true,
    defaultLayers: {
      // Celdas con las posiciones/tamaños que dejó el usuario (mosaico fijo, no adaptativo)
      g0: L({ id: 'g0', x: 7.39, y: 14.51, w: 85.18, h: 20, radius: 22, z: 2 }),
      g1: L({ id: 'g1', x: 7.39, y: 36.04, w: 41.59, h: 15, radius: 22, z: 2 }),
      g2: L({ id: 'g2', x: 51.04, y: 36.05, w: 41.59, h: 15, radius: 22, z: 2 }),
      g3: L({ id: 'g3', x: 7.41, y: 52.61, w: 41.59, h: 15, radius: 22, z: 2 }),
      g4: L({ id: 'g4', x: 51, y: 52.6, w: 41.59, h: 15, radius: 22, z: 2 }),
      g5: L({ id: 'g5', x: 7.41, y: 68.34, w: 85.65, h: 20.26, radius: 22, z: 2 }),
      // Título + subtítulo (movidos por el usuario)
      addr: L({ id: 'addr', x: 7.41, y: 4.75, w: 68, font: 'Playfair Display', size: 72, color: '#2b1a14', weight: 700, lineHeight: 1.0 }),
      lbl: L({ id: 'lbl', x: 20.25, y: 20.84, w: 60, font: 'Inter', size: 30, color: '#a78b61', weight: 400 }),
      // Sticker (texto "EN VENTA") reubicado al centro-arriba y más angosto
      op: L({ id: 'op', x: 50.25, y: 9.53, w: 19.9, h: 0, bg: '#d9221f', color: '#ffffff', font: 'Inter', size: 24, weight: 700, align: 'center', letterSpacing: 2, uppercase: true, padding: 16, radius: 32, border: '2px solid rgba(255,255,255,0.9)', z: 30 }),
      // Pie: ubicación con pin, divisor, detalles
      barrio: L({ id: 'barrio', x: 7.4, y: 90, w: 55, font: 'Inter', size: 32, color: '#2b1a14', weight: 500 }),
      line: L({ id: 'line', x: 7.4, y: 93.4, w: 50, h: 0.08, bg: 'rgba(199,168,107,0.6)', z: 4 }),
      amen: L({ id: 'amen', x: 7.4, y: 94.2, w: 60, font: 'Inter', size: 28, color: '#2b1a14' }),
      // Logo movido arriba a la derecha
      logo: L({ id: 'logo', x: 81.64, y: 4.02, w: 11, h: 0 }),
    },
  },

  // ============== t19: META AD (aviso publicitario 4:5 para Meta Ads — render dedicado en MetaAdRenderer) ==============
  {
    id: 't19',
    name: 'Meta Ad',
    category: 'premium',
    bgColor: '#ffffff',
    textColor: '#111827',
    defaultLayers: {},
  },

  // ============== t20: AVISO PRO (foto hero + 2 secundarias, precio en bloque, apto crédito) ==============
  {
    id: 't20',
    name: 'Aviso Pro',
    category: 'premium',
    bgColor: '#ffffff',
    textColor: '#111827',
    defaultLayers: {},
  },
];
