// Era print shop: turns flat images (generated art, or your own scans dropped
// into /public/art) into print-ready sheets with foil masks, the way a 1990s
// card or comic printer would separate them.
//
// Every builder returns { map, mask, height? } canvases.
//   mask R = prismatic foil   G = sparkle flake   B = metallic ink
//   height = embossing relief (white = raised)
// Where the art itself decides the finish (shadows, highlights, a green-screen
// cutout) the mask is derived from the pixels, so new images "just work".
import { makeCanvas, ctxOf, rr, rng } from './canvasKit.js';

export const ERA_FONT = {
  block: '"Bungee", "Arial Black", Impact, sans-serif',
  cond: '"Anton", Impact, "Arial Narrow Bold", sans-serif',
  body: '"Instrument Sans", "Helvetica Neue", Arial, sans-serif',
};

export const CARD = { W: 1024, H: 1430 };
export const COMIC = { W: 1024, H: 1560 };
export const PACK = { W: 1024, H: 1650 };

export async function loadArt(name) {
  for (const ext of ['png', 'jpg', 'jpeg', 'webp']) {
    try {
      const res = await fetch(`/art/${name}.${ext}`, { cache: 'no-store' });
      if (!res.ok) continue;
      const type = res.headers.get('content-type') || '';
      if (!type.startsWith('image/')) continue; // Vite serves index.html for misses
      return await createImageBitmap(await res.blob());
    } catch { /* try next */ }
  }
  return null;
}

function sheet(w, h, withHeight = false) {
  const map = makeCanvas(w, h);
  const mask = makeCanvas(w, h);
  const m = ctxOf(mask);
  m.fillStyle = '#000';
  m.fillRect(0, 0, w, h);
  const out = { map, mask, a: ctxOf(map), m };
  if (withHeight) {
    out.height = makeCanvas(w, h);
    out.h = ctxOf(out.height);
    out.h.fillStyle = '#000';
    out.h.fillRect(0, 0, w, h);
  }
  return out;
}

export function cover(ctx, img, x, y, w, h, alignY = 0.5) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s, ih = img.height * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) * alignY, iw, ih);
  ctx.restore();
}

const lum = (r, g, b) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

// Per-pixel mask from the art: fn(r,g,b,x,y) -> [R,G,B] 0..255, written only
// inside the given rect, max-blended with what's already there.
function maskFromArt(s, rect, fn) {
  const { x, y, w, h } = rect;
  const src = s.a.getImageData(x, y, w, h).data;
  const dst = s.m.getImageData(x, y, w, h);
  const d = dst.data;
  for (let i = 0, p = 0; i < src.length; i += 4, p++) {
    const px = p % w, py = (p / w) | 0;
    const [R, G, B] = fn(src[i], src[i + 1], src[i + 2], px / w, py / h);
    d[i] = Math.max(d[i], R);
    d[i + 1] = Math.max(d[i + 1], G);
    d[i + 2] = Math.max(d[i + 2], B);
  }
  s.m.putImageData(dst, x, y);
}

function outlinedText(ctx, str, x, y, font, fill, stroke, sw, align = 'left') {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = sw; ctx.strokeText(str, x, y); }
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}

function fit(ctx, str, family, maxW, start, weight = '400') {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(str).width > maxW && size > 12) { size -= 2; ctx.font = `${weight} ${size}px ${family}`; }
  return ctx.font;
}

