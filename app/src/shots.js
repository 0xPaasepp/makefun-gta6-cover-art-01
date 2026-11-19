// Fixed scenes for screenshots: ?shot=cover shows the cover alone,
// ?shot=dual shows the ink engine beside the photographic engine,
// ?shot=editor shows the app with photos loaded and a panel selected,
// ?shot=export shows the three exported PNGs. window.__shotReady is set
// once the scene is painted. Query params: template, engine, grade, size
// (0 square, 1 portrait, 2 landscape), title, subtitle, tagline, eyebrow.

import { drawCover, renderCoverToCanvas, EXPORT_SIZES } from './cover.js';
import { getLayout } from './templates.js';

function applyQuery(state, query) {
  if (query.get('template')) state.template = query.get('template');
  if (query.get('engine')) state.engine = query.get('engine');
  if (query.get('grade')) state.grade = query.get('grade');
  if (query.get('size') !== null) state.exportSize = Number(query.get('size'));
  if (query.get('title')) state.texts.title = query.get('title');
  if (query.get('subtitle')) state.texts.subtitle = query.get('subtitle');
  if (query.get('tagline')) state.texts.tagline = query.get('tagline');
  if (query.get('eyebrow')) state.texts.eyebrow = query.get('eyebrow');
}

export async function runShot(shot, query, api) {
  const { state } = api;
  await api.loadSamplePhotos();
  applyQuery(state, query);
  api.resetPanelsForTemplate();
  api.syncControls();
  api.renderTray();
  const preview = document.getElementById('preview');

  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    preview.width = window.innerWidth;
    preview.height = window.innerHeight;
    drawCover(preview, state);
  } else if (shot === 'dual') {
    document.body.classList.add('shot-dual');
    preview.width = window.innerWidth;
    preview.height = window.innerHeight;
    const ctx = preview.getContext('2d');
    const half = Math.floor(preview.width / 2);
    // Square covers: each half is near-square, so the cover fits with room
    // for its label underneath instead of the label covering the tagline.
    const size = EXPORT_SIZES[0];
    const ink = renderCoverToCanvas({ ...state, engine: 'ink' }, size.w, size.h);
    const photo = renderCoverToCanvas({ ...state, engine: 'photo' }, size.w, size.h);
    ctx.fillStyle = '#160a24';
    ctx.fillRect(0, 0, preview.width, preview.height);
    const dw = half - 4;
    const dy = Math.max(0, Math.floor((preview.height - 60 - dw) / 2));
    ctx.drawImage(ink, 0, dy, dw, dw);
    ctx.drawImage(photo, half + 4, dy, dw, dw);
    ctx.fillStyle = 'rgba(20,10,36,0.85)';
    ctx.fillRect(0, preview.height - 54, half - 4, 54);
    ctx.fillRect(half + 4, preview.height - 54, half - 4, 54);
    ctx.fillStyle = '#ffd166';
    ctx.font = 'bold 26px Anton, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('INK — POSTER MODE', (half - 4) / 2, preview.height - 18);
    ctx.fillText('PHOTO — CLEAN MODE', half + 4 + (half - 4) / 2, preview.height - 18);
  } else if (shot === 'editor') {
    // A panel mid-crop: offset the hero photo so the selection outline and
    // the drag handle show a crop in progress, face still in frame.
    state.panels[0].ox = 0.08;
    state.panels[0].oy = 0.1;
    state.panels[0].zoom = 1.25;
    state.selectedPanel = 0;
    api.syncControls();
    api.redraw();
    api.pushHistory();
  } else if (shot === 'export') {
    document.body.classList.add('shot-export');
    api.redraw();
    await api.exportAllSizes();
    const proof = document.getElementById('exportProof');
    proof.hidden = false;
    const sizes = window.__exported || [];
    proof.innerHTML = `<h2>Exported — 3 PNGs, one click</h2><div class="sizes">` +
      sizes.map((s) => {
        const url = (window.__lastExports || {})[`${s.w}x${s.h}`] || '';
        return `<figure><img src="${url}" width="150" alt="Exported cover ${s.label}"><figcaption>${s.label} PNG · ${(s.bytes / 1024).toFixed(0)} KiB</figcaption></figure>`;
      }).join('') + `</div><p class="hint">velvet-heat-1080x1080.png · velvet-heat-1080x1350.png · velvet-heat-1920x1080.png</p>`;
    window.scrollTo(0, 0);
  } else {
    api.redraw();
  }
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  window.__shotReady = true;
}
