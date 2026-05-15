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
  | 'orbit-ccw';

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
const easeInQuart = (t: number) => t * t * t * t;
const smoothstep = (t: number) => t * t * (3 - 2 * t);

interface Motion { zoom: number; panX: number; panY: number; rot: number }

function getMotion(style: MotionStyle, t: number, zoomAmount: number, w: number, h: number): Motion {
  const e = easeInOutCubic(t);
  const halfZ = zoomAmount * 0.5;
  switch (style) {
    case 'zoom-in':
      return { zoom: 1 + zoomAmount * e, panX: 0, panY: 0, rot: 0 };
    case 'zoom-out':
      return { zoom: 1 + zoomAmount - zoomAmount * e, panX: 0, panY: 0, rot: 0 };
    case 'pan-right':
      return { zoom: 1 + halfZ, panX: -0.08 * w * e, panY: 0, rot: 0 };
    case 'pan-left':
      return { zoom: 1 + halfZ, panX: 0.08 * w * e, panY: 0, rot: 0 };
    case 'pan-up':
      return { zoom: 1 + halfZ, panX: 0, panY: 0.06 * h * e, rot: 0 };
    case 'pan-down':
      return { zoom: 1 + halfZ, panX: 0, panY: -0.06 * h * e, rot: 0 };
    case 'orbit-cw':
      return { zoom: 1 + halfZ, panX: -0.04 * w * e, panY: -0.03 * h * e, rot: 0.4 * e };
    case 'orbit-ccw':
      return { zoom: 1 + halfZ, panX: 0.04 * w * e, panY: -0.03 * h * e, rot: -0.4 * e };
  }
}

// ─── Public types ────────────────────────────────────────────────────────────
export type Transition = 'cut' | 'fade' | 'slide-left' | 'slide-up' | 'zoom-blur';
export type Preset = 'cinematic' | 'energetic' | 'minimal' | 'pro';

export interface ReelOpts {
  placaEl: HTMLElement;
  format: 'story' | 'post';
  durationPerPhoto: number;
  fps: number;
  kenBurnsZoom: number;          // 1.0 + delta (e.g. 1.18 = 18% zoom)
  transition: Transition;
  transitionDuration: number;     // seconds
  content: 'photos' | 'placa';
  vignette: boolean;              // dark corners
  cinematicLook: boolean;         // contrast/saturation boost
  hd: boolean;                    // 2x resolution capture+downscale for sharper output
  intro: boolean;                 // 1.2s intro with logo
  outro: boolean;                 // 1.8s outro with full placa (data summary)
  audioFile?: File | null;
  bitrate?: number;               // bits per second, default 10M
  onProgress?: (phase: 'capturing' | 'encoding' | 'audio', current: number, total: number) => void;
  onAbort?: () => boolean;
}

export interface ReelResult {
  blob: Blob;
  width: number;
  height: number;
  duration: number;
}

export const PRESETS: Record<Preset, Partial<ReelOpts>> = {
  cinematic: { durationPerPhoto: 4, fps: 30, kenBurnsZoom: 1.14, transition: 'fade',       transitionDuration: 0.7, vignette: true,  cinematicLook: true,  hd: true,  intro: true, outro: true,  bitrate: 12_000_000 },
  energetic: { durationPerPhoto: 2, fps: 60, kenBurnsZoom: 1.28, transition: 'slide-left', transitionDuration: 0.3, vignette: false, cinematicLook: true,  hd: false, intro: false, outro: true, bitrate: 10_000_000 },
  minimal:   { durationPerPhoto: 5, fps: 30, kenBurnsZoom: 1.08, transition: 'cut',        transitionDuration: 0.0, vignette: false, cinematicLook: false, hd: false, intro: false, outro: false, bitrate: 8_000_000 },
  pro:       { durationPerPhoto: 3, fps: 30, kenBurnsZoom: 1.18, transition: 'fade',       transitionDuration: 0.5, vignette: true,  cinematicLook: true,  hd: true,  intro: true, outro: true,  bitrate: 14_000_000 },
};

export function isReelSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

