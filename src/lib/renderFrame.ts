// Single-frame renderer for the live editor preview. Mirrors the logic of
// generateReel but renders ONE frame to a target canvas synchronously (or
// asynchronously for videos that need seeking).
import type { MediaItem, Transition, MotionStyle, ColorGrade, TextStyle, PlacaData } from './reel';

export interface PreviewSettings {
  format: 'story' | 'post';
  kenBurnsZoom: number;
  transition: Transition;
  transitionDuration: number;
  globalDurationPerPhoto: number;
  colorGrade: ColorGrade;
  vignette: boolean;
  cinematicLook: boolean;
  lightLeak: boolean;
  filmGrain: boolean;
  textOverlays: TextStyle;
  textData?: PlacaData;
  content: 'photos' | 'placa';
}

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

const MOTION_BANK: MotionStyle[] = [
  'zoom-in', 'zoom-out', 'pan-right', 'pan-left',
  'zoom-in', 'zoom-out', 'pan-up', 'pan-down', 'orbit-cw', 'orbit-ccw',
];

function getMotion(style: MotionStyle, t: number, zoomAmount: number, w: number, h: number) {
  if (style === 'static') return { zoom: 1, panX: 0, panY: 0, rot: 0 };
  const tStretched = 0.08 + t * 0.84;
  const e = easeInOutSine(tStretched);
  const halfZ = zoomAmount * 0.5;
  switch (style) {
    case 'zoom-in':   return { zoom: 1 + zoomAmount * e, panX: 0, panY: 0, rot: 0 };
    case 'zoom-out':  return { zoom: 1 + zoomAmount - zoomAmount * e, panX: 0, panY: 0, rot: 0 };
    case 'pan-right': return { zoom: 1 + halfZ, panX: -0.08 * w * e, panY: 0, rot: 0 };
    case 'pan-left':  return { zoom: 1 + halfZ, panX:  0.08 * w * e, panY: 0, rot: 0 };
    case 'pan-up':    return { zoom: 1 + halfZ, panX: 0, panY:  0.06 * h * e, rot: 0 };
    case 'pan-down':  return { zoom: 1 + halfZ, panX: 0, panY: -0.06 * h * e, rot: 0 };
    case 'orbit-cw':  return { zoom: 1 + halfZ, panX: -0.04 * w * e, panY: -0.03 * h * e, rot:  0.4 * e };
    case 'orbit-ccw': return { zoom: 1 + halfZ, panX:  0.04 * w * e, panY: -0.03 * h * e, rot: -0.4 * e };
  }
  return { zoom: 1, panX: 0, panY: 0, rot: 0 };
}

// Compute clip durations + start times (seconds)
export interface ClipTiming {
  startSec: number;
  durationSec: number;
}

export function computeTimings(items: MediaItem[], globalDurationPerPhoto: number): ClipTiming[] {
  const out: ClipTiming[] = [];
  let acc = 0;
  for (const item of items) {
    let dur: number;
    if (item.type === 'video') {
      const vd = item.videoDuration ?? 0;
      const ts = item.trimStart ?? 0;
      const te = item.trimEnd ?? vd;
      const cap = Math.max(0.3, te - ts);
      dur = item.duration ?? Math.min(globalDurationPerPhoto, cap);
      dur = Math.min(dur, cap);
    } else {
      dur = item.duration ?? globalDurationPerPhoto;
    }
    // Speed shrinks/expands perceived duration
    const speed = item.speed ?? 1;
    dur = dur / speed;
    out.push({ startSec: acc, durationSec: Math.max(0.1, dur) });
    acc += dur;
  }
  return out;
}

// Asset cache: keep bitmaps/video elements alive across previews so scrubbing
// is fast. The cache is keyed by media item id and url so it correctly evicts
// when items change.
interface AssetCacheEntry {
  url: string;
  bitmap?: ImageBitmap;
  video?: HTMLVideoElement;
  width: number;
  height: number;
}

const assetCache = new Map<string, AssetCacheEntry>();

export function clearAssetCache() {
  for (const e of assetCache.values()) {
    e.bitmap?.close?.();
    if (e.video) {
      try { e.video.pause(); e.video.removeAttribute('src'); e.video.load(); } catch {}
    }
  }
  assetCache.clear();
}

