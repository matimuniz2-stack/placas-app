import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { toCanvas } from 'html-to-image';
import { usePlacaStore } from './store';

// ─── Motion + Easing ─────────────────────────────────────────────────────────
export type MotionStyle =
  | 'zoom-in'
  | 'zoom-out'
  | 'pan-right'
  | 'pan-left'
  | 'pan-up'
  | 'pan-down'
  | 'orbit-cw'
  | 'orbit-ccw'
  | 'static';

// Will be reassigned below once MOTION_BANK_CONTINUOUS is declared (forward reference workaround).
// We re-export the same array so existing code continues to use MOTION_BANK as the source of truth.
let MOTION_BANK: MotionStyle[] = [];

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

interface Motion { zoom: number; panX: number; panY: number; rot: number }

function getMotion(style: MotionStyle, t: number, zoomAmount: number, w: number, h: number): Motion {
  if (style === 'static') return { zoom: 1, panX: 0, panY: 0, rot: 0 };
  // Stretch the t range so we never hit the very slow extremes (no "pause" at the
  // start or end of clips). t now maps [0,1] → [0.08, 0.92] which keeps motion
  // perceptually constant across the whole clip.
  const tStretched = 0.08 + t * 0.84;
  // easeInOutSine is more uniform than cubic → no "freeze" at the edges
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
}

// Motion pattern that pairs each clip with its inverse for visual continuity.
// Zoom-in (ends zoomed) → Zoom-out (starts zoomed) → no visual jump.
// Pan-right (ends shifted) → Pan-left (starts shifted) → continuous.
const MOTION_BANK_CONTINUOUS: MotionStyle[] = [
  'zoom-in', 'zoom-out',
  'pan-right', 'pan-left',
  'zoom-in', 'zoom-out',
  'pan-up', 'pan-down',
  'orbit-cw', 'orbit-ccw',
];
MOTION_BANK = MOTION_BANK_CONTINUOUS;

// ─── Types ───────────────────────────────────────────────────────────────────
export type Transition = 'cut' | 'fade' | 'slide-left' | 'slide-up' | 'zoom-blur';
export type Preset = 'cinematic' | 'energetic' | 'minimal' | 'pro' | 'viral';
export type ColorGrade = 'none' | 'cinematic-teal' | 'warm-sunset' | 'cold-blue' | 'vintage-film' | 'punchy-estate' | 'premium-gold';
export type EffectsLevel = 'off' | 'subtle' | 'viral' | 'cinematic';
export type TextStyle = 'off' | 'bold' | 'minimal' | 'elegant';

export type MediaItem =
  | {
      id: string; type: 'photo'; url: string;
      duration?: number; motion?: MotionStyle;
      speed?: number;            // 1 = normal (only meaningful for videos but harmless on photos)
      reverse?: boolean;         // only meaningful for videos
      volume?: number;           // 0..100
      transitionIn?: { type: Transition; duration: number };  // override per-gap (before this clip)
    }
  | {
      id: string; type: 'video'; url: string;
      duration?: number; motion?: MotionStyle;
      trimStart?: number; trimEnd?: number;
      videoDuration?: number; videoWidth?: number; videoHeight?: number;
      speed?: number;
      reverse?: boolean;
      volume?: number;
      transitionIn?: { type: Transition; duration: number };
    };

export interface PlacaData {
  addr?: string;
  barrio?: string;
  price?: string;
  currency?: string;
  amb?: string;
  m2?: string;
  baths?: string;
  op?: string;
  handle?: string;
}

export interface ReelOpts {
  placaEl: HTMLElement;
  format: 'story' | 'post';
  durationPerPhoto: number;
  fps: number;
  kenBurnsZoom: number;
  transition: Transition;
  transitionDuration: number;
  content: 'photos' | 'placa';
  vignette: boolean;
  cinematicLook: boolean;
  hd: boolean;
  intro: boolean;
  outro: boolean;
  items?: MediaItem[];
  bitrate?: number;

  // New effects
  effectsLevel: EffectsLevel;     // master switch for the effects pack
  colorGrade: ColorGrade;         // LUT-style color grading
  speedRamp: boolean;             // varied per-clip durations for viral pacing
  zoomPunch: boolean;             // extra zoom at the tail of each clip
  lightLeak: boolean;             // moving warm gradient overlay
  filmGrain: boolean;             // grain texture
  rgbSplit: boolean;              // RGB split on transitions
  glitchFlash: boolean;           // short white flashes on cuts

