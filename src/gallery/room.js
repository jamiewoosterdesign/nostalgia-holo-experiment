import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { makeCanvas, ctxOf, colorTex, dataTex, rr } from '../art/canvasKit.js';
import { plaque } from '../art/prints.js';
import { createHoloMaterial } from '../materials/holoMaterial.js';
import { holoLaminate, laserPoster, loadArt } from '../art/era.js';

// Poster images are loaded once (boot) and reused when the room rebuilds on resize.
export const posterArt = { images: [] };
export async function loadPosters() {
  posterArt.images = await Promise.all(['poster-1', 'poster-2'].map((n) => loadArt(n)));
}

const wallCache = new Map();
function wallMaterial(key, w, h, seed) {
  if (wallCache.has(key)) return wallCache.get(key);
  const px = 1024;
  const panels = Math.max(2, Math.round(w / 0.42));
  const s = holoLaminate(Math.round(px * (w / h)), px, panels, seed);
  const height = dataTex(s.height);
  height.wrapS = height.wrapT = THREE.ClampToEdgeWrapping;
  const mat = createHoloMaterial({
    map: colorTex(s.map), roughness: 0.55, clearcoat: 0.35, clearcoatRoughness: 0.25,
    holo: {
      mask: dataTex(s.mask), height, emboss: 0.6,
      prism: 1, pattern: 'linear', patternScale: 90, patternAngle: 1.2, patternMix: 0.5,
      tiltGain: [2.2, 1.0], inkOver: 0.8, prismRough: 0.28, metalInkRough: 0.3,
      sparkle: 1, sparkleScale: 500, sparkleTilt: 0.4, sparkleRough: 0.2, glint: 1.0,
      aspect: w / h, glow: 0.0, saturation: 0.7,
    },
  });
  wallCache.set(key, mat);
  return mat;
}
function dataTexSRGB(c) { const t = colorTex(c); return t; }

// The gallery alcove behind the screen. The screen is the opening at z = 0;
// the room extends to z = -DEPTH. Bright, pearlescent, with a few saturated
// accents (electric blue, translucent orange, violet) and chrome.
export const ROOM = { depth: 1.35, floorY: -0.5, ceilY: 0.5 };

function ribbedNormalMap(stripes = 1) {
  const c = makeCanvas(256, 4);
  const a = ctxOf(c);
  const img = a.createImageData(256, 4);
  for (let x = 0; x < 256; x++) {
    const t = ((x / 256) * stripes) % 1;
    const nx = (t - 0.5) * 1.6;
    const nz = Math.sqrt(Math.max(0, 1 - nx * nx));
    for (let y = 0; y < 4; y++) {
      const i = (y * 256 + x) * 4;
      img.data[i] = (nx * 0.5 + 0.5) * 255;
      img.data[i + 1] = 128;
      img.data[i + 2] = nz * 255;
      img.data[i + 3] = 255;
    }
  }
  a.putImageData(img, 0, 0);
  const t = dataTex(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

// Tonal wall: one pearl colour, lit by a soft pool and falling off into the
// corners and floor so the room has depth without competing with the foils.
// `backAtU` = 0 or 1 says which edge of the texture meets the back wall.
function wallTex({ base, shade, pool = null, backAtU = null, poolY = 0.4 }) {
  const S = 512;
  const c = makeCanvas(S, S);
  const a = ctxOf(c);
  a.fillStyle = base;
  a.fillRect(0, 0, S, S);
  // falloff toward floor and ceiling
  let g = a.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, shade.replace('A', '0.35'));
  g.addColorStop(0.25, shade.replace('A', '0'));
  g.addColorStop(0.7, shade.replace('A', '0'));
  g.addColorStop(1, shade.replace('A', '0.55'));
  a.fillStyle = g; a.fillRect(0, 0, S, S);
  if (backAtU !== null) {
    // side walls: darker into the back corner, lighter at the opening
    const x0 = backAtU ? S : 0, x1 = backAtU ? 0 : S;
    g = a.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, shade.replace('A', '0.5'));
    g.addColorStop(0.45, shade.replace('A', '0.12'));
    g.addColorStop(1, shade.replace('A', '0'));
    a.fillStyle = g; a.fillRect(0, 0, S, S);
  } else {
    // back wall: vignette into both corners
    g = a.createLinearGradient(0, 0, S, 0);
    g.addColorStop(0, shade.replace('A', '0.4'));
    g.addColorStop(0.22, shade.replace('A', '0'));
    g.addColorStop(0.78, shade.replace('A', '0'));
    g.addColorStop(1, shade.replace('A', '0.4'));
    a.fillStyle = g; a.fillRect(0, 0, S, S);
  }
  if (pool) {
    const r = a.createRadialGradient(S / 2, S * poolY, 0, S / 2, S * poolY, S * 0.55);
    r.addColorStop(0, pool);
    r.addColorStop(1, 'rgba(255,255,255,0)');
    a.fillStyle = r; a.fillRect(0, 0, S, S);
  }
  return colorTex(c);
}

