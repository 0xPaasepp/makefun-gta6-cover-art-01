// Velvet Heat — Cover Studio: wires the editor page. Loads sample photos,
// lets the user crop and position each panel, switch templates and grades,
// edit the caption, undo and redo, and export all three post sizes as PNGs.
// A `?shot=` query sets up a fixed scene for a screenshot (./shots.js).

import { drawCover, renderCoverToCanvas, EXPORT_SIZES } from './cover.js';
import { getLayout, TEMPLATES } from './templates.js';
import { GRADES } from './grades.js';
import { runShot } from './shots.js';

const SAMPLES = [
  { src: 'samples/boombox.jpg', name: 'Boombox' },
  { src: 'samples/jetski.jpg', name: 'Jetski' },
  { src: 'samples/rooftop.jpg', name: 'Rooftop' },
  { src: 'samples/convertible.jpg', name: 'Convertible' },
  { src: 'samples/skate.jpg', name: 'Skateboard' },
  { src: 'samples/palmroad.jpg', name: 'Palm road' },
  { src: 'samples/boombox2.jpg', name: 'Boombox 2' },
  { src: 'samples/neonstreet.jpg', name: 'Neon street' },
  { src: 'samples/boulevard.jpg', name: 'Boulevard' },
  { src: 'samples/pier.jpg', name: 'Pier' },
];

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

export const state = {
  template: 'ink-heat',
  engine: 'ink',
  grade: 'sunset',
  sliders: { contrast: 1.08, saturation: 1.15, brightness: 1, temperature: 0.15 },
  toggles: { grain: true, vignette: true, halftone: true },
  texts: {
    title: 'VELVET HEAT',
    subtitle: 'one last summer in Miramar',
    tagline: 'ONE CITY. EVERY SUMMER ENDS.',
    eyebrow: 'WELCOME TO MIRAMAR',
  },
  photos: [],
  panels: [],
  selectedPanel: 0,
  exportSize: 2, // 1920 x 1080 landscape by default: the hero cover
};

let history = [];
let historyIndex = -1;

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** A fresh panel: photo `i`, centred, no crop offset. */
export function blankPanel(i) {
  return { photo: i, ox: 0, oy: 0, zoom: 1, rot: 0, grade: null };
}

/** Rebuilds the panel list for the current template, keeping photos. */
export function resetPanelsForTemplate() {
  const layout = getLayout(state.template, 1080, 1080);
  const old = state.panels;
  state.panels = layout.panels.map((panel, i) => {
    const keep = old[i];
    if (keep) return { ...keep };
    const photoCount = Math.max(1, state.photos.length);
    const p = blankPanel(i % photoCount);
    // Intelligent fit: a portrait photo in a wide panel crops the face at
    // the top, so nudge it down and zoom slightly to keep the face in frame.
    const img = state.photos[p.photo]?.img;
    if (img && img.naturalHeight > img.naturalWidth && panel.w > panel.h) {
      p.oy = 0.1;
      p.zoom = 1.12;
    }
    return p;
  });
  state.selectedPanel = 0;
}

/** Loads the eight default sample photos and assigns them across the panels. */
export async function loadSamplePhotos() {
  const firstEight = SAMPLES.slice(0, 8);
  state.photos = [];
  for (const s of firstEight) {
    const img = await loadImage(s.src);
    state.photos.push({ img, src: s.src, name: s.name });
  }
  resetPanelsForTemplate();
  renderTray();
  redraw();
}

/** Serialises the editable state (photos as src strings) for undo/redo. */
export function snapshotState() {
  return JSON.stringify({
    template: state.template, engine: state.engine, grade: state.grade,
    sliders: state.sliders, toggles: state.toggles, texts: state.texts,
    photos: state.photos.map((p) => ({ src: p.src, name: p.name })),
    panels: state.panels, selectedPanel: state.selectedPanel, exportSize: state.exportSize,
  });
}

/** Restores a snapshot taken by snapshotState (reloads photos by src). */
export async function restoreSnapshot(json) {
  const s = JSON.parse(json);
  Object.assign(state, {
    template: s.template, engine: s.engine, grade: s.grade,
    sliders: s.sliders, toggles: s.toggles, texts: s.texts,
    panels: s.panels, selectedPanel: s.selectedPanel, exportSize: s.exportSize,
  });
  state.photos = [];
  for (const p of s.photos) {
    if (p.src.startsWith('data:')) {
      const img = await loadImage(p.src);
      state.photos.push({ img, src: p.src, name: p.name });
    } else {
      const img = await loadImage(p.src);
      state.photos.push({ img, src: p.src, name: p.name });
    }
  }
  syncControls();
  renderTray();
  redraw();
}

