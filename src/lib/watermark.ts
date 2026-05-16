// Remove the red Zamboni-style watermark from a photo.
// Strategy:
//   1. Load image into an offscreen canvas at native resolution
//   2. Detect the red watermark region (cluster of red pixels near the center)
//      using HSV analysis (high saturation + red hue)
//   3. Build a binary mask of watermark pixels (slightly dilated for safety)
//   4. Content-aware fill: for every masked pixel, compute a weighted average
//      of the nearest non-masked pixels in 8 directions (raycasting)
//   5. Light gaussian blur on the inpainted region to hide edge artifacts
// This is a pure JS/canvas implementation (no WASM, no server) — works in any browser.

export interface WatermarkBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WatermarkRemoveOpts {
  manualBounds?: WatermarkBounds; // if set, skips auto-detect
  centerOnly?: boolean;            // restrict search to center 40% (default true)
  redThresholdH?: number;          // hue degrees (default 8 → ±8° around red)
  redThresholdS?: number;          // min saturation 0..1 (default 0.45)
  redThresholdV?: number;          // min value 0..1 (default 0.4)
  dilate?: number;                 // pixels to grow the mask outward (default 4)
}

/**
 * Public: take a photo URL/dataURL, remove the central red watermark,
 * return a new dataURL (JPEG 0.92).
 */
export async function removeWatermarkZ(imageUrl: string, opts: WatermarkRemoveOpts = {}): Promise<string> {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.decoding = 'async';
  img.src = imageUrl;
  await new Promise<void>((res, rej) => {
    if (img.complete && img.naturalWidth > 0) res();
    else {
      img.onload = () => res();
      img.onerror = () => rej(new Error('No se pudo cargar la foto'));
    }
  });

  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);

  const imgData = ctx.getImageData(0, 0, W, H);
  const pixels = imgData.data;

  // Build mask (1 = watermark, 0 = keep)
  const mask = new Uint8Array(W * H);

  if (opts.manualBounds) {
    const b = opts.manualBounds;
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) {
        if (x >= 0 && x < W && y >= 0 && y < H) mask[y * W + x] = 1;
      }
    }
  } else {
    autoDetectRedMask(pixels, mask, W, H, opts);
  }

  // Dilate the mask (grow outward) so we cover edge antialiasing of the watermark
  const dilateBy = Math.max(2, opts.dilate ?? Math.round(Math.min(W, H) * 0.004));
  const dilated = dilateMask(mask, W, H, dilateBy);

  // Inpaint: for each masked pixel, raycast in 8 directions to find nearest
  // non-masked pixel; weighted average by inverse distance.
  inpaintRaycast(pixels, dilated, W, H);

  // Tiny blur over the masked region only
  blurMaskedRegion(pixels, dilated, W, H, 2);

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.92);
}

// ─── Auto-detect red watermark area ──────────────────────────────────────────
function autoDetectRedMask(
  data: Uint8ClampedArray,
  mask: Uint8Array,
  W: number,
  H: number,
  opts: WatermarkRemoveOpts,
) {
  const minS = opts.redThresholdS ?? 0.45;
  const minV = opts.redThresholdV ?? 0.4;
  const hueTol = opts.redThresholdH ?? 12;
  const centerOnly = opts.centerOnly !== false;

  const cx = W / 2;
  const cy = H / 2;
  const searchRadius = centerOnly ? Math.max(W, H) * 0.30 : Math.max(W, H);

  let minX = W, minY = H, maxX = 0, maxY = 0;
  let redCount = 0;
  const tempMask = new Uint8Array(W * H);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (centerOnly) {
        const dx = x - cx;
        const dy = y - cy;
        if (Math.sqrt(dx * dx + dy * dy) > searchRadius) continue;
      }
      const i = (y * W + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const [h, s, v] = rgbToHsv(r, g, b);
      const isRed = (h <= hueTol || h >= 360 - hueTol) && s >= minS && v >= minV;
      if (isRed) {
        tempMask[y * W + x] = 1;
        redCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (redCount < 50) return; // probably no watermark

  // Only keep the largest connected component near the center (avoids picking
  // up small red objects in the photo like cars, signs, sofas)
  const components = findConnectedComponents(tempMask, W, H);
  let best: { size: number; cx: number; cy: number; pixels: number[] } | null = null;
  let bestScore = 0;
  for (const c of components) {
    if (c.size < 80) continue; // skip tiny noise
    const distToCenter = Math.sqrt((c.cx - cx) ** 2 + (c.cy - cy) ** 2);
    // score = size penalized by distance from center
    const score = c.size / (1 + distToCenter * 0.02);
    if (score > bestScore) { bestScore = score; best = c; }
  }
  if (!best) return;

  for (const p of best.pixels) mask[p] = 1;

  // Expand to the convex bounding rectangle of that component (watermarks are
  // usually solid rectangles; this captures any anti-aliased white/dark pixels
  // we may have missed inside the watermark)
  let bx0 = W, by0 = H, bx1 = 0, by1 = 0;
  for (const p of best.pixels) {
    const x = p % W;
    const y = Math.floor(p / W);
    if (x < bx0) bx0 = x; if (x > bx1) bx1 = x;
    if (y < by0) by0 = y; if (y > by1) by1 = y;
  }
  // Fill the bounding rect with the mask (only for the connected component area
  // — preserves rectangle shape of typical watermarks)
  for (let y = by0; y <= by1; y++) {
    for (let x = bx0; x <= bx1; x++) {
      mask[y * W + x] = 1;
    }
  }
}

function findConnectedComponents(mask: Uint8Array, W: number, H: number) {
  const visited = new Uint8Array(W * H);
  const out: { size: number; cx: number; cy: number; pixels: number[] }[] = [];
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && !visited[i]) {
      const pixels: number[] = [];
      let sumX = 0, sumY = 0;
      const stack: number[] = [i];
      while (stack.length) {
        const p = stack.pop()!;
        if (visited[p] || !mask[p]) continue;
        visited[p] = 1;
        pixels.push(p);
        const x = p % W;
        const y = Math.floor(p / W);
        sumX += x; sumY += y;
        if (x > 0) stack.push(p - 1);
        if (x < W - 1) stack.push(p + 1);
        if (y > 0) stack.push(p - W);
        if (y < H - 1) stack.push(p + W);
      }
      out.push({ size: pixels.length, cx: sumX / pixels.length, cy: sumY / pixels.length, pixels });
    }
  }
  return out;
}

