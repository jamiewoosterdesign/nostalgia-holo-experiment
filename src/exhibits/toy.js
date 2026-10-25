import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Exhibit } from './exhibit.js';
import { cardGeometry, blisterGeometry } from './geometry.js';
import { createHoloMaterial } from '../materials/holoMaterial.js';
import { colorTex, dataTex } from '../art/canvasKit.js';
import { buildCruiser } from '../ships/cruiser.js';
import { toyBacker, toyBack } from '../art/toyPackaging.js';
const P = { BACKER_W: 1024, BACKER_H: 1460 };
const edgeMat = (color) => new THREE.MeshStandardMaterial({color, roughness: 0.75});
const paperBack = (canvas) => new THREE.MeshPhysicalMaterial({map:colorTex(canvas),roughness:0.7,clearcoat:0.12});
const shadowed = mesh => {mesh.castShadow=true;mesh.receiveShadow=true;return mesh;};
// Optional user-supplied 3D model for the carded toy: /public/models/toy.glb
async function loadToyModel() {
  const url = import.meta.env.VITE_TOY_MODEL_URL;
  if (!url) return null;
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || type.includes('text/html')) return null;
    const gltf = await new GLTFLoader().loadAsync(url);
    const g = gltf.scene;
    const box = new THREE.Box3().setFromObject(g);
    const size = box.getSize(new THREE.Vector3());
    const c = box.getCenter(new THREE.Vector3());
    g.position.sub(c);
    const wrap = new THREE.Group();
    wrap.add(g);
    wrap.scale.setScalar(1 / Math.max(size.x, size.y, size.z));
    wrap.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return wrap;
  } catch { return null; }
}

// ---------------------------------------------------------------------------
export async function buildToyExhibit() {
  // ---------------- 04 Blister pack ----------------------------------------
  {
    const ex = new Exhibit({
      id: 'blister', no: '04', title: 'U.S.S. Enterprise',
      finish: 'The Next Generation · collector model',
      desc: 'A period-inspired space backdrop behind the Enterprise, holographic titles and a clear moulded blister. Unpack to examine the model.',
      actions: [{ id: 'unpack', label: 'Unpack', key: 'U', primary: true }, { id: 'flip', label: 'Flip', key: 'F' }],
    });
    const art = toyBacker();
    const H = 0.4;
    const Wb = H * (P.BACKER_W / P.BACKER_H);
    const holeY = H / 2 - (74 / P.BACKER_H) * H;
    const front = createHoloMaterial({
      map: colorTex(art.map), roughness: 0.55,
      holo: {
        mask: dataTex(art.mask), prism: 1, pattern: 'linear', patternScale: 70, inkOver: 0.25, metalInkRough: 0.24, saturation: 0.95,
        sparkle: 0, glint: 0, tiltGain: [1.5, 0.9],
        aspect: Wb / H, glow: 0,
      },
    });
    const back = paperBack(toyBack().map);
    const card = shadowed(new THREE.Mesh(
      cardGeometry(Wb, H, 0.012, 0.003, [{ x: 0, y: holeY, rx: (70 / P.BACKER_W) * Wb, ry: (28 / P.BACKER_H) * H }]),
      [front, back, edgeMat('#e9e7f5')],
    ));
    ex.pivot.add(card);
    ex.addHit(card);

    // Bubble
    const winH = (760 / P.BACKER_H) * H;
    const winW = ((P.BACKER_W - 180) / P.BACKER_W) * Wb;
    const winCY = H / 2 - ((300 + 380) / P.BACKER_H) * H;
    const bubbleMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff', transmission: 1, roughness: 0.03, thickness: 0.004, ior: 1.57,
      clearcoat: 1, clearcoatRoughness: 0.02, specularIntensity: 1, transparent: true, opacity: 1,
      envMapIntensity: 1.4,
    });
    const bubble = new THREE.Mesh(blisterGeometry(winW * 0.86, winH * 0.86, 0.05, 0.03), bubbleMat);
    bubble.position.set(0, winCY, 0.0015 + 0.03);
    bubble.renderOrder = 2;
    ex.pivot.add(bubble);
    ex.addHit(bubble);

    // Ship inside
    const shipHolder = new THREE.Group();
    const custom = await loadToyModel();
    const toy = custom || buildCruiser();
    toy.scale.multiplyScalar(custom ? 0.2 : 0.14);
    // Lie the toy back against the card, top facing out, nose up — the way a
    // carded toy actually sits in a shallow bubble.
    const REST_X = 1.4;
    toy.rotation.set(REST_X, Math.PI, 0);
    shipHolder.add(toy);
    // Seat it: measure its real extent and keep it between card face and bubble.
    toy.updateMatrixWorld(true);
    const tb = new THREE.Box3().setFromObject(toy);
    const CARD_FACE = 0.006 + 0.004; // card front + clearance
    const BUBBLE_IN = 0.05;          // inner depth of the bubble
    const depth = tb.max.z - tb.min.z;
    if (depth > BUBBLE_IN - 0.006) toy.scale.multiplyScalar((BUBBLE_IN - 0.006) / depth);
    toy.updateMatrixWorld(true);
    tb.setFromObject(toy);
    const seatZ = CARD_FACE - tb.min.z;
    const seatY = -(tb.min.y + tb.max.y) / 2;
    const seatX = -(tb.min.x + tb.max.x) / 2;
    toy.position.set(seatX, seatY, seatZ);
    shipHolder.position.set(0, winCY, 0);
    const toyBase = toy.scale.x;
    const seat = toy.position.clone();
    ex.pivot.add(shipHolder);

    ex.inspect.scale = 1.6;
    ex.unpacked = false;
    ex.u = 0;
    ex.action = function (id) {
      if (id === 'unpack') {
        this.unpacked = !this.unpacked;
        this.info.actions[0].label = this.unpacked ? 'Repack' : 'Unpack';
        if (this.unpacked && this.flipped) this.flip();
        return 'relabel';
      }
      if (id === 'flip') this.flip();
    };
    ex.onDeselect = function () { if (this.unpacked) this.action('unpack'); };
    const baseUpdate = ex.update.bind(ex);
    ex.update = function (dt, t) {
      baseUpdate(dt, t);
      this.u += ((this.unpacked ? 1 : 0) - this.u) * (1 - Math.exp(-dt * 3));
      const u = this.u;
      bubble.position.set(Math.sin(u * 1.4) * 0.16, winCY + u * 0.12, 0.0315 + u * 0.12);
      bubble.rotation.set(-u * 0.5, u * 0.9, u * 0.25);
      bubbleMat.opacity = 1 - Math.max(0, u - 0.6) * 1.5;
      bubble.visible = bubbleMat.opacity > 0.02;
      shipHolder.position.set(0, winCY + u * 0.02, u * 0.12);
      this.spin = (this.spin || 0) + dt * 0.6 * u;
      toy.position.copy(seat).multiplyScalar(1 - u);
      toy.rotation.x = REST_X - u * 1.0;
      toy.rotation.y = Math.PI + this.spin;
      toy.rotation.z = 0;
      toy.scale.setScalar(toyBase * (1 + u * 0.2));
    };
    return ex;
  }


}
