import { create, useStore } from 'zustand';
import { temporal } from 'zundo';
import type {
  PlacaData,
  PhotoState,
  ThemeState,
  AgentProfile,
  Format,
  LayerConfig,
  LayerId,
  CustomEl,
  SlideSnapshot,
} from '@/types';
import { ALL_TEMPLATES } from '@/components/templates/registry';
import { galleryCellBase } from './galleryLayout';
import { customElBase, CUSTOM_SLOTS, isMetaTemplate, metaBaseFor, metaFixedFormat, META_BASE, META2_BASE } from './metaAd';
import { amenString } from './format';

// Snapshot de una capa para copiar/pegar/duplicar en el Meta Ad: geometría + estilo
// (layer) y contenido (ce: foto vinculada o texto).
export interface LayerSnapshot {
  ce: CustomEl;
  layer: Partial<LayerConfig>;
}

interface PlacaState {
  // core
  format: Format;
  templateId: string;
  variantId: string;
  data: PlacaData;
  layerOverrides: Partial<Record<LayerId, Partial<LayerConfig>>>;
  textOverrides: Partial<Record<LayerId, string>>; // texto editado in-canvas (doble click)
  selectedLayer: LayerId | null;
  editingLayer: LayerId | null; // capa en edición de texto in-canvas
  bgOverride: string | null; // color de fondo elegido por el usuario (pisa el del template)

  // slides (carrusel): la slide activa vive en los campos de arriba; `slides` guarda
  // los snapshots (el de la activa puede estar desactualizado hasta el próximo switch).
  slides: SlideSnapshot[];
  activeSlide: number;

  // photos
  photos: PhotoState[];
  activePhotoIdx: number;

  // theme
  theme: ThemeState;
  agent: AgentProfile | null;

  // optional layers
  badges: string[]; // ids of stickers active
  qrUrl: string;
  mapUrl: string;   // dataURL of the rendered mini-map (or empty if not enabled)
  galleryCells: Record<string, number>; // celda de galería (g0..) / slot de foto Meta Ad → índice de foto
  customElements: Record<string, CustomEl>; // Meta Ad: elementos agregados por el usuario
  metaClipboard: LayerSnapshot | null; // portapapeles de capas (copiar/pegar en Meta Ad)

  // ui state (not in undo)
  abbreviatePrice: boolean;
  showGrid: boolean;
  snapToGrid: boolean;
  sidebarLeftOpen: boolean;
  sidebarRightOpen: boolean;

  // actions
  setFormat: (f: Format) => void;
  setTemplate: (id: string) => void;
  setVariant: (id: string) => void;
  patchData: (p: Partial<PlacaData>) => void;
  setData: (d: PlacaData) => void;

  addPhotos: (urls: string[]) => void;
  removePhoto: (idx: number) => void;
  setActivePhoto: (idx: number) => void;
  patchActivePhoto: (p: Partial<PhotoState>) => void;
  patchPhoto: (idx: number, p: Partial<PhotoState>) => void;
  replacePhotoUrl: (idx: number, url: string) => void;
  clearPhotos: () => void;

  patchLayer: (id: LayerId, p: Partial<LayerConfig>) => void;
  resetLayer: (id: LayerId) => void;
  resetAllLayers: () => void;
  selectLayer: (id: LayerId | null) => void;
  setTextOverride: (id: LayerId, text: string) => void;
  setEditingLayer: (id: LayerId | null) => void;

  patchTheme: (p: Partial<ThemeState>) => void;
  setAgent: (a: AgentProfile | null) => void;
  setBgOverride: (c: string | null) => void;

  // slides
  setActiveSlide: (i: number) => void;
  addSlide: (templateId?: string) => void;
  removeSlide: (i: number) => void;
  setSlides: (slides: SlideSnapshot[], active: number) => void;

  applyPreset: (p: {
    format: Format;
    templateId: string;
    variantId: string;
    layerOverrides: Partial<Record<LayerId, Partial<LayerConfig>>>;
    theme: ThemeState;
  }) => void;

