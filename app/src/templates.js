// The six cover templates. Each layout(w, h) returns panel rectangles in
// pixels plus the zones where the lettering goes, so every template has a
// genuinely different composition, panel arrangement, typography and palette
// — not a recolour of another. Panels are fractions of the cover, so the same
// template works at 1080x1080, 1080x1350 and 1920x1080.

export const TEMPLATES = [
  { id: 'ink-heat', name: 'Ink Heat', blurb: '9-panel grid, full-width title band' },
  { id: 'golden-hero', name: 'Golden Hour Hero', blurb: 'Full-bleed hero + filmstrip' },
  { id: 'neon-tilt', name: 'Neon Tilt', blurb: 'Tilted panels, diagonal title' },
  { id: 'sunset-sleeve', name: 'Sunset Sleeve', blurb: 'Hero-and-three + full-bleed strip' },
  { id: 'palm-grid', name: 'Palm Grid', blurb: '9-panel grid, centre title block' },
  { id: 'vice-magazine', name: 'Vice Magazine', blurb: 'Masthead, hero, barcode' },
];

function rect(x, y, w, h, rot = 0) {
  return { x, y, w, h, rot };
}

/** Ink Heat — 9 panels (hero pair + 3 + 4) over a full-width title band. */
export function layoutInkHeat(w, h) {
  const bandH = h * 0.26;
  const gridH = h - bandH;
  const g = Math.max(4, w * 0.006);
  const panels = [
    rect(0, 0, w * 0.52 - g / 2, gridH * 0.54 - g / 2),
    rect(w * 0.52 + g / 2, 0, w * 0.48 - g / 2, gridH * 0.54 - g / 2),
    rect(0, gridH * 0.54 + g / 2, w / 3 - g / 2, gridH * 0.2 - g / 2),
    rect(w / 3 + g / 2, gridH * 0.54 + g / 2, w / 3 - g, gridH * 0.2 - g / 2),
    rect((w * 2) / 3 + g / 2, gridH * 0.54 + g / 2, w / 3 - g / 2, gridH * 0.2 - g / 2),
    rect(0, gridH * 0.74 + g / 2, w / 4 - g / 2, gridH * 0.26 - g / 2),
    rect(w / 4 + g / 2, gridH * 0.74 + g / 2, w / 4 - g, gridH * 0.26 - g / 2),
    rect(w / 2 + g / 2, gridH * 0.74 + g / 2, w / 4 - g, gridH * 0.26 - g / 2),
    rect((w * 3) / 4 + g / 2, gridH * 0.74 + g / 2, w / 4 - g / 2, gridH * 0.26 - g / 2),
  ];
  return {
    panels,
    band: { x: 0, y: gridH, w, h: bandH },
    title: { x: w * 0.04, y: gridH + bandH * 0.08, w: w * 0.92, h: bandH * 0.52, align: 'left', size: bandH * 0.52 },
    subtitle: { x: w * 0.045, y: gridH + bandH * 0.62, w: w * 0.6, h: bandH * 0.2, align: 'left', size: bandH * 0.2 },
    tagline: { x: w * 0.045, y: gridH + bandH * 0.82, w: w * 0.92, h: bandH * 0.14, align: 'left', size: bandH * 0.13 },
    eyebrow: { x: w * 0.04, y: h * 0.015, w: w * 0.5, h: h * 0.03, align: 'left', size: h * 0.028 },
    skyline: true, stars: true, badge: 'EST. 2026', barcode: false, masthead: false,
    palette: ['#ff2e88', '#ff7a3d', '#ffd166'],
  };
}