  // Animated text overlays (only meaningful when content === 'photos')
  textOverlays: TextStyle;
  textData?: PlacaData;           // data shown in the overlays

  onProgress?: (phase: 'capturing' | 'encoding', current: number, total: number) => void;
  onAbort?: () => boolean;
}

export interface ReelResult { blob: Blob; width: number; height: number; duration: number }

export const PRESETS: Record<Preset, Partial<ReelOpts>> = {
  cinematic: { durationPerPhoto: 4, fps: 30, kenBurnsZoom: 1.14, transition: 'fade',       transitionDuration: 0.7, vignette: true,  cinematicLook: true,  hd: true,  intro: true,  outro: true,  bitrate: 12_000_000, effectsLevel: 'cinematic', colorGrade: 'cinematic-teal', speedRamp: false, zoomPunch: true,  lightLeak: true,  filmGrain: true,  rgbSplit: false, glitchFlash: false, textOverlays: 'elegant' },
  energetic: { durationPerPhoto: 2, fps: 60, kenBurnsZoom: 1.28, transition: 'slide-left', transitionDuration: 0.3, vignette: false, cinematicLook: true,  hd: false, intro: false, outro: true,  bitrate: 10_000_000, effectsLevel: 'viral',     colorGrade: 'punchy-estate',  speedRamp: true,  zoomPunch: true,  lightLeak: false, filmGrain: false, rgbSplit: true,  glitchFlash: true,  textOverlays: 'bold'    },
  minimal:   { durationPerPhoto: 5, fps: 30, kenBurnsZoom: 1.08, transition: 'cut',        transitionDuration: 0.0, vignette: false, cinematicLook: false, hd: false, intro: false, outro: false, bitrate: 8_000_000 , effectsLevel: 'off',       colorGrade: 'none',           speedRamp: false, zoomPunch: false, lightLeak: false, filmGrain: false, rgbSplit: false, glitchFlash: false, textOverlays: 'minimal' },
  pro:       { durationPerPhoto: 3, fps: 30, kenBurnsZoom: 1.18, transition: 'fade',       transitionDuration: 0.5, vignette: true,  cinematicLook: true,  hd: true,  intro: true,  outro: true,  bitrate: 14_000_000, effectsLevel: 'cinematic', colorGrade: 'premium-gold',   speedRamp: false, zoomPunch: true,  lightLeak: true,  filmGrain: true,  rgbSplit: false, glitchFlash: false, textOverlays: 'elegant' },
  viral:     { durationPerPhoto: 1.5,fps: 30, kenBurnsZoom: 1.30, transition: 'cut',        transitionDuration: 0.0, vignette: true,  cinematicLook: false, hd: true,  intro: false, outro: true,  bitrate: 14_000_000, effectsLevel: 'viral',     colorGrade: 'punchy-estate',  speedRamp: true,  zoomPunch: true,  lightLeak: true,  filmGrain: true,  rgbSplit: true,  glitchFlash: true,  textOverlays: 'bold'    },
};

export function isReelSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

// ─── Asset loaders (with limits and cleanup) ─────────────────────────────────
const MAX_BITMAP_SIDE = 2160;

async function loadPhotoBitmap(url: string): Promise<{ bm: ImageBitmap; w: number; h: number }> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = url;
  await new Promise<void>((res, rej) => {
    if (img.complete && img.naturalWidth > 0) res();
    else { img.onload = () => res(); img.onerror = () => rej(new Error('Foto no se pudo cargar')); }
  });
  // Down-scale large photos so we don't blow memory
  const longer = Math.max(img.naturalWidth, img.naturalHeight);
  let bm: ImageBitmap;
  if (longer > MAX_BITMAP_SIDE) {
    const scale = MAX_BITMAP_SIDE / longer;
    bm = await createImageBitmap(img, {
      resizeWidth: Math.round(img.naturalWidth * scale),
      resizeHeight: Math.round(img.naturalHeight * scale),
      resizeQuality: 'high',
    });
  } else {
    bm = await createImageBitmap(img);
  }
  return { bm, w: bm.width, h: bm.height };
}

async function makeVideoElement(url: string): Promise<HTMLVideoElement> {
  const v = document.createElement('video');
  v.crossOrigin = 'anonymous';
  v.muted = true;
  (v as any).playsInline = true;
  v.preload = 'auto';
  v.src = url;
  await new Promise<void>((res, rej) => {
    const onMeta = () => { v.removeEventListener('loadedmetadata', onMeta); res(); };
    const onErr  = () => { v.removeEventListener('error', onErr); rej(new Error('Video no se pudo cargar')); };
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('error', onErr);
    setTimeout(() => rej(new Error('Timeout cargando video')), 30000);
  });
  return v;
}