async function getAsset(item: MediaItem): Promise<AssetCacheEntry> {
  const key = item.id + ':' + item.url;
  const cached = assetCache.get(key);
  if (cached) return cached;

  if (item.type === 'photo') {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';
    img.src = item.url;
    await new Promise<void>((res, rej) => {
      if (img.complete && img.naturalWidth > 0) res();
      else { img.onload = () => res(); img.onerror = () => rej(new Error('img load')); }
    });
    const longer = Math.max(img.naturalWidth, img.naturalHeight);
    const MAX = 1920;
    let bm: ImageBitmap;
    if (longer > MAX) {
      const s = MAX / longer;
      bm = await createImageBitmap(img, {
        resizeWidth: Math.round(img.naturalWidth * s),
        resizeHeight: Math.round(img.naturalHeight * s),
        resizeQuality: 'high',
      });
    } else {
      bm = await createImageBitmap(img);
    }
    const entry: AssetCacheEntry = { url: item.url, bitmap: bm, width: bm.width, height: bm.height };
    assetCache.set(key, entry);
    return entry;
  } else {
    const v = document.createElement('video');
    v.crossOrigin = 'anonymous';
    v.muted = true;
    (v as any).playsInline = true;
    v.preload = 'auto';
    v.src = item.url;
    await new Promise<void>((res, rej) => {
      v.addEventListener('loadedmetadata', () => res(), { once: true });
      v.addEventListener('error', () => rej(new Error('video meta')), { once: true });
      setTimeout(() => rej(new Error('video meta timeout')), 15000);
    });
    const entry: AssetCacheEntry = { url: item.url, video: v, width: v.videoWidth, height: v.videoHeight };
    assetCache.set(key, entry);
    return entry;
  }
}

async function seekVideo(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve) => {
    const rVfc = (v as any).requestVideoFrameCallback as undefined | ((cb: any) => number);
    let done = false;
    const fin = () => { if (!done) { done = true; resolve(); } };
    if (rVfc) rVfc.call(v, () => fin());
    else v.addEventListener('seeked', fin, { once: true });
    try { v.currentTime = Math.max(0, Math.min(t, (v.duration || t) - 0.001)); } catch { fin(); }
    setTimeout(fin, 200);
  });
}

function drawCover(ctx: any, src: any, sw: number, sh: number, W: number, H: number, m: { zoom: number; panX: number; panY: number; rot: number }) {
  const srcA = sw / sh;
  const dstA = W / H;
  let baseW: number, baseH: number;
  if (srcA > dstA) { baseH = H; baseW = H * srcA; } else { baseW = W; baseH = W / srcA; }
  const drawW = baseW * m.zoom;
  const drawH = baseH * m.zoom;
  const dx = (W - drawW) / 2 + m.panX;
  const dy = (H - drawH) / 2 + m.panY;
  if (m.rot !== 0) {
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate((m.rot * Math.PI) / 180);
    ctx.translate(-W / 2, -H / 2);
    ctx.drawImage(src, dx, dy, drawW, drawH);
    ctx.restore();
  } else {
    ctx.drawImage(src, dx, dy, drawW, drawH);
  }
}

function applyColorGrade(ctx: any, W: number, H: number, grade: ColorGrade) {
  if (!grade || grade === 'none') return;
  ctx.save();
  switch (grade) {
    case 'cinematic-teal':
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(20, 80, 100, 0.18)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(255, 160, 80, 0.14)'; ctx.fillRect(0, 0, W, H);
      break;
    case 'warm-sunset':
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255, 150, 80, 0.16)'; ctx.fillRect(0, 0, W, H);
      break;
    case 'cold-blue':
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(60, 90, 180, 0.18)'; ctx.fillRect(0, 0, W, H);
      break;
    case 'vintage-film':
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(180, 130, 90, 0.18)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgba(255, 240, 200, 0.06)'; ctx.fillRect(0, 0, W, H);
      break;
    case 'punchy-estate':
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(0, 0, 0, 0.20)'; ctx.fillRect(0, 0, W, H);
      break;
    case 'premium-gold':
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = 'rgba(201, 168, 107, 0.14)'; ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = 'rgba(20, 10, 0, 0.20)'; ctx.fillRect(0, 0, W, H);
      break;
  }
  ctx.restore();
}

function drawVignette(ctx: any, W: number, H: number) {
  const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.18)');
  grad.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
}

