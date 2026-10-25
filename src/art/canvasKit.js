import * as THREE from 'three';

// Small helpers for painting print artwork and foil masks with Canvas 2D.

export function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

export function ctxOf(canvas) {
  return canvas.getContext('2d', { willReadFrequently: false });
}

export function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Seeded RNG so artwork is stable between reloads.
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s += 0x6d2b79f5;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function colorTex(canvas, anisotropy = 8) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = anisotropy;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export function dataTex(canvas, anisotropy = 8) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = anisotropy;
  return t;
}

// Soft nebula: layered radial gradients in screen blend.
export function nebula(ctx, w, h, palette, seed = 3, count = 40, alpha = 0.22) {
  const r = rng(seed);
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  for (let i = 0; i < count; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = (0.08 + r() * 0.35) * Math.max(w, h);
    const col = palette[Math.floor(r() * palette.length)];
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    g.addColorStop(0, hexA(col, alpha * (0.5 + r())));
    g.addColorStop(1, hexA(col, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  ctx.restore();
}

export function stars(ctx, w, h, n, seed = 7, color = '#ffffff', maxR = 2.4) {
  const r = rng(seed);
  const list = [];
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = r() * w;
    const y = r() * h;
    const s = Math.pow(r(), 3) * maxR + 0.4;
    ctx.globalAlpha = 0.4 + r() * 0.6;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, s, 0, Math.PI * 2);
    ctx.fill();
    if (s > maxR * 0.6) {
      ctx.globalAlpha = 0.5;
      ctx.fillRect(x - s * 5, y - 0.6, s * 10, 1.2);
      ctx.fillRect(x - 0.6, y - s * 5, 1.2, s * 10);
    }
    list.push({ x, y, s });
  }
  ctx.restore();
  return list;
}

export function halftone(ctx, x0, y0, w, h, cell, colour, angle = 0.4, fn = () => 0.5) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.fillStyle = colour;
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const R = Math.hypot(w, h) / 2 + cell;
  for (let v = -R; v < R; v += cell) {
    for (let u = -R; u < R; u += cell) {
      const x = cx + u * ca - v * sa;
      const y = cy + u * sa + v * ca;
      if (x < x0 - cell || x > x0 + w + cell || y < y0 - cell || y > y0 + h + cell) continue;
      const k = fn((x - x0) / w, (y - y0) / h);
      if (k <= 0.01) continue;
      ctx.beginPath();
      ctx.arc(x, y, (cell * 0.5) * Math.min(1, k) * 1.05, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function hexA(hex, a) {
  const c = new THREE.Color(hex);
  return `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;
}

// Draws text whose stroke ramps from dark to white, producing a rounded bevel
// when the canvas is used as a height map.
export function bevelText(ctx, text, x, y, font, depth = 14, align = 'center') {
  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round';
  for (let i = depth; i >= 1; i--) {
    const v = Math.round(255 * Math.pow(1 - i / depth, 0.7));
    ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.lineWidth = i * 2;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = '#fff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function bevelPath(ctx, pathFn, depth = 10) {
  ctx.save();
  ctx.lineJoin = 'round';
  for (let i = depth; i >= 1; i--) {
    const v = Math.round(255 * Math.pow(1 - i / depth, 0.7));
    ctx.strokeStyle = `rgb(${v},${v},${v})`;
    ctx.lineWidth = i * 2;
    pathFn();
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  pathFn();
  ctx.fill();
  ctx.restore();
}

export const FONT = {
  display: '"Arial Black", "Helvetica Neue", Impact, sans-serif',
  condensed: 'Impact, "Arial Narrow Bold", "Arial Black", sans-serif',
  body: '"Instrument Sans", "Helvetica Neue", Arial, sans-serif',
  mono: '"JetBrains Mono", Menlo, monospace',
};