  toggleBadge: (id: string) => void;
  setQrUrl: (url: string) => void;
  setMapUrl: (url: string) => void;
  setGalleryCell: (id: string, photoIdx: number) => void;
  addCustomElement: (type: 'text' | 'photo') => void;
  removeCustomElement: (id: string) => void;
  patchCustomElement: (id: string, p: Partial<CustomEl>) => void;
  duplicateLayer: (id: LayerId) => void; // clona una capa en un slot custom libre (Meta Ad)
  copyLayer: (id: LayerId) => void;       // copia una capa al portapapeles
  pasteLayer: () => void;                  // pega el portapapeles en un slot custom libre

  setAbbreviate: (b: boolean) => void;
  toggleSidebarLeft: () => void;
  toggleSidebarRight: () => void;
  toggleGrid: () => void;
  toggleSnap: () => void;

  resetAll: () => void;
}

const DEFAULT_DATA: PlacaData = {
  addr: 'Av. Libertador 4500',
  barrio: 'Belgrano',
  amb: '3',
  m2: '85',
  baths: '2',
  cochera: 'Sí',
  price: '195.000',
  currency: 'USD',
  op: 'Venta',
  expensas: '',
  antiguedad: '',
  desc: '',
  listingUrl: '',
  city: 'Mar del Plata',
  lote: '',
  microTagline: 'LISTA PARA DISFRUTAR',
  benefitTitle: 'ZONA RESIDENCIAL',
  benefitSubtitle: 'EXCELENTE ENTORNO',
  tipoPropiedad: 'Departamento',
  aptoCredito: true,
};

const DEFAULT_THEME: ThemeState = {
  brand: '#de1f1a',
  background: 'light',
  fontPrimary: 'Inter',
  fontSecondary: 'Cormorant Garamond',
  logoUrl: '/logo-z.png',
};

// ── Copiar / pegar / duplicar capas (Meta Ad) ───────────────────────────────
// Índice de foto al que está vinculada una capa de tipo foto, o null si es texto.
function metaPhotoIdx(s: PlacaState, id: string): number | null {
  if (id === 'maPhoto1') return s.galleryCells['maPhoto1'] ?? 0;
  if (id === 'maPhoto2') return s.galleryCells['maPhoto2'] ?? 1;
  if (id === 'maPhoto3') return s.galleryCells['maPhoto3'] ?? 2;
  if (/^g\d$/.test(id)) return s.galleryCells[id] ?? parseInt(id.slice(1), 10) + 1;
  if (id === 'photo') return s.activePhotoIdx;
  if (/^maC\d$/.test(id) && s.customElements[id]?.type === 'photo')
    return s.galleryCells[id] ?? s.customElements[id]?.photoIdx ?? 0;
  return null;
}

// Texto que muestra una capa de texto del Meta Ad (para clonarla como texto fijo).
function metaTextContent(s: PlacaState, id: string): string {
  if (/^maC\d$/.test(id)) return s.customElements[id]?.text || '';
  const to = s.textOverrides[id as LayerId];
  if (to != null) return to;
  const d = s.data;
  if (id === 'maSub') return (d.amenText && d.amenText.trim()) || (d.desc && d.desc.trim()) || amenString(d) || '';
  if (id === 'maTag') return (d.microTagline || '').trim();
  if (id === 'maHead') {
    const parts = (d.addr || '').includes('\n')
      ? (d.addr || '').split('\n')
      : [d.addr || '', d.barrio ? `en ${d.barrio}` : ''];
    return [parts[0] || '', parts[1] || ''].filter(Boolean).join('\n');
  }
  return '';
}

