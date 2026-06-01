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
  // ============== t01: CENTRADO OVERLAY (Cinzel) ==============
  {
    id: 't01',
    name: 'Centrado',
    category: 'minimal',
    bgColor: '#1a1a1a',
    overlay: 'rgba(0,0,0,0.55)',
    defaultLayers: {
      logo: L({ id: 'logo', x: 44, y: 18, w: 12, h: 0 }),
      op: L({ id: 'op', x: 10, y: 30, w: 80, font: 'Cinzel', size: 26, color: '#fff', align: 'center', letterSpacing: 14, uppercase: true, weight: 400 }),
      line: L({ id: 'line', x: 47, y: 38, w: 6, h: 0.05, bg: 'rgba(255,255,255,0.6)' }),
      addr: L({ id: 'addr', x: 8, y: 42, w: 84, font: 'Cinzel', size: 62, color: '#fff', align: 'center', letterSpacing: 5, lineHeight: 1.3, weight: 500, uppercase: true }),
      amen: L({ id: 'amen', x: 8, y: 60, w: 84, font: 'Inter', size: 24, color: 'rgba(255,255,255,0.88)', align: 'center', letterSpacing: 6, uppercase: true, weight: 400 }),
      price: L({ id: 'price', x: 8, y: 70, w: 84, font: 'Cinzel', size: 78, color: '#fff', align: 'center', letterSpacing: 8, weight: 500 }),
    },
  },

  // ============== t02: MAGAZINE EDITORIAL ==============
  {
    id: 't02',
    name: 'Magazine',
    category: 'editorial',
    bgColor: '#f4f1ea',
    textColor: '#222',
    defaultLayers: {
      tag: L({ id: 'tag', x: 6, y: 5, w: 60, font: 'Cormorant Garamond', size: 38, color: '#222', italic: true }),
      logo: L({ id: 'logo', x: 84, y: 5, w: 8, h: 0 }),
      num: L({ id: 'num', x: 6, y: 11, w: 60, font: 'DM Serif Display', size: 200, color: '#222', lineHeight: 1 }),
      photo: L({ id: 'photo', x: 6, y: 32, w: 88, h: 36 }),
      addr: L({ id: 'addr', x: 6, y: 70, w: 88, font: 'DM Serif Display', size: 70, color: '#222', lineHeight: 1.05 }),
      amen: L({ id: 'amen', x: 6, y: 84, w: 60, font: 'Inter', size: 22, color: '#666', letterSpacing: 4, uppercase: true }),
      price: L({ id: 'price', x: 6, y: 90, w: 60, font: 'DM Serif Display', size: 54, color: '#222' }),
    },
  },

  // ============== t03: LABELS + INFO (overlay) ==============
  {
    id: 't03',
    name: 'Labels',
    category: 'cinematic',
    bgColor: '#1a1a1a',
    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.88) 100%)',
    defaultLayers: {
      op: L({ id: 'op', x: 6, y: 5, w: 50, font: 'Inter', size: 22, color: '#fff', letterSpacing: 7, uppercase: true, weight: 500 }),
      logo: L({ id: 'logo', x: 86, y: 4, w: 8, h: 0 }),
      addr: L({ id: 'addr', x: 6, y: 68, w: 88, font: 'Marcellus', size: 78, color: '#fff', lineHeight: 1.1, weight: 400 }),
      amen: L({ id: 'amen', x: 6, y: 80, w: 88, font: 'Inter', size: 26, color: 'rgba(255,255,255,0.88)', letterSpacing: 4, uppercase: true }),
      price: L({ id: 'price', x: 6, y: 86, w: 88, font: 'Marcellus', size: 104, color: '#fff' }),
    },
  },

  // ============== t04: CENTRADO ALL-CAPS (Bebas) ==============
  {
    id: 't04',
    name: 'Caps',
    category: 'bold',
    bgColor: '#1a1a1a',
    overlay: 'rgba(0,0,0,0.45)',
    defaultLayers: {
      logo: L({ id: 'logo', x: 45, y: 20, w: 10, h: 0 }),
      addr: L({ id: 'addr', x: 5, y: 32, w: 90, font: 'Bebas Neue', size: 140, color: '#fff', align: 'center', letterSpacing: 8, lineHeight: 1 }),
      dot: L({ id: 'dot', x: 49, y: 56, w: 2, h: 1.2, bg: '#de1f1a' }),
      amen: L({ id: 'amen', x: 5, y: 64, w: 90, font: 'Inter', size: 24, color: '#fff', align: 'center', letterSpacing: 9, uppercase: true }),
      price: L({ id: 'price', x: 5, y: 76, w: 90, font: 'Bebas Neue', size: 114, color: '#fff', align: 'center', letterSpacing: 7 }),
    },
  },

  // ============== t05: TRACKING ESTIRADO (Tenor Sans) ==============
  {
    id: 't05',
    name: 'Tracking',
    category: 'premium',
    bgColor: '#1a1a1a',
    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.85) 100%)',
    defaultLayers: {
      logo: L({ id: 'logo', x: 47, y: 5, w: 8, h: 0 }),
      op: L({ id: 'op', x: 10, y: 12, w: 80, font: 'Tenor Sans', size: 22, color: '#fff', align: 'center', letterSpacing: 24, uppercase: true }),
      addr: L({ id: 'addr', x: 6, y: 70, w: 88, font: 'Tenor Sans', size: 50, color: '#fff', align: 'center', letterSpacing: 14, lineHeight: 1.4, uppercase: true }),
      amen: L({ id: 'amen', x: 6, y: 81, w: 88, font: 'Inter', size: 22, color: 'rgba(255,255,255,0.82)', align: 'center', letterSpacing: 18, uppercase: true }),
      price: L({ id: 'price', x: 6, y: 87, w: 88, font: 'Tenor Sans', size: 80, color: '#fff', align: 'center', letterSpacing: 22 }),
    },
  },

  // ============== t06: CREAM SERIF (Cormorant) ==============
  {
    id: 't06',
    name: 'Cream',
    category: 'editorial',
    bgColor: '#f4ede0',
    textColor: '#2a1810',
    defaultLayers: {
      photo: L({ id: 'photo', x: 0, y: 0, w: 100, h: 60 }),
      lbl: L({ id: 'lbl', x: 6, y: 64, w: 60, font: 'Cormorant Garamond', size: 30, color: '#2a1810', italic: true, opacity: 0.7 }),
      logo: L({ id: 'logo', x: 86, y: 64, w: 8, h: 0 }),
      addr: L({ id: 'addr', x: 6, y: 70, w: 88, font: 'Cormorant Garamond', size: 78, color: '#2a1810', weight: 700, lineHeight: 1.05 }),
      amen: L({ id: 'amen', x: 6, y: 84, w: 60, font: 'Cormorant Garamond', size: 36, color: '#2a1810' }),
      price: L({ id: 'price', x: 6, y: 90, w: 88, font: 'Cormorant Garamond', size: 80, color: '#2a1810', weight: 700, borderTop: '2px solid #c4ad7a', padding: 18 }),
    },
  },

  // ============== t07: WHITE CARD FLOTANTE ==============
  {
    id: 't07',
    name: 'White card',
    category: 'minimal',
    bgColor: '#1a1a1a',
    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.18) 0%, rgba(0,0,0,0) 30%)',
    defaultLayers: {
      logo: L({ id: 'logo', x: 84, y: 3, w: 9, h: 0 }),
      op: L({ id: 'op', x: 6, y: 58, w: 88, h: 38, bg: '#fff', font: 'IBM Plex Mono', size: 18, color: '#888', letterSpacing: 5, uppercase: true, padding: 48 }),
      addr: L({ id: 'addr', x: 11, y: 64, w: 78, font: 'Marcellus', size: 74, color: '#111', lineHeight: 1.05 }),
      amen: L({ id: 'amen', x: 11, y: 78, w: 78, font: 'Inter', size: 26, color: '#666', letterSpacing: 2.5 }),
      price: L({ id: 'price', x: 11, y: 86, w: 78, font: 'Marcellus', size: 90, color: '#111' }),
    },
  },

  // ============== t08: KINFOLK MINIMAL ==============
  {
    id: 't08',
    name: 'Kinfolk',
    category: 'minimal',
    bgColor: '#ece8e1',
    textColor: '#3a3530',
    defaultLayers: {
      lbl: L({ id: 'lbl', x: 6, y: 5, w: 60, font: 'Cormorant Garamond', size: 32, color: '#3a3530', italic: true, opacity: 0.75 }),
      logo: L({ id: 'logo', x: 86, y: 5, w: 8, h: 0 }),
      photo: L({ id: 'photo', x: 6, y: 12, w: 88, h: 48 }),
      addr: L({ id: 'addr', x: 6, y: 64, w: 88, font: 'Cormorant Garamond', size: 72, color: '#3a3530', lineHeight: 1.15 }),
      amen: L({ id: 'amen', x: 6, y: 80, w: 88, font: 'Inter', size: 26, color: '#3a3530', opacity: 0.72, letterSpacing: 3, uppercase: true, lineHeight: 1.6 }),
      price: L({ id: 'price', x: 6, y: 90, w: 88, font: 'Cormorant Garamond', size: 78, color: '#3a3530', weight: 500, borderTop: '2px solid #c4bdb0', padding: 18 }),
    },
  },

  // ============== t09: SWISS DESIGN ==============
  {
    id: 't09',
    name: 'Swiss',
    category: 'minimal',
    bgColor: '#fff',
    textColor: '#111',
    defaultLayers: {
      tag: L({ id: 'tag', x: 6, y: 5, w: 60, font: 'Inter', size: 22, color: '#111', letterSpacing: 6, uppercase: true, weight: 800 }),
      logo: L({ id: 'logo', x: 86, y: 5, w: 8, h: 0 }),
      photo: L({ id: 'photo', x: 6, y: 12, w: 88, h: 50 }),
      addr: L({ id: 'addr', x: 6, y: 65, w: 50, font: 'Inter', size: 78, color: '#111', weight: 900, lineHeight: 0.95 }),
      amen: L({ id: 'amen', x: 58, y: 78, w: 40, font: 'Inter', size: 22, color: '#111', letterSpacing: 1.5, lineHeight: 1.6 }),
      price: L({ id: 'price', x: 6, y: 88, w: 88, font: 'Inter', size: 90, color: '#111', weight: 900, borderTop: '3px solid #111', padding: 18 }),
    },
  },

  // ============== t10: CENTERED CARD ==============
  {
    id: 't10',
    name: 'Centered',
    category: 'editorial',
    bgColor: '#e8dbc1',
    defaultLayers: {
      op: L({ id: 'op', x: 8, y: 8, w: 84, h: 84, bg: '#fff', padding: 48 }),
      lbl: L({ id: 'lbl', x: 13, y: 13, w: 60, font: 'IBM Plex Mono', size: 18, color: '#888', letterSpacing: 4, uppercase: true }),
      logo: L({ id: 'logo', x: 82, y: 13, w: 7, h: 0 }),
      photo: L({ id: 'photo', x: 13, y: 19, w: 74, h: 40 }),
      addr: L({ id: 'addr', x: 13, y: 62, w: 74, font: 'Marcellus', size: 62, color: '#111', lineHeight: 1.15 }),
      amen: L({ id: 'amen', x: 13, y: 76, w: 74, font: 'Inter', size: 26, color: '#555', letterSpacing: 2 }),
      price: L({ id: 'price', x: 13, y: 84, w: 74, font: 'Marcellus', size: 78, color: '#111', borderTop: '2px solid #ddd', padding: 18 }),
    },
  },

  // ============== t11: BRUTALIST BOLD ==============
  {
    id: 't11',
    name: 'Brutalist',
    category: 'bold',
    bgColor: '#ffeb00',
    textColor: '#0a0a0a',
    defaultLayers: {
      logo: L({ id: 'logo', x: 85, y: 4, w: 11, h: 0 }),
      op: L({ id: 'op', x: 4, y: 5, w: 60, font: 'Space Grotesk', size: 30, color: '#0a0a0a', weight: 700, uppercase: true, letterSpacing: 2 }),
      photo: L({ id: 'photo', x: 4, y: 12, w: 92, h: 46, border: '8px solid #0a0a0a' }),
      addr: L({ id: 'addr', x: 4, y: 62, w: 92, font: 'Space Grotesk', size: 96, color: '#0a0a0a', weight: 700, lineHeight: 0.95, uppercase: true }),
      amen: L({ id: 'amen', x: 4, y: 80, w: 60, font: 'Space Grotesk', size: 24, color: '#0a0a0a', weight: 600, letterSpacing: 1 }),
      price: L({ id: 'price', x: 4, y: 88, w: 92, font: 'Space Grotesk', size: 96, color: '#0a0a0a', weight: 700, borderTop: '6px solid #0a0a0a', padding: 14 }),
    },
  },

  // ============== t12: CINEMA LETTERBOX ==============
  {
    id: 't12',
    name: 'Letterbox',
    category: 'cinematic',
    bgColor: '#000',
    overlay: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.8) 100%)',
    defaultLayers: {
      logo: L({ id: 'logo', x: 47, y: 38, w: 6, h: 0, opacity: 0.95 }),
      op: L({ id: 'op', x: 10, y: 6, w: 80, font: 'Tenor Sans', size: 18, color: 'rgba(255,255,255,0.7)', align: 'center', letterSpacing: 20, uppercase: true }),
      addr: L({ id: 'addr', x: 8, y: 46, w: 84, font: 'Tenor Sans', size: 64, color: '#fff', align: 'center', letterSpacing: 8, lineHeight: 1.2 }),
      amen: L({ id: 'amen', x: 8, y: 64, w: 84, font: 'IBM Plex Mono', size: 20, color: 'rgba(255,255,255,0.7)', align: 'center', letterSpacing: 6 }),
      price: L({ id: 'price', x: 8, y: 88, w: 84, font: 'Tenor Sans', size: 56, color: '#fff', align: 'center', letterSpacing: 8 }),
    },
  },

  // ============== t13: GOLD PREMIUM ==============
  {
    id: 't13',
    name: 'Gold Premium',
    category: 'premium',
    bgColor: '#1c1715',
    textColor: '#f0e6d2',
    defaultLayers: {
      logo: L({ id: 'logo', x: 46, y: 6, w: 8, h: 0 }),
      op: L({ id: 'op', x: 10, y: 16, w: 80, font: 'Italiana', size: 32, color: '#c9a86b', align: 'center', letterSpacing: 16, uppercase: true }),
      line: L({ id: 'line', x: 46, y: 22, w: 8, h: 0.05, bg: '#c9a86b' }),
      addr: L({ id: 'addr', x: 8, y: 32, w: 84, font: 'Italiana', size: 84, color: '#f0e6d2', align: 'center', lineHeight: 1.1, letterSpacing: 3 }),
      photo: L({ id: 'photo', x: 18, y: 50, w: 64, h: 28 }),
      amen: L({ id: 'amen', x: 8, y: 81, w: 84, font: 'Cormorant Garamond', size: 28, color: '#c9a86b', align: 'center', italic: true }),
      price: L({ id: 'price', x: 8, y: 88, w: 84, font: 'Italiana', size: 64, color: '#f0e6d2', align: 'center', letterSpacing: 6 }),
    },
  },

  // ============== t14: ARCHITECTURAL GRID ==============
  {
    id: 't14',
    name: 'Architectural',
    category: 'architectural',
    bgColor: '#fafafa',
    textColor: '#0a0a0a',
    defaultLayers: {
      tag: L({ id: 'tag', x: 4, y: 4, w: 60, font: 'IBM Plex Mono', size: 16, color: '#737373', letterSpacing: 4, uppercase: true, weight: 500 }),
      logo: L({ id: 'logo', x: 86, y: 4, w: 8, h: 0 }),
      photo: L({ id: 'photo', x: 4, y: 10, w: 60, h: 54 }),
      num: L({ id: 'num', x: 68, y: 10, w: 28, font: 'IBM Plex Mono', size: 22, color: '#0a0a0a', weight: 600, letterSpacing: 2 }),
      addr: L({ id: 'addr', x: 68, y: 16, w: 28, font: 'Inter', size: 36, color: '#0a0a0a', weight: 700, lineHeight: 1.1 }),
      amen: L({ id: 'amen', x: 68, y: 32, w: 28, font: 'IBM Plex Mono', size: 14, color: '#525252', lineHeight: 1.8, letterSpacing: 1 }),
      price: L({ id: 'price', x: 4, y: 88, w: 92, font: 'Inter', size: 80, color: '#0a0a0a', weight: 800, borderTop: '2px solid #0a0a0a', padding: 14 }),
    },
  },

  // ============== t15: MAGAZINE 02 ==============
  {
    id: 't15',
    name: 'Editorial 02',
    category: 'editorial',
    bgColor: '#f7f4ec',
    textColor: '#1c1715',
    defaultLayers: {
      logo: L({ id: 'logo', x: 4, y: 4, w: 7, h: 0 }),
      tag: L({ id: 'tag', x: 38, y: 5, w: 24, font: 'Cormorant Garamond', size: 22, color: '#1c1715', align: 'center', italic: true, letterSpacing: 2, uppercase: true }),
      photo: L({ id: 'photo', x: 4, y: 12, w: 92, h: 44 }),
      num: L({ id: 'num', x: 4, y: 57, w: 24, font: 'Playfair Display', size: 220, color: '#1c1715', weight: 900, lineHeight: 0.9 }),
      addr: L({ id: 'addr', x: 32, y: 60, w: 64, font: 'Playfair Display', size: 64, color: '#1c1715', weight: 700, lineHeight: 1.05 }),
      desc: L({ id: 'desc', x: 32, y: 76, w: 64, font: 'Cormorant Garamond', size: 24, color: '#3a3530', italic: true, lineHeight: 1.4, opacity: 0.85 }),
      amen: L({ id: 'amen', x: 32, y: 84, w: 64, font: 'IBM Plex Mono', size: 14, color: '#525252', letterSpacing: 2, uppercase: true }),
      price: L({ id: 'price', x: 32, y: 89, w: 64, font: 'Playfair Display', size: 50, color: '#1c1715', weight: 700 }),
    },
  },

  // ============== t16: ZAMBONI EDITORIAL (foto top + panel crema premium) ==============
  {
    id: 't16',
    name: 'Zamboni Pro',
    category: 'premium',
    bgColor: '#f4ebdd',
    textColor: '#2b1a14',
    // Fundido sutil al borde inferior de la foto (easing en varios pasos, poco fade)
    overlay:
      'linear-gradient(180deg, rgba(244,235,221,0) 0%, rgba(244,235,221,0) 53%, rgba(244,235,221,0.08) 55.5%, rgba(244,235,221,0.25) 57.5%, rgba(244,235,221,0.55) 59%, rgba(244,235,221,0.85) 60.3%, #f4ebdd 61%, #f4ebdd 100%)',
    defaultLayers: {
      photo: L({ id: 'photo', x: 0, y: 0, w: 100, h: 61 }),
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
];
