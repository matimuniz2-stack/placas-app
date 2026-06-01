import { toPng, toJpeg } from 'html-to-image';
import JSZip from 'jszip';
import { slugify } from './format';

export type ExportFormat = 'png' | 'jpg' | 'webp';
export type ExportResolution = 1 | 2 | 3;

interface ExportOpts {
  format: ExportFormat;
  resolution: ExportResolution;
  width: number;
  height: number;
}

async function waitFontsReady(): Promise<void> {
  try {
    // @ts-ignore
    if (document.fonts?.ready) await document.fonts.ready;
  } catch {}
  await new Promise((r) => setTimeout(r, 50));
}

async function captureNode(node: HTMLElement, opts: ExportOpts): Promise<string> {
  await waitFontsReady();
  // Filter out external stylesheets html-to-image can't read (cross-origin without CORS).
  // We rely on self-hosted @fontsource so embedded fonts work, and we skip any leftover.
  const filter = (el: Element) => {
    if (el.tagName === 'LINK') {
      const href = (el as HTMLLinkElement).href;
      if (href && /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(href)) return false;
    }
    return true;
  };
  const baseOpts: any = {
    width: opts.width,
    height: opts.height,
    pixelRatio: opts.resolution,
    cacheBust: true,
    skipFonts: false,
    filter,
    style: {
      transform: 'scale(1)',
      transformOrigin: 'top left',
    },
  };
  if (opts.format === 'jpg' || opts.format === 'webp') {
    const quality = opts.format === 'webp' ? 0.9 : 0.92;
    return await toJpeg(node, { ...baseOpts, quality });
  }
  return await toPng(node, baseOpts);
}

export async function captureToDataUrl(
  node: HTMLElement,
  width: number,
  height: number,
  format: ExportFormat = 'png',
  resolution: ExportResolution = 1
): Promise<string> {
  return await captureNode(node, { format, resolution, width, height });
}

/**
 * Captura un thumbnail liviano (jpg, ~200px de ancho) del placa para previews.
 * Best-effort: si falla, el caller debe manejar el error y seguir sin thumb.
 */
export async function captureThumb(node: HTMLElement, width: number, height: number): Promise<string> {
  await waitFontsReady();
  const filter = (el: Element) => {
    if (el.tagName === 'LINK') {
      const href = (el as HTMLLinkElement).href;
      if (href && /fonts\.googleapis\.com|fonts\.gstatic\.com/.test(href)) return false;
    }
    return true;
  };
  return await toJpeg(node, {
    width,
    height,
    pixelRatio: 0.18, // 1080 → ~195px
    quality: 0.7,
    cacheBust: true,
    skipFonts: false,
    filter,
    style: { transform: 'scale(1)', transformOrigin: 'top left' },
  });
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export function buildFilename(
  barrio: string,
  templateId: string,
  width: number,
  height: number,
  ext: ExportFormat
): string {
  const slug = slugify(barrio) || 'placa';
  const final = ext === 'jpg' ? 'jpg' : ext;
  return `zamboni_${slug}_${templateId}_${width}x${height}.${final}`;
}

export async function exportCarouselZip(opts: {
  generateSlide: (index: number) => Promise<string>;
  count: number;
  zipName: string;
  onProgress?: (i: number, total: number) => void;
}): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder(opts.zipName.replace(/\.zip$/, ''));
  for (let i = 0; i < opts.count; i++) {
    opts.onProgress?.(i + 1, opts.count);
    const dataUrl = await opts.generateSlide(i);
    const base64 = dataUrl.split(',')[1];
    folder!.file(`slide_${String(i + 1).padStart(2, '0')}.png`, base64, { base64: true });
  }
  return await zip.generateAsync({ type: 'blob' });
}

export function downloadBlob(blob: Blob, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}
