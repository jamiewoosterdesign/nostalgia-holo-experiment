// Procedural print artwork + foil masks for every exhibit.
// Each print returns { map, mask?, height? } canvases, painted in lock-step so
// the foil sits exactly on the printed shapes. All art is original; replace any
// `map` with a generated illustration later via src/art/overrides.js.
import {
  makeCanvas, ctxOf, rr, rng, nebula, stars, halftone, hexA, bevelText, bevelPath, FONT,
} from './canvasKit.js';

export const CARD_W = 1024;
export const CARD_H = 1430;

const RED = 'rgb(255,0,0)';
const GRN = 'rgb(0,255,0)';
const BLU = 'rgb(0,0,255)';

function pair(w, h) {
  const map = makeCanvas(w, h);
  const mask = makeCanvas(w, h);
  const m = ctxOf(mask);
  m.fillStyle = '#000';
  m.fillRect(0, 0, w, h);
  return { map, mask, a: ctxOf(map), m };
}

function starShape(ctx, cx, cy, rOut, rIn, points, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? rIn : rOut;
    const a = rot + (i * Math.PI) / points;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function text(ctx, str, x, y, font, fill, align = 'center', baseline = 'alphabetic') {
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;
  ctx.fillStyle = fill;
  ctx.fillText(str, x, y);
}

function fitFont(ctx, str, weight, family, maxW, start) {
  let size = start;
  ctx.font = `${weight} ${size}px ${family}`;
  while (ctx.measureText(str).width > maxW && size > 10) {
    size -= 2;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return `${weight} ${size}px ${family}`;
}

// ---------------------------------------------------------------------------
// 01 — Selective prismatic trading card. Ship art stays matte; border, stars
// and nebula carry the rainbow.
// ---------------------------------------------------------------------------
export function tradingCard() {
  const W = CARD_W, H = CARD_H;
  const { map, mask, a, m } = pair(W, H);
  const win = { x: 54, y: 54, w: W - 108, h: 1040, r: 22 };

  // Border base (foil)
  a.fillStyle = '#cfd3de';
  a.fillRect(0, 0, W, H);
  m.fillStyle = RED;
  m.fillRect(0, 0, W, H);

  // Art window
  a.save();
  rr(a, win.x, win.y, win.w, win.h, win.r);
  a.clip();
  const g = a.createLinearGradient(0, win.y, 0, win.y + win.h);
  g.addColorStop(0, '#0a1446');
  g.addColorStop(0.5, '#3a1a86');
  g.addColorStop(0.82, '#c2387a');
  g.addColorStop(1, '#ffb36b');
  a.fillStyle = g;
  a.fillRect(win.x, win.y, win.w, win.h);
  nebula(a, W, 1100, ['#4f7bff', '#d14dff', '#ff5fa0', '#2ee6d6'], 5, 36, 0.28);
  const st = stars(a, W, 1100, 260, 9, '#ffffff', 3);
  // planet
  const pg = a.createRadialGradient(250, 900, 20, 300, 980, 420);
  pg.addColorStop(0, '#ffd2a1');
  pg.addColorStop(0.5, '#ff6a6a');
  pg.addColorStop(1, '#3b1460');
  a.fillStyle = pg;
  a.beginPath();
  a.arc(300, 1000, 330, 0, Math.PI * 2);
  a.fill();
  a.strokeStyle = 'rgba(255,240,220,0.75)';
  a.lineWidth = 7;
  a.beginPath();
  a.ellipse(300, 1000, 520, 90, -0.25, Math.PI * 1.02, Math.PI * 1.98);
  a.stroke();
  a.restore();

  // Mask inside window: black, then nebula shimmer, stars sparkle, ring foil
  m.save();
  rr(m, win.x, win.y, win.w, win.h, win.r);
  m.clip();
  m.fillStyle = '#000';
  m.fillRect(0, 0, W, H);
  m.globalCompositeOperation = 'lighter';
  const r = rng(5);
  for (let i = 0; i < 14; i++) {
    const x = r() * W, y = r() * 700, rad = 60 + r() * 180;
    const ng = m.createRadialGradient(x, y, 0, x, y, rad);
    ng.addColorStop(0, 'rgba(70,0,0,1)');
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    m.fillStyle = ng;
    m.fillRect(0, 0, W, H);
  }
  for (const s of st) {
    m.fillStyle = 'rgb(200,255,0)';
    m.beginPath();
    m.arc(s.x, s.y, s.s * 2.2 + 1.5, 0, Math.PI * 2);
    m.fill();
  }
  m.strokeStyle = RED;
  m.lineWidth = 12;
  m.beginPath();
  m.ellipse(300, 1000, 520, 90, -0.25, Math.PI * 1.02, Math.PI * 1.98);
  m.stroke();
  m.restore();

  // Inner keyline (printed ink on foil)
  a.strokeStyle = '#1b1f45';
  a.lineWidth = 5;
  rr(a, win.x - 6, win.y - 6, win.w + 12, win.h + 12, win.r + 6);
  a.stroke();

  // Nameplate (matte navy, gold metallic title)
  const np = { x: 64, y: 1128, w: W - 128, h: 170 };
  a.fillStyle = '#121638';
  rr(a, np.x, np.y, np.w, np.h, 20);
  a.fill();
  m.fillStyle = '#000';
  rr(m, np.x, np.y, np.w, np.h, 20);
  m.fill();
  const tf = fitFont(a, 'VANGUARD', 900, FONT.display, np.w - 80, 104);
  const gold = a.createLinearGradient(0, np.y + 20, 0, np.y + 120);
  gold.addColorStop(0, '#fff1c2');
  gold.addColorStop(0.5, '#e2b357');
  gold.addColorStop(1, '#a8742a');
  text(a, 'VANGUARD', W / 2, np.y + 112, tf, gold);
  text(m, 'VANGUARD', W / 2, np.y + 112, tf, BLU);
  text(a, 'EXPLORER-CLASS CRUISER  ·  CREW 1,012', W / 2, np.y + 150, `600 26px ${FONT.mono}`, '#9fb1ff');

  // Border print
  text(a, 'STARLINE ✦ SERIES ONE', 80, H - 50, `700 28px ${FONT.body}`, '#1b1f45', 'left');
  text(a, '07 / 90', W - 80, H - 50, `700 28px ${FONT.mono}`, '#1b1f45', 'right');
  // badge
  a.fillStyle = '#ff4f8b';
  a.beginPath();
  a.arc(W - 120, 120, 54, 0, Math.PI * 2);
  a.fill();
  text(a, 'HOLO', W - 120, 132, `900 30px ${FONT.display}`, '#fff');
  m.fillStyle = '#000';
  m.beginPath();
  m.arc(W - 120, 120, 54, 0, Math.PI * 2);
  m.fill();

  return { map, mask };
}

// ---------------------------------------------------------------------------
// 02 — Full-bleed starburst refractor: everything is foil, art printed over.
// ---------------------------------------------------------------------------
export function refractorCard() {
  const W = CARD_W, H = CARD_H;
  const { map, mask, a, m } = pair(W, H);
  const win = { x: 50, y: 50, w: W - 100, h: 1060 };

  a.fillStyle = '#e9ecf4';
  a.fillRect(0, 0, W, H);

  a.save();
  rr(a, win.x, win.y, win.w, win.h, 18);
  a.clip();
  // starburst rays
  const cx = W / 2, cy = 560;
  for (let i = 0; i < 48; i++) {
    a.fillStyle = i % 2 ? '#2a3d9a' : '#1a2466';
    a.beginPath();
    a.moveTo(cx, cy);
    const a0 = (i / 48) * Math.PI * 2;
    const a1 = ((i + 1) / 48) * Math.PI * 2;
    a.lineTo(cx + Math.cos(a0) * 1500, cy + Math.sin(a0) * 1500);
    a.lineTo(cx + Math.cos(a1) * 1500, cy + Math.sin(a1) * 1500);
    a.fill();
  }
  // synth sun
  const sg = a.createLinearGradient(0, 260, 0, 760);
  sg.addColorStop(0, '#ffe36b');
  sg.addColorStop(0.5, '#ff7a3d');
  sg.addColorStop(1, '#ff2f8f');
  a.fillStyle = sg;
  a.beginPath();
  a.arc(cx, 540, 300, 0, Math.PI * 2);
  a.fill();
  a.fillStyle = '#1a2466';
  for (let i = 0; i < 9; i++) a.fillRect(cx - 320, 560 + i * 26, 640, 4 + i * 1.8);
  // neon grid floor
  const fy = 840;
  const fg = a.createLinearGradient(0, fy, 0, win.y + win.h);
  fg.addColorStop(0, '#240a4a');
  fg.addColorStop(1, '#0a0620');
  a.fillStyle = fg;
  a.fillRect(win.x, fy, win.w, win.h);
  a.strokeStyle = '#ff3df2';
  a.lineWidth = 3;
  for (let i = -14; i <= 14; i++) {
    a.beginPath();
    a.moveTo(cx + i * 20, fy);
    a.lineTo(cx + i * 150, win.y + win.h);
    a.stroke();
  }
  for (let k = 0; k < 9; k++) {
    const y = fy + Math.pow(k / 8, 2) * (win.y + win.h - fy);
    a.beginPath();
    a.moveTo(win.x, y);
    a.lineTo(win.x + win.w, y);
    a.stroke();
  }
  drawSentinel(a, cx, 230);
  a.restore();

  // Mask: foil everywhere, softer on the head, art printed over it.
  m.fillStyle = 'rgb(235,0,0)';
  m.fillRect(0, 0, W, H);
  m.save();
  rr(m, win.x, win.y, win.w, win.h, 18);
  m.clip();
  m.fillStyle = 'rgb(200,0,0)';
  m.fillRect(0, 0, W, H);
  m.restore();
  // red eye glow is matte ink
  m.fillStyle = '#000';
  m.fillRect(cx - 190, 470, 380, 40);

  // Frame print
  a.strokeStyle = '#141b4d';
  a.lineWidth = 6;
  rr(a, win.x - 6, win.y - 6, win.w + 12, win.h + 12, 22);
  a.stroke();
  const np = { x: 60, y: 1140, w: W - 120, h: 160 };
  const ng = a.createLinearGradient(np.x, 0, np.x + np.w, 0);
  ng.addColorStop(0, '#141b4d');
  ng.addColorStop(1, '#3b1670');
  a.fillStyle = ng;
  rr(a, np.x, np.y, np.w, np.h, 16);
  a.fill();
  const tf = fitFont(a, 'SENTINEL T-9', 900, FONT.display, np.w - 60, 96);
  text(a, 'SENTINEL T-9', W / 2, np.y + 100, tf, '#ffffff');
  text(a, 'CYBERNETIC UNIT  ·  REFRACTOR PARALLEL', W / 2, np.y + 140, `600 24px ${FONT.mono}`, '#ffb3e1');
  text(a, 'STARLINE ✦ CHROME', 80, H - 52, `700 28px ${FONT.body}`, '#141b4d', 'left');
  text(a, '23 / 90', W - 80, H - 52, `700 28px ${FONT.mono}`, '#141b4d', 'right');
  return { map, mask };
}

function drawSentinel(a, cx, top) {
  // An original chrome cyborg head with a red visor — 80s/90s action vibe.
  const chrome = (y0, y1) => {
    const g = a.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, '#f4f7ff');
    g.addColorStop(0.32, '#9ea9c7');
    g.addColorStop(0.45, '#2b2f4a');
    g.addColorStop(0.55, '#c6d0ec');
    g.addColorStop(0.8, '#6b7393');
    g.addColorStop(1, '#e6ebff');
    return g;
  };
  a.save();
  a.lineJoin = 'round';
  // shoulders
  a.fillStyle = chrome(860, 1100);
  a.beginPath();
  a.moveTo(cx - 380, 1120);
  a.lineTo(cx - 300, 900);
  a.lineTo(cx - 120, 860);
  a.lineTo(cx + 120, 860);
  a.lineTo(cx + 300, 900);
  a.lineTo(cx + 380, 1120);
  a.closePath();
  a.fill();
  a.strokeStyle = '#0d1030';
  a.lineWidth = 6;
  a.stroke();
  // neck pistons
  for (const dx of [-70, -25, 25, 70]) {
    a.fillStyle = chrome(760, 880);
    a.fillRect(cx + dx - 14, 760, 28, 120);
    a.strokeRect(cx + dx - 14, 760, 28, 120);
  }
  // cranium
  a.fillStyle = chrome(top, top + 560);
  a.beginPath();
  a.moveTo(cx - 200, top + 260);
  a.bezierCurveTo(cx - 210, top + 40, cx - 90, top - 10, cx, top - 10);
  a.bezierCurveTo(cx + 90, top - 10, cx + 210, top + 40, cx + 200, top + 260);
  a.lineTo(cx + 180, top + 430);
  a.lineTo(cx + 110, top + 560);
  a.lineTo(cx - 110, top + 560);
  a.lineTo(cx - 180, top + 430);
  a.closePath();
  a.fill();
  a.stroke();
  // centre crest
  a.fillStyle = 'rgba(255,255,255,0.55)';
  a.beginPath();
  a.moveTo(cx - 16, top + 10);
  a.lineTo(cx + 16, top + 10);
  a.lineTo(cx + 8, top + 200);
  a.lineTo(cx - 8, top + 200);
  a.fill();
  // cheek plates
  a.strokeStyle = '#0d1030';
  a.lineWidth = 4;
  for (const s of [-1, 1]) {
    a.beginPath();
    a.moveTo(cx + s * 190, top + 300);
    a.lineTo(cx + s * 90, top + 330);
    a.lineTo(cx + s * 70, top + 500);
    a.stroke();
    for (let i = 0; i < 4; i++) {
      a.beginPath();
      a.moveTo(cx + s * (170 - i * 8), top + 360 + i * 24);
      a.lineTo(cx + s * (110 - i * 4), top + 370 + i * 24);
      a.stroke();
    }
  }
  // visor
  a.fillStyle = '#0a0c20';
  a.beginPath();
  a.moveTo(cx - 195, top + 225);
  a.lineTo(cx + 195, top + 225);
  a.lineTo(cx + 175, top + 295);
  a.lineTo(cx - 175, top + 295);
  a.closePath();
  a.fill();
  const vg = a.createLinearGradient(cx - 190, 0, cx + 190, 0);
  vg.addColorStop(0, 'rgba(255,30,40,0)');
  vg.addColorStop(0.2, '#ff2030');
  vg.addColorStop(0.5, '#ffd0b0');
  vg.addColorStop(0.8, '#ff2030');
  vg.addColorStop(1, 'rgba(255,30,40,0)');
  a.fillStyle = vg;
  a.shadowColor = '#ff2030';
  a.shadowBlur = 40;
  a.fillRect(cx - 185, top + 245, 370, 22);
  a.shadowBlur = 0;
  // mouth grille
  a.fillStyle = '#0d1030';
  for (let i = -4; i <= 4; i++) a.fillRect(cx + i * 18 - 4, top + 450, 8, 70);
  a.restore();
}

// ---------------------------------------------------------------------------
// 03 — Embossed comic cover: brushed silver title, metallic ink, raised relief.
// ---------------------------------------------------------------------------
export const COMIC_W = 1024;
export const COMIC_H = 1560;

export function comicCover() {
  const W = COMIC_W, H = COMIC_H;
  const { map, mask, a, m } = pair(W, H);
  const height = makeCanvas(W, H);
  const h = ctxOf(height);
  h.fillStyle = '#000';
  h.fillRect(0, 0, W, H);

  // Space backdrop
  const g = a.createLinearGradient(0, 300, 0, H);
  g.addColorStop(0, '#0a1a5c');
  g.addColorStop(0.6, '#3a0f6b');
  g.addColorStop(1, '#ff4f6b');
  a.fillStyle = g;
  a.fillRect(0, 0, W, H);
  // speed lines from the focal point
  const fx = 560, fy = 820;
  const r = rng(41);
  a.save();
  a.globalCompositeOperation = 'screen';
  for (let i = 0; i < 160; i++) {
    const ang = r() * Math.PI * 2;
    const w = 0.004 + r() * 0.012;
    a.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.12})`;
    a.beginPath();
    a.moveTo(fx, fy);
    a.lineTo(fx + Math.cos(ang - w) * 1600, fy + Math.sin(ang - w) * 1600);
    a.lineTo(fx + Math.cos(ang + w) * 1600, fy + Math.sin(ang + w) * 1600);
    a.fill();
  }
  a.restore();
  stars(a, W, H, 200, 17, '#ffffff', 2.5);
  // planet with halftone shading
  const pc = { x: 820, y: 1320, r: 420 };
  const pg = a.createRadialGradient(pc.x - 160, pc.y - 200, 30, pc.x, pc.y, pc.r);
  pg.addColorStop(0, '#7ff6e2');
  pg.addColorStop(0.6, '#1f8fa8');
  pg.addColorStop(1, '#17204f');
  a.fillStyle = pg;
  a.beginPath();
  a.arc(pc.x, pc.y, pc.r, 0, Math.PI * 2);
  a.fill();
  a.save();
  a.beginPath();
  a.arc(pc.x, pc.y, pc.r, 0, Math.PI * 2);
  a.clip();
  halftone(a, pc.x - pc.r, pc.y - pc.r, pc.r * 2, pc.r * 2, 16, 'rgba(10,16,60,0.55)', 0.5, (u, v) => {
    const d = Math.hypot(u - 0.3, v - 0.25);
    return Math.max(0, (d - 0.3) * 1.6);
  });
  a.restore();
  // magenta halftone across the lower space
  halftone(a, 0, 900, W, 660, 22, 'rgba(255,60,170,0.35)', 0.25, (u, v) => v * 0.9);

  // Masthead
  a.fillStyle = '#e3172b';
  a.fillRect(0, 0, W, 330);
  halftone(a, 0, 0, W, 330, 14, 'rgba(120,0,20,0.45)', 0.78, (u, v) => 0.25 + v * 0.6);
  a.fillStyle = '#ffd400';
  a.fillRect(0, 318, W, 14);

  // Issue box (top-left)
  a.fillStyle = '#fff';
  a.fillRect(26, 26, 150, 170);
  a.strokeStyle = '#111';
  a.lineWidth = 4;
  a.strokeRect(26, 26, 150, 170);
  text(a, 'No.', 101, 70, `800 28px ${FONT.display}`, '#111');
  text(a, '1', 101, 150, `900 86px ${FONT.display}`, '#e3172b');
  text(a, '$1.25 US', 101, 184, `700 20px ${FONT.mono}`, '#111');
  bevelPath(h, () => { h.beginPath(); h.rect(26, 26, 150, 170); }, 4);

  // Title — the star of the cover: brushed silver, embossed, black keyline.
  const title = 'STARFALL';
  const tFont = fitFont(a, title, 900, FONT.condensed, W - 230, 230);
  a.save();
  a.font = tFont;
  a.textAlign = 'center';
  a.lineJoin = 'round';
  a.strokeStyle = '#0b0b16';
  a.lineWidth = 22;
  a.strokeText(title, 600, 280);
  const silver = a.createLinearGradient(0, 90, 0, 290);
  silver.addColorStop(0, '#ffffff');
  silver.addColorStop(0.45, '#aab3c6');
  silver.addColorStop(0.55, '#5f6a85');
  silver.addColorStop(1, '#e6ecff');
  a.fillStyle = silver;
  a.fillText(title, 600, 280);
  a.restore();
  m.save();
  m.font = tFont;
  m.textAlign = 'center';
  m.fillStyle = BLU;
  m.fillText(title, 600, 280);
  m.restore();
  bevelText(h, title, 600, 280, tFont, 16);

  text(a, 'THE SAGA OF THE STARHAWK', 600, 64, `800 30px ${FONT.body}`, '#ffd400');

  // Starburst blurb — prismatic foil stamp, embossed
  const bx = 190, by = 520;
  a.fillStyle = '#ffd400';
  starShape(a, bx, by, 150, 110, 18);
  a.fill();
  a.strokeStyle = '#111';
  a.lineWidth = 5;
  a.stroke();
  m.fillStyle = RED;
  starShape(m, bx, by, 150, 110, 18);
  m.fill();
  bevelPath(h, () => starShape(h, bx, by, 150, 110, 18), 10);
  a.save();
  a.translate(bx, by);
  a.rotate(-0.18);
  text(a, 'EMBOSSED', 0, -18, `900 34px ${FONT.condensed}`, '#e3172b');
  text(a, 'FOIL COVER!', 0, 22, `900 34px ${FONT.condensed}`, '#e3172b');
  text(a, 'COLLECTOR’S ITEM', 0, 56, `800 18px ${FONT.body}`, '#111');
  a.restore();

  // Caption box
  a.save();
  a.translate(400, 1360);
  a.rotate(-0.04);
  a.fillStyle = '#fff6a8';
  a.fillRect(-330, -60, 660, 120);
  a.strokeStyle = '#111';
  a.lineWidth = 5;
  a.strokeRect(-330, -60, 660, 120);
  text(a, 'ONE LAST RUN THROUGH', 0, -10, `900 40px ${FONT.condensed}`, '#111');
  text(a, 'THE SHATTERED ZONE!', 0, 38, `900 40px ${FONT.condensed}`, '#e3172b');
  a.restore();

  // UPC box (a very specific memory)
  a.fillStyle = '#fff';
  a.fillRect(30, 1410, 210, 125);
  const br = rng(3);
  a.fillStyle = '#111';
  let x = 44;
  while (x < 226) {
    const bw = 1 + Math.floor(br() * 4);
    if (br() < 0.6) a.fillRect(x, 1424, bw, 80);
    x += bw + 1;
  }
  text(a, '0 71486 02725 1', 135, 1526, `600 16px ${FONT.mono}`, '#111');

  return { map, mask, height };
}

// ---------------------------------------------------------------------------
// 04 — Blister-pack backing: cracked-ice sparkle foil under printed colour.
// ---------------------------------------------------------------------------
export const BACKER_W = 1024;
export const BACKER_H = 1460;

export function blisterBacker() {
  const W = BACKER_W, H = BACKER_H;
  const { map, mask, a, m } = pair(W, H);

  const g = a.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#2f5bff');
  g.addColorStop(0.5, '#7b2cff');
  g.addColorStop(1, '#ff3d9a');
  a.fillStyle = g;
  a.fillRect(0, 0, W, H);
  // swoosh
  a.fillStyle = 'rgba(255,255,255,0.18)';
  a.beginPath();
  a.moveTo(0, 520);
  a.bezierCurveTo(300, 380, 700, 700, W, 520);
  a.lineTo(W, 620);
  a.bezierCurveTo(700, 800, 300, 480, 0, 640);
  a.fill();

  // whole backing is sparkle + cracked ice
  m.fillStyle = 'rgb(180,255,0)';
  m.fillRect(0, 0, W, H);

  // Window (blueprint grid behind the ship)
  const win = { x: 90, y: 300, w: W - 180, h: 760 };
  const wg = a.createRadialGradient(W / 2, 680, 40, W / 2, 680, 520);
  wg.addColorStop(0, '#dff3ff');
  wg.addColorStop(1, '#6aa3ff');
  a.fillStyle = wg;
  rr(a, win.x, win.y, win.w, win.h, 40);
  a.fill();
  a.save();
  rr(a, win.x, win.y, win.w, win.h, 40);
  a.clip();
  a.strokeStyle = 'rgba(30,60,160,0.25)';
  a.lineWidth = 2;
  for (let x = win.x; x < win.x + win.w; x += 40) { a.beginPath(); a.moveTo(x, win.y); a.lineTo(x, win.y + win.h); a.stroke(); }
  for (let y = win.y; y < win.y + win.h; y += 40) { a.beginPath(); a.moveTo(win.x, y); a.lineTo(win.x + win.w, y); a.stroke(); }
  a.restore();
  m.fillStyle = 'rgb(255,0,0)';
  rr(m, win.x, win.y, win.w, win.h, 40);
  m.fill();

  // Logo: chrome metallic ink
  text(a, '✦ GALAXY SERIES ✦', W / 2, 170, `800 30px ${FONT.body}`, '#ffffff');
  const lf = fitFont(a, 'STARLINE', 900, FONT.display, W - 200, 140);
  a.save();
  a.font = lf;
  a.textAlign = 'center';
  a.lineJoin = 'round';
  a.strokeStyle = '#10154a';
  a.lineWidth = 16;
  a.strokeText('STARLINE', W / 2, 280);
  const ch = a.createLinearGradient(0, 160, 0, 290);
  ch.addColorStop(0, '#ffffff');
  ch.addColorStop(0.5, '#9fb6ff');
  ch.addColorStop(0.52, '#3a3f7a');
  ch.addColorStop(1, '#e9f0ff');
  a.fillStyle = ch;
  a.fillText('STARLINE', W / 2, 280);
  a.restore();
  m.save();
  m.font = lf;
  m.textAlign = 'center';
  m.fillStyle = BLU;
  m.fillText('STARLINE', W / 2, 280);
  m.restore();

  // Product panel (opaque white ink)
  const p = { x: 70, y: 1090, w: W - 140, h: 310 };
  a.fillStyle = '#ffffff';
  rr(a, p.x, p.y, p.w, p.h, 26);
  a.fill();
  m.fillStyle = '#000';
  rr(m, p.x, p.y, p.w, p.h, 26);
  m.fill();
  text(a, 'VANGUARD', p.x + 40, p.y + 90, `900 72px ${FONT.display}`, '#10154a', 'left');
  text(a, 'EXPLORER-CLASS CRUISER', p.x + 42, p.y + 132, `800 28px ${FONT.body}`, '#7b2cff', 'left');
  const feats = ['• Die-cast metal saucer', '• Light-up nacelles*', '• Detachable display stand'];
  feats.forEach((f, i) => text(a, f, p.x + 42, p.y + 184 + i * 34, `600 26px ${FONT.body}`, '#222', 'left'));
  text(a, '*Batteries not included', p.x + p.w - 30, p.y + p.h - 24, `500 18px ${FONT.body}`, '#666', 'right');
  // ages badge
  a.fillStyle = '#10154a';
  a.beginPath();
  a.arc(p.x + p.w - 100, p.y + 120, 66, 0, Math.PI * 2);
  a.fill();
  text(a, 'AGES', p.x + p.w - 100, p.y + 104, `800 22px ${FONT.body}`, '#fff');
  text(a, '5+', p.x + p.w - 100, p.y + 156, `900 52px ${FONT.display}`, '#ffd400');

  // NEW! burst (matte ink)
  a.fillStyle = '#ff8a1a';
  starShape(a, W - 150, 400, 105, 78, 14);
  a.fill();
  m.fillStyle = '#000';
  starShape(m, W - 150, 400, 105, 78, 14);
  m.fill();
  a.save();
  a.translate(W - 150, 400);
  a.rotate(0.2);
  text(a, 'NEW!', 0, 18, `900 52px ${FONT.display}`, '#ffffff');
  a.restore();

  // hang-hole reinforcement ring
  a.strokeStyle = 'rgba(255,255,255,0.7)';
  a.lineWidth = 6;
  a.beginPath();
  a.ellipse(W / 2, 74, 76, 34, 0, 0, Math.PI * 2);
  a.stroke();

  return { map, mask };
}

// ---------------------------------------------------------------------------
// 05 — Motion (lenticular) card border.
// ---------------------------------------------------------------------------
export const LENS_RECT = { x: 64, y: 64, w: CARD_W - 128, h: 1060 };

export function motionCardBorder({ title = 'STARHAWK', sub = 'JUMP SEQUENCE  ·  MOTION 3 OF 12', footer = 'STARLINE ✦ MOTION', code = 'M3' } = {}) {
  const W = CARD_W, H = CARD_H;
  const { map, mask, a, m } = pair(W, H);
  const g = a.createLinearGradient(0, 0, W, H);
  g.addColorStop(0, '#1de1ff');
  g.addColorStop(0.5, '#e6f3ff');
  g.addColorStop(1, '#ff4fd8');
  a.fillStyle = g;
  a.fillRect(0, 0, W, H);
  m.fillStyle = RED;
  m.fillRect(0, 0, W, H);
  // diagonal pinstripes
  a.strokeStyle = 'rgba(16,20,60,0.12)';
  a.lineWidth = 3;
  for (let i = -H; i < W; i += 22) { a.beginPath(); a.moveTo(i, 0); a.lineTo(i + H, H); a.stroke(); }
  const L = LENS_RECT;
  a.fillStyle = '#000';
  rr(a, L.x, L.y, L.w, L.h, 14);
  a.fill();
  a.strokeStyle = '#10143c';
  a.lineWidth = 8;
  rr(a, L.x - 6, L.y - 6, L.w + 12, L.h + 12, 18);
  a.stroke();

  const np = { x: 64, y: 1150, w: W - 128, h: 160 };
  a.fillStyle = '#10143c';
  rr(a, np.x, np.y, np.w, np.h, 18);
  a.fill();
  m.fillStyle = '#000';
  rr(m, np.x, np.y, np.w, np.h, 18);
  m.fill();
  text(a, title, np.x + 40, np.y + 92, `900 76px ${FONT.display}`, '#ffffff', 'left');
  text(a, sub, np.x + 42, np.y + 134, `600 24px ${FONT.mono}`, '#8fe9ff', 'left');
  // tilt icon
  a.save();
  a.translate(np.x + np.w - 90, np.y + 80);
  a.strokeStyle = '#ffdf3d';
  a.lineWidth = 6;
  a.beginPath();
  a.moveTo(-50, 0); a.lineTo(50, 0);
  a.moveTo(-50, 0); a.lineTo(-34, -14); a.moveTo(-50, 0); a.lineTo(-34, 14);
  a.moveTo(50, 0); a.lineTo(34, -14); a.moveTo(50, 0); a.lineTo(34, 14);
  a.stroke();
  text(a, 'TILT', 0, 46, `800 22px ${FONT.body}`, '#ffdf3d');
  a.restore();
  text(a, footer, 80, H - 50, `700 28px ${FONT.body}`, '#10143c', 'left');
  text(a, code, W - 80, H - 50, `700 28px ${FONT.mono}`, '#10143c', 'right');
  return {
    map,
    mask,
    lensRect: [L.x / W, 1 - (L.y + L.h) / H, (L.x + L.w) / W, 1 - L.y / H],
  };
}

// ---------------------------------------------------------------------------
// 06 — Foil booster packet: transparent inks over metallised film.
// ---------------------------------------------------------------------------
export const PACK_W = 1024;
export const PACK_H = 1650;

export function packetFront() {
  const W = PACK_W, H = PACK_H;
  const { map, mask, a, m } = pair(W, H);
  a.fillStyle = '#e2e6ee';
  a.fillRect(0, 0, W, H);
  m.fillStyle = BLU; // transparent ink over foil everywhere by default
  m.fillRect(0, 0, W, H);

  // Diagonal colour bands (transparent ink → tinted metal)
  const bands = ['#2f6bff', '#7b4dff', '#ff3d9a', '#ff8a2b', '#18c7a0'];
  a.save();
  a.translate(W / 2, H / 2);
  a.rotate(-0.42);
  bands.forEach((c, i) => {
    a.fillStyle = c;
    a.fillRect(-1400, -900 + i * 360, 2800, 300);
  });
  a.restore();

  // Crimps (silver with printed hatch)
  for (const [y0, y1] of [[0, 120], [H - 120, H]]) {
    a.fillStyle = '#d7dbe4';
    a.fillRect(0, y0, W, y1 - y0);
    a.strokeStyle = 'rgba(20,24,60,0.35)';
    a.lineWidth = 3;
    for (let x = 0; x < W; x += 14) { a.beginPath(); a.moveTo(x, y0); a.lineTo(x, y1); a.stroke(); }
  }
  text(a, 'TEAR HERE ▸', 40, 160, `700 22px ${FONT.mono}`, '#ffffff', 'left');

  // Prismatic starburst behind the badge
  m.fillStyle = 'rgb(255,0,255)';
  starShape(m, 300, 1020, 260, 160, 16);
  m.fill();
  a.fillStyle = '#f5f7ff';
  starShape(a, 300, 1020, 260, 160, 16);
  a.fill();

  // Title panel — opaque white ink (not metallic)
  const p = { x: 90, y: 260, w: W - 180, h: 420 };
  a.fillStyle = '#ffffff';
  rr(a, p.x, p.y, p.w, p.h, 30);
  a.fill();
  m.fillStyle = '#000';
  rr(m, p.x, p.y, p.w, p.h, 30);
  m.fill();
  text(a, 'HOLO/ARCHIVE', W / 2, p.y + 120, fitFont(a, 'HOLO/ARCHIVE', 900, FONT.display, p.w - 80, 110), '#10143c');
  text(a, 'COLLECTOR CARDS', W / 2, p.y + 200, `800 52px ${FONT.body}`, '#7b4dff');
  a.fillStyle = '#ff3d9a';
  rr(a, W / 2 - 200, p.y + 250, 400, 110, 20);
  a.fill();
  text(a, 'SERIES ONE', W / 2, p.y + 326, `900 58px ${FONT.condensed}`, '#ffffff');

  // Badge (opaque yellow)
  a.fillStyle = '#ffd400';
  a.beginPath();
  a.arc(300, 1020, 150, 0, Math.PI * 2);
  a.fill();
  m.fillStyle = '#000';
  m.beginPath();
  m.arc(300, 1020, 150, 0, Math.PI * 2);
  m.fill();
  text(a, '6', 300, 1050, `900 150px ${FONT.display}`, '#10143c');
  text(a, 'CARDS', 300, 1110, `800 40px ${FONT.body}`, '#10143c');

  // Ribbon
  a.save();
  a.translate(640, 1300);
  a.rotate(-0.08);
  a.fillStyle = '#10143c';
  a.fillRect(-330, -70, 660, 140);
  text(a, '1 HOLO CHASE CARD', 0, -6, `900 46px ${FONT.condensed}`, '#ffffff');
  text(a, 'IN EVERY PACK!', 0, 46, `900 46px ${FONT.condensed}`, '#ffd400');
  a.restore();
  m.save();
  m.translate(640, 1300);
  m.rotate(-0.08);
  m.fillStyle = '#000';
  m.fillRect(-330, -70, 660, 140);
  m.restore();

  text(a, '© 2026 HOLO/ARCHIVE · NOT SUITABLE FOR CHILDREN UNDER 3', W / 2, H - 150, `600 18px ${FONT.mono}`, '#ffffff');
  return { map, mask };
}

export function packetBack() {
  const W = PACK_W, H = PACK_H;
  const { map, mask, a, m } = pair(W, H);
  a.fillStyle = '#cfd5e4';
  a.fillRect(0, 0, W, H);
  m.fillStyle = BLU;
  m.fillRect(0, 0, W, H);
  const p = { x: 90, y: 220, w: W - 180, h: 1180 };
  a.fillStyle = '#ffffff';
  rr(a, p.x, p.y, p.w, p.h, 26);
  a.fill();
  m.fillStyle = '#000';
  rr(m, p.x, p.y, p.w, p.h, 26);
  m.fill();
  text(a, 'SERIES ONE CHECKLIST', W / 2, p.y + 90, `900 54px ${FONT.condensed}`, '#10143c');
  const items = [
    '01  VANGUARD', '02  STARHAWK', '03  SENTINEL T-9', '04  THE SHATTERED ZONE', '05  NEBULA RUNNER',
    '06  DEFLECTOR CREW', '07  PRISM KNIGHT', '08  ORBITAL STATION', '09  LAST LIGHT', '10  WARP CORE',
    '11  MOTION: JUMP', '12  CHASE: ????',
  ];
  items.forEach((t, i) => {
    a.strokeStyle = '#10143c';
    a.lineWidth = 3;
    a.strokeRect(p.x + 60, p.y + 150 + i * 80, 34, 34);
    text(a, t, p.x + 120, p.y + 180 + i * 80, `700 34px ${FONT.mono}`, '#10143c', 'left');
  });
  return { map, mask };
}

// ---------------------------------------------------------------------------
// Card backs & comic back ad
// ---------------------------------------------------------------------------
export function cardBack({ title, subtitle, stats = [], blurb = '', number = '', accent = '#ff4f8b' }) {
  const W = CARD_W, H = CARD_H;
  const c = makeCanvas(W, H);
  const a = ctxOf(c);
  a.fillStyle = '#bfe1f0';
  a.fillRect(0, 0, W, H);
  // repeating star pattern
  a.fillStyle = 'rgba(30,60,120,0.08)';
  for (let y = 20; y < H; y += 60) for (let x = (y / 60) % 2 ? 30 : 0; x < W; x += 60) {
    starShape(a, x, y, 12, 5, 5);
    a.fill();
  }
  a.fillStyle = accent;
  rr(a, 50, 50, W - 100, 190, 20);
  a.fill();
  text(a, title, 90, 160, fitFont(a, title, 900, FONT.display, W - 320, 88), '#ffffff', 'left');
  text(a, subtitle, 92, 210, `700 28px ${FONT.mono}`, 'rgba(255,255,255,0.85)', 'left');
  a.fillStyle = '#10143c';
  a.beginPath();
  a.arc(W - 140, 145, 70, 0, Math.PI * 2);
  a.fill();
  text(a, number, W - 140, 168, `900 62px ${FONT.display}`, '#ffd400');

  a.fillStyle = '#ffffff';
  rr(a, 50, 280, W - 100, 560, 20);
  a.fill();
  text(a, 'TECHNICAL READOUT', 90, 350, `800 30px ${FONT.mono}`, '#10143c', 'left');
  stats.forEach(([k, v], i) => {
    const y = 420 + i * 70;
    a.fillStyle = i % 2 ? '#f2f6fb' : '#e5eef7';
    a.fillRect(80, y - 44, W - 160, 64);
    text(a, k, 100, y, `700 30px ${FONT.body}`, '#3a3f6a', 'left');
    text(a, v, W - 100, y, `800 30px ${FONT.mono}`, '#10143c', 'right');
  });

  // blurb
  a.fillStyle = '#10143c';
  a.font = `500 30px ${FONT.body}`;
  a.textAlign = 'left';
  const words = blurb.split(' ');
  let line = '';
  let y = 920;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (a.measureText(test).width > W - 180) { a.fillText(line, 90, y); line = w; y += 44; } else line = test;
  }
  if (line) a.fillText(line, 90, y);

  a.fillStyle = '#10143c';
  a.fillRect(50, H - 150, W - 100, 100);
  text(a, 'HOLO/ARCHIVE  ✦  STARLINE SERIES ONE', W / 2, H - 88, `800 30px ${FONT.body}`, '#ffffff');
  return { map: c };
}

export function comicBack() {
  const W = COMIC_W, H = COMIC_H;
  const c = makeCanvas(W, H);
  const a = ctxOf(c);
  a.fillStyle = '#fff8e1';
  a.fillRect(0, 0, W, H);
  halftone(a, 0, 0, W, H, 18, 'rgba(255,90,60,0.12)', 0.3, () => 0.6);
  a.fillStyle = '#e3172b';
  a.fillRect(0, 0, W, 240);
  text(a, 'BUILD YOUR OWN', W / 2, 100, `900 70px ${FONT.condensed}`, '#ffd400');
  text(a, 'STAR CRUISER!', W / 2, 200, `900 100px ${FONT.condensed}`, '#ffffff');
  // cutaway diagram
  a.strokeStyle = '#10143c';
  a.lineWidth = 6;
  a.beginPath();
  a.ellipse(W / 2, 520, 330, 90, 0, 0, Math.PI * 2);
  a.stroke();
  a.beginPath();
  a.moveTo(W / 2 - 60, 600); a.lineTo(W / 2 - 40, 760); a.lineTo(W / 2 + 40, 760); a.lineTo(W / 2 + 60, 600);
  a.stroke();
  a.strokeRect(W / 2 - 300, 780, 600, 70);
  ['SAUCER SECTION', 'LIGHT-UP CORE', 'WARP PODS'].forEach((t, i) => {
    text(a, t, 120 + i * 300, 940, `800 26px ${FONT.body}`, '#10143c');
  });
  text(a, 'Over 140 snap-together parts! Glows in the dark!', W / 2, 1020, `600 34px ${FONT.body}`, '#333');
  // coupon
  a.setLineDash([16, 12]);
  a.strokeStyle = '#111';
  a.lineWidth = 4;
  a.strokeRect(80, 1100, W - 160, 380);
  a.setLineDash([]);
  text(a, 'SEND ONLY $2.99 + 3 PROOFS OF PURCHASE', W / 2, 1170, `900 38px ${FONT.condensed}`, '#e3172b');
  for (let i = 0; i < 4; i++) {
    a.fillStyle = '#111';
    a.fillRect(140, 1230 + i * 56, W - 280, 2);
  }
  text(a, 'Allow 6–8 weeks for delivery.', W / 2, 1460, `500 22px ${FONT.body}`, '#555');
  return { map: c };
}

// Small brushed-metal museum plaque
export function plaque(no, label) {
  const c = makeCanvas(512, 160);
  const a = ctxOf(c);
  const g = a.createLinearGradient(0, 0, 0, 160);
  g.addColorStop(0, '#f6f7fb');
  g.addColorStop(1, '#d9dde8');
  a.fillStyle = g;
  a.fillRect(0, 0, 512, 160);
  a.fillStyle = 'rgba(0,0,0,0.035)';
  for (let y = 0; y < 160; y += 2) a.fillRect(0, y, 512, 1);
  text(a, no, 34, 92, `800 64px ${FONT.mono}`, '#17142b', 'left');
  text(a, label.toUpperCase(), 150, 72, `700 26px ${FONT.body}`, '#17142b', 'left');
  text(a, 'GALLERY 01 · FOIL & LIGHT', 150, 112, `600 18px ${FONT.mono}`, '#6b6888', 'left');
  return c;
}

export { hexA };