// The 1993-style name band: a skewed team-colour bar, foil-stamped name in
// gold metallic ink with raised (embossed) letters, position + number chip.
function nameBand(s, { name, team, pos, number, accent, accent2, y0 = 1170 }) {
  const { a, m } = s;
  const W = CARD.W;
  const band = (ctx) => {
    ctx.beginPath();
    ctx.moveTo(0, y0 + 40); ctx.lineTo(W, y0 - 30); ctx.lineTo(W, y0 + 170); ctx.lineTo(0, y0 + 230);
    ctx.closePath();
  };
  const g = a.createLinearGradient(0, y0, W, y0 + 200);
  g.addColorStop(0, accent); g.addColorStop(1, accent2);
  a.save(); band(a); a.fillStyle = g; a.globalAlpha = 0.92; a.fill(); a.restore();
  // prism foil on the band
  m.save(); band(m); m.fillStyle = 'rgb(255,0,0)'; m.fill(); m.restore();
  // thin foil rules
  for (const off of [-8, 236]) {
    a.save(); a.strokeStyle = 'rgba(255,255,255,0.85)'; a.lineWidth = 5;
    a.beginPath(); a.moveTo(0, y0 + 40 + off); a.lineTo(W, y0 - 30 + off * 0.9); a.stroke(); a.restore();
    m.save(); m.strokeStyle = 'rgb(255,255,0)'; m.lineWidth = 7;
    m.beginPath(); m.moveTo(0, y0 + 40 + off); m.lineTo(W, y0 - 30 + off * 0.9); m.stroke(); m.restore();
  }
  // name: gold foil stamp, embossed
  const nf = fit(a, name.toUpperCase(), ERA_FONT.block, W - 300, 92);
  const nx = 60, ny = y0 + 130;
  a.save(); a.translate(nx, ny); a.rotate(-0.068);
  outlinedText(a, name.toUpperCase(), 0, 0, nf, '#f5d27a', 'rgba(20,10,40,0.9)', 10);
  a.restore();
  m.save(); m.translate(nx, ny); m.rotate(-0.068);
  outlinedText(m, name.toUpperCase(), 0, 0, nf, 'rgb(0,0,255)', null, 0);
  m.restore();
  if (s.h) {
    s.h.save(); s.h.translate(nx, ny); s.h.rotate(-0.068); s.h.filter = 'blur(2px)';
    outlinedText(s.h, name.toUpperCase(), 0, 0, nf, '#fff', null, 0);
    s.h.restore();
  }
  // team + position line
  a.save(); a.translate(nx + 4, ny + 58); a.rotate(-0.068);
  outlinedText(a, `${team.toUpperCase()}  •  ${pos}`, 0, 0, `400 34px ${ERA_FONT.cond}`, '#ffffff', 'rgba(0,0,0,0.6)', 5);
  a.restore();
  // number chip
  const cx = W - 130, cy = y0 + 70;
  a.save(); a.beginPath(); a.arc(cx, cy, 70, 0, Math.PI * 2); a.fillStyle = '#111'; a.fill();
  a.lineWidth = 8; a.strokeStyle = '#f5d27a'; a.stroke();
  outlinedText(a, number, cx, cy + 26, `400 72px ${ERA_FONT.block}`, '#fff', null, 0, 'center'); a.restore();
  m.save(); m.beginPath(); m.arc(cx, cy, 74, 0, Math.PI * 2); m.lineWidth = 12; m.strokeStyle = 'rgb(0,0,255)'; m.stroke(); m.restore();
}

function brandBadge(s, brand, x = 70, y = 80) {
  const { a, m } = s;
  a.save();
  rr(a, x, y, 230, 74, 14); a.fillStyle = 'rgba(10,10,20,0.85)'; a.fill();
  a.lineWidth = 4; a.strokeStyle = '#f5d27a'; a.stroke();
  outlinedText(a, brand, x + 115, y + 52, `400 40px ${ERA_FONT.block}`, '#f5d27a', null, 0, 'center');
  a.restore();
  m.save(); rr(m, x, y, 230, 74, 14); m.fillStyle = 'rgb(0,0,255)'; m.fill(); m.restore();
}

function innerFrame(s, inset = 26, radius = 24) {
  const { a, m } = s;
  a.save(); rr(a, inset, inset, CARD.W - inset * 2, CARD.H - inset * 2, radius);
  a.lineWidth = 6; a.strokeStyle = 'rgba(255,255,255,0.75)'; a.stroke(); a.restore();
  m.save(); rr(m, inset, inset, CARD.W - inset * 2, CARD.H - inset * 2, radius);
  m.lineWidth = 10; m.strokeStyle = 'rgb(255,255,0)'; m.stroke(); m.restore();
}