// ─── Dilate mask ─────────────────────────────────────────────────────────────
function dilateMask(src: Uint8Array, W: number, H: number, radius: number): Uint8Array {
  let out = new Uint8Array(src);
  for (let r = 0; r < radius; r++) {
    const next = new Uint8Array(out);
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (out[i]) continue;
        if (out[i - 1] || out[i + 1] || out[i - W] || out[i + W]) next[i] = 1;
      }
    }
    out = next;
  }
  return out;
}

// ─── Inpaint by 8-direction raycasting ───────────────────────────────────────
function inpaintRaycast(data: Uint8ClampedArray, mask: Uint8Array, W: number, H: number) {
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [-1, 1], [1, -1], [-1, -1],
  ];
  // Pre-compute borders we can sample from (non-masked pixels)
  // We'll write a temp Uint8 copy so reads don't pull already-inpainted pixels
  const orig = new Uint8ClampedArray(data);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      if (!mask[i]) continue;

      let sumR = 0, sumG = 0, sumB = 0, sumW = 0;
      for (const [dx, dy] of dirs) {
        // March until we exit the mask
        let nx = x + dx;
        let ny = y + dy;
        let steps = 0;
        const maxSteps = Math.max(W, H);
        while (nx >= 0 && ny >= 0 && nx < W && ny < H && steps < maxSteps) {
          const ni = ny * W + nx;
          if (!mask[ni]) {
            const pi = ni * 4;
            const r = orig[pi];
            const g = orig[pi + 1];
            const b = orig[pi + 2];
            const w = 1 / (steps + 1);
            sumR += r * w;
            sumG += g * w;
            sumB += b * w;
            sumW += w;
            break;
          }
          nx += dx;
          ny += dy;
          steps++;
        }
      }
      if (sumW > 0) {
        const pi = i * 4;
        data[pi]     = sumR / sumW;
        data[pi + 1] = sumG / sumW;
        data[pi + 2] = sumB / sumW;
      }
    }
  }
}

// ─── Tiny gaussian blur restricted to masked area ────────────────────────────
function blurMaskedRegion(data: Uint8ClampedArray, mask: Uint8Array, W: number, H: number, passes: number) {
  // Slightly enlarge mask so blur covers the seam between original and inpainted area
  const seam = dilateMask(mask, W, H, 2);
  const out = new Uint8ClampedArray(data);

  for (let pass = 0; pass < passes; pass++) {
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const i = y * W + x;
        if (!seam[i]) continue;
        const pi = i * 4;
        // 3x3 box blur
        let r = 0, g = 0, b = 0;
        let n = 0;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            const ni = ((y + oy) * W + (x + ox)) * 4;
            r += data[ni];
            g += data[ni + 1];
            b += data[ni + 2];
            n++;
          }
        }
        out[pi]     = r / n;
        out[pi + 1] = g / n;
        out[pi + 2] = b / n;
      }
    }
    data.set(out);
  }
}

// ─── HSV helper ──────────────────────────────────────────────────────────────
function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  const v = max;
  return [h, s, v];
}
