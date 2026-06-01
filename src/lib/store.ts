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
} from '@/types';
import { ALL_TEMPLATES } from '@/components/templates/registry';

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
  galleryCells: Record<string, number>; // celda de galería (g0..) → índice de foto asignada

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
};

const DEFAULT_THEME: ThemeState = {
  brand: '#de1f1a',
  background: 'light',
  fontPrimary: 'Inter',
  fontSecondary: 'Cormorant Garamond',
  logoUrl: '/logo-z.png',
};

export const usePlacaStore = create<PlacaState>()(
  temporal(
    (set, get) => ({
      format: 'story',
      templateId: 't01',
      variantId: 'default',
      data: DEFAULT_DATA,
      layerOverrides: {},
      textOverrides: {},
      selectedLayer: null,
      editingLayer: null,

      photos: [],
      activePhotoIdx: 0,

      theme: DEFAULT_THEME,
      agent: null,

      badges: [],
      qrUrl: '',
      mapUrl: '',
      galleryCells: {},

      abbreviatePrice: false,
      showGrid: false,
      snapToGrid: true,
      sidebarLeftOpen: true,
      sidebarRightOpen: true,

      setFormat: (f) => set({ format: f }),
      setTemplate: (id) => set({ templateId: id, layerOverrides: {}, textOverrides: {}, galleryCells: {}, selectedLayer: null, editingLayer: null }),
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

      setAbbreviate: (b) => set({ abbreviatePrice: b }),
      toggleSidebarLeft: () => set((s) => ({ sidebarLeftOpen: !s.sidebarLeftOpen })),
      toggleSidebarRight: () => set((s) => ({ sidebarRightOpen: !s.sidebarRightOpen })),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

      resetAll: () =>
        set({
          format: 'story',
          templateId: 't01',
          variantId: 'default',
          data: { ...DEFAULT_DATA, addr: '', barrio: '', amb: '', m2: '', baths: '', cochera: 'Sí', price: '', currency: 'USD', op: 'Venta', expensas: '', antiguedad: '', desc: '', listingUrl: '' },
          layerOverrides: {},
          textOverrides: {},
          selectedLayer: null,
          editingLayer: null,
          photos: [],
          activePhotoIdx: 0,
          theme: DEFAULT_THEME,
          agent: null,
          badges: [],
          qrUrl: '',
          mapUrl: '',
          galleryCells: {},
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

export function getCurrentTemplate() {
  const id = usePlacaStore.getState().templateId;
  return ALL_TEMPLATES.find((t) => t.id === id) || ALL_TEMPLATES[0];
}

export function getEffectiveLayer(id: LayerId): LayerConfig | undefined {
  const { templateId, layerOverrides } = usePlacaStore.getState();
  const tpl = ALL_TEMPLATES.find((t) => t.id === templateId);
  const base = tpl?.defaultLayers?.[id];
  const override = layerOverrides[id];
  if (!base && !override) return undefined;
  return { ...(base as LayerConfig), ...(override || {}) } as LayerConfig;
}