// Arma un snapshot (estilo + contenido) de una capa para clonarla.
function buildSnapshot(s: PlacaState, id: string): LayerSnapshot | null {
  const base = getEffectiveLayer(id as LayerId);
  if (!base) return null;
  const layer: Partial<LayerConfig> = {
    x: base.x, y: base.y, w: base.w, h: base.h, radius: base.radius,
    z: (base.z ?? 5) + 1, rotation: base.rotation, opacity: base.opacity,
    font: base.font, size: base.size, color: base.color, weight: base.weight,
    align: base.align, letterSpacing: base.letterSpacing, lineHeight: base.lineHeight,
    uppercase: base.uppercase, visible: true,
  };
  const photoIdx = metaPhotoIdx(s, id);
  const ce: CustomEl =
    photoIdx != null
      ? { type: 'photo', photoIdx }
      : { type: 'text', text: metaTextContent(s, id), font: base.font, size: base.size, color: base.color, align: base.align };
  return { ce, layer };
}

// Coloca un snapshot en el primer slot custom libre, desplazado para no taparse.
function placeSnapshot(s: PlacaState, snap: LayerSnapshot): Partial<PlacaState> {
  const slot = CUSTOM_SLOTS.find((c) => !s.customElements[c]);
  if (!slot) return {}; // sin slots libres (máx. 8 elementos custom)
  const layer = {
    ...snap.layer,
    x: Math.min(92, (snap.layer.x ?? 0) + 3),
    y: Math.min(92, (snap.layer.y ?? 0) + 3),
  };
  return {
    customElements: { ...s.customElements, [slot]: { ...snap.ce } },
    layerOverrides: { ...s.layerOverrides, [slot as LayerId]: layer },
    selectedLayer: slot as LayerId,
  };
}

// ── Slides (carrusel de placas) ─────────────────────────────────────────────
// Snapshot del diseño de la slide activa (lo que cambia por placa).
function snapshotSlide(s: PlacaState): SlideSnapshot {
  return {
    templateId: s.templateId,
    variantId: s.variantId,
    format: s.format,
    layerOverrides: s.layerOverrides,
    textOverrides: s.textOverrides,
    galleryCells: s.galleryCells,
    customElements: s.customElements,
    activePhotoIdx: s.activePhotoIdx,
    bgOverride: s.bgOverride,
    badges: s.badges,
  };
}

// Campos del estado live que carga un snapshot al activarse.
function loadSlide(sl: SlideSnapshot): Partial<PlacaState> {
  return {
    templateId: sl.templateId,
    variantId: sl.variantId,
    format: metaFixedFormat(sl.templateId) ?? sl.format,
    layerOverrides: sl.layerOverrides || {},
    textOverrides: sl.textOverrides || {},
    galleryCells: sl.galleryCells || {},
    customElements: sl.customElements || {},
    activePhotoIdx: sl.activePhotoIdx ?? 0,
    bgOverride: sl.bgOverride ?? null,
    badges: sl.badges || [],
    selectedLayer: null,
    editingLayer: null,
  };
}

// Slide nueva "en blanco" para un template dado.
export function blankSlide(templateId: string, format: Format): SlideSnapshot {
  return {
    templateId,
    variantId: 'default',
    format: metaFixedFormat(templateId) ?? format,
    layerOverrides: {},
    textOverrides: {},
    galleryCells: {},
    customElements: {},
    activePhotoIdx: 0,
    bgOverride: null,
    badges: [],
  };
}

// Cambiar de slide invalida el historial de undo (sería confuso deshacer "a través"
// de otra placa).
function clearUndoHistory() {
  try { (usePlacaStore as any).temporal.getState().clear(); } catch {}
}

