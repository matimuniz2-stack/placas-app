// Brand kits: save+switch between brand presets (logo + colors + fonts + agent).
import { get, set, del } from 'idb-keyval';

const KEY_KITS = 'brand_kits';
const KEY_ACTIVE = 'active_brand_kit';

export interface BrandKit {
  id: string;
  name: string;
  logoUrl: string;
  brandColor: string;
  fontPrimary: string;
  fontSecondary: string;
  agent?: {
    name: string;
    phone: string;
    photoUrl?: string;
  };
  captionHandle?: string; // e.g. @zamboni.inmobiliaria
  createdAt: string;
}

const DEFAULT_KIT: BrandKit = {
  id: 'zamboni-default',
  name: 'Zamboni Inmobiliaria',
  logoUrl: '/logo-z.png',
  brandColor: '#de1f1a',
  fontPrimary: 'Gill Sans MT',
  fontSecondary: 'Inter',
  agent: undefined,
  captionHandle: '@zamboni.inmobiliaria',
  createdAt: new Date().toISOString(),
};

export async function listBrandKits(): Promise<BrandKit[]> {
  const v = (await get<BrandKit[]>(KEY_KITS)) || [];
  // Always include the default at the top
  return [DEFAULT_KIT, ...v.filter((k) => k.id !== DEFAULT_KIT.id)];
}

export async function saveBrandKit(kit: BrandKit): Promise<void> {
  const cur = (await get<BrandKit[]>(KEY_KITS)) || [];
  const next = cur.filter((k) => k.id !== kit.id);
  next.push(kit);
  await set(KEY_KITS, next);
}

export async function deleteBrandKit(id: string): Promise<void> {
  if (id === DEFAULT_KIT.id) return; // can't delete the default
  const cur = (await get<BrandKit[]>(KEY_KITS)) || [];
  await set(KEY_KITS, cur.filter((k) => k.id !== id));
  const active = await get<string>(KEY_ACTIVE);
  if (active === id) await del(KEY_ACTIVE);
}

export async function setActiveBrandKit(id: string): Promise<void> {
  await set(KEY_ACTIVE, id);
}

export async function getActiveBrandKitId(): Promise<string | null> {
  return (await get<string>(KEY_ACTIVE)) || null;
}

export { DEFAULT_KIT };