// ---------------------------------------------------------------------------
// Full-bleed photo card ("prism parallel"): the photo stays photographic;
// only the dark arena shadows go prismatic, so the rainbow lives in the crowd
// behind the player. Foil band + gold embossed name.
export function photoCard(img, opts) {
  const s = sheet(CARD.W, CARD.H, true);
  const { a } = s;
  if (img) cover(a, img, 0, 0, CARD.W, CARD.H, 0.35);
  else { a.fillStyle = '#1c2140'; a.fillRect(0, 0, CARD.W, CARD.H); }
  // gentle print vignette
  const v = a.createRadialGradient(512, 600, 300, 512, 700, 900);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,10,0.35)');
  a.fillStyle = v; a.fillRect(0, 0, CARD.W, CARD.H);
  maskFromArt(s, { x: 0, y: 0, w: CARD.W, h: CARD.H }, (r, g, b) => {
    const L = lum(r, g, b);
    const f = Math.max(0, Math.min(1, (0.22 - L) / 0.16));
    return [f * 130, 0, 0];
  });
  innerFrame(s);
  brandBadge(s, opts.brand);
  nameBand(s, opts);
  return s;
}

// ---------------------------------------------------------------------------
// Cutout card ("holoview"): the player is keyed off a green screen and printed
// matte over a full-foil designed background — the most 1993 thing there is.
export function cutoutCard(img, opts) {
  const s = sheet(CARD.W, CARD.H, true);
  const { a, m } = s;
  const R = rng(opts.seed || 5);
  // designed background (printed over foil)
  const bg = a.createLinearGradient(0, 0, CARD.W, CARD.H);
  bg.addColorStop(0, opts.accent2); bg.addColorStop(0.55, '#121433'); bg.addColorStop(1, opts.accent);
  a.fillStyle = bg; a.fillRect(0, 0, CARD.W, CARD.H);
  // radial speed burst
  a.save(); a.translate(560, 560);
  for (let i = 0; i < 48; i++) {
    a.rotate((Math.PI * 2) / 48);
    a.fillStyle = i % 2 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.08)';
    a.beginPath(); a.moveTo(0, 0); a.lineTo(1400, -60); a.lineTo(1400, 60); a.closePath(); a.fill();
  }
  a.restore();
  // giant watermark number
  outlinedText(a, opts.number, CARD.W / 2, 1050, `400 760px ${ERA_FONT.block}`, 'rgba(255,255,255,0.08)', null, 0, 'center');
  // 90s confetti triangles (sparkle foil)
  for (let i = 0; i < 26; i++) {
    const x = R() * CARD.W, y = R() * 1100, sz = 18 + R() * 46, rot = R() * 6.28;
    const tri = (c) => { c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo(0, -sz); c.lineTo(sz * 0.9, sz * 0.6); c.lineTo(-sz * 0.9, sz * 0.6); c.closePath(); };
    tri(a); a.fillStyle = ['#ffd23f', '#1fd1c1', '#ff4fa0', '#ffffff'][i % 4]; a.globalAlpha = 0.55; a.fill(); a.restore();
    tri(m); m.fillStyle = 'rgb(255,255,0)'; m.fill(); m.restore();
  }
  // everything so far is foil
  m.save(); m.globalCompositeOperation = 'lighten'; m.fillStyle = 'rgb(255,0,0)'; m.fillRect(0, 0, CARD.W, CARD.H); m.restore();

  if (img) {
    // key the green screen
    const tmp = makeCanvas(CARD.W, CARD.H);
    const t = ctxOf(tmp);
    // fit the whole figure inside the art area (cutouts shouldn't be cropped)
    const sc = Math.min((CARD.W * 0.98) / img.width, 1150 / img.height);
    t.drawImage(img, (CARD.W - img.width * sc) / 2, 40, img.width * sc, img.height * sc);
    const id = t.getImageData(0, 0, CARD.W, CARD.H);
    const d = id.data;
    let keyed = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const gDom = g - Math.max(r, b);
      let alpha = Math.min(d[i + 3] / 255, 1 - Math.max(0, Math.min(1, (gDom - 30) / 60)));
      if (alpha < 0.02) keyed++;
      // despill: pull green toward the other channels on edges
      if (gDom > 0) d[i + 1] = Math.max(r, b) + gDom * 0.15;
      d[i + 3] = Math.round(alpha * 255);
    }
    t.putImageData(id, 0, 0);
    if (keyed < d.length / 4 * 0.05) {
      // not a green-screen image: fall back to the photo treatment
      return photoCard(img, opts);
    }
    // drop shadow then the player
    a.save(); a.filter = 'blur(14px) brightness(0)'; a.globalAlpha = 0.55; a.drawImage(tmp, 18, 22); a.restore();
    a.drawImage(tmp, 0, 0);
    // player prints matte: punch them out of the foil mask
    m.save(); m.globalCompositeOperation = 'destination-out'; m.drawImage(tmp, 0, 0); m.restore();
    m.save(); m.globalCompositeOperation = 'destination-over'; m.fillStyle = '#000'; m.fillRect(0, 0, CARD.W, CARD.H); m.restore();
  }
  innerFrame(s);
  brandBadge(s, opts.brand);
  nameBand(s, opts);
  return s;
}

