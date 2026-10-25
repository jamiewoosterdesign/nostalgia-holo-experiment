// Authentic photographs of the two visible W2 lenticular poses.
// These are texture coordinates into unchanged source photos, not invented frames.
// public/assets/simpsons/sources.json records provenance and resolution limits.

const ROOT = '/assets/simpsons/';
export const SIMPSONS_PHOTOS = {
  flexed: {
    file: 'reference-angle-1.webp',
    quad: [[92, 277], [559, 280], [557, 936], [89, 933]],
  },
  relaxed: {
    file: 'reference-angle-2.webp',
    quad: [[306, 424], [1290, 516], [1021, 1534], [339, 1421]],
  },
  back: {
    file: 'reference-sgc9-2.webp',
    quad: [[310, 545], [852, 540], [929, 1328], [237, 1333]],
  },
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Cannot load Simpsons source: ${src}`));
    img.src = src;
  });
}

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

// Map a unit square onto a photographed planar quadrilateral. The perspective
// transform keeps the masthead and fixed illustration aligned between angles.
export function photoPoint(quad, u, v) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = quad;
  const dx1 = x1 - x2, dx2 = x3 - x2;
  const dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = Math.abs(det) > 1e-8 ? (sx * dy2 - dx2 * sy) / det : 0;
  const h = Math.abs(det) > 1e-8 ? (dx1 * sy - sx * dy1) / det : 0;
  const a = x1 - x0 + g * x1, b = x3 - x0 + h * x3;
  const d = y1 - y0 + g * y1, e = y3 - y0 + h * y3;
  const z = g * u + h * v + 1;
  return [(a * u + b * v + x0) / z, (d * u + e * v + y0) / z];
}

function drawTriangle(ctx, img, src, dst) {
  const [[x0, y0], [x1, y1], [x2, y2]] = src;
  const [[u0, v0], [u1, v1], [u2, v2]] = dst;
  const denom = x0 * (y1 - y2) + x1 * (y2 - y0) + x2 * (y0 - y1);
  if (Math.abs(denom) < 1e-8) return;
  const a = (u0 * (y1 - y2) + u1 * (y2 - y0) + u2 * (y0 - y1)) / denom;
  const b = (v0 * (y1 - y2) + v1 * (y2 - y0) + v2 * (y0 - y1)) / denom;
  const c = (u0 * (x2 - x1) + u1 * (x0 - x2) + u2 * (x1 - x0)) / denom;
  const d = (v0 * (x2 - x1) + v1 * (x0 - x2) + v2 * (x1 - x0)) / denom;
  const e = (u0 * (x1 * y2 - x2 * y1) + u1 * (x2 * y0 - x0 * y2) + u2 * (x0 * y1 - x1 * y0)) / denom;
  const f = (v0 * (x1 * y2 - x2 * y1) + v1 * (x2 * y0 - x0 * y2) + v2 * (x0 * y1 - x1 * y0)) / denom;
  ctx.save();
  ctx.beginPath();
  // A tiny overlap avoids antialiased seams between texture triangles.
  const cx = (u0 + u1 + u2) / 3, cy = (v0 + v1 + v2) / 3;
  dst.forEach(([x, y], i) => {
    const dx = x - cx, dy = y - cy, len = Math.hypot(dx, dy);
    const px = x + dx / len * 0.45, py = y + dy / len * 0.45;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  });
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(a, b, c, d, e, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

export function rectifyPhoto(img, quad, width = 700, height = 980) {
  const out = canvas(width, height);
  const ctx = out.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  // Only geometry is corrected: the physical card's artwork is unchanged.
  const nx = 18, ny = 26;
  for (let y = 0; y < ny; y++) {
    for (let x = 0; x < nx; x++) {
      const uv = [[x / nx, y / ny], [(x + 1) / nx, y / ny], [(x + 1) / nx, (y + 1) / ny], [x / nx, (y + 1) / ny]];
      const src = uv.map(([u, v]) => photoPoint(quad, u, v));
      const dst = uv.map(([u, v]) => [u * width, v * height]);
      drawTriangle(ctx, img, [src[0], src[1], src[2]], [dst[0], dst[1], dst[2]]);
      drawTriangle(ctx, img, [src[0], src[2], src[3]], [dst[0], dst[2], dst[3]]);
    }
  }
  return out;
}

export async function buildSimpsonsFrames() {
  const defs = [SIMPSONS_PHOTOS.relaxed, SIMPSONS_PHOTOS.flexed, SIMPSONS_PHOTOS.back];
  const images = await Promise.all(defs.map((d) => loadImage(ROOT + d.file)));
  const [relaxed, flexed, back] = images.map((img, i) => rectifyPhoto(img, defs[i].quad));
  const atlas = canvas(relaxed.width * 2, relaxed.height);
  const ctx = atlas.getContext('2d');
  ctx.drawImage(relaxed, 0, 0);
  ctx.drawImage(flexed, relaxed.width, 0);
  return {
    atlas, map: flexed, back,
    cols: 2, rows: 1, count: 2,
    rect: [0, 0, 1, 1],
    note: 'Two authentic photographed optical poses, perspective corrected at runtime. Original print ghosting is retained. No fabricated intermediate artwork.',
  };
}
