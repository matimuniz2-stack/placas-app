export type Format = 'story' | 'post';

export type LayerId =
  | 'photo'
  | 'logo'
  | 'addr'
  | 'barrio'
  | 'price'
  | 'amen'
  | 'op'
  | 'desc'
  | 'extras'
  | 'badge'
  | 'qr'
  | 'agent'
  | 'map'
  | 'tag'
  | 'lbl'
  | 'num'
  | 'line'
  | 'dot'
  | 'line2'
  | 'dot2'
  | 'g0'
  | 'g1'
  | 'g2'
  | 'g3'
  | 'g4'
  | 'g5'
  // Meta Ad (t19): bloques editables
  | 'maPhoto1'
  | 'maPhoto2'
  | 'maPhoto3'
  | 'maStatus'
  | 'maLoc'
  | 'maHead'
  | 'maSub'
  | 'maPrice'
  | 'maTag'
  | 'maFeats'
  | 'maCta'
  | 'maBenefit'
  | 'maFeats2'
  | 'maBrand'
  | 'maFooter'
  // Meta Ad: elementos custom agregados por el usuario (slots fijos)
  | 'maC0'
  | 'maC1'
  | 'maC2'
  | 'maC3'
  | 'maC4'
  | 'maC5'
  | 'maC6'
  | 'maC7';

export type Align = 'left' | 'center' | 'right';

export interface LayerConfig {
  id: LayerId;
  x: number; // %
  y: number; // %
  w: number; // %
  h: number; // % (or auto = 0)
  rotation?: number;
  opacity?: number;
  visible: boolean;
  z?: number;

  // text-specific (optional)
  font?: string;
  size?: number;
  weight?: number;
  color?: string;
  align?: Align;
  letterSpacing?: number;
  lineHeight?: number;
  italic?: boolean;
  uppercase?: boolean;

  // box / decoration (optional)
  bg?: string;
  border?: string;
  borderTop?: string;
  padding?: number;
  radius?: number; // border-radius en px (para píldoras/badges)
}

export interface PlacaData {
  addr: string;
  barrio: string;
  amb: string;
  m2: string;
  baths: string;
  cochera: 'Sí' | 'No';
  cocheras?: string; // cantidad de cocheras (numérico). Si está, manda sobre cochera Sí/No.
  tipoPropiedad?: string; // ej: "Departamento" (título del Aviso Pro)
  titulo?: string; // gancho/diferencial que va de TÍTULO grande en t16 (ej "Exclusivo 4 ambientes"). Si está, la dirección baja al pie.
  aptoCredito?: boolean; // muestra el bloque "APTO CRÉDITO" (Aviso Pro)
  price: string;
  currency: 'USD' | 'ARS';
  op: 'Venta' | 'Alquiler';
  expensas?: string;
  antiguedad?: string;
  desc?: string;
  listingUrl?: string;
  amenText?: string; // override manual de la línea de detalles (amb · m² · baños…)
  // Datos clave on/off en la placa (claves: amb, m2, baths, cochera, aptoCredito, expensas, antiguedad).
  // undefined = defaults (core on, extras off). Ver ATTR_DEFS en lib/format.ts.
  attrsOn?: Record<string, boolean>;
  // Campos del aviso Meta Ad (t19)
  city?: string;
  lote?: string;
  microTagline?: string;
  benefitTitle?: string;
  benefitSubtitle?: string;
}

// Meta Ad (t19): elemento agregado por el usuario (texto o foto libre)
export interface CustomEl {
  type: 'text' | 'photo';
  text?: string;
  color?: string;
  size?: number;
  font?: string;
  align?: Align;
  photoIdx?: number;
}

/**
 * Snapshot del diseño de UNA placa dentro del carrusel (placa 1, placa 2, …).
 * Los datos de la propiedad y las fotos son compartidos entre todas las slides;
 * acá vive solo lo que cambia por placa: template, layout y contenido editado.
 */
export interface SlideSnapshot {
  templateId: string;
  variantId: string;
  format: Format;
  layerOverrides: Partial<Record<LayerId, Partial<LayerConfig>>>;
  textOverrides: Partial<Record<LayerId, string>>;
  galleryCells: Record<string, number>;
  customElements: Record<string, CustomEl>;
  activePhotoIdx: number;
  bgOverride: string | null;
  badges: string[];
}

export interface PhotoState {
  url: string; // dataURL or http
  pos: { x: number; y: number };
  zoom: number;
  filter: { b: number; c: number; s: number };
  bgRemoved?: boolean; // true if alpha foto
}

export interface AgentProfile {
  name: string;
  phone: string;
  photoUrl?: string;
}

export interface ThemeState {
  brand: string;
  background: string; // light / dark
  fontPrimary: string;
  fontSecondary: string;
  logoUrl: string;
}

export type TemplateCategory = 'minimal' | 'editorial' | 'bold' | 'cinematic' | 'premium' | 'architectural';

export interface TemplateDef {
  id: string;
  name: string;
  category: TemplateCategory;
  defaultLayers: Partial<Record<LayerId, LayerConfig>>;
  bgColor?: string;
  textColor?: string;
  overlay?: string; // CSS for ::after-like overlay
  gallery?: boolean; // renderiza grilla editorial de varias fotos (GalleryGrid)
  floatingCard?: boolean; // foto full-bleed + tarjeta crema flotante con la info (t21)
  thumbnail?: string;
  render?: (data: PlacaData, ctx: RenderContext) => React.ReactNode;
}

export interface RenderContext {
  format: Format;
  theme: ThemeState;
  photo?: PhotoState;
  layers: Partial<Record<LayerId, LayerConfig>>;
  amenString: string;
  extrasString: string;
  priceString: string;
  badges: string[]; // active badges
  agent?: AgentProfile;
  qrUrl?: string;
}

export interface Draft {
  id: string;
  name: string;
  savedAt: string;
  data: PlacaData;
  photos: PhotoState[];
  templateId: string;
  layerOverrides: Partial<Record<LayerId, Partial<LayerConfig>>>;
  textOverrides?: Partial<Record<LayerId, string>>;
  theme: ThemeState;
  badges: string[];
}

/**
 * Un "boceto" reusable: guarda SOLO el diseño (sin datos de la propiedad ni
 * fotos). Se aplica sobre cualquier propiedad para reproducir el layout.
 */
export interface DesignPreset {
  id: string;
  name: string;
  savedAt: string;
  format: Format;
  templateId: string; // template base del que deriva
  variantId: string;
  layerOverrides: Partial<Record<LayerId, Partial<LayerConfig>>>;
  theme: ThemeState; // color de marca, fuentes, logo
  thumb?: string; // dataURL jpg de preview (best-effort)
}