/** Pushes the current state onto the undo stack. */
export function pushHistory() {
  history = history.slice(0, historyIndex + 1);
  history.push(snapshotState());
  if (history.length > 60) history.shift();
  historyIndex = history.length - 1;
  updateUndoButtons();
}

export async function undo() {
  if (historyIndex <= 0) return;
  historyIndex -= 1;
  await restoreSnapshot(history[historyIndex]);
  updateUndoButtons();
}

export async function redo() {
  if (historyIndex >= history.length - 1) return;
  historyIndex += 1;
  await restoreSnapshot(history[historyIndex]);
  updateUndoButtons();
}

function updateUndoButtons() {
  $('undo').disabled = historyIndex <= 0;
  $('redo').disabled = historyIndex >= history.length - 1;
}

/** Redraws the preview canvas at the chosen export aspect. */
export function redraw() {
  const size = EXPORT_SIZES[state.exportSize];
  const maxW = 980;
  const scale = Math.min(1, maxW / size.w);
  preview.width = Math.round(size.w * scale);
  preview.height = Math.round(size.h * scale);
  drawCover(preview, state);
  drawSelection();
  window.__shotReady = window.__shotReady || false;
}

/** Draws the selected-panel outline and crop handles on the preview. */
export function drawSelection() {
  const ctx = preview.getContext('2d');
  const size = EXPORT_SIZES[state.exportSize];
  const sx = preview.width / size.w;
  const sy = preview.height / size.h;
  const layout = getLayout(state.template, size.w, size.h);
  const panel = layout.panels[state.selectedPanel];
  if (!panel) return;
  ctx.save();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 6]);
  ctx.strokeRect(panel.x * sx, panel.y * sy, panel.w * sx, panel.h * sy);
  ctx.setLineDash([]);
  ctx.fillStyle = '#ffd166';
  const hx = panel.x * sx + panel.w * sx;
  const hy = panel.y * sy + panel.h * sy;
  ctx.beginPath();
  ctx.arc(hx, hy, 9, 0, Math.PI * 2);
  ctx.fill();
  // "Drag to crop" tag: a yellow pill inside the panel's bottom edge, so it
  // never collides with the eyebrow text above the panel.
  const label = 'drag to crop';
  ctx.font = 'bold 11px sans-serif';
  const lw = ctx.measureText(label).width + 16;
  const lx = panel.x * sx + (panel.w * sx) / 2 - lw / 2;
  const ly = panel.y * sy + panel.h * sy - 26;
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(lx, ly, lw, 18);
  ctx.fillStyle = '#14101f';
  ctx.textAlign = 'center';
  ctx.fillText(label, panel.x * sx + (panel.w * sx) / 2, ly + 13);
  ctx.restore();
}

/** Finds which panel a preview point (in canvas pixels) falls in. */
export function panelAt(px, py) {
  const size = EXPORT_SIZES[state.exportSize];
  const sx = size.w / preview.width;
  const sy = size.h / preview.height;
  const layout = getLayout(state.template, size.w, size.h);
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const p = layout.panels[i];
    if (px * sx >= p.x && px * sx <= p.x + p.w && py * sy >= p.y && py * sy <= p.y + p.h) return i;
  }
  return -1;
}