// ─── Main generator ──────────────────────────────────────────────────────────
export async function generateReel(opts: ReelOpts): Promise<ReelResult> {
  if (!isReelSupported()) throw new Error('Tu navegador no soporta WebCodecs. Probá con Chrome o Edge actualizado.');

  const store = usePlacaStore.getState();
  const photos = store.photos;
  if (photos.length === 0) throw new Error('Subí al menos una foto para generar el Reel.');

  // Output dimensions: 1080×1920 (story) or 1080×1350 (post). HD captures at 2x then downscales.
  const W = 1080;
  const H = opts.format === 'story' ? 1920 : 1350;
  const captureScale = opts.hd ? 2 : 1;
  const CW = W * captureScale;
  const CH = H * captureScale;

  // ─── Capture bitmaps ────────────────────────────────────────────────────────
  const originalIdx = store.activePhotoIdx;
  const bitmaps: ImageBitmap[] = [];
  const dims: Array<{ w: number; h: number }> = [];
  let placaCloseBitmap: ImageBitmap | null = null; // for outro

  try {
    for (let i = 0; i < photos.length; i++) {
      if (opts.onAbort?.()) throw new Error('Cancelado');
      opts.onProgress?.('capturing', i + 1, photos.length + (opts.outro ? 1 : 0));

      if (opts.content === 'photos') {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = photos[i].url;
        await new Promise<void>((res, rej) => {
          if (img.complete && img.naturalWidth > 0) res();
          else { img.onload = () => res(); img.onerror = () => rej(new Error('No se pudo cargar la foto ' + (i + 1))); }
        });
        const bm = await createImageBitmap(img);
        bitmaps.push(bm);
        dims.push({ w: img.naturalWidth, h: img.naturalHeight });
      } else {
        usePlacaStore.setState({ activePhotoIdx: i });
        await new Promise((r) => setTimeout(r, 200));
        if (document.fonts?.ready) { try { await document.fonts.ready; } catch {} }
        const canvas = await toCanvas(opts.placaEl, {
          width: W, height: H, pixelRatio: captureScale, cacheBust: true,
          filter: (el) => el.tagName !== 'LINK' || !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(((el as HTMLLinkElement).href || '')),
        });
        const bitmap = await createImageBitmap(canvas);
        bitmaps.push(bitmap);
        dims.push({ w: CW, h: CH });
      }
    }

    // Outro: capture the full placa (with all data + logo + stickers)
    if (opts.outro) {
      opts.onProgress?.('capturing', photos.length + 1, photos.length + 1);
      // ensure original photo is shown in outro
      usePlacaStore.setState({ activePhotoIdx: originalIdx });
      await new Promise((r) => setTimeout(r, 200));
      if (document.fonts?.ready) { try { await document.fonts.ready; } catch {} }
      const canvas = await toCanvas(opts.placaEl, {
        width: W, height: H, pixelRatio: captureScale, cacheBust: true,
        filter: (el) => el.tagName !== 'LINK' || !/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(((el as HTMLLinkElement).href || '')),
      });
      placaCloseBitmap = await createImageBitmap(canvas);
    }
  } finally {
    usePlacaStore.setState({ activePhotoIdx: originalIdx });
    await new Promise((r) => setTimeout(r, 100));
  }

  // ─── Audio decode (optional) ────────────────────────────────────────────────
  let audioBuffer: AudioBuffer | null = null;
  let audioCtx: AudioContext | null = null;
  if (opts.audioFile) {
    try {
      opts.onProgress?.('audio', 0, 1);
      audioCtx = new AudioContext({ sampleRate: 48000 });
      const arr = await opts.audioFile.arrayBuffer();
      audioBuffer = await audioCtx.decodeAudioData(arr);
    } catch (e) {
      console.warn('Audio decode failed, continuing without music', e);
      audioBuffer = null;
    }
  }

  // ─── Setup muxer + encoders ─────────────────────────────────────────────────
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: W, height: H, frameRate: opts.fps },
    ...(audioBuffer
      ? { audio: { codec: 'aac', numberOfChannels: Math.min(2, audioBuffer.numberOfChannels), sampleRate: 48000 } }
      : {}),
    fastStart: 'in-memory',
  });

  // Video encoder
  const videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error('VideoEncoder error', e),
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
  if (!configured) throw new Error('No se pudo configurar el encoder H.264.');

  // ─── Compute timing ─────────────────────────────────────────────────────────
  const introFrames = opts.intro ? Math.round(1.2 * opts.fps) : 0;
  const outroFrames = opts.outro ? Math.round(1.8 * opts.fps) : 0;
  const framesPerPhoto = Math.round(opts.durationPerPhoto * opts.fps);
  const transitionFrames = opts.transition !== 'cut' ? Math.round(opts.transitionDuration * opts.fps) : 0;
  const totalFrames = introFrames + bitmaps.length * framesPerPhoto + outroFrames;
  const usPerFrame = Math.round(1_000_000 / opts.fps);

  // ─── Canvas ─────────────────────────────────────────────────────────────────
  const canvas: HTMLCanvasElement | OffscreenCanvas =
    typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : document.createElement('canvas');
  if (!(canvas instanceof OffscreenCanvas)) {
    canvas.width = W; canvas.height = H;
  }
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!ctx) throw new Error('Canvas 2D context no disponible');

  // ─── Drawing helpers ────────────────────────────────────────────────────────
  const drawCover = (bm: ImageBitmap, srcDims: { w: number; h: number }, m: Motion) => {
    const srcA = srcDims.w / srcDims.h;
    const dstA = W / H;
    let baseW: number, baseH: number;
    if (srcA > dstA) { baseH = H; baseW = H * srcA; }
    else { baseW = W; baseH = W / srcA; }
    const drawW = baseW * m.zoom;
    const drawH = baseH * m.zoom;
    const dx = (W - drawW) / 2 + m.panX;
    const dy = (H - drawH) / 2 + m.panY;
    if (m.rot !== 0) {
      ctx.save();
      ctx.translate(W / 2, H / 2);
      ctx.rotate((m.rot * Math.PI) / 180);
      ctx.translate(-W / 2, -H / 2);
      ctx.drawImage(bm, dx, dy, drawW, drawH);
      ctx.restore();
    } else {
      ctx.drawImage(bm, dx, dy, drawW, drawH);
    }
  };

  // Cinematic look LUT applied via composite + overlays
  const applyCinematicLook = () => {
    if (!opts.cinematicLook) return;
    // Subtle warm tint + contrast lift
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

  // ─── Frame loop ─────────────────────────────────────────────────────────────
  const motionPerPhoto: MotionStyle[] = bitmaps.map((_, i) => MOTION_BANK[i % MOTION_BANK.length]);

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (opts.onAbort?.()) {
      try { videoEncoder.close(); } catch {}
      throw new Error('Cancelado');
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    // INTRO (logo Z animado + fade in foto 1)
    if (frameIdx < introFrames) {
      const t = frameIdx / Math.max(1, introFrames - 1);
      const eased = easeOutQuart(t);
      // Pre-fade: first photo with slow zoom
      const firstM = getMotion('zoom-out', 1 - eased * 0.4, opts.kenBurnsZoom - 1, W, H);
      ctx.save();
      ctx.globalAlpha = eased;
      drawCover(bitmaps[0], dims[0], firstM);
      ctx.restore();

      // Logo Z big in center, animated scale
      const logoScale = 0.6 + 0.4 * easeInOutCubic(t);
      const logoSize = Math.min(W, H) * 0.32 * logoScale;
      ctx.save();
      ctx.globalAlpha = 1 - smoothstep(Math.max(0, (t - 0.6) / 0.4));
      ctx.fillStyle = '#de1f1a';
      // Draw a stylized Z shape (matches logo aesthetic)
      const cx = W / 2; const cy = H / 2;
      const ls = logoSize;
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
    // OUTRO (placa full con datos)
    else if (frameIdx >= totalFrames - outroFrames) {
      const outroIdx = frameIdx - (totalFrames - outroFrames);
      const t = outroIdx / Math.max(1, outroFrames - 1);
      const eased = easeOutQuart(t);

      // crossfade from last photo to placa
      if (eased < 1 && bitmaps.length > 0) {
        const lastM = getMotion(motionPerPhoto[bitmaps.length - 1], 1, opts.kenBurnsZoom - 1, W, H);
        ctx.save();
        ctx.globalAlpha = 1 - eased;
        drawCover(bitmaps[bitmaps.length - 1], dims[bitmaps.length - 1], lastM);
        ctx.restore();
      }
      if (placaCloseBitmap) {
        ctx.save();
        ctx.globalAlpha = eased;
        // slight zoom on outro placa for life
        const m: Motion = { zoom: 1 + 0.04 * easeInOutCubic(t), panX: 0, panY: 0, rot: 0 };
        drawCover(placaCloseBitmap, { w: CW, h: CH }, m);
        ctx.restore();
      }
    }
    // MAIN CLIPS (Ken Burns sobre cada foto)
    else {
      const seqIdx = frameIdx - introFrames;
      const photoIdx = Math.floor(seqIdx / framesPerPhoto);
      const frameInPhoto = seqIdx % framesPerPhoto;
      const t = frameInPhoto / Math.max(1, framesPerPhoto - 1);
      const motion = motionPerPhoto[photoIdx];

      const m = getMotion(motion, t, opts.kenBurnsZoom - 1, W, H);
      drawCover(bitmaps[photoIdx], dims[photoIdx], m);

      // Transitions
      if (transitionFrames > 0 && photoIdx < bitmaps.length - 1 && frameInPhoto >= framesPerPhoto - transitionFrames) {
        const a = (frameInPhoto - (framesPerPhoto - transitionFrames)) / transitionFrames;
        const nextMotion = motionPerPhoto[photoIdx + 1];
        const nextM = getMotion(nextMotion, 0, opts.kenBurnsZoom - 1, W, H);

        if (opts.transition === 'fade') {
          ctx.save();
          ctx.globalAlpha = easeInOutCubic(a);
          drawCover(bitmaps[photoIdx + 1], dims[photoIdx + 1], nextM);
          ctx.restore();
        } else if (opts.transition === 'slide-left') {
          const offset = (1 - easeOutQuart(a)) * W;
          ctx.save();
          ctx.translate(offset, 0);
          drawCover(bitmaps[photoIdx + 1], dims[photoIdx + 1], nextM);
          ctx.restore();
        } else if (opts.transition === 'slide-up') {
          const offset = (1 - easeOutQuart(a)) * H;
          ctx.save();
          ctx.translate(0, offset);
          drawCover(bitmaps[photoIdx + 1], dims[photoIdx + 1], nextM);
          ctx.restore();
        } else if (opts.transition === 'zoom-blur') {
          ctx.save();
          ctx.globalAlpha = easeInOutCubic(a);
          ctx.filter = `blur(${(1 - a) * 8}px)`;
          const zoomM: Motion = { ...nextM, zoom: nextM.zoom * (1 + 0.15 * (1 - a)) };
          drawCover(bitmaps[photoIdx + 1], dims[photoIdx + 1], zoomM);
          ctx.filter = 'none';
          ctx.restore();
        }
      }

      applyCinematicLook();
      drawVignette();
    }

    const frame = new VideoFrame(canvas as any, {
      timestamp: frameIdx * usPerFrame,
      duration: usPerFrame,
    });
    videoEncoder.encode(frame, { keyFrame: frameIdx === 0 || frameIdx % opts.fps === 0 });
    frame.close();

    opts.onProgress?.('encoding', frameIdx + 1, totalFrames);

    if (videoEncoder.encodeQueueSize > 10) {
      while (videoEncoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 4));
    }
  }

  await videoEncoder.flush();
  videoEncoder.close();

  // ─── Audio encoding (parallel-ish, after video) ─────────────────────────────
  if (audioBuffer && opts.audioFile) {
    try {
      const totalVideoDurSec = totalFrames / opts.fps;
      const numChannels = Math.min(2, audioBuffer.numberOfChannels);
      const sampleRate = 48000;
      const totalSamples = Math.floor(totalVideoDurSec * sampleRate);
      const FRAME_SIZE = 1024;

      const audioEncoder = new AudioEncoder({
        output: (chunk, meta) => muxer.addAudioChunk(chunk, meta),
        error: (e) => console.error('AudioEncoder error', e),
      });
      audioEncoder.configure({
        codec: 'mp4a.40.2',
        numberOfChannels: numChannels,
        sampleRate,
        bitrate: 192_000,
      });

      // Resample to 48k mix-down to numChannels if needed (simple linear)
      const srcRate = audioBuffer.sampleRate;
      const srcLen = audioBuffer.length;
      const ratio = srcRate / sampleRate;

      const get = (ch: number, t: number) => {
        const idx = Math.min(srcLen - 1, Math.max(0, t * ratio));
        const i0 = Math.floor(idx);
        const i1 = Math.min(srcLen - 1, i0 + 1);
        const frac = idx - i0;
        const data = audioBuffer!.getChannelData(Math.min(ch, audioBuffer!.numberOfChannels - 1));
        return data[i0] * (1 - frac) + data[i1] * frac;
      };

      let sampleIdx = 0;
      while (sampleIdx < totalSamples) {
        const n = Math.min(FRAME_SIZE, totalSamples - sampleIdx);
        const buf = new Float32Array(n * numChannels);
        for (let s = 0; s < n; s++) {
          for (let c = 0; c < numChannels; c++) {
            buf[s * numChannels + c] = get(c, sampleIdx + s);
          }
        }
        const ad = new AudioData({
          format: 'f32',
          sampleRate,
          numberOfFrames: n,
          numberOfChannels: numChannels,
          timestamp: Math.round((sampleIdx / sampleRate) * 1_000_000),
          data: buf,
        });
        audioEncoder.encode(ad);
        ad.close();
        sampleIdx += n;
        if (sampleIdx % (FRAME_SIZE * 50) === 0) {
          if (audioEncoder.encodeQueueSize > 16) {
            while (audioEncoder.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 4));
          }
        }
      }
      await audioEncoder.flush();
      audioEncoder.close();
    } catch (e) {
      console.warn('Audio encoding failed, finishing without it', e);
    }
  }
  if (audioCtx) try { audioCtx.close(); } catch {}

  muxer.finalize();

  // Release bitmaps
  for (const b of bitmaps) b.close?.();
  placaCloseBitmap?.close?.();

  return {
    blob: new Blob([target.buffer], { type: 'video/mp4' }),
    width: W,
    height: H,
    duration: totalFrames / opts.fps,
  };
}
