import * as THREE from 'three';
import { rng } from '../art/canvasKit.js';

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}

// A card with real thickness. Material groups: 0 = front, 1 = back, 2 = edge.
// Front/back UVs span 0..1 over the card face (back mirrored so its art reads correctly).
export function cardGeometry(w, h, radius, thickness, holes = []) {
  const shape = roundedRectShape(w, h, radius);
  for (const hole of holes) {
    const p = new THREE.Path();
    p.absellipse(hole.x, hole.y, hole.rx, hole.ry, 0, Math.PI * 2, true);
    shape.holes.push(p);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness, bevelEnabled: false, curveSegments: 10,
  });
  geo.translate(0, 0, -thickness / 2);
  geo.computeVertexNormals();

  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  const front = [], back = [], edge = [];
  for (let t = 0; t < pos.count / 3; t++) {
    const i = t * 3;
    const nz = (nrm.getZ(i) + nrm.getZ(i + 1) + nrm.getZ(i + 2)) / 3;
    const bucket = nz > 0.9 ? front : nz < -0.9 ? back : edge;
    bucket.push(i, i + 1, i + 2);
    for (let k = 0; k < 3; k++) {
      const x = pos.getX(i + k), y = pos.getY(i + k);
      if (bucket === front) uv.setXY(i + k, (x + w / 2) / w, (y + h / 2) / h);
      else if (bucket === back) uv.setXY(i + k, 1 - (x + w / 2) / w, (y + h / 2) / h);
    }
  }
  geo.setIndex([...front, ...back, ...edge]);
  geo.clearGroups();
  geo.addGroup(0, front.length, 0);
  geo.addGroup(front.length, back.length, 1);
  geo.addGroup(front.length + back.length, edge.length, 2);
  return geo;
}

// Pillow-shaped foil packet with crimped ends and baked-in crinkles.
// side = +1 front face, -1 back face. Both meet at z = 0 around the edge.
export function packetGeometry(w, h, side = 1, seed = 4) {
  const segX = 120, segY = 190;
  const geo = new THREE.PlaneGeometry(w, h, segX, segY);
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  const r = rng(seed);
  // Random crease lines: each crease is a line with a sharp ridge profile.
  const creases = [];
  for (let i = 0; i < 34; i++) {
    const a = r() * Math.PI;
    creases.push({
      nx: Math.cos(a), ny: Math.sin(a),
      d: (r() - 0.5) * (w + h) * 0.6,
      amp: (0.0012 + r() * 0.0035) * (r() < 0.5 ? -1 : 1),
      width: 0.006 + r() * 0.02,
    });
  }
  const crimp = 0.075; // fraction of height at each end
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    const u = x / w + 0.5, v = y / h + 0.5;
    const ex = Math.sin(Math.PI * Math.min(1, Math.max(0, u)));
    const inBody = v > crimp && v < 1 - crimp;
    const vb = Math.min(1, Math.max(0, (v - crimp) / (1 - 2 * crimp)));
    const ey = inBody ? Math.sin(Math.PI * vb) : 0;
    let z = Math.pow(ex, 0.45) * Math.pow(ey, 0.35) * 0.028;
    // crinkles fade toward the seams
    let cr = 0;
    for (const c of creases) {
      const dist = x * c.nx + y * c.ny - c.d;
      cr += c.amp * Math.max(0, 1 - Math.abs(dist) / c.width);
    }
    z += cr * Math.pow(ex * (inBody ? ey : 0.2), 0.5);
    // crimp ridges
    if (!inBody) z += Math.abs(Math.sin(x * 260)) * 0.0012 - 0.0006;
    // fin seam along the edges
    pos.setZ(i, z * side);
    if (side < 0) uv.setX(i, 1 - uv.getX(i));
  }
  if (side < 0) {
    // flip winding so the back faces outward
    const idx = geo.index.array;
    for (let i = 0; i < idx.length; i += 3) { const t = idx[i]; idx[i] = idx[i + 1]; idx[i + 1] = t; }
  }
  geo.computeVertexNormals();
  return geo;
}

// Clear moulded blister bubble: a rounded slab with a flange.
export function blisterGeometry(w, h, depth, radius) {
  const shape = roundedRectShape(w, h, radius);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth * 0.4,
    bevelEnabled: true,
    bevelThickness: depth * 0.6,
    bevelSize: radius * 0.6,
    bevelSegments: 10,
    curveSegments: 16,
  });
  geo.computeVertexNormals();
  return geo;
}