// ---------------------------------------------------------------------------
// Chromium comic cover: the whole cover is printed on foil board with inks
// over it; highlights flare, the masthead is embossed metallic.
export function chromiumCover(img) {
  const s = sheet(COMIC.W, COMIC.H, true);
  const { a } = s;
  if (img) cover(a, img, 0, 0, COMIC.W, COMIC.H, 0.0);
  else { a.fillStyle = '#20183a'; a.fillRect(0, 0, COMIC.W, COMIC.H); }
  const top = Math.round(COMIC.H * 0.24);
  maskFromArt(s, { x: 0, y: 0, w: COMIC.W, h: COMIC.H }, (r, g, b, u, v) => {
    const L = lum(r, g, b);
    const sat = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
    let R = 70 + Math.max(0, (L - 0.55) / 0.45) * 185;       // highlights go full foil
    let B = 0;
    if (v < 0.24 && L > 0.6 && sat > 0.25) { B = 255; R = 120; } // masthead letters → metallic
    const G = L > 0.9 ? 160 : 0;                              // hottest whites sparkle
    return [R, G, B];
  });
  // emboss: bright saturated masthead letters
  const src = a.getImageData(0, 0, COMIC.W, top);
  const hc = makeCanvas(COMIC.W, top);
  const hx = ctxOf(hc);
  const hd = hx.createImageData(COMIC.W, top);
  for (let i = 0; i < src.data.length; i += 4) {
    const L = lum(src.data[i], src.data[i + 1], src.data[i + 2]);
    const sat = (Math.max(src.data[i], src.data[i + 1], src.data[i + 2]) - Math.min(src.data[i], src.data[i + 1], src.data[i + 2])) / 255;
    const v = (L > 0.55 && sat > 0.22) ? 255 : 0;
    hd.data[i] = hd.data[i + 1] = hd.data[i + 2] = v; hd.data[i + 3] = 255;
  }
  hx.putImageData(hd, 0, 0);
  s.h.filter = 'blur(3px)';
  s.h.drawImage(hc, 0, 0);
  s.h.filter = 'none';
  return s;
}

// ---------------------------------------------------------------------------
// Flicker (lenticular) frames: an image of N frames side by side → atlas.
export function flickerAtlas(img, n = 3, aspect = 896 / 1060) {
  if (!img) return null;
  const fw = img.width / n;
  // crop each panel to the lens window's aspect (centred), trimming gutters
  let cw = fw * 0.96, chh = img.height;
  if (cw / chh > aspect) cw = chh * aspect; else chh = cw / aspect;
  const cellW = 600, cellH = Math.round(cellW / aspect);
  const c = makeCanvas(cellW * n, cellH);
  const x = ctxOf(c);
  for (let i = 0; i < n; i++) {
    const sx = i * fw + (fw - cw) / 2;
    const sy = (img.height - chh) / 2;
    x.drawImage(img, sx, sy, cw, chh, i * cellW, 0, cellW, cellH);
  }
  return { canvas: c, cols: n, rows: 1, count: n };
}

