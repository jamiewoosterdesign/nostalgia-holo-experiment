import * as THREE from 'three';
import { Exhibit } from './exhibit.js';
import { cardGeometry, packetGeometry } from './geometry.js';
import { colorTex, dataTex } from '../art/canvasKit.js';
import { loadImage, scan, solidMask, archiveReverse } from '../art/realPrints.js';
import { createHoloMaterial } from '../materials/holoMaterial.js';
import { rectifyPhoto } from '../art/simpsonsFrames.js';

const ROOT = '/assets/basketball/';
const edge = new THREE.MeshStandardMaterial({ color: '#e9e5db', roughness: 0.8 });
const stock = (map) => new THREE.MeshPhysicalMaterial({ map: colorTex(map), roughness: 0.55, clearcoat: 0.22 });

async function cardMaterials(card) {
  const map = scan(await loadImage(ROOT + card.front), card.crop);
  let front = stock(map);
  if (card.finish === 'hologram' || card.finish === 'foil') {
    const mask = solidMask(map);
    const pixels = map.getContext('2d').getImageData(0, 0, map.width, map.height);
    const out = mask.getContext('2d').getImageData(0, 0, map.width, map.height);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const r = pixels.data[i], g = pixels.data[i + 1], b = pixels.data[i + 2];
      const neutral = Math.max(r, g, b) - Math.min(r, g, b) < 42;
      const strength = neutral ? 0.8 : 0.12;
      out.data[i] = strength * 210;
      out.data[i + 1] = card.finish === 'foil' ? strength * 60 : 0;
      out.data[i + 2] = strength * 55;
    }
    mask.getContext('2d').putImageData(out, 0, 0);
    front = createHoloMaterial({ map: colorTex(map), clearcoat: 0.38, roughness: 0.4,
      holo: { mask: dataTex(mask), prism: 0.85, pattern: 'linear', patternScale: 95,
        patternMix: 0.4, inkOver: 1, sparkle: card.finish === 'foil' ? 0.5 : 0,
        sparkleScale: 340, glint: 2, tiltGain: [1.7, 0.8], saturation: 0.7, glow: 0 } });
  }
  const backMap = card.back ? scan(await loadImage(ROOT + card.back), card.backCrop)
    : archiveReverse(card.name, `${card.year} · ${card.set}`, [`Card ${card.number || ''}`, 'From the personal nostalgia selection.']);
  return [front, stock(backMap), edge];
}

