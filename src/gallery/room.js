import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { makeCanvas, ctxOf, colorTex, dataTex } from '../art/canvasKit.js';
import { plaque } from '../art/prints.js';

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

function wallGradient(top, bottom, accent) {
  const c = makeCanvas(512, 512);
  const a = ctxOf(c);
  const g = a.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  a.fillStyle = g;
  a.fillRect(0, 0, 512, 512);
  if (accent) {
    const r = a.createRadialGradient(380, 360, 10, 380, 360, 360);
    r.addColorStop(0, accent);
    r.addColorStop(1, 'rgba(255,255,255,0)');
    a.fillStyle = r;
    a.fillRect(0, 0, 512, 512);
  }
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

  // --- Shell ---------------------------------------------------------------------
  const back = new THREE.Mesh(new THREE.PlaneGeometry(W, H), pearl('#f6f3ff'));
  back.material.map = wallGradient('#f3f6ff', '#efe8ff', 'rgba(255,214,240,0.55)');
  back.position.set(0, 0, -D);
  back.receiveShadow = true;
  group.add(back);

  const leftMat = new THREE.MeshPhysicalMaterial({
    map: wallGradient('#7b4dff', '#ff3d9a', 'rgba(255,170,60,0.55)'), roughness: 0.3, clearcoat: 0.8,
    iridescence: 0.4, iridescenceThicknessRange: [200, 500],
  });
  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, H), leftMat);
  left.rotation.y = Math.PI / 2;
  left.position.set(-W / 2, 0, -D / 2);
  left.receiveShadow = true;
  group.add(left);

  // Right wall: saturated electric blue behind ribbed glass.
  const rightMat = new THREE.MeshPhysicalMaterial({
    map: wallGradient('#2f6bff', '#7b4dff', 'rgba(24,199,240,0.8)'), roughness: 0.35, clearcoat: 0.6,
  });
  const right = new THREE.Mesh(new THREE.PlaneGeometry(D, H), rightMat);
  right.rotation.y = -Math.PI / 2;
  right.position.set(W / 2, 0, -D / 2);
  right.receiveShadow = true;
  group.add(right);

  const ribbed = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 1, roughness: 0.08, thickness: 0.05, ior: 1.5,
    normalMap: ribbedNormalMap(1), normalScale: new THREE.Vector2(1, 1), clearcoat: 1,
  });
  ribbed.normalMap.repeat.set(70, 1);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(D * 0.78, H * 0.92), ribbed);
  glass.rotation.y = -Math.PI / 2;
  glass.position.set(W / 2 - 0.07, 0, -D * 0.52);
  group.add(glass);
  parts.ribbedGlass = glass;

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: '#fbfaff', roughness: 0.8 }));
  ceil.rotation.x = Math.PI / 2;
  ceil.position.set(0, H / 2, -D / 2);
  group.add(ceil);
  // ceiling light slots
  for (let i = 0; i < 3; i++) {
    const slot = new THREE.Mesh(
      new THREE.PlaneGeometry(W * 0.8, 0.035),
      new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffffff').multiplyScalar(2.2) }),
    );
    slot.rotation.x = Math.PI / 2;
    slot.position.set(0, H / 2 - 0.001, -0.2 - i * 0.42);
    group.add(slot);
  }

  // Floor (glossy resin; reflection injected by FloorMirror)
  const floorMat = new THREE.MeshPhysicalMaterial({
    color: '#b9bccf', roughness: 0.12, metalness: 0.0, clearcoat: 0.6, clearcoatRoughness: 0.08,
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
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.02), satinSilver);
    b.position.set(x, y, -0.01);
    group.add(b);
  }

  // --- Back-wall centrepiece: translucent orange disc in a chrome halo ----------
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.025, 96),
    new THREE.MeshPhysicalMaterial({
      color: '#ff7a2b', transmission: 0.9, roughness: 0.15, thickness: 0.4, ior: 1.49,
      attenuationColor: new THREE.Color('#ff5a00'), attenuationDistance: 0.25, clearcoat: 1,
    }),
  );
  disc.rotation.x = Math.PI / 2;
  disc.position.set(0, 0.16, -D + 0.07);
  group.add(disc);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.295, 0.01, 24, 160), chrome);
  halo.position.set(0, 0.16, -D + 0.07);
  group.add(halo);
  // little light behind the disc makes it glow
  const glowLight = new THREE.PointLight('#ff8a3d', 0.6, 1.2, 2);
  glowLight.position.set(0, 0.16, -D + 0.02);
  group.add(glowLight);

  // Vertical chrome fins on the back wall (depth cues when you lean)
  for (let i = 0; i < 2; i++) {
    for (const s of [-1, 1]) {
      const fin = new THREE.Mesh(new RoundedBoxGeometry(0.02, H * 0.86, 0.09, 3, 0.008), i ? satinSilver : chrome);
      fin.position.set(s * (0.5 + i * 0.1) * (W / 1.6), 0, -D + 0.045);
      fin.castShadow = true;
      group.add(fin);
    }
  }

  // Gallery rails on the left wall
  for (let i = 0; i < 2; i++) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, D * 0.9, 12), chrome);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(-W / 2 + 0.01, 0.3 - i * 0.04, -D / 2);
    group.add(rail);
  }

  // --- Plinths (tinted acrylic) ---------------------------------------------------
  const acrylic = (color) => new THREE.MeshPhysicalMaterial({
    color: '#ffffff', transmission: 1, roughness: 0.05, thickness: 0.25, ior: 1.49,
    attenuationColor: new THREE.Color(color), attenuationDistance: 0.28, clearcoat: 1, clearcoatRoughness: 0.05,
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
    g.addColorStop(0.8, 'rgba(160,140,255,0.55)');
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