// ---------------------------------------------------------------------------
// Foil wrapper: metallised film everywhere except where the art is printed in
// opaque white. Crimped ends get serrations.
export function packWrapper(img, { brand = 'COURTKINGS', line = 'SERIES 1 • 1993' } = {}) {
  const s = sheet(PACK.W, PACK.H);
  const { a, m } = s;
  const crimp = Math.round(PACK.H * 0.075);
  a.fillStyle = '#c9ccd6'; a.fillRect(0, 0, PACK.W, PACK.H);
  if (img) cover(a, img, 0, crimp, PACK.W, PACK.H - crimp * 2, 0.5);
  maskFromArt(s, { x: 0, y: crimp, w: PACK.W, h: PACK.H - crimp * 2 }, (r, g, b) => {
    const white = Math.min(r, g, b) > 205 ? 1 : 0;
    return [white ? 0 : 150, 0, white ? 0 : 200];
  });
  // crimps: silver film with serration stripes
  for (const y0 of [0, PACK.H - crimp]) {
    const g = a.createLinearGradient(0, y0, 0, y0 + crimp);
    g.addColorStop(0, '#e9ebf2'); g.addColorStop(0.5, '#9fa4b4'); g.addColorStop(1, '#e9ebf2');
    a.fillStyle = g; a.fillRect(0, y0, PACK.W, crimp);
    a.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < PACK.W; x += 10) a.fillRect(x, y0, 4, crimp);
    m.fillStyle = 'rgb(255,0,255)'; m.fillRect(0, y0, PACK.W, crimp);
  }
  if (!img) {
    outlinedText(a, brand, PACK.W / 2, 520, `400 120px ${ERA_FONT.block}`, '#fff', '#1a1040', 16, 'center');
    outlinedText(a, line, PACK.W / 2, 600, `400 48px ${ERA_FONT.cond}`, '#ffd23f', null, 0, 'center');
  }
  return s;
}

