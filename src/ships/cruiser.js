import * as THREE from 'three';
import { aztecPanels, windowBand, glowDisk, grille } from './hullTextures.js';

// An original late-80s style explorer cruiser: elliptical saucer, swept neck,
// engineering hull with a glowing deflector, and two long glowing nacelles.
// Forward is +z, up is +y, overall length ≈ 1.

const lathe = (pts, seg = 96) =>
  new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

export function buildCruiser() {
  const ship = new THREE.Group();
  ship.name = 'cruiser';

  const panels = aztecPanels(11);
  panels.repeat.set(3, 2);
  const hull = new THREE.MeshPhysicalMaterial({
    color: '#c3c8d2',
    map: panels,
    metalness: 0.35,
    roughness: 0.42,
    clearcoat: 0.4,
    clearcoatRoughness: 0.25,
  });
  const hullDark = new THREE.MeshPhysicalMaterial({ color: '#9aa1ad', metalness: 0.5, roughness: 0.4 });
  const glowBlue = new THREE.MeshStandardMaterial({
    color: '#000', emissive: '#5fb4ff', emissiveIntensity: 3.2, emissiveMap: grille('#ffffff'),
  });
  const glowRed = new THREE.MeshStandardMaterial({ color: '#330000', emissive: '#ff3b2a', emissiveIntensity: 3.5 });
  const windows = new THREE.MeshStandardMaterial({
    color: '#202430', emissive: '#ffffff', emissiveIntensity: 1.8, emissiveMap: windowBand(5, 2), roughness: 0.4,
  });

  // --- Saucer ---------------------------------------------------------------
  const saucerProfile = [
    [0.0, -0.05], [0.2, -0.046], [0.38, -0.036], [0.52, -0.024], [0.58, -0.01], [0.585, 0.0],
    [0.58, 0.009], [0.55, 0.024], [0.45, 0.042], [0.3, 0.06], [0.12, 0.072], [0.0, 0.075],
  ];
  const saucer = new THREE.Mesh(lathe(saucerProfile), hull);
  saucer.scale.set(1.12, 1, 0.98);
  saucer.position.set(0, 0, 0.3);
  ship.add(saucer);

  // Window bands around the rim
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.586, 0.586, 0.016, 128, 1, true), windows);
  windows.emissiveMap.repeat.set(3, 1);
  band.scale.copy(saucer.scale);
  band.position.copy(saucer.position);
  ship.add(band);
  const band2 = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.012, 128, 1, true), windows);
  band2.position.set(0, 0.035, 0.3);
  band2.scale.copy(saucer.scale);
  ship.add(band2);

  // Bridge dome + sensor ring
  const bridge = new THREE.Mesh(new THREE.SphereGeometry(0.07, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), hull);
  bridge.scale.set(1.1, 0.55, 1);
  bridge.position.set(0, 0.074, 0.28);
  ship.add(bridge);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.004, 8, 128), hullDark);
  ring.rotation.x = Math.PI / 2;
  ring.scale.set(1.12, 0.98, 1);
  ring.position.set(0, 0.066, 0.3);
  ship.add(ring);

  // Impulse engines at saucer rear
  const impulse = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.022, 0.02), glowRed);
  impulse.position.set(0, 0.0, -0.245);
  ship.add(impulse);

  // --- Neck -----------------------------------------------------------------
  const neckGeo = new THREE.BoxGeometry(0.11, 0.16, 0.3, 1, 1, 1);
  const np = neckGeo.attributes.position;
  for (let i = 0; i < np.count; i++) {
    // taper toward the top & sweep back
    const y = np.getY(i);
    if (y > 0) np.setX(i, np.getX(i) * 0.7);
    if (y > 0) np.setZ(i, np.getZ(i) * 0.75 + 0.05);
  }
  neckGeo.computeVertexNormals();
  const neck = new THREE.Mesh(neckGeo, hull);
  neck.position.set(0, -0.1, -0.04);
  neck.rotation.x = -0.25;
  ship.add(neck);

  // --- Engineering hull -------------------------------------------------------
  const engProfile = [
    [0.0, -0.4], [0.03, -0.395], [0.055, -0.36], [0.07, -0.25], [0.078, -0.05], [0.08, 0.15],
    [0.078, 0.25], [0.072, 0.31], [0.064, 0.33], [0.0, 0.33],
  ];
  const eng = new THREE.Mesh(lathe(engProfile, 64), hull);
  eng.rotation.x = Math.PI / 2;
  eng.scale.set(1.25, 1, 0.95); // after rotation: x width, z(height) handled by scale.z
  eng.position.set(0, -0.19, -0.22);
  ship.add(eng);

  const deflector = new THREE.Mesh(
    new THREE.CircleGeometry(0.06, 48),
    new THREE.MeshStandardMaterial({
      color: '#000', emissive: '#ffffff', emissiveIntensity: 2.4,
      emissiveMap: glowDisk('#fff3c4', '#ff9a3c', '#2f6bff'),
    }),
  );
  deflector.scale.set(1.25, 0.95, 1);
  deflector.position.set(0, -0.19, 0.112);
  ship.add(deflector);
  const deflRim = new THREE.Mesh(new THREE.TorusGeometry(0.062, 0.008, 12, 48), hullDark);
  deflRim.scale.set(1.25, 0.95, 1);
  deflRim.position.copy(deflector.position);
  ship.add(deflRim);

  // --- Pylons & nacelles ---------------------------------------------------------
  const nacelleProfile = [
    [0.0, -0.32], [0.025, -0.318], [0.04, -0.3], [0.045, -0.2], [0.046, 0.2], [0.044, 0.27],
    [0.036, 0.3], [0.0, 0.305],
  ];
  for (const side of [-1, 1]) {
    const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.11), hull);
    pylon.position.set(side * 0.15, -0.13, -0.42);
    pylon.rotation.z = side * -1.05;
    pylon.rotation.x = 0.25;
    ship.add(pylon);

    const nacelle = new THREE.Group();
    const body = new THREE.Mesh(lathe(nacelleProfile, 48), hull);
    body.rotation.x = Math.PI / 2;
    body.scale.set(1.35, 1, 1.05);
    nacelle.add(body);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.03, 0.42), glowBlue);
    strip.position.set(-side * 0.058, 0, -0.01);
    nacelle.add(strip);
    const strip2 = strip.clone();
    strip2.position.x = side * 0.058;
    nacelle.add(strip2);

    const bussard = new THREE.Mesh(new THREE.SphereGeometry(0.04, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glowRed);
    bussard.rotation.x = Math.PI / 2;
    bussard.scale.set(1.35, 1.1, 1.05);
    bussard.position.set(0, 0, 0.27);
    nacelle.add(bussard);

    nacelle.position.set(side * 0.27, -0.03, -0.42);
    ship.add(nacelle);
  }

  // Running lights
  const light = (color, x, y, z) => {
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(0.008, 8, 8),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(4) }),
    );
    m.position.set(x, y, z);
    m.userData.blink = true;
    ship.add(m);
  };
  light('#ff2a2a', -0.655, 0, 0.3);
  light('#2aff6a', 0.655, 0, 0.3);
  light('#ffffff', 0, 0.08, 0.6);

  ship.traverse((o) => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; }
  });
  // Centre it.
  ship.position.set(0, 0.06, 0.05);
  const root = new THREE.Group();
  root.add(ship);
  root.userData.size = 1.3;
  return root;
}
