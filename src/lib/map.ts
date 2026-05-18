// Mini-map rendering using public OSM-compatible tile servers.
// - Geocoding: Nominatim (OpenStreetMap, free, no key)
// - Tiles: Carto basemaps CDN (free for personal/light use, CORS open)
// Returns a dataURL with a clean map centered on the given address + pin marker.

export interface GeocodeResult {
  lat: number;
  lng: number;
  displayName?: string;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddress(query: string, signal?: AbortSignal): Promise<GeocodeResult | null> {
  if (!query.trim()) return null;
  const url = `${NOMINATIM_BASE}?q=${encodeURIComponent(query + ', Buenos Aires, Argentina')}&format=json&limit=1&addressdetails=0`;
  try {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
      displayName: data[0].display_name,
    };
  } catch (e) {
    console.warn('geocode failed', e);
    return null;
  }
}

// Web Mercator projection
function lng2tile(lng: number, zoom: number): number { return ((lng + 180) / 360) * Math.pow(2, zoom); }
function lat2tile(lat: number, zoom: number): number {
  return ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * Math.pow(2, zoom);
}

export type MapStyle = 'light' | 'dark' | 'voyager' | 'positron';

function tileUrl(style: MapStyle, z: number, x: number, y: number): string {
  // Carto basemaps free tier — CORS allowed
  const styleMap: Record<MapStyle, string> = {
    light: 'light_all',
    dark: 'dark_all',
    voyager: 'rastertiles/voyager',
    positron: 'light_nolabels',
  };
  const s = styleMap[style] || 'light_all';
  return `https://cartodb-basemaps-a.global.ssl.fastly.net/${s}/${z}/${x}/${y}@2x.png`;
}

export interface RenderMapOpts {
  lat: number;
  lng: number;
  zoom?: number;           // default 15
  width: number;           // output width px
  height: number;          // output height px
  style?: MapStyle;        // default 'voyager'
  pinColor?: string;       // default '#de1f1a'
  showPin?: boolean;       // default true
}

export async function renderStaticMap(opts: RenderMapOpts): Promise<string> {
  const TILE = 256;
  const tileSize = TILE * 2; // @2x retina tiles
  const z = opts.zoom ?? 15;
  const style: MapStyle = opts.style || 'voyager';
  const pinColor = opts.pinColor || '#de1f1a';

  // Compute float tile coords for the center
  const cxTile = lng2tile(opts.lng, z);
  const cyTile = lat2tile(opts.lat, z);

  // How many tiles we need around the center to fill width/height
  const tilesX = Math.ceil(opts.width / tileSize) + 2;
  const tilesY = Math.ceil(opts.height / tileSize) + 2;

  const minTileX = Math.floor(cxTile - tilesX / 2);
  const minTileY = Math.floor(cyTile - tilesY / 2);

  // Offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = opts.width;
  canvas.height = opts.height;
  const ctx = canvas.getContext('2d')!;

  // Center pixel = canvas center; offsets to tile origins
  const cxPx = (cxTile - minTileX) * tileSize;
  const cyPx = (cyTile - minTileY) * tileSize;
  const offsetX = opts.width / 2 - cxPx;
  const offsetY = opts.height / 2 - cyPx;

  // Background fallback
  ctx.fillStyle = style === 'dark' ? '#1a1a1a' : '#f0f0f0';
  ctx.fillRect(0, 0, opts.width, opts.height);

  // Fetch + draw tiles in parallel
  const tiles: Promise<void>[] = [];
  for (let ty = 0; ty < tilesY; ty++) {
    for (let tx = 0; tx < tilesX; tx++) {
      const tileX = minTileX + tx;
      const tileY = minTileY + ty;
      const maxTile = Math.pow(2, z);
      if (tileX < 0 || tileY < 0 || tileX >= maxTile || tileY >= maxTile) continue;
      tiles.push((async () => {
        try {
          const res = await fetch(tileUrl(style, z, tileX, tileY), { mode: 'cors' });
          if (!res.ok) return;
          const blob = await res.blob();
          const bm = await createImageBitmap(blob);
          ctx.drawImage(bm, offsetX + tx * tileSize, offsetY + ty * tileSize, tileSize, tileSize);
          bm.close?.();
        } catch (e) {
          // Tile failed silently; gray background fills in
        }
      })());
    }
  }
  await Promise.all(tiles);

  // Draw pin
  if (opts.showPin !== false) {
    const px = opts.width / 2;
    const py = opts.height / 2;
    const pinSize = Math.max(28, Math.min(opts.width, opts.height) * 0.06);

    // Pin shadow
    ctx.beginPath();
    ctx.ellipse(px, py + 4, pinSize * 0.45, pinSize * 0.18, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fill();

    // Pin body (teardrop)
    ctx.beginPath();
    ctx.moveTo(px, py + pinSize * 0.05);
    ctx.lineTo(px - pinSize * 0.5, py - pinSize * 0.6);
    ctx.bezierCurveTo(
      px - pinSize * 0.5, py - pinSize * 1.4,
      px + pinSize * 0.5, py - pinSize * 1.4,
      px + pinSize * 0.5, py - pinSize * 0.6,
    );
    ctx.closePath();
    ctx.fillStyle = pinColor;
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Pin inner dot
    ctx.beginPath();
    ctx.arc(px, py - pinSize * 0.85, pinSize * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

// Helper for the placa: address → cached map dataURL
const cache = new Map<string, string>();
export async function getMapForAddress(address: string, opts: Omit<RenderMapOpts, 'lat' | 'lng'> & { style?: MapStyle }): Promise<{ url: string; lat: number; lng: number } | null> {
  const key = `${address}|${opts.width}x${opts.height}|z${opts.zoom || 15}|${opts.style || 'voyager'}`;
  if (cache.has(key)) {
    // Return cached but without lat/lng (kept off-cache for simplicity)
    return null; // force refetch to keep API simple; cache is below
  }
  const geo = await geocodeAddress(address);
  if (!geo) return null;
  const url = await renderStaticMap({ lat: geo.lat, lng: geo.lng, ...opts });
  cache.set(key, url);
  return { url, lat: geo.lat, lng: geo.lng };
}
