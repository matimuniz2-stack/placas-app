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
  // Rediseño 2026-06-11 según reference "Alvear y Colón": kicker dorado uppercase,
  // título serif gigante, logo Z con subrayado dorado + rombo, specs con separadores,
  // pin rojo en la ubicación.
  {
    id: 't16',
    name: 'Zamboni Pro',
    category: 'premium',
    bgColor: '#f4ebdd',
    textColor: '#2b1a14',
    // Fundido al borde inferior de la foto (easing en varios pasos para que no sea lineal)
    overlay:
      'linear-gradient(180deg, rgba(244,235,221,0) 0%, rgba(244,235,221,0) 44%, rgba(244,235,221,0.15) 47.5%, rgba(244,235,221,0.4) 50.5%, rgba(244,235,221,0.68) 53%, rgba(244,235,221,0.9) 55%, #f4ebdd 56%, #f4ebdd 100%)',
    defaultLayers: {
      photo: L({ id: 'photo', x: 0, y: 0, w: 100, h: 56, z: 0 }),
      // Sticker "EN VENTA" arriba a la derecha (sin borde, como el reference)
      op: L({ id: 'op', x: 73.5, y: 6.3, w: 23, h: 0, bg: '#d9221f', color: '#ffffff', font: 'Inter', size: 28, weight: 700, align: 'center', letterSpacing: 2, uppercase: true, padding: 18, radius: 22, z: 30 }),
      // Kicker dorado: "DEPTO EN VENTA"
      lbl: L({ id: 'lbl', x: 7.4, y: 59.8, w: 60, font: 'Inter', size: 30, color: '#9c7a35', weight: 700, letterSpacing: 7, uppercase: true }),
      // Título serif gigante (ej: "Alvear y Colón")
      addr: L({ id: 'addr', x: 7.4, y: 62.8, w: 67, font: 'Playfair Display', size: 104, color: '#241710', weight: 700, lineHeight: 1.02 }),
      // Logo Z a la derecha del título, con subrayado dorado + rombo debajo
      logo: L({ id: 'logo', x: 79.5, y: 60.8, w: 13.5, h: 0 }),
      line2: L({ id: 'line2', x: 78.5, y: 69.6, w: 15, h: 0.08, bg: 'rgba(199,168,107,0.8)', z: 4 }),
      dot2: L({ id: 'dot2', x: 85.4, y: 69.2, w: 1.3, h: 0.73, bg: '#c7a86b', rotation: 45, z: 6 }),
      // Divisor largo con rombo al centro
      line: L({ id: 'line', x: 7.4, y: 72.7, w: 62, h: 0.08, bg: 'rgba(199,168,107,0.55)', z: 4 }),
      dot: L({ id: 'dot', x: 37.4, y: 72.1, w: 2, h: 1.13, bg: '#c7a86b', rotation: 45, z: 6 }),
      // Precio en rojo
      price: L({ id: 'price', x: 7.4, y: 75.8, w: 85, font: 'Playfair Display', size: 110, color: '#d9221f', weight: 700, lineHeight: 1 }),
      // Línea de detalles con íconos dorados y separadores verticales
      amen: L({ id: 'amen', x: 7.4, y: 85.6, w: 85, font: 'Inter', size: 38, color: '#2b1a14', letterSpacing: 0.3 }),
      // Ubicación con pin rojo + divisor fino arriba (ej: "Loma de Colón, Mar del Plata")
      barrio: L({ id: 'barrio', x: 7.4, y: 90.3, w: 85.2, font: 'Inter', size: 36, color: '#2b1a14', weight: 500, borderTop: '1px solid rgba(199,168,107,0.6)', padding: 24 }),
    },
  },

  // ============== t17: ZAMBONI GALERÍA (formato 2026-06-11, armado por el usuario) ==============
  // Fotos grandes apiladas casi a sangre (las dibuja GalleryGrid con el motor de
  // galleryLayout.ts), pill VENTA sobre la primera foto, pie con pin + ubicación + logo Z.
  {
    id: 't17',
    name: 'Galería',
    category: 'premium',
    bgColor: '#f4ebdd',
    textColor: '#2b1a14',
    gallery: true,
    defaultLayers: {
      // Pill "VENTA" sobre la foto superior (estilo t16, sin borde)
      op: L({ id: 'op', x: 73, y: 2.9, w: 22, h: 0, bg: '#d9221f', color: '#ffffff', font: 'Inter', size: 28, weight: 700, align: 'center', letterSpacing: 2, uppercase: true, padding: 18, radius: 22, z: 30 }),
      // Pie: hairline + ubicación con pin rojo + logo Z
      line: L({ id: 'line', x: 3.9, y: 93.3, w: 70, h: 0.08, bg: 'rgba(199,168,107,0.6)', z: 4 }),
      barrio: L({ id: 'barrio', x: 3.9, y: 94.1, w: 78, font: 'Inter', size: 34, color: '#2b1a14', weight: 500 }),
      logo: L({ id: 'logo', x: 84.8, y: 92, w: 11, h: 0 }),
      // Línea de amenities (oculta por defecto; activala con el ojo en Layers —
      // el import del listing la deja cargada con las amenities detectadas)
      amen: L({ id: 'amen', x: 3.9, y: 91.2, w: 78, font: 'Inter', size: 26, color: '#2b1a14', visible: false }),
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

  // ============== t21: AVISO PREMIUM (variante refinada: specs a la derecha, footer negro) ==============
  {
    id: 't21',
    name: 'Aviso Premium',
    category: 'premium',
    bgColor: '#ffffff',
    textColor: '#111827',
    defaultLayers: {},
  },

  // ============== t22: STORY ADS (vertical 1080x1920, top/bottom vacíos, contenido centrado) ==============
  {
    id: 't22',
    name: 'Story Ads',
    category: 'premium',
    bgColor: '#ffffff',
    textColor: '#111827',
    defaultLayers: {},
  },

  // ============== t23: TARJETA FLOTANTE (foto full-bleed + tarjeta crema flotante) ==============
  // Elegido de la galería de 100 diseños. La foto cubre toda la placa y la info va en una
  // tarjeta crema con sombra, flotando abajo. Mantiene el logo Z original (subrayado dorado +
  // rombo). Fuente Space Grotesk. El título grande usa el diferencial (data.titulo); abajo, la
  // dirección con pin. NO tiene layer `photo` → la foto va de fondo full-bleed (la elige el usuario).
  // ⚠️ id t23: t21 ya está tomado por "Aviso Premium" (meta).
  {
    id: 't23',
    name: 'Tarjeta flotante',
    category: 'premium',
    bgColor: '#f4ebdd',
    textColor: '#2b1a14',
    floatingCard: true,
    defaultLayers: {
      op: L({ id: 'op', x: 70.5, y: 4.5, w: 25.5, h: 0, bg: '#d9221f', color: '#ffffff', font: 'Space Grotesk', size: 28, weight: 700, align: 'center', letterSpacing: 2, uppercase: true, padding: 18, radius: 12, z: 30 }),
      // Tarjeta compacta abajo (~tercio inferior): se ve ~62% de la foto arriba.
      // Kicker dorado
      lbl: L({ id: 'lbl', x: 8.5, y: 64, w: 60, font: 'Space Grotesk', size: 26, color: '#9c7a35', weight: 700, letterSpacing: 6, uppercase: true }),
      // Título grande (diferencial) — 2 líneas; auto-shrink en Renderer
      addr: L({ id: 'addr', x: 8.5, y: 66.2, w: 64, font: 'Space Grotesk', size: 70, color: '#241710', weight: 700, lineHeight: 1.05 }),
      // Logo Z original (a la derecha del título) + subrayado dorado y rombo
      logo: L({ id: 'logo', x: 79.5, y: 66, w: 13, h: 0 }),
      line2: L({ id: 'line2', x: 78.5, y: 74.4, w: 14, h: 0.08, bg: 'rgba(199,168,107,0.8)', z: 4 }),
      dot2: L({ id: 'dot2', x: 84.9, y: 74, w: 1.3, h: 0.73, bg: '#c7a86b', rotation: 45, z: 6 }),
      // Divisor con rombo
      line: L({ id: 'line', x: 8.5, y: 77, w: 58, h: 0.09, bg: 'rgba(199,168,107,0.55)', z: 4 }),
      dot: L({ id: 'dot', x: 36, y: 76.3, w: 2.1, h: 1.18, bg: '#c7a86b', rotation: 45, z: 6 }),
      // Precio grande en rojo
      price: L({ id: 'price', x: 8.5, y: 79.4, w: 84, font: 'Space Grotesk', size: 92, color: '#d9221f', weight: 700, lineHeight: 1 }),
      // Atributos con íconos
      amen: L({ id: 'amen', x: 8.5, y: 87.8, w: 85, font: 'Space Grotesk', size: 33, color: '#2b1a14', letterSpacing: 0.3 }),
      // Ubicación con pin (dirección) + hairline arriba, pegada al pie de la tarjeta
      barrio: L({ id: 'barrio', x: 8.5, y: 92.3, w: 84, font: 'Space Grotesk', size: 32, color: '#2b1a14', weight: 500, borderTop: '1px solid rgba(199,168,107,0.55)', padding: 24 }),
    },
  },

  // ============== t24: EDITORIAL MINIMAL (diseño #30 de la galería de 100) ==============
  // Foto arriba ~64% (se ve bien el ambiente) + panel blanco abajo, tipografía fina
  // Space Grotesk, tag "EN VENTA" con borde (outline), precio rojo, logo Z original a la
  // derecha. El título usa el diferencial (data.titulo); abajo la dirección con pin.
  // Color switcheable (blanco por defecto, crema vía bgOverride). Sin divisor (minimal).
  {
    id: 't24',
    name: 'Editorial minimal',
    category: 'premium',
    bgColor: '#ffffff',
    textColor: '#0e0e0e',
    defaultLayers: {
      photo: L({ id: 'photo', x: 0, y: 0, w: 100, h: 64, z: 0 }),
      // Tag "EN VENTA" outline (borde rojo, fondo transparente) arriba-izq sobre la foto
      op: L({ id: 'op', x: 5, y: 4.5, w: 0, h: 0, bg: 'transparent', border: '2px solid #d9221f', color: '#d9221f', font: 'Space Grotesk', size: 26, weight: 700, align: 'center', letterSpacing: 2, uppercase: true, padding: 16, radius: 8, z: 30 }),
      // Kicker dorado tenue
      lbl: L({ id: 'lbl', x: 7, y: 66.5, w: 62, font: 'Space Grotesk', size: 27, color: '#b08c3f', weight: 600, letterSpacing: 5, uppercase: true }),
      // Título (diferencial) — peso medio, elegante; 2 líneas; auto-shrink en Renderer
      addr: L({ id: 'addr', x: 7, y: 69.2, w: 68, font: 'Space Grotesk', size: 78, color: '#0e0e0e', weight: 500, lineHeight: 1.05 }),
      // Logo Z original a la derecha (mismo asset de siempre)
      logo: L({ id: 'logo', x: 80, y: 67, w: 12.5, h: 0 }),
      // Precio rojo
      price: L({ id: 'price', x: 7, y: 82, w: 86, font: 'Space Grotesk', size: 90, color: '#d9221f', weight: 700, lineHeight: 1 }),
      // Datos clave con íconos (respeta attrsOn)
      amen: L({ id: 'amen', x: 7, y: 89.6, w: 86, font: 'Space Grotesk', size: 34, color: '#0e0e0e', letterSpacing: 0.3 }),
      // Ubicación con pin (dirección + ciudad)
      barrio: L({ id: 'barrio', x: 7, y: 93.8, w: 86, font: 'Space Grotesk', size: 34, color: '#0e0e0e', weight: 500 }),
    },
  },
];
