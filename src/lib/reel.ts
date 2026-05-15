import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
import { toCanvas } from 'html-to-image';
import { usePlacaStore } from './store';

export interface ReelOpts {
  placaEl: HTMLElement;
  format: 'story' | 'post';
  durationPerPhoto: number;
  fps: number;
  kenBurnsZoom: number; // 1.15 means zoom from 1.0 to 1.15
  transition: 'cut' | 'fade';
  transitionDuration: number; // seconds
  onProgress?: (phase: 'capturing' | 'encoding', current: number, total: number) => void;
  onAbort?: () => boolean;
}

export interface ReelResult {
  blob: Blob;
  width: number;
  height: number;
  duration: number;
}

export function isReelSupported(): boolean {
  return typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
}

export async function generateReel(opts: ReelOpts): Promise<ReelResult> {
  if (!isReelSupported()) {
    throw new Error('Tu navegador no soporta WebCodecs. Probá con Chrome o Edge actualizado.');
  }

  const store = usePlacaStore.getState();
  const photos = store.photos;
  if (photos.length === 0) throw new Error('Subí al menos una foto para generar el Reel.');

  const W = 1080;
  const H = opts.format === 'story' ? 1920 : 1350;

  // 1) Capture one placa bitmap per photo (sequentially, switching activePhotoIdx)
  const originalIdx = store.activePhotoIdx;
  const bitmaps: ImageBitmap[] = [];
  try {
    for (let i = 0; i < photos.length; i++) {
      if (opts.onAbort?.()) throw new Error('Cancelado');
      opts.onProgress?.('capturing', i + 1, photos.length);
      usePlacaStore.setState({ activePhotoIdx: i });
      // Let React + fonts settle
      await new Promise((r) => setTimeout(r, 220));
      if (document.fonts?.ready) {
        try { await document.fonts.ready; } catch {}
      }
      const canvas = await toCanvas(opts.placaEl, {
        width: W,
        height: H,
        pixelRatio: 1,
        cacheBust: true,
        filter: (el) => {
          if (el.tagName === 'LINK') {
            const href = (el as HTMLLinkElement).href;
            if (href && /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(href)) return false;
          }
          return true;
        },
      });
      const bitmap = await createImageBitmap(canvas);
      bitmaps.push(bitmap);
    }
  } finally {
    usePlacaStore.setState({ activePhotoIdx: originalIdx });
    await new Promise((r) => setTimeout(r, 100));
  }

  // 2) Setup mp4-muxer + VideoEncoder
  const target = new ArrayBufferTarget();
  const muxer = new Muxer({
    target,
    video: { codec: 'avc', width: W, height: H, frameRate: opts.fps },
    fastStart: 'in-memory',
  });

  const encoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => {
      console.error('VideoEncoder error', e);
    },
  });

  // Try high-profile first, fall back to baseline
  const codecs = ['avc1.640028', 'avc1.4d0028', 'avc1.42e028', 'avc1.42001f'];
  let configured = false;
  for (const codec of codecs) {
    try {
      const support = await VideoEncoder.isConfigSupported({
        codec,
        width: W,
        height: H,
        framerate: opts.fps,
        bitrate: 6_000_000,
      });
      if (support.supported) {
        encoder.configure({
          codec,
          width: W,
          height: H,
          framerate: opts.fps,
          bitrate: 6_000_000,
        });
        configured = true;
        break;
      }
    } catch {
      // try next codec
    }
  }
  if (!configured) throw new Error('No se pudo configurar el encoder H.264.');

  // 3) Render frames
  const canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : document.createElement('canvas');
  if (!(canvas instanceof OffscreenCanvas)) {
    (canvas as HTMLCanvasElement).width = W;
    (canvas as HTMLCanvasElement).height = H;
  }
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
  if (!ctx) throw new Error('Canvas 2D context no disponible');

  const framesPerPhoto = Math.round(opts.durationPerPhoto * opts.fps);
  const transitionFrames = opts.transition === 'fade' ? Math.round(opts.transitionDuration * opts.fps) : 0;
  const totalFrames = bitmaps.length * framesPerPhoto;
  const microsecondsPerFrame = Math.round(1_000_000 / opts.fps);

  for (let frameIdx = 0; frameIdx < totalFrames; frameIdx++) {
    if (opts.onAbort?.()) {
      try { encoder.close(); } catch {}
      throw new Error('Cancelado');
    }

    const photoIdx = Math.floor(frameIdx / framesPerPhoto);
    const frameInPhoto = frameIdx % framesPerPhoto;
    const t = frameInPhoto / Math.max(1, framesPerPhoto - 1); // 0..1

    // Ken Burns: alternate zoom-in and zoom-out per photo, with subtle pan
    const direction = photoIdx % 2 === 0 ? 1 : -1;
    const zoomDelta = (opts.kenBurnsZoom - 1) * (direction === 1 ? t : 1 - t);
    const zoom = 1 + zoomDelta;
    const panX = (direction === 1 ? -t : t - 1) * 0.04 * W; // ~4% pan
    const panY = (direction === 1 ? -t : t - 1) * 0.02 * H;

    const drawW = W * zoom;
    const drawH = H * zoom;
    const dx = (W - drawW) / 2 + panX;
    const dy = (H - drawH) / 2 + panY;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    ctx.drawImage(bitmaps[photoIdx], dx, dy, drawW, drawH);

    // Crossfade with next photo at the tail of each clip
    if (
      opts.transition === 'fade' &&
      transitionFrames > 0 &&
      photoIdx < bitmaps.length - 1 &&
      frameInPhoto >= framesPerPhoto - transitionFrames
    ) {
      const a = (frameInPhoto - (framesPerPhoto - transitionFrames)) / transitionFrames;
      const next = bitmaps[photoIdx + 1];
      ctx.save();
      ctx.globalAlpha = a;
      ctx.drawImage(next, 0, 0, W, H);
      ctx.restore();
    }

    const frame = new VideoFrame(canvas as any, {
      timestamp: frameIdx * microsecondsPerFrame,
      duration: microsecondsPerFrame,
    });
    encoder.encode(frame, { keyFrame: frameInPhoto === 0 || frameIdx === 0 });
    frame.close();

    opts.onProgress?.('encoding', frameIdx + 1, totalFrames);

    // Flush encoder queue periodically to avoid backpressure
    if (encoder.encodeQueueSize > 8) {
      while (encoder.encodeQueueSize > 4) {
        await new Promise((r) => setTimeout(r, 4));
      }
    }
  }

  await encoder.flush();
  encoder.close();
  muxer.finalize();

  // Release bitmaps
  for (const b of bitmaps) b.close?.();

  return {
    blob: new Blob([target.buffer], { type: 'video/mp4' }),
    width: W,
    height: H,
    duration: (totalFrames / opts.fps),
  };
}
