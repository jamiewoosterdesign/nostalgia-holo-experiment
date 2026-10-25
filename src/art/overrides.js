// Drop-in artwork. Put generated illustrations in /public/art and they replace
// the procedural art inside each exhibit's art window on the next reload:
//
//   public/art/selective.png       art for card 01 (portrait ~ 0.88 : 1)
//   public/art/selective-foil.png  optional greyscale: white = prismatic foil
//   public/art/refractor.png       art for card 02
//   public/art/comic.png           cover art for 03 (below the masthead)
//   public/art/blister.png         replaces the blister backing window
//   public/art/packet.png          replaces the packet's centre artwork
//
// Without a -foil mask, card 01 treats the art as matte (border stays foil),
// and card 02 keeps its "foil everywhere" behaviour.

const WINDOWS = {
  selective: { x: 54, y: 54, w: 916, h: 1040, foil: 0 },
  refractor: { x: 50, y: 50, w: 924, h: 1060, foil: 200 },
  comic: { x: 0, y: 332, w: 1024, h: 1228, foil: 0 },
  blister: { x: 90, y: 300, w: 844, h: 760, foil: 70 },
  packet: { x: 90, y: 700, w: 844, h: 480, foil: -1 },
};

async function loadImage(url) {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const type = res.headers.get('content-type') || '';
    if (!type.startsWith('image/')) return null; // Vite serves index.html for misses
    const blob = await res.blob();
    return await createImageBitmap(blob);
  } catch {
    return null;
  }
}

function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  const iw = img.width * s;
  const ih = img.height * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  ctx.restore();
}

export async function applyOverride(id, art) {
  const win = WINDOWS[id];
  if (!win) return;
  const img = await loadImage(`/art/${id}.png`);
  if (!img) return;
  const a = art.map.getContext('2d');
  cover(a, img, win.x, win.y, win.w, win.h);
  art.replaced = true;
  if (art.mask) {
    const m = art.mask.getContext('2d');
    const foil = await loadImage(`/art/${id}-foil.png`);
    if (foil) {
      // Put the greyscale foil mask into the red channel.
      const tmp = new OffscreenCanvas(win.w, win.h);
      const t = tmp.getContext('2d');
      cover(t, foil, 0, 0, win.w, win.h);
      const data = t.getImageData(0, 0, win.w, win.h);
      const out = m.getImageData(win.x, win.y, win.w, win.h);
      for (let i = 0; i < data.data.length; i += 4) {
        out.data[i] = data.data[i];
        out.data[i + 1] = 0;
      }
      m.putImageData(out, win.x, win.y);
    } else if (win.foil >= 0) {
      m.fillStyle = `rgb(${win.foil},${id === 'blister' ? 60 : 0},0)`;
      m.fillRect(win.x, win.y, win.w, win.h);
    }
  }
}
