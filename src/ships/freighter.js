import * as THREE from 'three';
import { grimePlating, glowDisk } from './hullTextures.js';
import { rng } from '../art/canvasKit.js';

// An original battered light freighter: round disc hull, split forward
// mandibles, an off-centre cockpit tube, radar dish, a wide engine arc, and
// lots of surface clutter. Forward is +z, up is +y, diameter ≈ 1.

const profile = [
  [0.0, -0.078], [0.15, -0.075], [0.3, -0.065], [0.42, -0.045], [0.48, -0.015], [0.485, 0.0],
  [0.48, 0.015], [0.42, 0.045], [0.3, 0.07], [0.15, 0.082], [0.0, 0.085],
];
const heightAt = (r, top) => {
  const pts = top ? profile.slice(5).reverse() : profile.slice(0, 6);
  // pts sorted by r ascending
  const sorted = [...pts].sort((a, b) => a[0] - b[0]);
  for (let i = 0; i < sorted.length - 1; i++) {
    const [r0, y0] = sorted[i];
    const [r1, y1] = sorted[i + 1];
    if (r >= r0 && r <= r1) return y0 + ((r - r0) / (r1 - r0)) * (y1 - y0);
  }
  return 0;
};

export function buildFreighter() {
  const ship = new THREE.Group();
  ship.name = 'freighter';

  const plating = grimePlating(21);
  const hull = new THREE.MeshPhysicalMaterial({
    color: '#ffffff', map: plating, metalness: 0.25, roughness: 0.62, clearcoat: 0.1,
  });
  const hullPlain = new THREE.MeshPhysicalMaterial({ color: '#b9b5ad', metalness: 0.3, roughness: 0.55 });
  const dark = new THREE.MeshStandardMaterial({ color: '#2c2a29', metalness: 0.4, roughness: 0.6 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#0b1320', metalness: 0.1, roughness: 0.05, clearcoat: 1, emissive: '#2a5a8a', emissiveIntensity: 0.25,
  });
  const engine = new THREE.MeshStandardMaterial({
    color: '#000', emissive: '#8fd0ff', emissiveIntensity: 4.2,
  });

  // Disc
  const disc = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 128), hull);
  ship.add(disc);

  // Mandibles
  for (const side of [-1, 1]) {
    const g = new THREE.BoxGeometry(0.13, 0.065, 0.38, 2, 1, 4);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const z = p.getZ(i);
      const t = (z + 0.19) / 0.38; // 0 back → 1 front
      p.setY(i, p.getY(i) * (1 - t * 0.45));
      if (p.getX(i) * side < 0) p.setX(i, p.getX(i) * (1 - t * 0.2));
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, hull);
    m.position.set(side * 0.105, 0, 0.47);
    ship.add(m);
    // mandible detail boxes
    for (let k = 0; k < 4; k++) {
      const d = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.015, 0.05), k % 2 ? dark : hullPlain);
      d.position.set(side * (0.1 + (k % 2) * 0.02), 0.034 - k * 0.002, 0.36 + k * 0.07);
      ship.add(d);
    }
  }
  const slot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.05, 0.2), dark);
  slot.position.set(0, 0, 0.42);
  ship.add(slot);

  // Cockpit arm + tube (off-centre, starboard)
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.07), hullPlain);
  arm.position.set(0.45, 0.0, 0.2);
  arm.rotation.y = -0.35;
  ship.add(arm);
  const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.22, 32), hullPlain);
  tube.rotation.x = Math.PI / 2;
  tube.position.set(0.52, 0.0, 0.3);
  ship.add(tube);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.06, 32), hullPlain);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0.52, 0.0, 0.44);
  ship.add(nose);
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(0.032, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  canopy.rotation.x = Math.PI / 2;
  canopy.position.set(0.52, 0.0, 0.455);
  ship.add(canopy);

  // Radar dish (port side, top)
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.012, 0.06, 12), dark);
  stalk.position.set(-0.17, 0.1, 0.12);
  ship.add(stalk);
  const dish = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 32, 12, 0, Math.PI * 2, 0, 0.7),
    new THREE.MeshPhysicalMaterial({ color: '#cfcac0', metalness: 0.4, roughness: 0.4, side: THREE.DoubleSide }),
  );
  dish.rotation.x = -1.0;
  dish.position.set(-0.17, 0.15, 0.1);
  ship.add(dish);

  // Gun turret + hatch rings
  const turret = new THREE.Mesh(new THREE.SphereGeometry(0.06, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), hullPlain);
  turret.position.set(0, 0.085, -0.02);
  ship.add(turret);
  for (const s of [-1, 1]) {
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 8), dark);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(s * 0.02, 0.12, 0.05);
    ship.add(barrel);
  }
  for (const [x, z, rad] of [[0.2, -0.1, 0.05], [-0.22, -0.18, 0.04], [0.05, 0.25, 0.035]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.006, 8, 32), dark);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, heightAt(Math.hypot(x, z), true) + 0.002, z);
    ship.add(ring);
  }

  // Engine arc at the rear
  const arc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.487, 0.487, 0.028, 96, 1, true, Math.PI - 1.15, 2.3),
    engine,
  );
  arc.rotation.y = 0; // theta measured from +z, rear centred at PI
  ship.add(arc);
  const exhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 0.05, 96, 1, true, Math.PI - 1.15, 2.3),
    new THREE.MeshBasicMaterial({
      color: '#6fb8ff', transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    }),
  );
  ship.add(exhaust);

  // Side pod (port)
  const pod = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.2), hullPlain);
  pod.position.set(-0.47, 0, -0.05);
  ship.add(pod);

  // Greebles
  const r = rng(99);
  const gGeo = new THREE.BoxGeometry(1, 1, 1);
  const count = 260;
  const greebles = new THREE.InstancedMesh(gGeo, hullPlain, count);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const col = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const top = i < count * 0.7;
    let rad, ang;
    do {
      rad = 0.1 + r() * 0.34;
      ang = r() * Math.PI * 2;
    } while (Math.abs(Math.sin(ang)) < 0.15 && Math.cos(ang) < 0 && rad > 0.3); // keep engine edge clear
    const x = Math.sin(ang) * rad;
    const z = Math.cos(ang) * rad;
    const y = heightAt(rad, top) * (top ? 1 : 1);
    const sx = 0.01 + r() * 0.04;
    const sz = 0.01 + r() * 0.05;
    const sy = 0.004 + r() * 0.015;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ang + (r() < 0.5 ? 0 : Math.PI / 2));
    m4.compose(new THREE.Vector3(x, y + (top ? sy / 2 : -sy / 2), z), q, new THREE.Vector3(sx, sy, sz));
    greebles.setMatrixAt(i, m4);
    const l = 0.55 + r() * 0.35;
    col.setRGB(l, l * 0.98, l * 0.94);
    greebles.setColorAt(i, col);
  }
  ship.add(greebles);

  // Landing lights / port lights
  const lights = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffd28a').multiplyScalar(3) });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.006, 6, 6), lights);
    l.position.set(Math.sin(a) * 0.483, 0, Math.cos(a) * 0.483);
    ship.add(l);
  }

  ship.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  const root = new THREE.Group();
  root.add(ship);
  root.userData.size = 1.1;
  root.userData.engineGlow = glowDisk('#ffffff', '#9fd4ff', 'rgba(47,107,255,0)');
  return root;
}