function haloTex() {
  const S = 512;
  const c = makeCanvas(S, S);
  const a = ctxOf(c);
  const r = a.createRadialGradient(S / 2, S / 2, S * 0.18, S / 2, S / 2, S / 2);
  r.addColorStop(0, 'rgba(255,255,255,0)');
  r.addColorStop(0.42, 'rgba(255,250,255,0.9)');
  r.addColorStop(0.55, 'rgba(225,215,255,0.45)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  a.fillStyle = r; a.fillRect(0, 0, S, S);
  return colorTex(c);
}

export function buildRoom(aspect) {
  const group = new THREE.Group();
  const W = aspect; // room width matches the screen
  const D = ROOM.depth;
  const H = 1;
  const parts = {};

  // --- Materials -------------------------------------------------------------
  const pearl = (color, iri = 0.8) => new THREE.MeshPhysicalMaterial({
    color, roughness: 0.42, metalness: 0.0,
    iridescence: iri, iridescenceIOR: 1.6, iridescenceThicknessRange: [250, 650],
    sheen: 0.6, sheenColor: new THREE.Color('#d9d2ff'), sheenRoughness: 0.5,
    clearcoat: 0.25, clearcoatRoughness: 0.35,
  });
  const chrome = new THREE.MeshPhysicalMaterial({ color: '#f2f4fa', metalness: 1, roughness: 0.08 });
  const satinSilver = new THREE.MeshPhysicalMaterial({
    color: '#e7e9f0', metalness: 1, roughness: 0.32, anisotropy: 0.8,
  });

  // --- Shell: a square room in dark printed board with foil-stamped 90s confetti
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), wallMaterial('back' + W.toFixed(2), W, H, 11));
  back.position.set(0, 0, -D);
  back.receiveShadow = true;
  group.add(back);

  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMaterial('side', D, H, 23));
  left.rotation.y = Math.PI / 2;
  left.position.set(-W / 2, 0, -D / 2);
  left.receiveShadow = true;
  group.add(left);

  const right = new THREE.Mesh(new THREE.PlaneGeometry(D, H), wallMaterial('side2', D, H, 37));
  right.rotation.y = -Math.PI / 2;
  right.position.set(W / 2, 0, -D / 2);
  right.receiveShadow = true;
  group.add(right);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: '#0e0d1a', roughness: 0.85 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, H / 2, -D / 2);
  group.add(ceil);

  // --- Laser posters on the side walls -------------------------------------
  posterArt.images.forEach((img, i) => {
    if (!img) return;
    const ph = 0.56;
    const pw = ph * (img.width / img.height);
    const sheet = laserPoster(img, 1024);
    const mat = createHoloMaterial({
      map: colorTex(sheet.map), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.03,
      holo: {
        mask: dataTex(sheet.mask), prism: 1, pattern: i ? 'concentric' : 'starburst', patternScale: i ? 60 : 90,
        tiltGain: [2.0, 1.2], inkOver: 0.9, prismRough: 0.12,
        sparkle: 1, sparkleScale: 200, sparkleTilt: 1.3, glint: 6, aspect: pw / ph, glow: 0.02,
      },
    });
    const poster = new THREE.Group();
    const face = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), mat);
    face.position.z = 0.006;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(pw + 0.024, ph + 0.024, 0.01), new THREE.MeshPhysicalMaterial({ color: '#0a0a0e', roughness: 0.35, clearcoat: 0.8 }));
    poster.add(frame, face);
    const side = i === 0 ? -1 : 1;
    poster.rotation.y = -side * Math.PI / 2;
    poster.position.set(side * (W / 2 - 0.006), 0.06, -D * 0.5);
    group.add(poster);
  });

  // Chrome corner trims so the box reads as built architecture.
  const trim = (len, x, y, z, axis) => {
    const g = axis === 'z' ? new THREE.BoxGeometry(0.012, 0.012, len)
      : axis === 'y' ? new THREE.BoxGeometry(0.012, len, 0.012) : new THREE.BoxGeometry(len, 0.012, 0.012);
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: '#2a2833', metalness: 0.9, roughness: 0.3 }));
    m.position.set(x, y, z);
    group.add(m);
  };
  for (const sx of [-1, 1]) {
    trim(D, sx * W / 2, H / 2, -D / 2, 'z');
    trim(D, sx * W / 2, -H / 2, -D / 2, 'z');
    trim(H, sx * W / 2, 0, -D, 'y');
  }
  trim(W, 0, H / 2, -D, 'x');
  trim(W, 0, -H / 2, -D, 'x');

  // Floor (glossy resin; reflection injected by FloorMirror)
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: '#05030a', roughness: 0.1, metalness: 0.0, envMapIntensity: 0.15,
  });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, ROOM.floorY, -D / 2);
  floor.receiveShadow = true;
  group.add(floor);
  parts.floor = floor;

  // Window frame (the "opening" of the alcove) — a thin satin silver bezel.
  const bezelT = 0.012;
  for (const [x, y, w, h] of [[0, H / 2 - bezelT / 2, W, bezelT], [0, -H / 2 + bezelT / 2, W, bezelT], [-W / 2 + bezelT / 2, 0, bezelT, H], [W / 2 - bezelT / 2, 0, bezelT, H]]) {
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), new THREE.MeshPhysicalMaterial({ color: '#1a1922', metalness: 0.8, roughness: 0.35 }));
    b.position.set(x, y, -0.01);
    group.add(b);
  }

  // --- Plinths (tinted acrylic) ---------------------------------------------------
  // Smoked black glass plinths with a coloured edge glow, so they sit back
  // and let the exhibits and walls carry the colour.
  const acrylic = (color) => new THREE.MeshPhysicalMaterial({
    color: '#0c0814', roughness: 0.18, metalness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05,
    emissive: new THREE.Color(color), emissiveIntensity: 0.06, envMapIntensity: 0.6,
  });
  const plinths = [];
  const makePlinth = (x, z, w, h, d, color, no, label) => {
    const p = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, 0.012), acrylic(color));
    p.position.set(x, ROOM.floorY + h / 2, z);
    p.castShadow = true;
    p.receiveShadow = true;
    group.add(p);
    // satin top plate
    const top = new THREE.Mesh(new RoundedBoxGeometry(w * 1.02, 0.008, d * 1.02, 2, 0.003), satinSilver);
    top.position.set(x, ROOM.floorY + h + 0.004, z);
    top.receiveShadow = true;
    group.add(top);
    // plaque
    const tex = colorTex(plaque(no, label));
    const pl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12, 0.0375),
      new THREE.MeshPhysicalMaterial({ map: tex, metalness: 0.6, roughness: 0.35, clearcoat: 0.5 }),
    );
    pl.position.set(x, ROOM.floorY + h * 0.72, z + d / 2 + 0.002);
    group.add(pl);
    plinths.push(p);
    return ROOM.floorY + h + 0.008;
  };

  // Floor glow rings under floating exhibits
  const ringTex = (() => {
    const c = makeCanvas(256, 256);
    const a = ctxOf(c);
    const g = a.createRadialGradient(128, 128, 30, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.62, 'rgba(160,190,255,0.0)');
    g.addColorStop(0.8, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    a.fillStyle = g;
    a.fillRect(0, 0, 256, 256);
    return colorTex(c);
  })();
  const glowRing = (x, z, r) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(r * 2, r * 2),
      new THREE.MeshBasicMaterial({ map: ringTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8 }),
    );
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, ROOM.floorY + 0.002, z);
    group.add(m);
    return m;
  };

  return { group, parts, makePlinth, glowRing, plinths, W, D };
}
