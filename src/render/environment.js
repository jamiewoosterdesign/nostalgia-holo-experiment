import * as THREE from 'three';

// A bright studio "room" made of soft window-shaped light panels, baked to a
// prefiltered environment map. Every reflective object shares these same
// windows, so one broad reflection slides across plastic, stretches across
// brushed metal and shatters into points on sparkle foil.
export function buildEnvironment(renderer) {
  const scene = new THREE.Scene();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  geo.deleteAttribute('uv');

  // Inner room: warm white with a faint lilac/ice gradient via vertex colours.
  const roomGeo = new THREE.BoxGeometry(20, 12, 20, 8, 8, 8);
  const colors = [];
  const pos = roomGeo.attributes.position;
  const top = new THREE.Color('#fbf8ff');
  const bottom = new THREE.Color('#d9dcef');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const t = (pos.getY(i) + 6) / 12;
    c.copy(bottom).lerp(top, t);
    // cool cast on one side, warm on the other
    const s = pos.getX(i) / 10;
    c.r += s * 0.03; c.b -= s * 0.03;
    colors.push(c.r, c.g, c.b);
  }
  roomGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const room = new THREE.Mesh(
    roomGeo,
    new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true }),
  );
  room.position.y = 3;
  scene.add(room);

  const panel = (color, intensity, x, y, z, sx, sy, sz, ry = 0) => {
    const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) });
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.y = ry;
    scene.add(mesh);
  };

  // Big window wall behind the viewer (what flat things facing us reflect).
  panel('#ffffff', 9, -2.6, 3.4, 9.6, 3.2, 4.6, 0.1);
  panel('#ffffff', 9, 1.4, 3.4, 9.6, 3.2, 4.6, 0.1);
  panel('#fff3e0', 7, 5.2, 3.0, 9.6, 1.6, 4.0, 0.1);
  // Skylight strips
  panel('#ffffff', 12, 0, 8.9, 0, 12, 0.1, 1.2);
  panel('#ffffff', 10, 0, 8.9, -4, 12, 0.1, 0.8);
  panel('#eef4ff', 10, 0, 8.9, 4, 12, 0.1, 0.8);
  // Side light boxes with colour for character
  panel('#bfe0ff', 6, -9.6, 3.5, 0, 0.1, 5, 6);
  panel('#ffd7f0', 5, 9.6, 3.0, -2, 0.1, 4, 5);
  // Small accent strips (give distinct glints)
  panel('#7aa6ff', 14, 6.5, 6.5, 6, 0.3, 2.6, 0.3);
  panel('#ff9a5a', 14, -6.5, 1.5, 6, 0.3, 1.8, 0.3);
  // Floor bounce
  panel('#f4f1ff', 1.6, 0, -2.95, 0, 18, 0.1, 18);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.035);
  pmrem.dispose();
  return rt.texture;
}

// High-contrast reflection environment for foils and metals. Real holographic
// film only "pops" because it mirrors a mostly-dim room with a few very bright
// lights: the rainbow lives in the highlights. A uniformly bright env makes
// foil read as flat pastel paint, so metals get this one instead.
export function buildFoilEnvironment(renderer) {
  const scene = new THREE.Scene();
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const roomGeo = new THREE.BoxGeometry(20, 12, 20);
  scene.add(new THREE.Mesh(roomGeo, new THREE.MeshBasicMaterial({ color: '#2c2a44', side: THREE.BackSide })));
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), new THREE.MeshBasicMaterial({ color: '#2a2742' }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -5.9;
  scene.add(floor);
  const panel = (color, intensity, x, y, z, sx, sy, sz) => {
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity) }));
    m.position.set(x, y, z);
    m.scale.set(sx, sy, sz);
    scene.add(m);
  };
  // Large softbox behind/above the viewer — the main sweep across flat cards.
  panel('#ffffff', 16, 0, 3.2, 9.8, 5.5, 2.2, 0.1);
  // Vertical window strips behind the viewer: as you lean, these bars slide across foil.
  for (let i = -3; i <= 3; i++) panel(i % 2 ? '#fff4e6' : '#eaf2ff', 22, i * 1.9, 0.6, 9.8, 0.35, 5.5, 0.1);
  // Ceiling strips
  for (let i = -2; i <= 2; i++) panel('#ffffff', 10, 0, 5.9, i * 3, 14, 0.1, 0.15);
  // Coloured rim lights for character
  panel('#4f7bff', 14, -9.8, 1, -2, 0.1, 3.5, 2.5);
  panel('#ff4fa8', 14, 9.8, 1.5, -1, 0.1, 3.5, 2.5);
  panel('#ffb04a', 12, 4, -2, -9.8, 3, 1, 0.1);
  // Scatter of small bright points: these become the independent sparkle glints.
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2;
    const y = (Math.random() - 0.3) * 10;
    const r = 9.6;
    const s = 0.12 + Math.random() * 0.22;
    panel('#ffffff', 30, Math.cos(a) * r, y, Math.sin(a) * r, s, s, s);
  }
  const pmrem = new THREE.PMREMGenerator(renderer);
  const rt = pmrem.fromScene(scene, 0.0);
  pmrem.dispose();
  return rt.texture;
}