/** Golden Hour Hero — one full-bleed hero, a 3-panel filmstrip, title over the hero. */
export function layoutGoldenHero(w, h) {
  const heroH = h * 0.64;
  const stripH = h * 0.2;
  const g = Math.max(4, w * 0.006);
  const panels = [
    rect(0, 0, w, heroH),
    rect(0, heroH + g, w / 3 - g / 2, stripH),
    rect(w / 3 + g / 2, heroH + g, w / 3 - g, stripH),
    rect((w * 2) / 3 + g / 2, heroH + g, w / 3 - g / 2, stripH),
  ];
  return {
    panels,
    band: { x: 0, y: heroH + stripH + g * 2, w, h: h - heroH - stripH - g * 2 },
    title: { x: w * 0.04, y: heroH * 0.7, w: w * 0.92, h: heroH * 0.24, align: 'left', size: heroH * 0.2 },
    subtitle: { x: w * 0.045, y: heroH * 0.93, w: w * 0.7, h: heroH * 0.06, align: 'left', size: heroH * 0.055 },
    tagline: { x: w * 0.04, y: h * 0.9, w: w * 0.92, h: h * 0.06, align: 'center', size: h * 0.028 },
    eyebrow: { x: w * 0.04, y: h * 0.02, w: w * 0.6, h: h * 0.03, align: 'left', size: h * 0.028 },
    skyline: false, stars: true, badge: 'GOLDEN HOUR', barcode: false, masthead: false, scrim: true,
    palette: ['#ffb347', '#ff7a3d', '#2ec4b6'],
  };
}

/** Neon Tilt — panels tilted a few degrees; the tilt frames faces, never cuts
 * them: every panel rotates about its own centre and the gaps stay clear of
 * the panel middles, where faces sit. */
export function layoutNeonTilt(w, h) {
  const g = Math.max(6, w * 0.01);
  const panels = [
    rect(w * 0.02, h * 0.2, w * 0.5, h * 0.44, -3.5),
    rect(w * 0.52, h * 0.16, w * 0.46, h * 0.4, 3),
    rect(w * 0.05, h * 0.68, w * 0.42, h * 0.28, 2.5),
    rect(w * 0.5, h * 0.6, w * 0.44, h * 0.3, -2.5),
    rect(w * 0.3, h * 0.44, w * 0.38, h * 0.2, -1.5),
  ];
  return {
    panels,
    band: null,
    title: { x: w * 0.03, y: h * 0.015, w: w * 0.94, h: h * 0.075, align: 'left', size: h * 0.068, rot: -1.5 },
    subtitle: { x: w * 0.035, y: h * 0.095, w: w * 0.7, h: h * 0.045, align: 'left', size: h * 0.04, rot: -1.5 },
    tagline: { x: w * 0.04, y: h * 0.955, w: w * 0.92, h: h * 0.03, align: 'center', size: h * 0.024 },
    eyebrow: null,
    skyline: false, stars: false, badge: 'NEON NIGHTS', barcode: false, masthead: false,
    palette: ['#ff2e88', '#22d3ee', '#7c3aed'],
  };
}

/** Sunset Sleeve — hero left, three stacked right, full-bleed strip, title band. */
export function layoutSunsetSleeve(w, h) {
  const bandH = h * 0.2;
  const topH = h * 0.6;
  const stripH = h - topH - bandH;
  const g = Math.max(4, w * 0.006);
  const panels = [
    rect(0, 0, w * 0.58 - g / 2, topH - g / 2),
    rect(w * 0.58 + g / 2, 0, w * 0.42 - g / 2, topH / 3 - g / 2),
    rect(w * 0.58 + g / 2, topH / 3 + g / 2, w * 0.42 - g / 2, topH / 3 - g),
    rect(w * 0.58 + g / 2, (topH * 2) / 3 + g / 2, w * 0.42 - g / 2, topH / 3 - g / 2),
    rect(0, topH + g / 2, w * 0.5 - g / 2, stripH - g / 2),
    rect(w * 0.5 + g / 2, topH + g / 2, w * 0.5 - g / 2, stripH - g / 2),
  ];
  return {
    panels,
    band: { x: 0, y: h - bandH, w, h: bandH },
    title: { x: w * 0.04, y: h - bandH + bandH * 0.06, w: w * 0.92, h: bandH * 0.55, align: 'left', size: bandH * 0.52 },
    subtitle: { x: w * 0.045, y: h - bandH + bandH * 0.64, w: w * 0.6, h: bandH * 0.22, align: 'left', size: bandH * 0.2 },
    tagline: { x: w * 0.045, y: h - bandH * 0.02, w: w * 0.92, h: bandH * 0.14, align: 'left', size: bandH * 0.12 },
    eyebrow: { x: w * 0.04, y: h * 0.015, w: w * 0.5, h: h * 0.03, align: 'left', size: h * 0.026 },
    skyline: true, stars: true, badge: null, barcode: false, masthead: false,
    palette: ['#ff6b4a', '#ff2e88', '#7c3aed'],
  };
}

