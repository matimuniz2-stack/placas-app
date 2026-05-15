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
  selectedLayer: LayerId | null;

  // photos
  photos: PhotoState[];
  activePhotoIdx: number;

  // theme
  theme: ThemeState;
  agent: AgentProfile | null;

  // optional layers
  badges: string[]; // ids of stickers active
  qrUrl: string;

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

  patchTheme: (p: Partial<ThemeState>) => void;
  setAgent: (a: AgentProfile | null) => void;

  toggleBadge: (id: string) => void;
  setQrUrl: (url: string) => void;

  setAbbreviate: (b: boolean) => void;
  toggleSidebarLeft: () => void;
  toggleSidebarRight: () => void;
  toggleGrid: () => void;
  toggleSnap: () => void;
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
      selectedLayer: null,

      photos: [],
      activePhotoIdx: 0,

      theme: DEFAULT_THEME,
      agent: null,

      badges: [],
      qrUrl: '',

      abbreviatePrice: false,
      showGrid: false,
      snapToGrid: true,
      sidebarLeftOpen: true,
      sidebarRightOpen: true,

      setFormat: (f) => set({ format: f }),
      setTemplate: (id) => set({ templateId: id, layerOverrides: {}, selectedLayer: null }),
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
          return { layerOverrides: o };
        }),
      resetAllLayers: () => set({ layerOverrides: {} }),
      selectLayer: (id) => set({ selectedLayer: id }),

      patchTheme: (p) => set((s) => ({ theme: { ...s.theme, ...p } })),
      setAgent: (a) => set({ agent: a }),

      toggleBadge: (id) =>
        set((s) => ({
          badges: s.badges.includes(id) ? s.badges.filter((b) => b !== id) : [...s.badges, id],
        })),
      setQrUrl: (url) => set({ qrUrl: url }),

      setAbbreviate: (b) => set({ abbreviatePrice: b }),
      toggleSidebarLeft: () => set((s) => ({ sidebarLeftOpen: !s.sidebarLeftOpen })),
      toggleSidebarRight: () => set((s) => ({ sidebarRightOpen: !s.sidebarRightOpen })),
      toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
      toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),
    }),
    {
      limit: 50,
      partialize: (state) => {
        // Excluir cosas pesadas / no-undo del history
        const {
          photos: _ph,
          selectedLayer: _sel,
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