export function packBack() {
  const s = sheet(PACK.W, PACK.H);
  const { a, m } = s;
  const crimp = Math.round(PACK.H * 0.075);
  const g = a.createLinearGradient(0, 0, PACK.W, PACK.H);
  g.addColorStop(0, '#d8dbe6'); g.addColorStop(1, '#aeb3c4');
  a.fillStyle = g; a.fillRect(0, 0, PACK.W, PACK.H);
  m.fillStyle = 'rgb(200,0,255)'; m.fillRect(0, 0, PACK.W, PACK.H);
  // white printed info panel
  a.fillStyle = '#f4f4f0'; rr(a, 160, 520, 704, 560, 18); a.fill();
  m.fillStyle = '#000'; rr(m, 160, 520, 704, 560, 18); m.fill();
  a.fillStyle = '#1a1a2a'; a.textAlign = 'center';
  a.font = `400 52px ${ERA_FONT.block}`; a.fillText('12 CARDS', PACK.W / 2, 620);
  a.font = `500 30px ${ERA_FONT.body}`;
  ['Find 1 Holoview insert in every', 'specially marked pack.', '', 'Collect all 220 cards!', '', 'NOT FOR SALE TO MINORS UNDER 0'].forEach((l, i) => a.fillText(l, PACK.W / 2, 690 + i * 48));
  for (const y0 of [0, PACK.H - crimp]) {
    a.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = 0; x < PACK.W; x += 10) a.fillRect(x, y0, 4, crimp);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Laser poster: the whole print is holographic film with transparent inks;
// the brightest parts (stars, rims) carry flake sparkle.
export function laserPoster(img, w = 1024) {
  const h = img ? Math.round(w * (img.height / img.width)) : Math.round(w * 1.4);
  const s = sheet(w, h);
  if (img) s.a.drawImage(img, 0, 0, w, h);
  else { s.a.fillStyle = '#101024'; s.a.fillRect(0, 0, w, h); }
  maskFromArt(s, { x: 0, y: 0, w, h }, (r, g, b) => {
    const L = lum(r, g, b);
    return [90 + L * 165, L > 0.82 ? 255 : 0, 0];
  });
  return s;
}

// ---------------------------------------------------------------------------
// Wallpaper: deep navy board, foil-printed 1990s confetti (triangles,
// squiggles, rings, dots). Mostly matte; the shapes catch the light.
export function confettiWallpaper(w = 2048, h = 1024, seed = 11) {
  const s = sheet(w, h);
  const { a, m } = s;
  const R = rng(seed);
  const g = a.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#15142a'); g.addColorStop(1, '#0d0c1c');
  a.fillStyle = g; a.fillRect(0, 0, w, h);
  // fine paper grain
  for (let i = 0; i < w * h * 0.02; i++) {
    a.fillStyle = `rgba(255,255,255,${R() * 0.025})`;
    a.fillRect(R() * w, R() * h, 1.5, 1.5);
  }
  const inks = ['#2bd4c5', '#ff4fa0', '#ffd23f', '#8b6bff', '#e9e9f4'];
  const N = Math.round((w * h) / 52000);
  for (let i = 0; i < N; i++) {
    const x = R() * w, y = R() * h, sz = 6 + R() * 14, rot = R() * 6.28, kind = Math.floor(R() * 5);
    const ink = inks[Math.floor(R() * inks.length)];
    const foil = R() < 0.6 ? 'rgb(255,0,0)' : 'rgb(255,255,0)';
    const draw = (c, col) => {
      c.save(); c.translate(x, y); c.rotate(rot);
      c.fillStyle = c.strokeStyle = col || ink; c.lineWidth = 2.5; c.lineCap = 'round';
      c.globalAlpha = c === a ? 0.28 : 1;
      c.beginPath();
      if (kind === 0) { c.moveTo(0, -sz); c.lineTo(sz * 0.9, sz * 0.6); c.lineTo(-sz * 0.9, sz * 0.6); c.closePath(); c.fill(); }
      else if (kind === 1) { for (let k = 0; k <= 24; k++) { const t = k / 24; c.lineTo((t - 0.5) * sz * 3, Math.sin(t * 12) * sz * 0.3); } c.stroke(); }
      else if (kind === 2) { c.arc(0, 0, sz * 0.6, 0, Math.PI * 2); c.stroke(); }
      else if (kind === 3) { c.arc(0, 0, sz * 0.18, 0, Math.PI * 2); c.fill(); }
      else { c.rect(-sz * 0.12, -sz, sz * 0.24, sz * 2); c.fill(); }
      c.restore();
    };
    draw(a, ink);
    draw(m, foil);
  }
  return s;
}

// ---------------------------------------------------------------------------
// Holographic laminate wall sheets: smoked graphite board with a fine
// diffraction film over it, hung as large panels with shadow-gap seams.
// No printed motif — the only "pattern" is the light. A faint pressed
// micro-grid (height) breaks up the reflection like real embossed laminate.
export function holoLaminate(w = 2048, h = 1024, panels = 4, seed = 3) {
  const s = sheet(w, h, true);
  const { a, m } = s;
  const R = rng(seed);
  const g = a.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#1b1a22'); g.addColorStop(1, '#121118');
  a.fillStyle = g; a.fillRect(0, 0, w, h);
  // very subtle sheet-to-sheet tone variation, like real laminate batches
  const pw = w / panels;
  for (let i = 0; i < panels; i++) {
    a.fillStyle = `rgba(255,255,255,${0.008 + R() * 0.012})`;
    a.fillRect(i * pw, 0, pw, h);
  }
  // film: everywhere except seams
  m.fillStyle = 'rgb(80,18,0)'; m.fillRect(0, 0, w, h);
  // pressed micro-grid in the height map
  s.h.fillStyle = '#000'; s.h.fillRect(0, 0, w, h);
  s.h.strokeStyle = 'rgba(255,255,255,0.18)'; s.h.lineWidth = 1;
  const step = 28;
  for (let x = 0; x < w; x += step) { s.h.beginPath(); s.h.moveTo(x + 0.5, 0); s.h.lineTo(x + 0.5, h); s.h.stroke(); }
  for (let y = 0; y < h; y += step) { s.h.beginPath(); s.h.moveTo(0, y + 0.5); s.h.lineTo(w, y + 0.5); s.h.stroke(); }
  // shadow-gap seams between sheets
  for (let i = 1; i < panels; i++) {
    const x = Math.round(i * pw);
    a.fillStyle = '#050508'; a.fillRect(x - 3, 0, 6, h);
    m.fillStyle = '#000'; m.fillRect(x - 4, 0, 8, h);
    s.h.fillStyle = '#000'; s.h.fillRect(x - 5, 0, 10, h);
  }
  return s;
}