function drawCinematicLook(ctx: any, W: number, H: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = 'rgba(255, 240, 220, 0.06)'; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'soft-light';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)'; ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// Main entry: render the frame at given seconds onto the target canvas.
export async function renderPreviewFrame(
  canvas: HTMLCanvasElement,
  items: MediaItem[],
  settings: PreviewSettings,
  timeSec: number,
): Promise<{ totalSec: number; currentClip: number }> {
  const W = 1080;
  const H = settings.format === 'story' ? 1920 : 1350;
  if (canvas.width !== W) canvas.width = W;
  if (canvas.height !== H) canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  if (items.length === 0) {
    ctx.fillStyle = '#444';
    ctx.font = '24px Inter';
    ctx.textAlign = 'center';
    ctx.fillText('Agregá fotos o videos al timeline', W / 2, H / 2);
    return { totalSec: 0, currentClip: -1 };
  }

  const timings = computeTimings(items, settings.globalDurationPerPhoto);
  const totalSec = timings.reduce((s, t) => s + t.durationSec, 0);
  const t = Math.max(0, Math.min(totalSec, timeSec));

  // Find current clip
  let clipIdx = 0;
  for (let i = 0; i < timings.length; i++) {
    if (t >= timings[i].startSec && t < timings[i].startSec + timings[i].durationSec) { clipIdx = i; break; }
    if (i === timings.length - 1) clipIdx = i;
  }
  const tim = timings[clipIdx];
  const localT = Math.max(0, Math.min(1, (t - tim.startSec) / tim.durationSec));

  const item = items[clipIdx];
  const motion = item.motion ?? MOTION_BANK[clipIdx % MOTION_BANK.length];
  const m = getMotion(motion, localT, settings.kenBurnsZoom - 1, W, H);

  try {
    const asset = await getAsset(item);
    if (item.type === 'photo' && asset.bitmap) {
      drawCover(ctx, asset.bitmap, asset.width, asset.height, W, H, m);
    } else if (item.type === 'video' && asset.video) {
      const vd = item.videoDuration ?? asset.video.duration ?? 0;
      const ts = item.trimStart ?? 0;
      const te = item.trimEnd ?? vd;
      let targetTime = ts + (te - ts) * localT;
      if (item.reverse) targetTime = te - (te - ts) * localT;
      await seekVideo(asset.video, targetTime);
      drawCover(ctx, asset.video, asset.width, asset.height, W, H, m);
    }

    // Crossfade INTO next clip during transition tail
    const trans = item.transitionIn && clipIdx > 0 ? item.transitionIn : { type: settings.transition, duration: settings.transitionDuration };
    // Apply transition coming INTO this clip from previous if we're in the head
    if (clipIdx > 0 && trans.type !== 'cut' && trans.duration > 0) {
      const headLen = trans.duration;
      if (localT * tim.durationSec < headLen) {
        const a = (localT * tim.durationSec) / headLen;
        const prevItem = items[clipIdx - 1];
        const prevMotion = prevItem.motion ?? MOTION_BANK[(clipIdx - 1) % MOTION_BANK.length];
        const prevAsset = await getAsset(prevItem);
        // prev clip is at its end (t close to 1)
        const prevT = Math.min(1, 1 - 0.0001);
        const pm = getMotion(prevMotion, prevT, settings.kenBurnsZoom - 1, W, H);
        ctx.save();
        ctx.globalAlpha = 1 - easeInOutCubic(a);
        if (prevItem.type === 'photo' && prevAsset.bitmap) {
          drawCover(ctx, prevAsset.bitmap, prevAsset.width, prevAsset.height, W, H, pm);
        } else if (prevItem.type === 'video' && prevAsset.video) {
          const pvd = prevItem.videoDuration ?? prevAsset.video.duration ?? 0;
          const pts = prevItem.trimStart ?? 0;
          const pte = prevItem.trimEnd ?? pvd;
          let ptt = prevItem.reverse ? pts : pte;
          ptt = Math.max(0, Math.min(pvd, ptt - 0.05));
          await seekVideo(prevAsset.video, ptt);
          drawCover(ctx, prevAsset.video, prevAsset.width, prevAsset.height, W, H, pm);
        }
        ctx.restore();
      }
    }
  } catch (e) {
    console.warn('renderPreviewFrame asset error', e);
  }

  // Effects stack
  applyColorGrade(ctx, W, H, settings.colorGrade);
  if (settings.cinematicLook) drawCinematicLook(ctx, W, H);
  if (settings.vignette) drawVignette(ctx, W, H);

  return { totalSec, currentClip: clipIdx };
}