export const usePlacaStore = create<PlacaState>()(
  temporal(
    (set, get) => ({
      format: 'story',
      templateId: 't16',
      variantId: 'default',
      data: DEFAULT_DATA,
      layerOverrides: {},
      textOverrides: {},
      selectedLayer: null,
      editingLayer: null,
      bgOverride: null,

      slides: [blankSlide('t16', 'story')],
      activeSlide: 0,

      photos: [],
      activePhotoIdx: 0,

      theme: DEFAULT_THEME,
      agent: null,

      badges: [],
      qrUrl: '',
      mapUrl: '',
      galleryCells: {},
      customElements: {},
      metaClipboard: null,

      abbreviatePrice: false,
      showGrid: false,
      snapToGrid: true,
      sidebarLeftOpen: true,
      sidebarRightOpen: true,

      // El formato de los templates meta está fijado (su layout solo funciona en su
      // relación de aspecto): se ignora el cambio manual si el template lo impone.
      setFormat: (f) => set((s) => ({ format: metaFixedFormat(s.templateId) ?? f })),
      setTemplate: (id) => set((s) => ({ templateId: id, format: metaFixedFormat(id) ?? s.format, layerOverrides: {}, textOverrides: {}, galleryCells: {}, selectedLayer: null, editingLayer: null })),
      setVariant: (id) => set({ variantId: id }),
      patchData: (p) => set((s) => ({ data: { ...s.data, ...p } })),
      setData: (d) => set({ data: d }),

      addPhotos: (urls) =>
        set((s) => {
          const newPhotos = urls.map((u) => ({
            url: u,
            pos: { x: 50, y: 50 },
            zoom: 1,
            filter: { b: 100, c: 100, s: 100 },
          }));
          const merged = [...s.photos, ...newPhotos];
          return {
            photos: merged,
            activePhotoIdx: s.photos.length === 0 ? 0 : s.activePhotoIdx,
          };
        }),

      removePhoto: (idx) =>
        set((s) => {
          const next = s.photos.filter((_, i) => i !== idx);
          const newActive = Math.min(s.activePhotoIdx, Math.max(0, next.length - 1));
          return { photos: next, activePhotoIdx: newActive };
        }),

      setActivePhoto: (idx) => set({ activePhotoIdx: idx }),

      patchActivePhoto: (p) =>
        set((s) => {
          const photos = [...s.photos];
          if (photos[s.activePhotoIdx]) {
            photos[s.activePhotoIdx] = { ...photos[s.activePhotoIdx], ...p };
          }
          return { photos };
        }),

      patchPhoto: (idx, p) =>
        set((s) => {
          const photos = [...s.photos];
          if (photos[idx]) photos[idx] = { ...photos[idx], ...p };
          return { photos };
        }),

      replacePhotoUrl: (idx, url) =>
        set((s) => {
          const photos = [...s.photos];
          if (photos[idx]) photos[idx] = { ...photos[idx], url };
          return { photos };
        }),

      clearPhotos: () => set({ photos: [], activePhotoIdx: 0 }),

      patchLayer: (id, p) =>
        set((s) => ({
          layerOverrides: { ...s.layerOverrides, [id]: { ...s.layerOverrides[id], ...p } },
        })),
      resetLayer: (id) =>
        set((s) => {
          const o = { ...s.layerOverrides };
          delete o[id];
          const t = { ...s.textOverrides };
          delete t[id];
          return { layerOverrides: o, textOverrides: t };
        }),
      resetAllLayers: () => set({ layerOverrides: {}, textOverrides: {} }),
      selectLayer: (id) => set({ selectedLayer: id }),
      setTextOverride: (id, text) =>
        set((s) => ({ textOverrides: { ...s.textOverrides, [id]: text } })),
      setEditingLayer: (id) => set({ editingLayer: id }),

      patchTheme: (p) => set((s) => ({ theme: { ...s.theme, ...p } })),
      setAgent: (a) => set({ agent: a }),
      setBgOverride: (c) => set({ bgOverride: c }),

      setActiveSlide: (i) =>
        set((s) => {
          if (i === s.activeSlide || i < 0 || i >= s.slides.length) return {} as any;
          const slides = [...s.slides];
          slides[s.activeSlide] = snapshotSlide(s);
          clearUndoHistory();
          return { slides, activeSlide: i, ...loadSlide(slides[i]) };
        }),
      addSlide: (templateId) =>
        set((s) => {
          const slides = [...s.slides];
          slides[s.activeSlide] = snapshotSlide(s);
          // Por defecto la nueva placa alterna: si la actual es Zamboni Pro, sigue Galería.
          const tid = templateId || (s.templateId === 't16' ? 't17' : 't16');
          const fresh = blankSlide(tid, s.format);
          slides.push(fresh);
          clearUndoHistory();
          return { slides, activeSlide: slides.length - 1, ...loadSlide(fresh) };
        }),
      removeSlide: (i) =>
        set((s) => {
          if (s.slides.length <= 1 || i < 0 || i >= s.slides.length) return {} as any;
          const slides = [...s.slides];
          slides[s.activeSlide] = snapshotSlide(s);
          slides.splice(i, 1);
          const nextActive = Math.min(i === s.activeSlide ? i : s.activeSlide > i ? s.activeSlide - 1 : s.activeSlide, slides.length - 1);
          clearUndoHistory();
          return { slides, activeSlide: nextActive, ...loadSlide(slides[nextActive]) };
        }),
      setSlides: (slides, active) =>
        set(() => {
          if (!slides.length) return {} as any;
          const i = Math.max(0, Math.min(active, slides.length - 1));
          clearUndoHistory();
          return { slides, activeSlide: i, ...loadSlide(slides[i]) };
        }),

      // Aplica un boceto guardado: reemplaza SOLO el diseño (template, layout,
      // tema, formato). No toca data, fotos, badges ni agente de la propiedad.
      applyPreset: (p) =>
        set({
          format: p.format,
          templateId: p.templateId,
          variantId: p.variantId,
          layerOverrides: p.layerOverrides || {},
          theme: p.theme,
          selectedLayer: null,
        }),

      toggleBadge: (id) =>
        set((s) => ({
          badges: s.badges.includes(id) ? s.badges.filter((b) => b !== id) : [...s.badges, id],
        })),
      setQrUrl: (url) => set({ qrUrl: url }),
      setMapUrl: (url) => set({ mapUrl: url }),
      setGalleryCell: (id, photoIdx) =>
        set((s) => ({ galleryCells: { ...s.galleryCells, [id]: photoIdx } })),

      addCustomElement: (type) =>
        set((s) => {
          const slot = CUSTOM_SLOTS.find((c) => !s.customElements[c]);
          if (!slot) return {} as any;
          return {
            customElements: {
              ...s.customElements,
              [slot]: { type, text: type === 'text' ? 'Texto nuevo' : undefined, photoIdx: type === 'photo' ? 0 : undefined },
            },
            selectedLayer: slot as LayerId,
          };
        }),
      removeCustomElement: (id) =>
        set((s) => {
          const ce = { ...s.customElements };
          delete ce[id];
          const lo = { ...s.layerOverrides };
          delete lo[id as LayerId];
          const to = { ...s.textOverrides };
          delete to[id as LayerId];
          return { customElements: ce, layerOverrides: lo, textOverrides: to, selectedLayer: null };
        }),
      patchCustomElement: (id, p) =>
        set((s) => ({ customElements: { ...s.customElements, [id]: { ...(s.customElements[id] || { type: 'text' }), ...p } } })),

      duplicateLayer: (id) =>
        set((s) => {
          const snap = buildSnapshot(s, id);
          if (!snap) return {} as any;
          return placeSnapshot(s, snap) as any;
        }),
      copyLayer: (id) =>
        set((s) => {
          const snap = buildSnapshot(s, id);
          return { metaClipboard: snap } as any;
        }),
      pasteLayer: () =>
        set((s) => {
          if (!s.metaClipboard) return {} as any;
          return placeSnapshot(s, s.metaClipboard) as any;
        }),

      setAbbreviate: (b) => set({ abbreviatePrice: b }),
      toggleSidebarLeft: () => set((s) => ({ sidebarLeftOpen: !s.sidebarLeftOpen })),
      toggleSidebarRight: () => set((s) => ({ sidebarRightOpen: !s.sidebarRightOpen })),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

      resetAll: () =>
        set({
          format: 'story',
          templateId: 't16',
          variantId: 'default',
          data: { ...DEFAULT_DATA, addr: '', barrio: '', amb: '', m2: '', baths: '', cochera: 'Sí', price: '', currency: 'USD', op: 'Venta', expensas: '', antiguedad: '', desc: '', listingUrl: '' },
          layerOverrides: {},
          textOverrides: {},
          selectedLayer: null,
          editingLayer: null,
          bgOverride: null,
          slides: [blankSlide('t16', 'story')],
          activeSlide: 0,
          photos: [],
          activePhotoIdx: 0,
          theme: DEFAULT_THEME,
          agent: null,
          badges: [],
          qrUrl: '',
          mapUrl: '',
          galleryCells: {},
          customElements: {},
          abbreviatePrice: false,
          showGrid: false,
        }),
    }),
    {
      limit: 50,
      partialize: (state) => {
        // Excluir cosas pesadas / no-undo del history
        const {
          photos: _ph,
          selectedLayer: _sel,
          editingLayer: _ed,
          sidebarLeftOpen: _l,
          sidebarRightOpen: _r,
          showGrid: _g,
          snapToGrid: _s,
          metaClipboard: _cb,
          slides: _sl,
          activeSlide: _as,
          ...rest
        } = state;
        return rest as any;
      },
    }
  )
);