/** Palm Grid — 3x3 grid whose centre cell is the title block, not a photo. */
export function layoutPalmGrid(w, h) {
  const bandH = h * 0.14;
  const gridH = h - bandH;
  const g = Math.max(4, w * 0.006);
  const cw = w / 3;
  const ch = gridH / 3;
  const cells = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (r === 1 && c === 1) continue; // centre cell is the title block
      cells.push(rect(c * cw + (c ? g / 2 : 0), r * ch + (r ? g / 2 : 0),
        cw - (c === 1 ? g : g / 2), ch - (r === 1 ? g : g / 2)));
    }
  }
  return {
    panels: cells,
    band: { x: 0, y: gridH, w, h: bandH },
    title: { x: cw, y: ch + ch * 0.08, w: cw, h: ch * 0.5, align: 'center', size: ch * 0.42 },
    subtitle: { x: cw, y: ch + ch * 0.6, w: cw, h: ch * 0.18, align: 'center', size: ch * 0.16 },
    tagline: { x: w * 0.04, y: gridH + bandH * 0.3, w: w * 0.92, h: bandH * 0.4, align: 'center', size: bandH * 0.24 },
    eyebrow: { x: w * 0.04, y: h * 0.015, w: w * 0.5, h: h * 0.03, align: 'left', size: h * 0.026 },
    skyline: false, stars: true, badge: 'PALM GRID', barcode: false, masthead: false,
    palette: ['#ff2e88', '#ff9f1c', '#2ec4b6'],
  };
}

/** Vice Magazine — masthead, one hero, two side panels, barcode, issue line. */
export function layoutViceMagazine(w, h) {
  const mastH = h * 0.15;
  const bodyH = h * 0.63;
  const g = Math.max(4, w * 0.006);
  const panels = [
    rect(0, mastH + g, w * 0.62 - g / 2, bodyH),
    rect(w * 0.62 + g / 2, mastH + g, w * 0.38 - g / 2, bodyH / 2 - g / 2),
    rect(w * 0.62 + g / 2, mastH + g + bodyH / 2 + g / 2, w * 0.38 - g / 2, bodyH / 2 - g / 2),
  ];
  return {
    panels,
    band: { x: 0, y: mastH + bodyH + g * 2, w, h: h - mastH - bodyH - g * 2 },
    title: { x: w * 0.03, y: 0, w: w * 0.94, h: mastH, align: 'center', size: mastH * 0.72 },
    subtitle: { x: w * 0.04, y: mastH + bodyH + g * 2 + h * 0.01, w: w * 0.62, h: h * 0.05, align: 'left', size: h * 0.038 },
    tagline: { x: w * 0.04, y: h * 0.93, w: w * 0.6, h: h * 0.05, align: 'left', size: h * 0.026 },
    eyebrow: { x: w * 0.04, y: mastH + bodyH + g * 2 + h * 0.055, w: w * 0.6, h: h * 0.03, align: 'left', size: h * 0.024 },
    skyline: false, stars: false, badge: null, barcode: true, masthead: true,
    palette: ['#f5efe0', '#ff2e88', '#14101f'],
  };
}

const LAYOUTS = {
  'ink-heat': layoutInkHeat,
  'golden-hero': layoutGoldenHero,
  'neon-tilt': layoutNeonTilt,
  'sunset-sleeve': layoutSunsetSleeve,
  'palm-grid': layoutPalmGrid,
  'vice-magazine': layoutViceMagazine,
};

/** Returns the layout for a template id at the given pixel size. */
export function getLayout(templateId, w, h) {
  const fn = LAYOUTS[templateId] ?? layoutInkHeat;
  return fn(w, h);
}