async function seekVideoTo(v: HTMLVideoElement, t: number): Promise<void> {
  return new Promise<void>((resolve) => {
    // Prefer requestVideoFrameCallback when available (frame-accurate)
    const rVfc = (v as any).requestVideoFrameCallback as undefined | ((cb: any) => number);
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    if (rVfc) {
      rVfc.call(v, () => finish());
    } else {
      v.addEventListener('seeked', finish, { once: true });
    }
    try { v.currentTime = Math.max(0, Math.min(t, (v.duration || t) - 0.001)); } catch { finish(); }
    setTimeout(finish, 250); // fallback so we never hang
  });
}

// ─── Main generator ──────────────────────────────────────────────────────────
export async function generateReel(opts: ReelOpts): Promise<ReelResult> {
  if (!isReelSupported()) throw new Error('Tu navegador no soporta WebCodecs. Probá con Chrome o Edge actualizado.');

  const store = usePlacaStore.getState();
  const photos = store.photos;

  // Resolve items: explicit, or default to store photos as photo items
  const baseItems: MediaItem[] =
    opts.items && opts.items.length > 0
      ? opts.items
      : photos.map((p, i) => ({ id: 'p' + i, type: 'photo' as const, url: p.url }));

  if (baseItems.length === 0) throw new Error('Agregá al menos una foto o video al timeline.');

  const W = 1080;
  const H = opts.format === 'story' ? 1920 : 1350;
  const captureScale = opts.hd ? 2 : 1;
  const CW = W * captureScale;
  const CH = H * captureScale;

  // ─── Pre-load assets (photos → bitmaps · videos → HTMLVideoElement) ────────
  type LoadedItem =
    | { kind: 'photo'; item: MediaItem; bitmap: ImageBitmap; w: number; h: number }
    | { kind: 'video'; item: MediaItem; video: HTMLVideoElement; w: number; h: number; trimStart: number; trimEnd: number };

  const loaded: LoadedItem[] = [];
  let placaCloseBitmap: ImageBitmap | null = null;
  const originalIdx = store.activePhotoIdx;
  let cleaned = false;

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    for (const li of loaded) {
      if (li.kind === 'photo') li.bitmap.close?.();
      else { try { li.video.pause(); li.video.removeAttribute('src'); li.video.load(); } catch {} }
    }
    placaCloseBitmap?.close?.();
    usePlacaStore.setState({ activePhotoIdx: originalIdx });
  };

  try {
    for (let i = 0; i < baseItems.length; i++) {
      if (opts.onAbort?.()) throw new Error('Cancelado');
      opts.onProgress?.('capturing', i + 1, baseItems.length + (opts.outro ? 1 : 0));

      const item = baseItems[i];

      if (opts.content === 'placa' && item.type === 'photo') {
        // Capture full placa with this photo
        const photoIdx = photos.findIndex((p) => p.url === item.url);
        if (photoIdx >= 0) usePlacaStore.setState({ activePhotoIdx: photoIdx });
        await new Promise((r) => setTimeout(r, 200));
        if (document.fonts?.ready) { try { await document.fonts.ready; } catch {} }
        const canvas = await toCanvas(opts.placaEl, {
          width: W, height: H, pixelRatio: captureScale, cacheBust: true,
          filter: (el) => el.tagName !== 'LINK' || !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test((el as HTMLLinkElement).href || ''),
        });
        const bm = await createImageBitmap(canvas);
        loaded.push({ kind: 'photo', item, bitmap: bm, w: CW, h: CH });
      } else if (item.type === 'photo') {
        const { bm, w, h } = await loadPhotoBitmap(item.url);
        loaded.push({ kind: 'photo', item, bitmap: bm, w, h });
      } else {
        const v = await makeVideoElement(item.url);
        const duration = item.videoDuration ?? v.duration ?? 0;
        const trimStart = Math.max(0, Math.min(duration, item.trimStart ?? 0));
        const trimEnd = Math.max(trimStart + 0.1, Math.min(duration, item.trimEnd ?? duration));
        loaded.push({
          kind: 'video',
          item,
          video: v,
          w: v.videoWidth || W,
          h: v.videoHeight || H,
          trimStart,
          trimEnd,
        });
      }

      // Yield to the UI between heavy loads so it doesn't freeze
      await new Promise((r) => setTimeout(r, 0));
    }

    if (opts.outro) {
      opts.onProgress?.('capturing', baseItems.length + 1, baseItems.length + 1);
      usePlacaStore.setState({ activePhotoIdx: originalIdx });
      await new Promise((r) => setTimeout(r, 200));
      if (document.fonts?.ready) { try { await document.fonts.ready; } catch {} }
      const canvas = await toCanvas(opts.placaEl, {
        width: W, height: H, pixelRatio: captureScale, cacheBust: true,
        filter: (el) => el.tagName !== 'LINK' || !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test((el as HTMLLinkElement).href || ''),
      });
      placaCloseBitmap = await createImageBitmap(canvas);
    }
  } catch (e) {
    cleanup();
    throw e;
  } finally {
    usePlacaStore.setState({ activePhotoIdx: originalIdx });
    await new Promise((r) => setTimeout(r, 80));
  }

  // ─── Setup muxer + video encoder ────────────────────────────────────────────
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: W, height: H, frameRate: opts.fps },
    fastStart: 'in-memory',
  });

  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder', e),
  });
  const bitrate = opts.bitrate || (opts.hd ? 14_000_000 : 10_000_000);
  const codecs = ['avc1.640032', 'avc1.640028', 'avc1.4d0028', 'avc1.42e028'];
  let configured = false;
  for (const codec of codecs) {
    try {
      const supp = await VideoEncoder.isConfigSupported({ codec, width: W, height: H, framerate: opts.fps, bitrate });
      if (supp.supported) {
        videoEncoder.configure({ codec, width: W, height: H, framerate: opts.fps, bitrate });
        configured = true;
        break;
      }
    } catch {}
  }
  if (!configured) { cleanup(); throw new Error('No se pudo configurar el encoder H.264.'); }

  // ─── Compute clip durations & frame counts ──────────────────────────────────
  const usPerFrame = Math.round(1_000_000 / opts.fps);
  const introFrames = opts.intro ? Math.round(1.2 * opts.fps) : 0;
  const outroFrames = opts.outro ? Math.round(1.8 * opts.fps) : 0;

  // Speed ramp pattern: short-short-LONG-short-short-LONG... viral pacing
  const SPEED_RAMP = [0.6, 0.55, 1.6, 0.7, 0.6, 1.5, 0.55, 0.7, 1.4];

  const clipFrames: number[] = loaded.map((li, i) => {
    let dur: number;
    if (li.kind === 'video') {
      const cap = li.trimEnd - li.trimStart;
      dur = Math.max(0.5, li.item.duration ?? cap);
      dur = Math.min(dur, cap || dur);
    } else {
      const base = Math.max(0.5, li.item.duration ?? opts.durationPerPhoto);
      const factor = opts.speedRamp ? SPEED_RAMP[i % SPEED_RAMP.length] : 1;
      dur = Math.max(0.4, base * factor);
    }
    return Math.max(1, Math.round(dur * opts.fps));
  });
  const totalClipFrames = clipFrames.reduce((s, n) => s + n, 0);
  const totalFrames = introFrames + totalClipFrames + outroFrames;
  const transitionFrames = opts.transition !== 'cut' ? Math.round(opts.transitionDuration * opts.fps) : 0;

  // Canvas
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : document.createElement('canvas');
  if (!(canvas instanceof OffscreenCanvas)) { canvas.width = W; canvas.height = H; }
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!ctx) { cleanup(); throw new Error('Canvas 2D context no disponible'); }

  // ─── Draw helpers ───────────────────────────────────────────────────────────
  const drawCoverImg = (src: CanvasImageSource, sw: number, sh: number, m: Motion) => {
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
  };

  const applyCinematicLook = () => {
    if (!opts.cinematicLook) return;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.fillStyle = 'rgba(255, 240, 220, 0.06)';
    ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'soft-light';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };

  const drawVignette = () => {
    if (!opts.vignette) return;
    const grad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.7);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.18)');
    grad.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  };

  // ─── Effects pack ───────────────────────────────────────────────────────────
  const applyColorGrade = () => {
    if (!opts.colorGrade || opts.colorGrade === 'none') return;
    ctx.save();
    switch (opts.colorGrade) {
      case 'cinematic-teal':
        // shadows → teal, highlights → orange (Hollywood look)
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(20, 80, 100, 0.18)';
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(255, 160, 80, 0.14)';
        ctx.fillRect(0, 0, W, H);
        break;
      case 'warm-sunset':
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 150, 80, 0.16)';
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(255, 220, 200, 0.06)';
        ctx.fillRect(0, 0, W, H);
        break;
      case 'cold-blue':
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(60, 90, 180, 0.18)';
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.10)';
        ctx.fillRect(0, 0, W, H);
        break;
      case 'vintage-film':
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(180, 130, 90, 0.18)';
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'multiply';
        ctx.fillStyle = 'rgba(255, 240, 200, 0.06)';
        ctx.fillRect(0, 0, W, H);
        // faded highlights
        ctx.globalCompositeOperation = 'screen';
        ctx.fillStyle = 'rgba(30, 20, 10, 0.08)';
        ctx.fillRect(0, 0, W, H);
        break;
      case 'punchy-estate':
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.20)';
        ctx.fillRect(0, 0, W, H);
        break;
      case 'premium-gold':
        ctx.globalCompositeOperation = 'overlay';
        ctx.fillStyle = 'rgba(201, 168, 107, 0.14)';
        ctx.fillRect(0, 0, W, H);
        ctx.globalCompositeOperation = 'soft-light';
        ctx.fillStyle = 'rgba(20, 10, 0, 0.20)';
        ctx.fillRect(0, 0, W, H);
        break;
    }
    ctx.restore();
  };

  // Pre-baked film grain — created once, reused every frame with translation
  let grainCanvas: HTMLCanvasElement | OffscreenCanvas | null = null;
  if (opts.filmGrain) {
    const GS = 512;
    grainCanvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(GS, GS) : (() => { const c = document.createElement('canvas'); c.width = GS; c.height = GS; return c; })();
    const gctx = grainCanvas.getContext('2d') as any;
    const img = gctx.createImageData(GS, GS);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() * 255) | 0;
      img.data[i] = n; img.data[i + 1] = n; img.data[i + 2] = n; img.data[i + 3] = 255;
    }
    gctx.putImageData(img, 0, 0);
  }

  const drawFilmGrain = (frameIdx: number) => {
    if (!opts.filmGrain || !grainCanvas) return;
    // shift grain every frame so it animates
    const ox = ((frameIdx * 17) % grainCanvas.width) - grainCanvas.width / 2;
    const oy = ((frameIdx * 31) % grainCanvas.height) - grainCanvas.height / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.07;
    // tile grain across the whole frame
    for (let y = oy; y < H; y += grainCanvas.height) {
      for (let x = ox; x < W; x += grainCanvas.width) {
        ctx.drawImage(grainCanvas as any, x, y);
      }
    }
    ctx.restore();
  };

  const drawLightLeak = (globalT: number) => {
    if (!opts.lightLeak) return;
    // Diagonal warm gradient that travels across the frame slowly
    const phase = (globalT * 0.5) % 1;
    const cx = W * (0.2 + 0.6 * phase);
    const cy = H * (0.3 + 0.4 * phase);
    const radius = Math.max(W, H) * 0.6;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    grad.addColorStop(0, 'rgba(255, 200, 130, 0.22)');
    grad.addColorStop(0.4, 'rgba(255, 160, 90, 0.10)');
    grad.addColorStop(1, 'rgba(255, 100, 50, 0)');
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };

  const drawGlitchFlash = (intensity: number) => {
    if (!opts.glitchFlash || intensity <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(255,255,255,${intensity})`;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  };

  // Smart text overlays — driven by clip index over time
  const fitText = (text: string, maxWidth: number, baseSize: number, font: string): number => {
    let size = baseSize;
    ctx.font = `${size}px ${font}`;
    while (ctx.measureText(text).width > maxWidth && size > 18) {
      size -= 4;
      ctx.font = `${size}px ${font}`;
    }
    return size;
  };

  const drawTextOverlay = (clipIdx: number, t: number) => {
    if (opts.textOverlays === 'off' || opts.content === 'placa') return;
    const data = opts.textData;
    if (!data) return;

    const style = opts.textOverlays;
    const isBold = style === 'bold';
    const isElegant = style === 'elegant';
    const fontHeader = isBold ? "'Anton'" : isElegant ? "'Italiana'" : "'Inter'";
    const fontMain = isBold ? "'Bebas Neue'" : isElegant ? "'Cormorant Garamond'" : "'Inter'";
    const fontData = "'IBM Plex Mono'";

    // Choose what to show on each clip
    let header = '';
    let main = '';
    let footer = '';
    const op = (data.op || 'VENTA').toUpperCase();
    const opLabel = op === 'ALQUILER' ? 'EN ALQUILER' : 'EN VENTA';

    if (clipIdx === 0) {
      header = opLabel;
      main = (data.barrio || data.addr || '').toUpperCase();
    } else if (clipIdx === 1) {
      header = 'DIRECCIÓN';
      main = data.addr || '';
    } else if (clipIdx === 2) {
      const parts: string[] = [];
      if (data.amb) parts.push(`${data.amb} amb`);
      if (data.m2) parts.push(`${data.m2} m²`);
      if (data.baths) parts.push(`${data.baths} baños`);
      header = 'DETALLES';
      main = parts.join(' · ').toUpperCase();
    } else if (data.price) {
      header = data.currency || 'USD';
      main = data.price;
    } else {
      footer = data.handle || '@zamboni.inmobiliaria';
    }

    // Entrance: 0..0.18 slide+fade in. Hold. Exit: 0.85..1 fade out.
    let alpha = 1;
    let yOffset = 0;
    let scale = 1;
    if (t < 0.18) {
      const k = t / 0.18;
      const eased = easeOutQuart(k);
      alpha = eased;
      yOffset = (1 - eased) * 30;
      scale = 0.92 + 0.08 * eased;
    } else if (t > 0.85) {
      const k = (t - 0.85) / 0.15;
      alpha = 1 - easeInOutCubic(k);
    }
    if (alpha <= 0.01) return;

    // Position: lower-left third for cinematic feel
    const padding = W * 0.06;
    const baseY = H * 0.78;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(padding, baseY + yOffset);
    ctx.scale(scale, scale);

    // Subtle backdrop (only on photo content)
    if (isBold || isElegant) {
      ctx.save();
      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      const padW = W * 0.6;
      const padH = H * 0.12;
      ctx.fillRect(-padding * 0.3, -padH * 0.7, padW + padding * 0.6, padH * 1.4);
      ctx.restore();
    }

    if (header) {
      ctx.fillStyle = '#de1f1a';
      const hs = isBold ? 32 : 26;
      ctx.font = `700 ${hs}px ${fontHeader}`;
      ctx.fillText(header.toUpperCase(), 0, 0);
    }
    if (main) {
      ctx.fillStyle = '#ffffff';
      const baseSize = isBold ? 128 : 84;
      const size = fitText(main, W * 0.85, baseSize, fontMain);
      ctx.font = `${isBold ? 700 : 500} ${size}px ${fontMain}`;
      ctx.fillText(main, 0, size * 1.05);
    }
    if (footer) {
      ctx.fillStyle = '#ffffff';
      ctx.font = `500 38px ${fontData}`;
      ctx.fillText(footer, 0, 38);
    }

    ctx.restore();
  };

  const motionFor = (idx: number): MotionStyle => loaded[idx].item.motion || MOTION_BANK[idx % MOTION_BANK.length];

  // Helper: render a single clip's source at progress t (0..1)
  const renderClipAt = async (clipIdx: number, t: number, alpha = 1, motionOverride?: MotionStyle, extraZoom = 0) => {
    const li = loaded[clipIdx];
    const motion = motionOverride ?? motionFor(clipIdx);
    const m = getMotion(motion, t, opts.kenBurnsZoom - 1, W, H);
    if (extraZoom !== 0) m.zoom += extraZoom;
    if (li.kind === 'photo') {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawCoverImg(li.bitmap, li.w, li.h, m);
      ctx.restore();
    } else {
      const targetTime = li.trimStart + (li.trimEnd - li.trimStart) * t;
      await seekVideoTo(li.video, targetTime);
      ctx.save();
      ctx.globalAlpha = alpha;
      drawCoverImg(li.video, li.w, li.h, m);
      ctx.restore();
    }
  };

  // Zoom punch: subtle extra zoom at the tail of each clip for that "TikTok cut" feel
  const punchAt = (localFrame: number, total: number): number => {
    if (!opts.zoomPunch) return 0;
    const window = Math.min(8, Math.floor(total * 0.25));
    if (localFrame < total - window) return 0;
    const k = (localFrame - (total - window)) / window; // 0..1 over the punch window
    return 0.06 * easeOutQuart(k);
  };

  // RGB split during last frames of a transition (subtle chromatic aberration)
  const drawRGBSplit = async (clipIdx: number, t: number, intensity: number) => {
    if (!opts.rgbSplit || intensity <= 0) return;
    const off = 4 * intensity;
    const li = loaded[clipIdx];
    const motion = motionFor(clipIdx);
    const m = getMotion(motion, t, opts.kenBurnsZoom - 1, W, H);
    const src: CanvasImageSource = li.kind === 'photo' ? li.bitmap : li.video;
    const sw = li.kind === 'photo' ? li.w : li.w;
    const sh = li.kind === 'photo' ? li.h : li.h;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.35;
    // red channel offset right
    ctx.filter = 'url(#__none) saturate(2) hue-rotate(0deg)'; // best-effort, browsers may ignore
    ctx.translate(off, 0);
    drawCoverImg(src, sw, sh, { ...m, zoom: m.zoom });
    ctx.translate(-2 * off, 0);
    drawCoverImg(src, sw, sh, { ...m, zoom: m.zoom });
    ctx.restore();
  };

  // ─── Frame loop ─────────────────────────────────────────────────────────────
  // Precompute cumulative frame offsets per clip
  const clipStartFrame: number[] = [];
  {
    let acc = 0;
    for (const n of clipFrames) { clipStartFrame.push(acc); acc += n; }
  }

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (opts.onAbort?.()) {
      try { videoEncoder.close(); } catch {}
      cleanup();
      throw new Error('Cancelado');
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // INTRO
    if (frameIdx < introFrames) {
      const t = frameIdx / Math.max(1, introFrames - 1);
      const eased = easeOutQuart(t);
      await renderClipAt(0, 1 - eased * 0.4, eased, 'zoom-out', 0);

      // Logo Z big
      const logoScale = 0.6 + 0.4 * easeInOutCubic(t);
      const logoSize = Math.min(W, H) * 0.32 * logoScale;
      ctx.save();
      ctx.globalAlpha = 1 - smoothstep(Math.max(0, (t - 0.6) / 0.4));
      ctx.fillStyle = '#de1f1a';
      const cx = W / 2; const cy = H / 2; const ls = logoSize;
      ctx.beginPath();
      ctx.moveTo(cx - ls * 0.45, cy - ls * 0.5);
      ctx.lineTo(cx + ls * 0.45, cy - ls * 0.5);
      ctx.lineTo(cx + ls * 0.45, cy - ls * 0.3);
      ctx.lineTo(cx - ls * 0.15, cy + ls * 0.3);
      ctx.lineTo(cx + ls * 0.45, cy + ls * 0.3);
      ctx.lineTo(cx + ls * 0.45, cy + ls * 0.5);
      ctx.lineTo(cx - ls * 0.45, cy + ls * 0.5);
      ctx.lineTo(cx - ls * 0.45, cy + ls * 0.3);
      ctx.lineTo(cx + ls * 0.15, cy - ls * 0.3);
      ctx.lineTo(cx - ls * 0.45, cy - ls * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      applyColorGrade();
      drawLightLeak(frameIdx / Math.max(1, totalFrames - 1));
      applyCinematicLook();
      drawFilmGrain(frameIdx);
      drawVignette();
    }
    // OUTRO
    else if (frameIdx >= totalFrames - outroFrames) {
      const oIdx = frameIdx - (totalFrames - outroFrames);
      const t = oIdx / Math.max(1, outroFrames - 1);
      const eased = easeOutQuart(t);

      // Fade out from last clip
      if (eased < 1 && loaded.length > 0) {
        await renderClipAt(loaded.length - 1, 1, 1 - eased);
      }
      if (placaCloseBitmap) {
        const m: Motion = { zoom: 1 + 0.04 * easeInOutCubic(t), panX: 0, panY: 0, rot: 0 };
        ctx.save();
        ctx.globalAlpha = eased;
        drawCoverImg(placaCloseBitmap, CW, CH, m);
        ctx.restore();
      }
    }
    // MAIN
    else {
      const seqIdx = frameIdx - introFrames;
      let clipIdx = 0;
      for (let i = 0; i < clipStartFrame.length; i++) {
        if (seqIdx >= clipStartFrame[i] && seqIdx < clipStartFrame[i] + clipFrames[i]) {
          clipIdx = i; break;
        }
      }
      const localFrame = seqIdx - clipStartFrame[clipIdx];
      const localTotal = clipFrames[clipIdx];
      const t = localFrame / Math.max(1, localTotal - 1);
      const extraZoom = punchAt(localFrame, localTotal);

      await renderClipAt(clipIdx, t, 1, undefined, extraZoom);

      // Transition into next clip at tail. Crucially: the next clip's motion
      // ALSO progresses during the fade, so the second photo isn't frozen.
      let transA = 0;
      if (transitionFrames > 0 && clipIdx < loaded.length - 1 && localFrame >= localTotal - transitionFrames) {
        const a = (localFrame - (localTotal - transitionFrames)) / transitionFrames;
        transA = a;
        const nextLocalFrame = a * transitionFrames; // how far into the next clip we are
        const nextT = Math.min(1, nextLocalFrame / Math.max(1, clipFrames[clipIdx + 1] - 1));
        if (opts.transition === 'fade') {
          await renderClipAt(clipIdx + 1, nextT, easeInOutCubic(a), undefined, 0);
        } else if (opts.transition === 'slide-left') {
          const offset = (1 - easeOutQuart(a)) * W;
          ctx.save();
          ctx.translate(offset, 0);
          await renderClipAt(clipIdx + 1, nextT, 1);
          ctx.restore();
        } else if (opts.transition === 'slide-up') {
          const offset = (1 - easeOutQuart(a)) * H;
          ctx.save();
          ctx.translate(0, offset);
          await renderClipAt(clipIdx + 1, nextT, 1);
          ctx.restore();
        } else if (opts.transition === 'zoom-blur') {
          ctx.save();
          ctx.filter = `blur(${(1 - a) * 8}px)`;
          await renderClipAt(clipIdx + 1, nextT, easeInOutCubic(a));
          ctx.filter = 'none';
          ctx.restore();
        }
      }

      // RGB split on cuts: kicks in only when zoomPunch peaks (tail of clip)
      if (extraZoom > 0 && opts.rgbSplit) {
        await drawRGBSplit(clipIdx, t, extraZoom / 0.06);
      }

      // Glitch flash at the very start of a clip
      if (opts.glitchFlash && localFrame < 2 && clipIdx > 0) {
        drawGlitchFlash(0.85 * (1 - localFrame / 2));
      }

      // Effects stack (order matters: grade → leak → look → grain → vignette → text)
      applyColorGrade();
      drawLightLeak(frameIdx / Math.max(1, totalFrames - 1));
      applyCinematicLook();
      drawFilmGrain(frameIdx);
      drawVignette();
      drawTextOverlay(clipIdx, t);
    }

    // Encode frame
    let frame: VideoFrame;
    try {
      frame = new VideoFrame(canvas as any, {
        timestamp: frameIdx * usPerFrame,
        duration: usPerFrame,
      });
    } catch (e) {
      // Skip frame on error rather than crash entire encode
      console.warn('VideoFrame create failed at', frameIdx, e);
      continue;
    }
    try {
      videoEncoder.encode(frame, { keyFrame: frameIdx === 0 || frameIdx % opts.fps === 0 });
    } finally {
      frame.close();
    }

    opts.onProgress?.('encoding', frameIdx + 1, totalFrames);

    // Aggressive backpressure: never let encoder queue grow unbounded
    if (videoEncoder.encodeQueueSize > 6) {
      while (videoEncoder.encodeQueueSize > 2) {
        await new Promise((r) => setTimeout(r, 4));
      }
    } else if (frameIdx % 12 === 0) {
      // periodic yield so UI stays responsive
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();
  muxer.finalize();

  cleanup();

  return {
    blob: new Blob([target.buffer], { type: 'video/mp4' }),
    width: W,
    height: H,
    duration: totalFrames / opts.fps,
  };
}

// ─── Helpers exposed for the UI ──────────────────────────────────────────────
export async function probeVideo(url: string): Promise<{ duration: number; width: number; height: number }> {
  const v = document.createElement('video');
  v.muted = true; (v as any).playsInline = true; v.preload = 'metadata'; v.src = url;
  await new Promise<void>((res, rej) => {
    v.addEventListener('loadedmetadata', () => res(), { once: true });
    v.addEventListener('error', () => rej(new Error('Video metadata failed')), { once: true });
    setTimeout(() => rej(new Error('Timeout video metadata')), 15000);
  });
  return { duration: v.duration || 0, width: v.videoWidth, height: v.videoHeight };
}

export async function captureVideoPoster(url: string, t = 0.1): Promise<string> {
  const v = await makeVideoElement(url);
  await seekVideoTo(v, Math.min(t, (v.duration || 1) - 0.05));
  const c = document.createElement('canvas');
  c.width = v.videoWidth || 320; c.height = v.videoHeight || 480;
  const cx = c.getContext('2d')!;
  cx.drawImage(v, 0, 0, c.width, c.height);
  const url2 = c.toDataURL('image/jpeg', 0.7);
  try { v.pause(); v.removeAttribute('src'); v.load(); } catch {}
  return url2;
}
