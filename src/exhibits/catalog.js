import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Exhibit } from './exhibit.js';
import { cardGeometry, packetGeometry, blisterGeometry } from './geometry.js';
import { createHoloMaterial } from '../materials/holoMaterial.js';
import { colorTex, dataTex } from '../art/canvasKit.js';
import * as P from '../art/prints.js';
import * as E from '../art/era.js';
import { buildCruiser } from '../ships/cruiser.js';
import { applyOverride } from '../art/overrides.js';

const CARD_H = 0.26;
const CARD_W = CARD_H * (E.CARD.W / E.CARD.H);

const edgeMat = (color = '#f3f3f0') => new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
const paperBack = (canvas) => new THREE.MeshPhysicalMaterial({
  map: colorTex(canvas), roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.3,
});

function shadowed(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

// The invented player who stars on the cards.
const PLAYER = {
  name: 'Darius Vance', team: 'Coral Coast Comets', pos: 'FORWARD', number: '32',
  brand: 'COURTKINGS', accent: '#0f9e9a', accent2: '#5b2a86',
};

function cardBackFor(title, sub, number, stats, blurb, accent = '#0f9e9a') {
  return paperBack(P.cardBack({ title, subtitle: sub, number, accent, stats, blurb }).map);
}

// Optional user-supplied 3D model for the carded toy: /public/models/toy.glb
async function loadToyModel() {
  try {
    const res = await fetch('/models/toy.glb', { method: 'HEAD', cache: 'no-store' });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || type.includes('text/html')) return null;
    const gltf = await new GLTFLoader().loadAsync('/models/toy.glb');
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
export async function buildCatalog({ studio }) {
  const exhibits = [];
  const [dunkImg, driveImg, comicImg, flickerImg, packImg] = await Promise.all(
    ['dunk', 'drive', 'comic', 'flicker', 'pack'].map((n) => E.loadArt(n)),
  );

  // Card materials are shared with the cards that come out of the pack.
  const dunkArt = E.photoCard(dunkImg, PLAYER);
  const dunkFront = createHoloMaterial({
    map: colorTex(dunkArt.map), roughness: 0.5,
    holo: {
      mask: dataTex(dunkArt.mask), height: dataTex(dunkArt.height), emboss: 6,
      prism: 1, pattern: 'linear', patternScale: 70, patternAngle: 0.75, tiltGain: [1.9, 1.1],
      inkOver: 0.85, metalInkRough: 0.22,
      sparkle: 1, sparkleScale: 240, sparkleTilt: 1.4, glint: 6,
      aspect: CARD_W / CARD_H, glow: 0.02, saturation: 0.9,
    },
  });
  dunkFront.clearcoat = 0.8; dunkFront.clearcoatRoughness = 0.08;
  const dunkBack = cardBackFor('DARIUS VANCE', 'COMETS • FORWARD', '32',
    [['Height', '6-8'], ['Weight', '225'], ['College', 'Bayview St.'], ['PPG', '24.1'], ['Finish', 'Prism parallel']],
    'Led the league in dunks his second season. The "Sky Hammer" tomahawk was named play of the year.');

  const hvArt = E.cutoutCard(driveImg, { ...PLAYER, seed: 9 });
  const hvFront = createHoloMaterial({
    map: colorTex(hvArt.map), roughness: 0.45,
    holo: {
      mask: dataTex(hvArt.mask), height: dataTex(hvArt.height), emboss: 6,
      prism: 1, pattern: 'diamond', patternScale: 30, patternMix: 1.1, tiltGain: [2.2, 1.3],
      inkOver: 0.8, metalInkRough: 0.2,
      sparkle: 1, sparkleScale: 180, sparkleTilt: 1.6, glint: 8,
      aspect: CARD_W / CARD_H, glow: 0.03, saturation: 1, prismRough: 0.14,
    },
  });
  hvFront.clearcoat = 0.9; hvFront.clearcoatRoughness = 0.06;
  const hvBack = cardBackFor('HOLOVIEW', 'INSERT • 1 PER PACK', 'H7',
    [['Player', 'Darius Vance'], ['Team', 'Comets'], ['Insert', 'Holoview'], ['Odds', '1:12'], ['Finish', 'Diamond foil']],
    'The player is printed on plain board, cut over a full-foil diamond background, so he floats over the rainbow.', '#5b2a86');

  // ---------------- 01 Prism parallel (photo) ---------------------------------
  {
    const ex = new Exhibit({
      id: 'dunk', no: '01', title: 'Darius Vance',
      finish: 'Prism parallel · embossed foil name',
      desc: 'A full-bleed action photo. Only the dark arena shadows are printed on foil, so the rainbow lives in the crowd behind him. The name is a raised gold stamp.',
      actions: [{ id: 'flip', label: 'Flip', key: 'F' }],
    });
    const mesh = shadowed(new THREE.Mesh(cardGeometry(CARD_W, CARD_H, 0.01, 0.0018), [dunkFront, dunkBack, edgeMat()]));
    ex.pivot.add(mesh); ex.addHit(mesh);
    ex.inspect.scale = 2.3;
    exhibits.push(ex);
  }

  // ---------------- 02 Holoview insert (cutout) -----------------------------
  {
    const ex = new Exhibit({
      id: 'holoview', no: '02', title: 'Holoview Insert',
      finish: 'Diamond foil, matte cutout',
      desc: 'The chase card. A diamond-grid hologram fills everything except the player, so as you tilt it the background shatters into colour behind a matte figure.',
      actions: [{ id: 'flip', label: 'Flip', key: 'F' }],
    });
    const mesh = shadowed(new THREE.Mesh(cardGeometry(CARD_W, CARD_H, 0.01, 0.0018), [hvFront, hvBack, edgeMat()]));
    ex.pivot.add(mesh); ex.addHit(mesh);
    ex.inspect.scale = 2.3;
    exhibits.push(ex);
  }

  // ---------------- 03 Chromium comic ---------------------------------------
  {
    const ex = new Exhibit({
      id: 'comic', no: '03', title: 'Neon Valkyrie #1',
      finish: 'Chromium foil cover, embossed masthead',
      desc: 'The whole cover is printed over mirror foil with the inks on top. Highlights flare when they catch the light, and the masthead is raised metallic ink.',
      actions: [{ id: 'flip', label: 'Flip', key: 'F' }],
    });
    const art = E.chromiumCover(comicImg);
    const H = 0.34;
    const Wc = H * (E.COMIC.W / E.COMIC.H);
    const front = createHoloMaterial({
      map: colorTex(art.map), roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.1,
      holo: {
        mask: dataTex(art.mask), height: dataTex(art.height), emboss: 8,
        prism: 1, pattern: 'linear', patternScale: 90, patternAngle: 1.1, tiltGain: [1.7, 1.0],
        inkOver: 0.92, metalInkRough: 0.25, sparkle: 1, sparkleScale: 260, sparkleTilt: 1.2, glint: 5,
        aspect: Wc / H, glow: 0.02, saturation: 0.85,
      },
    });
    const back = paperBack(P.comicBack().map);
    back.roughness = 0.8;
    const mesh = shadowed(new THREE.Mesh(cardGeometry(Wc, H, 0.002, 0.003), [front, back, edgeMat('#f6f1e4')]));
    ex.pivot.add(mesh); ex.addHit(mesh);
    ex.inspect.scale = 1.85;
    exhibits.push(ex);
  }

  // ---------------- 04 Blister pack ----------------------------------------
  {
    const ex = new Exhibit({
      id: 'blister', no: '04', title: 'Vanguard (carded)',
      finish: 'Cracked-ice sparkle under a PET blister',
      desc: 'Four materials under one light: printed card, cracked-ice foil, a clear moulded bubble, and the die-cast model inside. Unpack it to see each layer on its own.',
      actions: [{ id: 'unpack', label: 'Unpack', key: 'U', primary: true }, { id: 'flip', label: 'Flip', key: 'F' }],
    });
    const art = P.blisterBacker();
    await applyOverride('blister', art);
    const H = 0.4;
    const Wb = H * (P.BACKER_W / P.BACKER_H);
    const holeY = H / 2 - (74 / P.BACKER_H) * H;
    const front = createHoloMaterial({
      map: colorTex(art.map), roughness: 0.55,
      holo: {
        mask: dataTex(art.mask), prism: 1, pattern: 'crackedIce', patternScale: 7, inkOver: 0.85,
        sparkle: 1, sparkleScale: 140, sparkleTilt: 1.3, glint: 7, tiltGain: [1.5, 0.9],
        aspect: Wb / H, glow: 0.03,
      },
    });
    const back = paperBack(P.cardBack({
      title: 'STARLINE', subtitle: 'COLLECT THEM ALL!', number: '★', accent: '#2f5bff',
      stats: [['Vanguard', '#1001'], ['Starhawk', '#1002'], ['Sentinel', '#1003'], ['Orbital dock', '#1004'], ['Nebula runner', '#1005']],
      blurb: 'Each Starline starship is crafted from die-cast metal and high-impact plastic. Display stand included.',
    }).map);
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
    exhibits.push(ex);
  }

  // ---------------- 05 Flicker card -------------------------------------------
  {
    const ex = new Exhibit({
      id: 'motion', no: '05', title: 'Sk8-Rex',
      finish: 'Lenticular flicker card',
      desc: 'Frames are sliced into strips under a sheet of tiny ridged lenses. Tilt it, or move your head, and he lands the kickflip.',
      actions: [{ id: 'flip', label: 'Flip', key: 'F' }],
    });
    const art = P.motionCardBorder({ title: 'SK8-REX', sub: 'KICKFLIP  ·  FLICKER 1 OF 12', footer: 'RAD-ROS ✦ FLICKERS', code: 'F1' });
    const fl = E.flickerAtlas(flickerImg, 3);
    let lent;
    if (fl) {
      lent = { frames: colorTex(fl.canvas), grid: [fl.cols, fl.rows], count: fl.count, rect: art.lensRect, lensCount: 140, gain: 2.6, spread: 0.03, ridge: 0.5 };
    } else {
      const atlas = studio.renderMotionAtlas(buildCruiser());
      lent = { frames: atlas.texture, grid: [atlas.cols, atlas.rows], count: atlas.count, rect: art.lensRect, lensCount: 140, gain: 2.8, spread: 0.035, ridge: 0.5 };
    }
    const front = createHoloMaterial({
      map: colorTex(art.map), roughness: 0.5,
      holo: {
        mask: dataTex(art.mask), prism: 1, pattern: 'linear', patternScale: 110, patternAngle: -0.4,
        inkOver: 0.65, tiltGain: [1.8, 1.0], aspect: CARD_W / CARD_H, glow: 0.03, lenticular: lent,
      },
    });
    front.clearcoat = 0.9; front.clearcoatRoughness = 0.06;
    const back = cardBackFor('SK8-REX', 'RAD-ROS FLICKERS', 'F1',
      [['Species', 'Tyrannosaurus'], ['Stance', 'Goofy'], ['Board', '9" deck'], ['Best trick', 'Kickflip'], ['Finish', 'Lenticular']],
      'Rides the half-pipe at Cretaceous Park every Saturday morning. Tilt slowly to see the full trick.', '#18b8d8');
    const mesh = shadowed(new THREE.Mesh(cardGeometry(CARD_W, CARD_H, 0.01, 0.0035), [front, back, edgeMat('#e8eef6')]));
    ex.pivot.add(mesh); ex.addHit(mesh);
    ex.inspect.scale = 2.3;
    exhibits.push(ex);
  }

  // ---------------- 06 Wax pack (openable) ------------------------------------
  {
    const ex = new Exhibit({
      id: 'packet', no: '06', title: 'Courtkings Series 1',
      finish: 'Metallised film wrapper',
      desc: 'Transparent inks over metallised film, with opaque white where the design needs to stay solid. Open it — there is a Holoview inside.',
      actions: [{ id: 'open', label: 'Open pack', key: 'O', primary: true }, { id: 'flip', label: 'Flip', key: 'F' }],
    });
    const fa = E.packWrapper(packImg);
    const ba = E.packBack();
    const H = 0.3;
    const Wp = H * (E.PACK.W / E.PACK.H);
    const mk = (a) => createHoloMaterial({
      map: colorTex(a.map), roughness: 0.35, metalness: 0, clearcoat: 0.5, clearcoatRoughness: 0.08,
      side: THREE.DoubleSide,
      holo: {
        mask: dataTex(a.mask), prism: 1, pattern: 'concentric', patternScale: 40, tiltGain: [1.6, 0.9],
        inkOver: 0.85, metalInkRough: 0.12, prismRough: 0.12, crinkle: 0.05, aspect: Wp / H, glow: 0.02,
      },
    });
    const fMat = mk(fa), bMat = mk(ba);
    const TEAR = 0.93; // tear line (fraction of height from bottom)
    const body = new THREE.Group();
    const top = new THREE.Group();
    body.add(shadowed(new THREE.Mesh(packetGeometry(Wp, H, 1, 4, { v1: TEAR }), fMat)));
    body.add(shadowed(new THREE.Mesh(packetGeometry(Wp, H, -1, 9, { v1: TEAR }), bMat)));
    top.add(shadowed(new THREE.Mesh(packetGeometry(Wp, H, 1, 4, { v0: TEAR }), fMat)));
    top.add(shadowed(new THREE.Mesh(packetGeometry(Wp, H, -1, 9, { v0: TEAR }), bMat)));
    ex.pivot.add(body, top);
    for (const g of [body, top]) g.children.forEach((m) => ex.addHit(m));

    // Cards inside: the two hits, plus a base card (same photo, plain stock).
    const baseFront = new THREE.MeshPhysicalMaterial({ map: colorTex(dunkArt.map), roughness: 0.55, clearcoat: 0.3 });
    const inner = [];
    const cardGeo = cardGeometry(CARD_W * 0.9, CARD_H * 0.9, 0.009, 0.0016);
    [[baseFront, dunkBack], [dunkFront, dunkBack], [hvFront, hvBack]].forEach(([f, b], i) => {
      const c = shadowed(new THREE.Mesh(cardGeo, [f, b, edgeMat()]));
      c.visible = false;
      ex.pivot.add(c);
      inner.push(c);
    });

    ex.inspect.scale = 2.0;
    ex.swayAmp = 0.07;
    ex.opened = false;
    ex.o = 0;
    ex.action = function (id) {
      if (id === 'open') {
        this.opened = !this.opened;
        this.info.actions[0].label = this.opened ? 'Reseal' : 'Open pack';
        if (this.opened && this.flipped) this.flip();
        return 'relabel';
      }
      if (id === 'flip') this.flip();
    };
    ex.onDeselect = function () { if (this.opened) this.action('open'); };
    const baseUpdate = ex.update.bind(ex);
    ex.update = function (dt, t) {
      baseUpdate(dt, t);
      this.o += ((this.opened ? 1 : 0) - this.o) * (1 - Math.exp(-dt * 2.6));
      const o = this.o;
      // 1) tear strip peels up and away
      const tear = Math.min(1, o * 2.2);
      top.position.set(tear * 0.09, H * TEAR - H / 2 + tear * 0.05, tear * 0.03);
      top.rotation.set(-tear * 0.6, 0, -tear * 0.9);
      top.children.forEach((m) => { m.position.y = -(H * TEAR - H / 2); });
      top.visible = tear < 0.98;
      // 2) cards rise out and fan
      const rise = Math.max(0, Math.min(1, (o - 0.25) / 0.75));
      const e = rise * rise * (3 - 2 * rise);
      body.position.y = -e * 0.08;
      inner.forEach((c, i) => {
        c.visible = rise > 0.001;
        const k = i - 1;
        c.position.set(k * 0.075 * e, -0.03 + e * (0.13 + (i === 2 ? 0.02 : 0)), 0.001 + i * 0.004 + e * 0.02 * i);
        c.rotation.set(0, 0, -k * 0.22 * e);
      });
    };
    exhibits.push(ex);
  }

  return exhibits;
}
