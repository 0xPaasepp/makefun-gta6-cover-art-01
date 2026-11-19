// Velvet Heat cover renderer: draws the whole cover onto a canvas at any
// size, from the editor state. Dual engine: `ink` posterizes every panel
// (face-aware, see grades.js) and `photo` keeps the photos photographic with
// a colour grade. Templates come from templates.js; lettering is Anton for
// titles and Pacifico for script subtitles, both vendored under app/fonts.

import { getLayout } from './templates.js';
import { gradePhotoCanvas, inkCanvas, drawHalftone, drawGrain, drawVignette } from './grades.js';

const BG = '#160a24';

/** Fits `text` into `maxW` by shrinking the font; returns the size used. */
export function fitFont(ctx, text, fontFamily, startSize, maxW, weight = '') {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${fontFamily}`;
  while (size > 10 && ctx.measureText(text).width > maxW) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${fontFamily}`;
  }
  return size;
}

/** Draws one photo into a panel rect, honouring its crop/position/rotate. */
export function drawPanelPhoto(ctx, img, panel, grade, engine, sliders, halftoneOn) {
  const { x, y, w, h } = panel;
  if (w < 4 || h < 4) return;
  // Render the graded photo at panel resolution, then place it rotated.
  const pw = Math.min(Math.round(w), 900);
  const ph = Math.max(2, Math.round((pw * h) / w));
  let graded;
  if (engine === 'ink') graded = inkCanvas(img, pw, ph, sliders);
  else graded = gradePhotoCanvas(img, pw, ph, grade, sliders);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(((panel.rot ?? 0) * Math.PI) / 180);
  const zoom = panel.zoom ?? 1;
  const ox = (panel.ox ?? 0) * w;
  const oy = (panel.oy ?? 0) * h;
  ctx.drawImage(graded, -w * zoom / 2 + ox, -h * zoom / 2 + oy, w * zoom, h * zoom);
  if (halftoneOn && engine === 'ink') {
    drawHalftone(ctx, graded, { x: -w / 2, y: -h / 2, w, h }, Math.max(7, w / 110), Math.max(1.2, w / 320), 'rgba(20,4,32,0.28)');
  }
  ctx.restore();
  // White panel frame, like a printed poster grid.
  ctx.save();
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = Math.max(2, w * 0.004);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

/** Deterministic skyline silhouette along the top of a band. */
export function drawSkyline(ctx, x, y, w, h, colour) {
  ctx.save();
  ctx.fillStyle = colour;
  let bx = x;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  while (bx < x + w) {
    const bw = w * (0.04 + rnd() * 0.05);
    const bh = h * (0.35 + rnd() * 0.6);
    ctx.fillRect(bx, y + h - bh, bw, bh);
    if (rnd() > 0.7) ctx.fillRect(bx + bw * 0.3, y + h - bh - h * 0.18, bw * 0.12, h * 0.18); // antenna
    bx += bw + w * 0.008;
  }
  ctx.restore();
}

/** Yellow starburst badge with a short label. */
export function drawStarburst(ctx, cx, cy, r, label) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#ffd166';
  ctx.strokeStyle = '#14101f';
  ctx.lineWidth = Math.max(2, r * 0.06);
  ctx.beginPath();
  const spikes = 12;
  for (let i = 0; i < spikes * 2; i++) {
    const rr = i % 2 === 0 ? r : r * 0.78;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(a) * rr;
    const py = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#14101f';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const size = fitFont(ctx, label, 'Anton, sans-serif', r * 0.34, r * 1.5);
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

/** Five-star heat meter. */
export function drawStars(ctx, x, y, size, filled, colour = '#ffd166') {
  ctx.save();
  ctx.fillStyle = colour;
  for (let i = 0; i < 5; i++) {
    const cx = x + i * size * 1.25;
    ctx.beginPath();
    for (let k = 0; k < 10; k++) {
      const rr = k % 2 === 0 ? size / 2 : size / 4.5;
      const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
      const px = cx + Math.cos(a) * rr;
      const py = y + Math.sin(a) * rr;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    if (i < filled) ctx.fill();
    else { ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1; }
  }
  ctx.restore();
}

/** Barcode block for the magazine template. */
export function drawBarcode(ctx, x, y, w, h) {
  ctx.save();
  ctx.fillStyle = '#f5efe0';
  ctx.fillRect(x, y, w, h);
  let bx = x + w * 0.06;
  let seed = 13;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  ctx.fillStyle = '#14101f';
  while (bx < x + w * 0.94) {
    const bw = 1 + rnd() * w * 0.03;
    if (rnd() > 0.35) ctx.fillRect(bx, y + h * 0.08, bw, h * 0.62);
    bx += bw + w * 0.012;
  }
  ctx.fillStyle = '#14101f';
  ctx.textAlign = 'center';
  ctx.font = `${Math.max(9, h * 0.16)}px monospace`;
  ctx.fillText('0 262626 010101', x + w / 2, y + h * 0.9);
  ctx.restore();
}

/** Gradient title text with a dark outline and soft shadow. */
export function drawTitleText(ctx, zone, text, palette) {
  const t = (text || '').trim().toUpperCase();
  if (!t) return;
  ctx.save();
  if (zone.rot) {
    ctx.translate(zone.x + zone.w / 2, zone.y + zone.h / 2);
    ctx.rotate((zone.rot * Math.PI) / 180);
    ctx.translate(-(zone.x + zone.w / 2), -(zone.y + zone.h / 2));
  }
  const size = fitFont(ctx, t, 'Anton, sans-serif', zone.size, zone.w);
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = zone.align ?? 'left';
  const ax = zone.align === 'center' ? zone.x + zone.w / 2 : zone.align === 'right' ? zone.x + zone.w : zone.x;
  const grad = ctx.createLinearGradient(zone.x, zone.y, zone.x + zone.w, zone.y);
  grad.addColorStop(0, '#fff7e8');
  grad.addColorStop(0.45, palette[0]);
  grad.addColorStop(0.8, palette[1] ?? palette[0]);
  grad.addColorStop(1, palette[2] ?? palette[1] ?? palette[0]);
  ctx.shadowColor = 'rgba(10,2,20,0.55)';
  ctx.shadowBlur = size * 0.12;
  ctx.shadowOffsetY = size * 0.05;
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeStyle = '#160a24';
  ctx.strokeText(t, ax, zone.y + size * 0.92);
  ctx.fillStyle = grad;
  ctx.fillText(t, ax, zone.y + size * 0.92);
  ctx.restore();
}

/** Script subtitle in Pacifico. */
export function drawScriptText(ctx, zone, text, colour = '#ffffff') {
  const t = (text || '').trim();
  if (!t || !zone) return;
  ctx.save();
  if (zone.rot) {
    ctx.translate(zone.x + zone.w / 2, zone.y + zone.h / 2);
    ctx.rotate((zone.rot * Math.PI) / 180);
    ctx.translate(-(zone.x + zone.w / 2), -(zone.y + zone.h / 2));
  }
  const size = fitFont(ctx, t, 'Pacifico, cursive', zone.size, zone.w);
  ctx.font = `${size}px Pacifico, cursive`;
  ctx.textAlign = zone.align ?? 'left';
  const ax = zone.align === 'center' ? zone.x + zone.w / 2 : zone.align === 'right' ? zone.x + zone.w : zone.x;
  ctx.shadowColor = 'rgba(10,2,20,0.6)';
  ctx.shadowBlur = size * 0.15;
  ctx.fillStyle = colour;
  ctx.fillText(t, ax, zone.y + size);
  ctx.restore();
}

/** Small caps line (eyebrow / tagline) with wide letter spacing. */
export function drawCapsLine(ctx, zone, text, colour = '#ffffff') {
  const t = (text || '').trim().toUpperCase();
  if (!t || !zone) return;
  ctx.save();
  try { ctx.letterSpacing = `${Math.max(1, zone.size * 0.22)}px`; } catch { /* older canvas */ }
  const size = fitFont(ctx, t, 'Anton, sans-serif', zone.size, zone.w);
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = zone.align ?? 'left';
  const ax = zone.align === 'center' ? zone.x + zone.w / 2 : zone.align === 'right' ? zone.x + zone.w : zone.x;
  ctx.fillStyle = colour;
  // If even the smallest size is too wide, squeeze horizontally rather
  // than letting the line run off the edge of the cover.
  const tw = ctx.measureText(t).width;
  if (tw > zone.w) {
    const sx = zone.w / tw;
    ctx.save();
    ctx.translate(ax, 0);
    ctx.scale(sx, 1);
    ctx.translate(-ax, 0);
    ctx.fillText(t, ax, zone.y + size);
    ctx.restore();
  } else {
    ctx.fillText(t, ax, zone.y + size);
  }
  ctx.restore();
}

/**
 * Draws the whole cover. `state` carries template, engine, grade, sliders,
 * toggles, photos (Image objects), panels (per-panel photo + transform) and
 * texts. The canvas keeps its own width/height (the export size).
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const layout = getLayout(state.template, w, h);
  const sliders = state.sliders ?? {};
  const toggles = state.toggles ?? {};
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);

  // Panels first, so the title band and furniture sit on top.
  layout.panels.forEach((panel, i) => {
    const p = state.panels?.[i];
    const img = p && state.photos[p.photo] ? state.photos[p.photo].img : null;
    if (!img) {
      ctx.save();
      ctx.fillStyle = '#2a1544';
      ctx.fillRect(panel.x, panel.y, panel.w, panel.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(panel.x + 2, panel.y + 2, panel.w - 4, panel.h - 4);
      ctx.restore();
      return;
    }
    drawPanelPhoto(ctx, img, { ...panel, ox: p.ox, oy: p.oy, zoom: p.zoom, rot: (panel.rot ?? 0) + (p.rot ?? 0) },
      p.grade ?? state.grade, state.engine, sliders, toggles.halftone);
  });

  // Bottom scrim for hero templates: darkens the hero's lower third so the
  // title never has to fight the photo — or the face — for contrast.
  if (layout.scrim && layout.panels[0]) {
    const hp = layout.panels[0];
    const sg = ctx.createLinearGradient(0, hp.y + hp.h * 0.45, 0, hp.y + hp.h);
    sg.addColorStop(0, 'rgba(12,3,24,0)');
    sg.addColorStop(1, 'rgba(12,3,24,0.8)');
    ctx.fillStyle = sg;
    ctx.fillRect(hp.x, hp.y + hp.h * 0.45, hp.w, hp.h * 0.55);
  }

  // Title band: deep violet with a sunset gradient wash and skyline.
  if (layout.band) {
    const b = layout.band;
    const grad = ctx.createLinearGradient(b.x, b.y, b.x + b.w, b.y + b.h);
    grad.addColorStop(0, '#1c0b33');
    grad.addColorStop(0.55, '#3d1150');
    grad.addColorStop(1, '#7a1e5e');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    if (layout.skyline) drawSkyline(ctx, b.x, b.y, b.w, b.h * 0.5, 'rgba(12,3,24,0.85)');
    ctx.fillStyle = 'rgba(255,209,102,0.9)';
    ctx.fillRect(b.x, b.y, b.w, Math.max(2, h * 0.004));
  }

  // Lettering.
  drawTitleText(ctx, layout.title, state.texts.title, layout.palette);
  drawScriptText(ctx, layout.subtitle, state.texts.subtitle, '#ffe9f3');
  if (layout.tagline) drawCapsLine(ctx, layout.tagline, state.texts.tagline, '#ffd166');
  if (layout.eyebrow) {
    const eb = state.template === 'vice-magazine'
      ? `ISSUE 01 — SUMMER 2026 · ${state.texts.eyebrow}`
      : state.texts.eyebrow;
    // Dark pill behind the eyebrow so it reads over any photo.
    const z = layout.eyebrow;
    ctx.save();
    ctx.font = `${z.size}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.max(1, z.size * 0.22)}px`; } catch { /* older canvas */ }
    const tw = ctx.measureText((eb || '').trim().toUpperCase()).width;
    const px = z.align === 'center' ? z.x + z.w / 2 - tw / 2 : z.x;
    ctx.fillStyle = 'rgba(12,3,24,0.72)';
    ctx.fillRect(px - z.size * 0.5, z.y, tw + z.size, z.size * 1.5);
    ctx.restore();
    drawCapsLine(ctx, layout.eyebrow, eb, 'rgba(255,255,255,0.9)');
  }

  // Poster furniture.
  if (layout.stars && layout.band) {
    drawStars(ctx, layout.band.x + layout.band.w * 0.72, layout.band.y + layout.band.h * 0.62,
      Math.max(10, h * 0.02), 5);
  }
  if (layout.badge) {
    const r = Math.max(26, Math.min(w, h) * 0.055);
    drawStarburst(ctx, w - r * 1.15, r * 1.15, r, layout.badge);
  }
  if (layout.barcode) {
    drawBarcode(ctx, w * 0.82, h * 0.9, w * 0.15, h * 0.075);
  }

  if (toggles.vignette) drawVignette(ctx, w, h, 0.42);
  if (toggles.grain) drawGrain(ctx, w, h, 0.07);
}

/** Renders the cover at an export size and returns the canvas. */
export function renderCoverToCanvas(state, width, height) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  drawCover(c, state);
  return c;
}

export const EXPORT_SIZES = [
  { label: '1080 × 1080', w: 1080, h: 1080 },
  { label: '1080 × 1350', w: 1080, h: 1350 },
  { label: '1920 × 1080', w: 1920, h: 1080 },
];
