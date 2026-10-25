import { makeCanvas, ctxOf } from './canvasKit.js';

// Original photographs stay untouched on disk. Crops and finish separations
// are texture-space metadata, independent of the original printed artwork.
export async function loadImage(url) {
  const response = await fetch(url);
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error(`Artwork could not be loaded: ${url}`);
  }
  return createImageBitmap(await response.blob());
}

export function scan(image, crop = [0, 0, image.width, image.height], width = crop[2], height = crop[3]) {
  const map = makeCanvas(Math.round(width), Math.round(height));
  ctxOf(map).drawImage(image, ...crop, 0, 0, map.width, map.height);
  return map;
}

export function solidMask(map, color = '#000') {
  const mask = makeCanvas(map.width, map.height);
  const ctx = ctxOf(mask);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, mask.width, mask.height);
  return mask;
}

export function spiderManPrint(image) {
  const crop = [47, 43, 990, 1522];
  const map = scan(image, crop);
  const mask = solidMask(map);
  const m = ctxOf(mask);
  m.translate(-crop[0], -crop[1]);
  // Follow the inside of the printed black eye surrounds, in scan coordinates.
  // The reflection art, webbing, masthead and cover remain the original scan.
  m.fillStyle = 'rgb(205,0,25)';
  const left = new Path2D('M368 684 C350 723 314 852 309 937 C307 1043 332 1168 366 1264 C389 1336 445 1396 531 1418 C570 1429 593 1412 611 1372 C626 1330 641 1286 622 1242 C590 1172 566 1090 535 1015 C498 943 455 875 416 824 C392 781 380 724 368 684 Z');
  const right = new Path2D('M922 617 C946 638 1005 706 1025 749 L1032 1311 C1002 1350 968 1373 936 1373 C885 1364 837 1316 811 1267 C792 1220 776 1176 764 1135 C789 1065 827 989 860 914 C899 827 915 735 922 617 Z');
  m.fill(left); m.fill(right);
  return { map, mask, aspect: crop[2] / crop[3] };
}

export function hulkPrint(image) {
  const map = scan(image, [60, 18, 1062, 1476]);
  const mask = solidMask(map);
  const a = ctxOf(map).getImageData(0, 0, map.width, map.height);
  const m = ctxOf(mask).getImageData(0, 0, map.width, map.height);
  for (let i = 0; i < a.data.length; i += 4) {
    const r = a.data[i], g = a.data[i + 1], b = a.data[i + 2];
    const p = i / 4, x = p % map.width, y = Math.floor(p / map.width);
    const border = x < 65 || x > map.width - 70 || y < 65 || y > map.height - 82;
    const greenInk = g > r * 1.1 && g > b * 1.12;
    const darkInk = Math.max(r, g, b) < 88;
    // Silver microflakes in the stock, with dense inks screening the figure.
    const strength = border ? 0.9 : greenInk || darkInk ? 0.08 : 0.58;
    m.data[i] = 105 * strength;
    m.data[i + 1] = 245 * strength;
    m.data[i + 2] = 90 * strength;
  }
  ctxOf(mask).putImageData(m, 0, 0);
  return { map, mask };
}

// An honest archival reverse where an original reverse scan isn't available.
// Kept visually distinct from an invented manufacturer back.
export function archiveReverse(title, subtitle, lines = [], aspect = 5 / 7) {
  const map = makeCanvas(1200, Math.round(1200 / aspect));
  const c = ctxOf(map), h = map.height;
  c.fillStyle = '#e8e2d3'; c.fillRect(0, 0, 1200, h);
  c.fillStyle = '#292726'; c.fillRect(0, 0, 1200, 20);
  c.font = '600 25px monospace'; c.fillText('HOLO / ARCHIVE', 80, 120);
  c.font = '700 65px Arial';
  const words = title.split(' '); let line = '', y = 285;
  for (const word of words) {
    if (c.measureText(`${line} ${word}`).width > 1030) { c.fillText(line, 80, y); y += 80; line = word; }
    else line += (line ? ' ' : '') + word;
  }
  c.fillText(line, 80, y);
  c.font = '28px Arial'; c.fillStyle = '#615c52'; c.fillText(subtitle, 80, y + 65);
  c.fillRect(80, y + 110, 1040, 2);
  c.font = '30px Arial';
  lines.forEach((text, i) => c.fillText(text, 80, y + 200 + i * 65));
  c.font = '24px monospace';
  c.fillText('ARCHIVE DISPLAY REVERSE', 80, h - 145);
  c.font = '24px Arial'; c.fillText('The original reverse was not available.', 80, h - 100);
  return map;
}