// zundo attaches a Zustand store at usePlacaStore.temporal. Use it via useStore.
export function useTemporalStore<T>(selector: (state: any) => T): T {
  // @ts-ignore
  return useStore(usePlacaStore.temporal, selector);
}
useTemporalStore.getState = () => (usePlacaStore as any).temporal.getState();

// Slides con el estado live fusionado en la activa (para guardar/exportar).
export function currentSlidesSnapshot(): { slides: SlideSnapshot[]; activeSlide: number } {
  const s = usePlacaStore.getState();
  const slides = [...s.slides];
  slides[s.activeSlide] = snapshotSlide(s);
  return { slides, activeSlide: s.activeSlide };
}

// Arma el carrusel automático después de importar un listing: placa 1 = Zamboni Pro
// (foto de portada + datos) y placa 2 = Galería con los ambientes. Si el listing
// traía amenities, quedan cargadas en la capa "Detalles" de la placa 2 (oculta por
// defecto en el formato actual; se activa con el ojo en Layers).
export function buildImportSlides(amenLine?: string) {
  const s = usePlacaStore.getState();
  const slide1 = blankSlide('t16', 'story');
  const slide2 = blankSlide('t17', 'story');
  if (amenLine && amenLine.trim()) {
    slide2.textOverrides = { amen: amenLine.trim() };
  }
  s.setSlides([slide1, slide2], 0);
}

