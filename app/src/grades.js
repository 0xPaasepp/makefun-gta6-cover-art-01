// Photo grades for Velvet Heat: the dual engine's colour work.
// Every grade is a pure function from a source canvas to a new canvas, so the
// editor can re-grade a panel without touching the original photo.
// photoMode grades use canvas filters + a tint wash; inkMode posterizes with a
// face-aware blend (posterized colour mixed back with the original, so eyes
// and lips keep their modelling instead of flattening into flat shapes).

export const GRADES = ['ink', 'sunset', 'neon', 'golden', 'duotone'];

/** Builds a canvas of the given size holding a copy of `src` drawn to cover it. */
export function coverCanvas(src, w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round(w));
  c.height = Math.max(2, Math.round(h));
  const ctx = c.getContext('2d');
  const s = Math.max(w / src.naturalWidth, h / src.naturalHeight);
  const pw = src.naturalWidth * s;
  const ph = src.naturalHeight * s;
  ctx.drawImage(src, (w - pw) / 2, (h - ph) / 2, pw, ph);
  return c;
}

/** Applies the global sliders (contrast/saturation/brightness/temperature) as a filter string. */
export function sliderFilter(sliders) {
  const c = sliders.contrast ?? 1;
  const s = sliders.saturation ?? 1;
  const b = sliders.brightness ?? 1;
  const t = sliders.temperature ?? 0; // -1 cool .. +1 warm
  const sepia = t > 0 ? t * 0.35 : 0;
  const hue = t < 0 ? t * -12 : t * -6;
  return `contrast(${c}) saturate(${s}) brightness(${b}) sepia(${sepia}) hue-rotate(${hue}deg)`;
}

const TINTS = {
  sunset: ['rgba(255,110,60,0.24)', 'rgba(200,30,110,0.2)'],
  neon: ['rgba(255,40,160,0.26)', 'rgba(20,180,255,0.24)'],
  golden: ['rgba(255,170,60,0.26)', 'rgba(255,120,20,0.12)'],
  duotone: null,
  ink: null,
};

const GRADE_FILTERS = {
  sunset: 'sepia(0.28) hue-rotate(-8deg) saturate(1.15)',
  neon: 'hue-rotate(12deg) saturate(1.35)',
  golden: 'sepia(0.35) saturate(1.1)',
  duotone: '',
  ink: '',
};

/** Photographic grade: filter + warm/cool tint wash. Returns a new canvas. */
export function gradePhotoCanvas(src, w, h, grade, sliders) {
  const c = coverCanvas(src, w, h);
  const ctx = c.getContext('2d');
  const gf = GRADE_FILTERS[grade] ?? '';
  ctx.filter = gf ? `${sliderFilter(sliders)} ${gf}` : sliderFilter(sliders);
  ctx.drawImage(c, 0, 0);
  ctx.filter = 'none';
  if (grade === 'duotone') return duotoneCanvas(c, '#3b1d5e', '#ffd9a0');
  if (grade === 'ink') {
    // Light ink in photo mode: a gentle posterize so the grade button is
    // never a no-op outside the ink engine.
    inkPosterizeCanvas(c, 6, 0.35);
    inkTintCanvas(c);
    return c;
  }
  const tints = TINTS[grade];
  if (tints) {
    const g = ctx.createLinearGradient(0, 0, w * 0.4, h);
    g.addColorStop(0, tints[0]);
    g.addColorStop(1, tints[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  return c;
}

/** Maps luminance onto a two-colour ramp (violet shadows -> cream highlights). */
export function duotoneCanvas(src, dark, light) {
  const w = src.width;
  const h = src.height;
  const ctx = src.getContext('2d');
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const dc = hexRgb(dark);
  const lc = hexRgb(light);
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    const k = Math.pow(lum, 1.15);
    d[i] = dc[0] + (lc[0] - dc[0]) * k;
    d[i + 1] = dc[1] + (lc[1] - dc[1]) * k;
    d[i + 2] = dc[2] + (lc[2] - dc[2]) * k;
  }
  ctx.putImageData(data, 0, 0);
  return src;
}

export function hexRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

/**
 * Face-aware ink/posterize: quantize the colours, then blend the posterized
 * image back with the original (62% poster / 38% photo) so faces keep eyes,
 * lips and skin modelling instead of flattening into flat pink shapes.
 * `levels` controls how few colours the poster uses.
 */
export function inkPosterizeCanvas(src, levels, blend) {
  const w = src.width;
  const h = src.height;
  const ctx = src.getContext('2d');
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  const step = 255 / (levels - 1);
  for (let i = 0; i < d.length; i += 4) {
    for (let ch = 0; ch < 3; ch++) {
      const v = d[i + ch];
      const q = Math.round(v / step) * step;
      d[i + ch] = Math.round(q * blend + v * (1 - blend));
    }
  }
  ctx.putImageData(data, 0, 0);
  return src;
}

/** Warms a posterized canvas toward the ink palette (magenta shadows, amber light). */
export function inkTintCanvas(src) {
  const w = src.width;
  const h = src.height;
  const ctx = src.getContext('2d');
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const lum = (0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]) / 255;
    // Push shadows magenta, highlights amber; keep mid-tones photographic.
    const m = Math.max(0, 0.55 - lum) * 2;
    const a = Math.max(0, lum - 0.6) * 2;
    d[i] = Math.min(255, d[i] + 26 * m + 30 * a);
    d[i + 1] = Math.max(0, d[i + 1] - 12 * m);
    d[i + 2] = Math.min(255, d[i + 2] + 18 * m - 10 * a);
  }
  ctx.putImageData(data, 0, 0);
  return src;
}

