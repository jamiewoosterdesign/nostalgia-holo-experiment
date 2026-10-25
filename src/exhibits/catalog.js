import * as THREE from 'three';
import { Exhibit } from './exhibit.js';
import { cardGeometry, packetGeometry, blisterGeometry } from './geometry.js';
import { createHoloMaterial as createHoloMaterialBase } from '../materials/holoMaterial.js';
import { colorTex, dataTex } from '../art/canvasKit.js';
import * as P from '../art/prints.js';
import { buildCruiser } from '../ships/cruiser.js';
import { buildFreighter } from '../ships/freighter.js';
import { applyOverride } from '../art/overrides.js';

const CARD_H = 0.26;
const CARD_W = CARD_H * (P.CARD_W / P.CARD_H);

const edgeMat = (color = '#f3f3f0') => new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
const paperBack = (canvas) => new THREE.MeshPhysicalMaterial({
  map: colorTex(canvas), roughness: 0.62, clearcoat: 0.25, clearcoatRoughness: 0.3,
});

function shadowed(mesh) { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; }

// ---------------------------------------------------------------------------
export async function buildCatalog({ studio, foilEnv }) {
  const createHoloMaterial = (o) => createHoloMaterialBase({ envMap: foilEnv, envMapIntensity: 0.65, ...o });
  const exhibits = [];
  const cruiserArt = buildCruiser();
  const freighterArt = buildFreighter();

  // ---------------- 01 Selective prismatic card --------------------------
  {
    const ex = new Exhibit({
      id: 'selective', no: '01', title: 'Vanguard',
      finish: 'Selective prismatic foil',
      desc: 'The ship is printed matte on plain board. Only the border, the nebula and the stars are foil, so the rainbow moves around the art instead of drowning it.',
      actions: [{ id: 'flip', label: 'Flip', key: 'F' }],
    });
    const art = P.tradingCard();
    await applyOverride('selective', art);
    const layer = studio.renderLayer(cruiserArt, {
      width: 1024, height: 1430, fov: 40,
      camPos: new THREE.Vector3(2.3, 1.25, 3.0),
      target: new THREE.Vector3(-0.05, -0.55, 0),
      place: (g) => { g.rotation.y = -0.35; g.rotation.z = 0.12; },
    });
    const front = createHoloMaterial({
      map: colorTex(art.map), roughness: 0.6,
      holo: {
        mask: dataTex(art.mask), layer: art.replaced ? null : layer, layerMatte: 1,
        prism: 1, pattern: 'linear', patternScale: 60, patternAngle: 0.75, tiltGain: [1.9, 1.1],
        sparkle: 1, sparkleScale: 220, sparkleTilt: 1.6, glint: 8,
        aspect: CARD_W / CARD_H, glow: 0.05, saturation: 0.95,
      },
    });
    const back = paperBack(P.cardBack({
      title: 'VANGUARD', subtitle: 'EXPLORER-CLASS CRUISER', number: '07', accent: '#7b4dff',
      stats: [['Length', '642 m'], ['Crew', '1,012'], ['Top speed', 'Warp 9.6'], ['Saucer sep.', 'YES'], ['Finish', 'Selective foil']],
      blurb: 'Long-range explorer with a separating saucer section. Collector note: the hull is printed matte so the foil stars glitter around it.',
    }).map);
    const mesh = shadowed(new THREE.Mesh(cardGeometry(CARD_W, CARD_H, 0.01, 0.0018), [front, back, edgeMat()]));
    ex.pivot.add(mesh);
    ex.addHit(mesh);
    ex.inspect.scale = 2.3;
    exhibits.push(ex);
  }

  // ---------------- 02 Full refractor ----------------------------------------
  {
    const ex = new Exhibit({
      id: 'refractor', no: '02', title: 'Sentinel T-9',
      finish: 'Starburst refractor',
      desc: 'Everything is foil. Translucent inks are printed straight over a radial diffraction pattern, so the whole card turns into a moving starburst as you lean.',
      actions: [{ id: 'flip', label: 'Flip', key: 'F' }],
    });
    const art = P.refractorCard();
    await applyOverride('refractor', art);
    const front = createHoloMaterial({
      map: colorTex(art.map), roughness: 0.4,
      holo: {
        mask: dataTex(art.mask), prism: 1, pattern: 'starburst', patternScale: 64, patternMix: 1.2,
        inkOver: 1, tiltGain: [2.4, 1.4], aspect: CARD_W / CARD_H, glow: 0.04, saturation: 1, prismRough: 0.1,
      },
    });
    const back = paperBack(P.cardBack({
      title: 'SENTINEL T-9', subtitle: 'CYBERNETIC UNIT', number: '23', accent: '#e3172b',
      stats: [['Height', '1.9 m'], ['Alloy', 'Mimetic chrome'], ['Power cell', '120 yrs'], ['Visor', 'Thermal / IR'], ['Finish', 'Refractor']],
      blurb: 'Sent back to guard the archive. Chase parallel: 1 in every 24 packs carries the starburst refractor finish.',
    }).map);
    const mesh = shadowed(new THREE.Mesh(cardGeometry(CARD_W, CARD_H, 0.01, 0.0018), [front, back, edgeMat()]));
    ex.pivot.add(mesh);
    ex.addHit(mesh);
    ex.inspect.scale = 2.3;
    exhibits.push(ex);
  }

  // ---------------- 03 Embossed comic ---------------------------------------
  {
    const ex = new Exhibit({
      id: 'comic', no: '03', title: 'Starfall #1',
      finish: 'Embossed brushed-silver cover',
      desc: 'Raised lettering and brushed metallic ink. The relief only shows up as highlights run along the bevels, with a prismatic foil stamp on the starburst.',
      actions: [{ id: 'flip', label: 'Flip', key: 'F' }],
    });
    const art = P.comicCover();
    await applyOverride('comic', art);
    const H = 0.34;
    const Wc = H * (P.COMIC_W / P.COMIC_H);
    const layer = studio.renderLayer(freighterArt, {
      width: 1024, height: 1560, fov: 30,
      camPos: new THREE.Vector3(-1.2, 2.0, 2.8),
      target: new THREE.Vector3(-0.05, -0.15, 0),
      place: (g) => { g.rotation.set(0.35, 0.9, -0.45); },
    });
    const front = createHoloMaterial({
      map: colorTex(art.map), roughness: 0.68, clearcoat: 0.15,
      anisotropy: 0.7,
      holo: {
        mask: dataTex(art.mask), height: dataTex(art.height), emboss: 7,
        layer: art.replaced ? null : layer, layerMatte: 1,
        prism: 1, pattern: 'diamond', patternScale: 34, tiltGain: [1.6, 1.0],
        metalInkRough: 0.14, brush: 1, aspect: Wc / H, glow: 0.04,
      },
    });
    const back = paperBack(P.comicBack().map);
    back.roughness = 0.8;
    const mesh = shadowed(new THREE.Mesh(cardGeometry(Wc, H, 0.002, 0.003), [front, back, edgeMat('#f6f1e4')]));
    ex.pivot.add(mesh);
    ex.addHit(mesh);
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
      envMapIntensity: 1.6, envMap: foilEnv,
    });
    const bubble = new THREE.Mesh(blisterGeometry(winW * 0.86, winH * 0.86, 0.05, 0.03), bubbleMat);
    bubble.position.set(0, winCY, 0.0015 + 0.03);
    bubble.renderOrder = 2;
    ex.pivot.add(bubble);
    ex.addHit(bubble);

    // Ship inside
    const shipHolder = new THREE.Group();
    const toy = buildCruiser();
    toy.scale.setScalar(0.14);
    toy.traverse((o) => { if (o.isMesh && o.material.isMeshStandardMaterial && !o.material.emissiveMap) { o.material = o.material.clone(); o.material.envMap = foilEnv; } });
    toy.rotation.set(0.95, Math.PI + 0.45, 0.25); // top faces out of the pack, nose up, banked
    shipHolder.add(toy);
    shipHolder.position.set(0, winCY + 0.005, 0.035);
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
      shipHolder.position.set(0, winCY + 0.005 + u * 0.02, 0.035 + u * 0.12);
      this.spin = (this.spin || 0) + dt * 0.6 * u;
      toy.rotation.x = 0.95 - u * 0.65;
      toy.rotation.y = Math.PI + 0.45 + this.spin;
      toy.rotation.z = 0.25 * (1 - u);
      toy.scale.setScalar(0.14 + u * 0.03);
    };
    exhibits.push(ex);
  }

  // ---------------- 05 Motion card -------------------------------------------
  {
    const ex = new Exhibit({
      id: 'motion', no: '05', title: 'Starhawk: Jump',
      finish: 'Lenticular motion card',
      desc: 'Sixteen frames are interleaved under a sheet of tiny cylindrical lenses. Tilt it, or move your head, and the Starhawk banks past and jumps to light speed.',
      actions: [{ id: 'flip', label: 'Flip', key: 'F' }],
    });
    const art = P.motionCardBorder();
    const atlas = studio.renderMotionAtlas(buildFreighter());
    const front = createHoloMaterial({
      map: colorTex(art.map), roughness: 0.5,
      holo: {
        mask: dataTex(art.mask), prism: 1, pattern: 'linear', patternScale: 110, patternAngle: -0.4,
        inkOver: 0.65, tiltGain: [1.8, 1.0], aspect: CARD_W / CARD_H, glow: 0.04,
        lenticular: {
          frames: atlas.texture, grid: [atlas.cols, atlas.rows], count: atlas.count, rect: art.lensRect,
          lensCount: 140, gain: 2.8, spread: 0.035, ridge: 0.5,
        },
      },
    });
    front.clearcoat = 0.9;
    front.clearcoatRoughness = 0.06;
    const back = paperBack(P.cardBack({
      title: 'STARHAWK', subtitle: 'MOTION SERIES', number: 'M3', accent: '#18b8d8',
      stats: [['Class', 'Light freighter'], ['Crew', '2 + cargo'], ['Jump drive', 'Class 0.5'], ['Shields', 'Patched'], ['Finish', 'Lenticular']],
      blurb: 'Fastest junk in the sector. Tilt the card slowly to watch the full jump sequence.',
    }).map);
    const mesh = shadowed(new THREE.Mesh(cardGeometry(CARD_W, CARD_H, 0.01, 0.0035), [front, back, edgeMat('#e8eef6')]));
    ex.pivot.add(mesh);
    ex.addHit(mesh);
    ex.inspect.scale = 2.3;
    exhibits.push(ex);
  }

  // ---------------- 06 Foil packet -------------------------------------------------
  {
    const ex = new Exhibit({
      id: 'packet', no: '06', title: 'Series One Booster',
      finish: 'Crinkled metallised film',
      desc: 'Transparent inks over metallised film, with opaque white panels. Every crease breaks the room’s reflections into its own sharp-edged patch.',
      actions: [{ id: 'flip', label: 'Flip', key: 'F' }],
    });
    const fa = P.packetFront();
    const ba = P.packetBack();
    await applyOverride('packet', fa);
    const H = 0.3;
    const Wp = H * (P.PACK_W / P.PACK_H);
    const mk = (a) => createHoloMaterial({
      map: colorTex(a.map), roughness: 0.5, metalness: 0, clearcoat: 0.2,
      holo: {
        mask: dataTex(a.mask), prism: 1, pattern: 'concentric', patternScale: 50, tiltGain: [1.8, 1],
        metalInkRough: 0.08, crinkle: 0.3, aspect: Wp / H, glow: 0.03,
      },
    });
    const f = shadowed(new THREE.Mesh(packetGeometry(Wp, H, 1, 4), mk(fa)));
    const b = shadowed(new THREE.Mesh(packetGeometry(Wp, H, -1, 9), mk(ba)));
    ex.pivot.add(f, b);
    ex.addHit(f);
    ex.addHit(b);
    ex.inspect.scale = 2.0;
    ex.swayAmp = 0.09;
    exhibits.push(ex);
  }

  return exhibits;
}