export function getCurrentTemplate() {
  const id = usePlacaStore.getState().templateId;
  return ALL_TEMPLATES.find((t) => t.id === id) || ALL_TEMPLATES[0];
}

export function getEffectiveLayer(id: LayerId): LayerConfig | undefined {
  const { templateId, layerOverrides, photos } = usePlacaStore.getState();
  const tpl = ALL_TEMPLATES.find((t) => t.id === templateId);
  let base = tpl?.defaultLayers?.[id];
  // Celdas de galería: la geometría base la da el motor adaptativo (según cantidad de
  // fotos). El override del usuario manda sobre esa base, así la celda es editable a mano.
  if (!base && tpl?.gallery && /^g\d$/.test(id)) base = galleryCellBase(id, photos.length);
  // Meta Ad (t19) / Aviso Pro (t20): bases de los bloques editables según el template.
  // Fallback a META_BASE cuando el store no está en un template meta (p. ej. thumbnails
  // del picker con overrideTemplateId) para que no queden vacíos.
  if (!base && isMetaTemplate(templateId)) base = metaBaseFor(templateId)[id];
  else if (!base) base = META_BASE[id] ?? META2_BASE[id];
  if (!base && /^maC\d$/.test(id)) base = customElBase(id, usePlacaStore.getState().customElements[id]?.type || 'text');
  const override = layerOverrides[id];
  if (!base && !override) return undefined;
  return { ...(base as LayerConfig), ...(override || {}) } as LayerConfig;
}