/** Full ink treatment: posterize (face-aware) + ink tint. Returns a new canvas. */
export function inkCanvas(src, w, h, sliders) {
  let c = coverCanvas(src, w, h);
  const ctx = c.getContext('2d');
  ctx.filter = `contrast(${(sliders.contrast ?? 1) * 1.12}) saturate(${(sliders.saturation ?? 1) * 1.15}) brightness(${sliders.brightness ?? 1})`;
  ctx.drawImage(c, 0, 0);
  ctx.filter = 'none';
  c = inkPosterizeCanvas(c, 5, 0.62);
  c = inkTintCanvas(c);
  return c;
}

/**
 * Halftone dots: samples the panel at low resolution and draws a dot per
 * sample, radius from darkness. Drawn onto `ctx` inside `rect`.
 */
export function drawHalftone(ctx, srcCanvas, rect, spacing, maxR, colour) {
  const cols = Math.max(6, Math.round(rect.w / spacing));
  const rows = Math.max(6, Math.round(rect.h / spacing));
  const sample = document.createElement('canvas');
  sample.width = cols;
  sample.height = rows;
  const sctx = sample.getContext('2d');
  sctx.drawImage(srcCanvas, 0, 0, cols, rows);
  const data = sctx.getImageData(0, 0, cols, rows).data;
  ctx.save();
  ctx.fillStyle = colour;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = (y * cols + x) * 4;
      const lum = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
      const r = Math.max(0.4, (1 - lum) * maxR);
      ctx.beginPath();
      ctx.arc(rect.x + ((x + 0.5) / cols) * rect.w, rect.y + ((y + 0.5) / rows) * rect.h, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Shared film grain: a pre-rendered noise tile, drawn at low alpha. */
let noiseTile = null;
export function grainTile() {
  if (noiseTile) return noiseTile;
  noiseTile = document.createElement('canvas');
  noiseTile.width = 160;
  noiseTile.height = 160;
  const ctx = noiseTile.getContext('2d');
  const data = ctx.createImageData(160, 160);
  for (let i = 0; i < data.data.length; i += 4) {
    const v = Math.floor(Math.random() * 255);
    data.data[i] = v;
    data.data[i + 1] = v;
    data.data[i + 2] = v;
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  return noiseTile;
}

/** Soft darkening toward the corners. */
export function drawVignette(ctx, w, h, strength) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.42, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(10,4,24,0)');
  g.addColorStop(1, `rgba(10,4,24,${strength})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

/** Grain overlay across the whole cover. */
export function drawGrain(ctx, w, h, alpha) {
  ctx.save();
  ctx.globalAlpha = alpha;
  const tile = grainTile();
  const pattern = ctx.createPattern(tile, 'repeat');
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}
