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

const MOTION_BANK: MotionStyle[] = [
  'zoom-in',
  'pan-right',
  'zoom-out',
  'pan-left',
  'pan-down',
  'orbit-cw',
  'zoom-in',
  'pan-up',
  'orbit-ccw',
];

const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutQuart = (t: number) => 1 - Math.pow(1 - t, 4);
const smoothstep = (t: number) => t * t * (3 - 2 * t);

interface Motion { zoom: number; panX: number; panY: number; rot: number }

function getMotion(style: MotionStyle, t: number, zoomAmount: number, w: number, h: number): Motion {
  if (style === 'static') return { zoom: 1, panX: 0, panY: 0, rot: 0 };
  const e = easeInOutCubic(t);
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

// ─── Types ───────────────────────────────────────────────────────────────────
export type Transition = 'cut' | 'fade' | 'slide-left' | 'slide-up' | 'zoom-blur';
export type Preset = 'cinematic' | 'energetic' | 'minimal' | 'pro';

export type MediaItem =
  | { id: string; type: 'photo'; url: string; duration?: number; motion?: MotionStyle }
  | { id: string; type: 'video'; url: string; duration?: number; motion?: MotionStyle; trimStart?: number; trimEnd?: number; videoDuration?: number; videoWidth?: number; videoHeight?: number };

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
  items?: MediaItem[];          // when omitted, falls back to store.photos as photo items
  bitrate?: number;
  onProgress?: (phase: 'capturing' | 'encoding', current: number, total: number) => void;
  onAbort?: () => boolean;
}

export interface ReelResult { blob: Blob; width: number; height: number; duration: number }

export const PRESETS: Record<Preset, Partial<ReelOpts>> = {
  cinematic: { durationPerPhoto: 4, fps: 30, kenBurnsZoom: 1.14, transition: 'fade',       transitionDuration: 0.7, vignette: true,  cinematicLook: true,  hd: true,  intro: true,  outro: true,  bitrate: 12_000_000 },
  energetic: { durationPerPhoto: 2, fps: 60, kenBurnsZoom: 1.28, transition: 'slide-left', transitionDuration: 0.3, vignette: false, cinematicLook: true,  hd: false, intro: false, outro: true,  bitrate: 10_000_000 },
  minimal:   { durationPerPhoto: 5, fps: 30, kenBurnsZoom: 1.08, transition: 'cut',        transitionDuration: 0.0, vignette: false, cinematicLook: false, hd: false, intro: false, outro: false, bitrate: 8_000_000  },
  pro:       { durationPerPhoto: 3, fps: 30, kenBurnsZoom: 1.18, transition: 'fade',       transitionDuration: 0.5, vignette: true,  cinematicLook: true,  hd: true,  intro: true,  outro: true,  bitrate: 14_000_000 },
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

  const clipFrames: number[] = loaded.map((li) => {
    let dur: number;
    if (li.kind === 'video') {
      const cap = li.trimEnd - li.trimStart;
      dur = Math.max(0.5, li.item.duration ?? cap);
      // never longer than the trimmed range
      dur = Math.min(dur, cap || dur);
    } else {
      dur = Math.max(0.5, li.item.duration ?? opts.durationPerPhoto);
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

  const motionFor = (idx: number): MotionStyle => loaded[idx].item.motion || MOTION_BANK[idx % MOTION_BANK.length];

  // Helper: render a single clip's source at progress t (0..1)
  const renderClipAt = async (clipIdx: number, t: number, alpha = 1, motionOverride?: MotionStyle) => {
    const li = loaded[clipIdx];
    const motion = motionOverride ?? motionFor(clipIdx);
    const m = getMotion(motion, t, opts.kenBurnsZoom - 1, W, H);
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
      await renderClipAt(0, 1 - eased * 0.4, eased, 'zoom-out');

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

      applyCinematicLook();
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
      // Find which clip
      let clipIdx = 0;
      for (let i = 0; i < clipStartFrame.length; i++) {
        if (seqIdx >= clipStartFrame[i] && seqIdx < clipStartFrame[i] + clipFrames[i]) {
          clipIdx = i; break;
        }
      }
      const localFrame = seqIdx - clipStartFrame[clipIdx];
      const localTotal = clipFrames[clipIdx];
      const t = localFrame / Math.max(1, localTotal - 1);

      await renderClipAt(clipIdx, t);

      // Transition into next clip at tail
      if (transitionFrames > 0 && clipIdx < loaded.length - 1 && localFrame >= localTotal - transitionFrames) {
        const a = (localFrame - (localTotal - transitionFrames)) / transitionFrames;
        if (opts.transition === 'fade') {
          await renderClipAt(clipIdx + 1, 0, easeInOutCubic(a));
        } else if (opts.transition === 'slide-left') {
          const offset = (1 - easeOutQuart(a)) * W;
          ctx.save();
          ctx.translate(offset, 0);
          await renderClipAt(clipIdx + 1, 0, 1);
          ctx.restore();
        } else if (opts.transition === 'slide-up') {
          const offset = (1 - easeOutQuart(a)) * H;
          ctx.save();
          ctx.translate(0, offset);
          await renderClipAt(clipIdx + 1, 0, 1);
          ctx.restore();
        } else if (opts.transition === 'zoom-blur') {
          ctx.save();
          ctx.filter = `blur(${(1 - a) * 8}px)`;
          await renderClipAt(clipIdx + 1, 0, easeInOutCubic(a));
          ctx.filter = 'none';
          ctx.restore();
        }
      }

      applyCinematicLook();
      drawVignette();
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
