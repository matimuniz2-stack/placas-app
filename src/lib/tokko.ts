// Tokko Broker API client. Docs: https://www.tokkobroker.com/api/docs/
// We store the API key in IndexedDB (not localStorage) so it survives across
// reloads and never leaves the browser.

import { get, set, del } from 'idb-keyval';

const TOKKO_KEY_STORAGE = 'tokko_api_key';
const TOKKO_BASE_DEFAULT = 'https://tokkobroker.com/api/v1';

export interface TokkoCredentials {
  apiKey: string;
  baseUrl?: string;
}

export async function saveTokkoKey(apiKey: string, baseUrl?: string): Promise<void> {
  await set(TOKKO_KEY_STORAGE, { apiKey, baseUrl: baseUrl || TOKKO_BASE_DEFAULT });
}

export async function loadTokkoKey(): Promise<TokkoCredentials | null> {
  const v = await get<TokkoCredentials>(TOKKO_KEY_STORAGE);
  return v || null;
}

export async function clearTokkoKey(): Promise<void> {
  await del(TOKKO_KEY_STORAGE);
}

// ─── Types ───────────────────────────────────────────────────────────────────
export interface TokkoProperty {
  id: number;
  reference_code?: string;
  address?: string;
  fake_address?: string;
  publication_title?: string;
  description?: string;
  rich_description?: string;
  type?: { name?: string; code?: string };
  location?: {
    name?: string;            // neighborhood
    parent_division?: { name?: string };
    full_location?: string;
  };
  status?: string;
  disposition?: string;
  operations?: Array<{
    operation_type?: string;  // 'Venta' | 'Alquiler'
    operation_id?: number;
    prices?: Array<{ currency: string; price: number; period?: number }>;
  }>;
  surface_total?: string | number;
  surface_covered?: string | number;
  total_surface?: string | number;
  roofed_surface?: string | number;
  room_amount?: number;       // ambientes
  suite_amount?: number;
  bathroom_amount?: number;
  parking_lot_amount?: number;
  age?: number;
  expenses?: number;
  photos?: Array<{
    image?: string;
    thumb?: string;
    description?: string;
    order?: number;
    is_blueprint?: boolean;
  }>;
  videos?: Array<{ provider?: string; player_url?: string; provider_video_id?: string }>;
  public_url?: string;
  geo_lat?: string;
  geo_long?: string;
}

export interface TokkoSearchFilters {
  operation_types?: number[];        // 1=Venta, 2=Alquiler, 3=Alquiler temporario
  property_types?: number[];          // ids específicos
  current_localization_id?: number;   // barrio
  current_localization_type?: string; // 'division'
  price_from?: number;
  price_to?: number;
  surface_from?: number;
  surface_to?: number;
  rooms_from?: number;
  rooms_to?: number;
  with_pictures?: boolean;
  limit?: number;
  offset?: number;
  order_by?: string;
  search?: string;                    // free text
}

export interface TokkoSearchResult {
  meta: { total_count: number; next?: string; previous?: string; limit: number; offset: number };
  objects: TokkoProperty[];
}

// ─── Client ──────────────────────────────────────────────────────────────────
export class TokkoClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(creds: TokkoCredentials) {
    this.apiKey = creds.apiKey;
    this.baseUrl = (creds.baseUrl || TOKKO_BASE_DEFAULT).replace(/\/+$/, '');
  }

  /** Ping the API to validate the key (uses a 1-item list query). */
  async test(): Promise<{ ok: boolean; status?: number; error?: string }> {
    try {
      const res = await this._fetch('/property/', { limit: 1 });
      return { ok: res.ok, status: res.status, error: res.ok ? undefined : await res.text() };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'unknown' };
    }
  }

  /** Search properties. */
  async search(filters: TokkoSearchFilters = {}): Promise<TokkoSearchResult> {
    const params: Record<string, any> = {
      limit: 20,
      offset: 0,
      with_pictures: true,
      ...filters,
    };
    if (params.operation_types) {
      params.operation_types = JSON.stringify(params.operation_types);
    }
    if (params.property_types) {
      params.property_types = JSON.stringify(params.property_types);
    }
    const res = await this._fetch('/property/', params);
    if (!res.ok) throw new Error(`Tokko ${res.status}: ${await res.text()}`);
    return (await res.json()) as TokkoSearchResult;
  }

  /** Get a single property by id. */
  async getProperty(id: number): Promise<TokkoProperty> {
    const res = await this._fetch(`/property/${id}/`, {});
    if (!res.ok) throw new Error(`Tokko ${res.status}: ${await res.text()}`);
    return (await res.json()) as TokkoProperty;
  }

  private _fetch(path: string, params: Record<string, any>): Promise<Response> {
    const url = new URL(this.baseUrl + path);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('format', 'json');
    url.searchParams.set('lang', 'es_ar');
    for (const [k, v] of Object.entries(params)) {
      if (v === undefined || v === null) continue;
      url.searchParams.set(k, String(v));
    }
    return fetch(url.toString(), { headers: { Accept: 'application/json' } });
  }
}

// ─── Helpers to convert Tokko → our PlacaData ────────────────────────────────
import type { PlacaData } from '@/types';

export function tokkoToPlacaData(p: TokkoProperty): Partial<PlacaData> {
  // Find Venta first, fall back to Alquiler
  const op = p.operations?.find((o) => o.operation_type === 'Venta') || p.operations?.[0];
  const price = op?.prices?.[0];
  const formattedPrice = price?.price
    ? String(Math.round(price.price)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
    : '';

  const addr = p.fake_address || p.address || p.publication_title || '';
  const barrio = p.location?.name || '';
  const m2 = String(p.surface_covered || p.roofed_surface || p.total_surface || p.surface_total || '').replace(/\.0+$/, '');

  return {
    addr,
    barrio,
    amb: String(p.room_amount || ''),
    m2,
    baths: String(p.bathroom_amount || ''),
    cochera: (p.parking_lot_amount && p.parking_lot_amount > 0 ? 'Sí' : 'No') as any,
    price: formattedPrice,
    currency: (price?.currency || 'USD') as any,
    op: (op?.operation_type === 'Alquiler' ? 'Alquiler' : 'Venta') as any,
    expensas: p.expenses ? String(p.expenses) : '',
    antiguedad: p.age ? String(p.age) : '',
    desc: stripHtml(p.description || p.rich_description || '').slice(0, 140),
    listingUrl: p.public_url || '',
  };
}

export function tokkoPhotoUrls(p: TokkoProperty, max = 10): string[] {
  if (!p.photos) return [];
  return p.photos
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .filter((ph) => !ph.is_blueprint)
    .map((ph) => ph.image || ph.thumb || '')
    .filter(Boolean)
    .slice(0, max);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
