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
  | 'tag'
  | 'lbl'
  | 'num'
  | 'line'
  | 'dot';

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
}

export interface PlacaData {
  addr: string;
  barrio: string;
  amb: string;
  m2: string;
  baths: string;
  cochera: 'Sí' | 'No';
  price: string;
  currency: 'USD' | 'ARS';
  op: 'Venta' | 'Alquiler';
  expensas?: string;
  antiguedad?: string;
  desc?: string;
  listingUrl?: string;
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
  theme: ThemeState;
  badges: string[];
}