export async function buildBasketballPack() {
  const response = await fetch(ROOT + 'catalog.json');
  if (!response.ok || response.headers.get('content-type')?.includes('text/html')) throw new Error('Basketball artwork catalog is missing.');
  const collection = await response.json();
  const materials = await Promise.all(collection.cards.map(cardMaterials));
  const packImage = await loadImage(ROOT + collection.pack.front);
  const frontMap = collection.pack.quad ? rectifyPhoto(packImage, collection.pack.quad, 960, 1536) : scan(packImage, collection.pack.crop);
  const packBack = collection.pack.back ? await loadImage(ROOT + collection.pack.back) : null;
  const backMap = packBack ? (collection.pack.backQuad ? rectifyPhoto(packBack, collection.pack.backQuad, 960, 1536) : scan(packBack, collection.pack.backCrop))
    : archiveReverse('Upper Deck', '1994–95 · Series One', ['Basketball · hobby foil wrapper', 'Personal selection of 1993–95 cards.', 'Includes two shiny inserts and Jordan checklist.'], frontMap.width / frontMap.height);
  const mkWrapper = (map) => createHoloMaterial({ map: colorTex(map), side: THREE.DoubleSide,
    roughness: 0.44, clearcoat: 0.18,
    holo: { mask: dataTex(solidMask(map, 'rgb(0,0,145)')), prism: 0, sparkle: 0,
      metalInkRough: 0.35, crinkle: 0.025, inkOver: 1, glow: 0 } });
  const fMat = mkWrapper(frontMap), bMat = mkWrapper(backMap);
  const ex = new Exhibit({ id: 'packet', no: '06', title: 'Upper Deck · Series One',
    finish: '1994–95 · silver foil hobby pack',
    desc: `${materials.length} real cards from 1991–94, including Jordan, his checklist and two shiny inserts. A personal nostalgia selection inside the period wrapper.`, actions: [] });
  const H = 0.3, W = H * 0.64, TEAR = 0.93;
  const body = new THREE.Group(), top = new THREE.Group();
  for (const [direction, seed, material] of [[1, 4, fMat], [-1, 9, bMat]]) {
    body.add(new THREE.Mesh(packetGeometry(W, H, direction, seed, { v1: TEAR }), material));
    const strip = new THREE.Mesh(packetGeometry(W, H, direction, seed, { v0: TEAR }), material);
    strip.position.y = -(H * TEAR - H / 2); top.add(strip);
  }
  ex.pivot.add(body, top);
  [...body.children, ...top.children].forEach(m => ex.addHit(m));
  const geo = cardGeometry(0.171, 0.2394, 0.0012, 0.0014);
  const cards = materials.map(mats => {
    const mesh = new THREE.Mesh(geo, mats); mesh.visible = false;
    ex.pivot.add(mesh); ex.addHit(mesh); return mesh;
  });
  ex.opened = false; ex.o = 0; ex.cardIndex = 0; ex.cardFlipped = false;
  ex.inspect.scale = 2; ex.swayAmp = 0.025;
  const wrapperDescription = ex.info.desc;
  function labels() {
    const c = collection.cards[ex.cardIndex];
    ex.info.finish = ex.opened ? `CARD ${ex.cardIndex + 1} / ${cards.length} · ${c.finish || 'paper'}` : '1994–95 · silver foil hobby pack';
    ex.info.title = ex.opened ? c.name : 'Upper Deck · Series One';
    ex.info.desc = ex.opened ? `${c.year} ${c.set}${c.number ? ` · #${c.number}` : ''}. Browse the pack, flip each card and tilt to catch the light.` : wrapperDescription;
    ex.info.actions = ex.opened ? [
      { id: 'previous', label: 'Previous', key: 'ArrowLeft' },
      { id: 'next', label: 'Next card', key: 'ArrowRight', primary: true },
      { id: 'flip', label: 'Flip card', key: 'F' }, { id: 'open', label: 'Reseal', key: 'O' },
    ] : [{ id: 'open', label: 'Open pack', key: 'O', primary: true }, { id: 'flip', label: 'Flip', key: 'F' }];
  }
  labels();
  ex.action = function (id) {
    if (id === 'open') {
      this.opened = !this.opened; this.cardFlipped = false;
      this.inspect.scale = this.opened ? 1.65 : 2;
      if (this.flipped) this.flip();
    }
    if (id === 'next' || id === 'previous') {
      this.cardIndex = (this.cardIndex + (id === 'next' ? 1 : cards.length - 1)) % cards.length;
      this.cardFlipped = false;
    }
    if (id === 'flip') { if (this.opened) this.cardFlipped = !this.cardFlipped; else this.flip(); }
    labels(); return 'relabel';
  };
  ex.onDeselect = () => { if (ex.opened) ex.action('open'); };
  const update = ex.update.bind(ex);
  const target = new THREE.Vector3();
  ex.update = function (dt, t) {
    update(dt, t);
    this.o += ((this.opened ? 1 : 0) - this.o) * (1 - Math.exp(-dt * 4));
    const o = this.o, tear = Math.min(1, o * 2.4);
    top.position.set(tear * 0.08, H * TEAR - H / 2 + tear * 0.065, tear * 0.02);
    top.rotation.set(-tear * 0.6, 0, -tear * 0.9); top.visible = tear < 0.98;
    const rise = THREE.MathUtils.smoothstep(o, 0.2, 1);
    body.position.set(-rise * 0.15, -rise * 0.10, -rise * 0.025); body.rotation.z = rise * 0.16;
    cards.forEach((card, i) => {
      const order = (i - this.cardIndex + cards.length) % cards.length;
      card.visible = rise > 0.001;
      target.set((0.065 + Math.min(order, 4) * 0.004) * rise,
        -0.03 + rise * (0.085 + Math.min(order, 4) * 0.003), 0.005 + rise * (0.09 - order * 0.002));
      card.position.lerp(target, 1 - Math.exp(-dt * 12));
      const y = order === 0 && this.cardFlipped ? Math.PI : 0;
      card.rotation.y += (y - card.rotation.y) * (1 - Math.exp(-dt * 10));
      card.rotation.z = order === 0 ? 0 : -0.015 * Math.min(order, 5) * rise;
    });
  };
  return ex;
}