/** Renders the photo tray thumbnails. */
export function renderTray() {
  const tray = $('tray');
  tray.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `${photo.name} — click to put in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.src;
    img.alt = photo.name;
    b.appendChild(img);
    b.addEventListener('click', () => {
      state.panels[state.selectedPanel].photo = i;
      pushHistory();
      redraw();
    });
    tray.appendChild(b);
  });
}

/** Syncs every control with the current state (after undo/redo or a shot). */
export function syncControls() {
  $('title').value = state.texts.title;
  $('subtitle').value = state.texts.subtitle;
  $('tagline').value = state.texts.tagline;
  $('eyebrow').value = state.texts.eyebrow;
  document.querySelectorAll('[data-template]').forEach((b) => b.classList.toggle('active', b.dataset.template === state.template));
  document.querySelectorAll('[data-engine]').forEach((b) => b.classList.toggle('active', b.dataset.engine === state.engine));
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === state.grade));
  document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('active', Number(b.dataset.size) === state.exportSize));
  $('contrast').value = state.sliders.contrast;
  $('saturation').value = state.sliders.saturation;
  $('brightness').value = state.sliders.brightness;
  $('temperature').value = state.sliders.temperature;
  $('grain').checked = state.toggles.grain;
  $('vignette').checked = state.toggles.vignette;
  $('halftone').checked = state.toggles.halftone;
  syncPanelControls();
}

/** Syncs the per-panel controls for the selected panel. */
export function syncPanelControls() {
  const p = state.panels[state.selectedPanel];
  if (!p) return;
  $('panelLabel').textContent = `Panel ${state.selectedPanel + 1} of ${state.panels.length}`;
  $('panelPhoto').innerHTML = state.photos.map((ph, i) =>
    `<option value="${i}"${p.photo === i ? ' selected' : ''}>${ph.name}</option>`).join('');
  $('panelGrade').value = p.grade ?? '';
  $('zoom').value = p.zoom;
  $('rotate').value = p.rot;
  $('offsetX').value = p.ox;
  $('offsetY').value = p.oy;
}

/** Downloads a canvas as a PNG file. */
export function downloadCanvas(canvas, filename) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      resolve(blob);
    }, 'image/png');
  });
}

/** Exports all three post sizes as PNGs, one click. */
export async function exportAllSizes() {
  const out = [];
  for (const size of EXPORT_SIZES) {
    const canvas = renderCoverToCanvas(state, size.w, size.h);
    const blob = await downloadCanvas(canvas, `velvet-heat-${size.w}x${size.h}.png`);
    out.push({ label: size.label, w: size.w, h: size.h, bytes: blob.size });
    // Keep a data URL for the export-proof screenshot scene.
    window.__lastExports = window.__lastExports || {};
    window.__lastExports[`${size.w}x${size.h}`] = canvas.toDataURL('image/png');
  }
  statusEl.textContent = `Exported ${out.map((o) => o.label).join(', ')} — PNG`;
  window.__exported = out;
  return out;
}

/** Fills every panel with the same photo (one-photo-fill). */
export function fillAllWithPhoto(i) {
  state.panels.forEach((p) => { p.photo = i; });
  pushHistory();
  redraw();
}

function bindControls() {
  document.querySelectorAll('[data-template]').forEach((b) => b.addEventListener('click', () => {
    state.template = b.dataset.template;
    resetPanelsForTemplate();
    syncControls();
    pushHistory();
    redraw();
  }));
  document.querySelectorAll('[data-engine]').forEach((b) => b.addEventListener('click', () => {
    state.engine = b.dataset.engine;
    syncControls();
    pushHistory();
    redraw();
  }));
  document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => {
    state.grade = b.dataset.grade;
    syncControls();
    pushHistory();
    redraw();
  }));
  document.querySelectorAll('[data-size]').forEach((b) => b.addEventListener('click', () => {
    state.exportSize = Number(b.dataset.size);
    syncControls();
    pushHistory();
    redraw();
  }));
  const textIds = ['title', 'subtitle', 'tagline', 'eyebrow'];
  textIds.forEach((id) => $(id).addEventListener('input', () => {
    state.texts[id] = $(id).value;
    redraw();
  }));
  textIds.forEach((id) => $(id).addEventListener('change', pushHistory));
  const sliderIds = ['contrast', 'saturation', 'brightness', 'temperature'];
  sliderIds.forEach((id) => $(id).addEventListener('input', () => {
    state.sliders[id] = Number($(id).value);
    redraw();
  }));
  sliderIds.forEach((id) => $(id).addEventListener('change', pushHistory));
  ['grain', 'vignette', 'halftone'].forEach((id) => $(id).addEventListener('change', () => {
    state.toggles[id] = $(id).checked;
    pushHistory();
    redraw();
  }));
  $('undo').addEventListener('click', undo);
  $('redo').addEventListener('click', redo);
  $('exportAll').addEventListener('click', exportAllSizes);
  $('loadSamples').addEventListener('click', async () => {
    await loadSamplePhotos();
    pushHistory();
  });
  $('fillOne').addEventListener('click', () => fillAllWithPhoto(state.panels[state.selectedPanel]?.photo ?? 0));
  $('upload').addEventListener('change', async (e) => {
    const files = [...e.target.files].slice(0, 9);
    for (const file of files) {
      // Tray holds at most 9 photos: a new upload bumps the oldest sample
      // photo out (never a photo the user uploaded themselves).
      while (state.photos.length >= 9) {
        const drop = state.photos.findIndex((p) => !p.user);
        if (drop < 0) break;
        state.photos.splice(drop, 1);
        state.panels.forEach((p) => {
          if (p.photo === drop) p.photo = 0;
          else if (p.photo > drop) p.photo -= 1;
        });
      }
      if (state.photos.length >= 9) break;
      const url = URL.createObjectURL(file);
      const img = await loadImage(url);
      state.photos.push({ img, src: url, name: file.name.replace(/\.[^.]+$/, ''), user: true });
    }
    renderTray();
    syncPanelControls();
    pushHistory();
    redraw();
  });
  $('panelPhoto').addEventListener('change', (e) => {
    state.panels[state.selectedPanel].photo = Number(e.target.value);
    pushHistory();
    redraw();
  });
  $('panelGrade').addEventListener('change', (e) => {
    state.panels[state.selectedPanel].grade = e.target.value || null;
    pushHistory();
    redraw();
  });
  $('zoom').addEventListener('input', (e) => { state.panels[state.selectedPanel].zoom = Number(e.target.value); redraw(); });
  $('zoom').addEventListener('change', pushHistory);
  $('rotate').addEventListener('input', (e) => { state.panels[state.selectedPanel].rot = Number(e.target.value); redraw(); });
  $('rotate').addEventListener('change', pushHistory);
  $('offsetX').addEventListener('input', (e) => { state.panels[state.selectedPanel].ox = Number(e.target.value); redraw(); });
  $('offsetX').addEventListener('change', pushHistory);
  $('offsetY').addEventListener('input', (e) => { state.panels[state.selectedPanel].oy = Number(e.target.value); redraw(); });
  $('offsetY').addEventListener('change', pushHistory);
  $('rotLeft').addEventListener('click', () => { state.panels[state.selectedPanel].rot -= 15; syncPanelControls(); pushHistory(); redraw(); });
  $('rotRight').addEventListener('click', () => { state.panels[state.selectedPanel].rot += 15; syncPanelControls(); pushHistory(); redraw(); });

  // Drag on the preview: select a panel, drag its photo to reposition it.
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  preview.addEventListener('pointerdown', (e) => {
    const r = preview.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const i = panelAt(px, py);
    if (i < 0) return;
    state.selectedPanel = i;
    syncPanelControls();
    dragging = true;
    lastX = px;
    lastY = py;
    preview.setPointerCapture(e.pointerId);
    redraw();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const r = preview.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const p = state.panels[state.selectedPanel];
    const size = EXPORT_SIZES[state.exportSize];
    const layout = getLayout(state.template, size.w, size.h);
    const panel = layout.panels[state.selectedPanel];
    p.ox = Math.max(-0.5, Math.min(0.5, p.ox + ((px - lastX) / (preview.width / size.w)) / panel.w));
    p.oy = Math.max(-0.5, Math.min(0.5, p.oy + ((py - lastY) / (preview.height / size.h)) / panel.h));
    lastX = px;
    lastY = py;
    redraw();
  });
  preview.addEventListener('pointerup', () => { if (dragging) { dragging = false; pushHistory(); } });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[state.selectedPanel];
    p.zoom = Math.max(1, Math.min(3, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    syncPanelControls();
    redraw();
  }, { passive: false });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
    if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
  });
}

function buildTemplateButtons() {
  const wrap = $('templates');
  TEMPLATES.forEach((t) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.template = t.id;
    b.className = 'pill';
    b.innerHTML = `<strong>${t.name}</strong><span>${t.blurb}</span>`;
    wrap.appendChild(b);
  });
}

function buildGradeButtons() {
  const wrap = $('grades');
  GRADES.forEach((g) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = g;
    b.className = 'pill';
    b.textContent = g[0].toUpperCase() + g.slice(1);
    wrap.appendChild(b);
  });
}

/** Waits until the vendored fonts are usable on canvas, then draws. */
export async function waitForFonts() {
  try {
    await Promise.all([
      document.fonts.load('100px Anton'),
      document.fonts.load('100px Pacifico'),
      document.fonts.ready,
    ]);
  } catch { /* fall back to system fonts */ }
  window.__fontsReady = true;
}

export async function boot() {
  buildTemplateButtons();
  buildGradeButtons();
  bindControls();
  syncControls();
  await waitForFonts();
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), { loadSamplePhotos, loadImage, state, redraw, exportAllSizes, syncControls, renderTray, resetPanelsForTemplate, pushHistory });
    window.__shotReady = true;
  } else {
    await loadSamplePhotos();
    pushHistory();
  }
  window.__vh = { state, redraw, exportAllSizes, undo, redo, loadSamplePhotos, fillAllWithPhoto };
}

boot();
