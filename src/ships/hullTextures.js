import * as THREE from 'three';
import { makeCanvas, ctxOf, rng, colorTex } from '../art/canvasKit.js';

// "Aztec" panelling: clean capital-ship plating made of overlapping tonal panels.
export function aztecPanels(seed = 11, size = 1024) {
  const c = makeCanvas(size, size);
  const ctx = ctxOf(c);
  const r = rng(seed);
  ctx.fillStyle = '#d6dae2';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    const w = 20 + r() * 180;
    const h = 10 + r() * 70;
    const x = r() * size;
    const y = r() * size;
    const l = 196 + Math.floor((r() - 0.5) * 34);
    const tint = r() < 0.5 ? 4 : -2;
    ctx.fillStyle = `rgb(${l - tint},${l},${l + tint * 2})`;
    ctx.globalAlpha = 0.55;
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 0.25;
  ctx.strokeStyle = '#8e95a3';
  ctx.lineWidth = 1;
  for (let i = 0; i < 260; i++) {
    const x = r() * size;
    const y = r() * size;
    ctx.strokeRect(x, y, 30 + r() * 140, 12 + r() * 50);
  }
  const t = colorTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Weathered freighter plating, laid out for a lathe (u = around, v = profile).
export function grimePlating(seed = 21, w = 2048, h = 1024) {
  const c = makeCanvas(w, h);
  const ctx = ctxOf(c);
  const r = rng(seed);
  ctx.fillStyle = '#bdb9b1';
  ctx.fillRect(0, 0, w, h);
  // radial plates
  const rings = [0, 90, 180, 300, 420, 520, 600, 700, 820, 930, 1024];
  for (let ri = 0; ri < rings.length - 1; ri++) {
    const y0 = rings[ri];
    const y1 = rings[ri + 1];
    let x = 0;
    while (x < w) {
      const pw = 40 + r() * 160;
      const l = 160 + Math.floor(r() * 50);
      const warm = r() < 0.18;
      ctx.fillStyle = warm ? `rgb(${l + 18},${l - 4},${l - 26})` : `rgb(${l},${l - 2},${l - 6})`;
      ctx.fillRect(x, y0, pw, y1 - y0);
      ctx.strokeStyle = 'rgba(60,55,50,0.45)';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y0, pw, y1 - y0);
      x += pw;
    }
  }
  // scorch & grime
  for (let i = 0; i < 160; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 10 + r() * 90;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const dark = r() < 0.7;
    g.addColorStop(0, dark ? 'rgba(40,34,28,0.35)' : 'rgba(150,80,40,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  // streaks
  ctx.strokeStyle = 'rgba(50,45,40,0.18)';
  for (let i = 0; i < 300; i++) {
    const x = r() * w;
    const y = r() * h;
    ctx.lineWidth = 1 + r() * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (r() - 0.5) * 6, y + 20 + r() * 60);
    ctx.stroke();
  }
  // red stripe accents
  ctx.fillStyle = 'rgba(178,52,40,0.85)';
  ctx.fillRect(w * 0.08, 300, w * 0.05, 120);
  ctx.fillRect(w * 0.57, 300, w * 0.05, 120);
  const t = colorTex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// Dotted window band (emissive), repeats around a ring.
export function windowBand(seed = 5, rows = 2, w = 2048, h = 64) {
  const c = makeCanvas(w, h);
  const ctx = ctxOf(c);
  const r = rng(seed);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  for (let row = 0; row < rows; row++) {
    const y = ((row + 0.5) / rows) * h;
    for (let x = 4; x < w; x += 9) {
      if (r() < 0.25) continue;
      const warm = r() < 0.8;
      ctx.fillStyle = warm ? '#ffe2a8' : '#cfe6ff';
      ctx.globalAlpha = 0.6 + r() * 0.4;
      ctx.fillRect(x, y - 3, 5, 6);
    }
  }
  const t = colorTex(c);
  t.wrapS = THREE.RepeatWrapping;
  return t;
}

// Radial gradient disk for deflectors / engines.
export function glowDisk(inner, mid, outer, size = 256) {
  const c = makeCanvas(size, size);
  const ctx = ctxOf(c);
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // concentric grille lines
  ctx.strokeStyle = 'rgba(0,0,0,0.25)';
  for (let rr = 12; rr < size / 2; rr += 12) {
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  return colorTex(c);
}

// Stripe grille for warp nacelle glow strips.
export function grille(color, size = 512) {
  const c = makeCanvas(size, 64);
  const ctx = ctxOf(c);
  const g = ctx.createLinearGradient(0, 0, 0, 64);
  g.addColorStop(0, '#000');
  g.addColorStop(0.5, color);
  g.addColorStop(1, '#000');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  for (let x = 0; x < size; x += 16) ctx.fillRect(x, 0, 3, 64);
  return colorTex(c);
}
