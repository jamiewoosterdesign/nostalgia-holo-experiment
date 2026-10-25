import * as THREE from 'three';
import { Exhibit } from './exhibit.js';
import { cardGeometry } from './geometry.js';
import { createHoloMaterial } from '../materials/holoMaterial.js';
import { colorTex, dataTex } from '../art/canvasKit.js';
import { loadImage, spiderManPrint, hulkPrint, archiveReverse } from '../art/realPrints.js';
import { buildSimpsonsFrames } from '../art/simpsonsFrames.js';
import { buildToyExhibit } from './toy.js';
import { buildBasketballPack } from './basketballPack.js';
import { buildWolverineExhibit } from './wolverine.js';

const CARD_H = 0.26, CARD_W = CARD_H * 5 / 7;
const edge = (color = '#e7e3d8') => new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
const paper = (canvas) => new THREE.MeshPhysicalMaterial({ map: colorTex(canvas), roughness: 0.52, clearcoat: 0.18 });
const actions = [{ id: 'flip', label: 'Flip', key: 'F' }];
function addCard(ex, front, back, { width = CARD_W, height = CARD_H, depth = 0.0014, radius = 0.0015 } = {}) {
  const mesh = new THREE.Mesh(cardGeometry(width, height, radius, depth), [front, back, edge()]);
  mesh.castShadow = true; mesh.receiveShadow = true;
  ex.pivot.add(mesh); ex.addHit(mesh); ex.inspect.scale = 2.3;
  return mesh;
}

export async function buildCatalog() {
  const [hulk, wolverine, comic, simpsons, toy, packet] = await Promise.all([
    loadImage('/assets/marvel/hulk-silver-reference.png'),
    buildWolverineExhibit(),
    loadImage('/assets/marvel/spider-man-50-reference.png'),
    buildSimpsonsFrames(), buildToyExhibit(), buildBasketballPack(),
  ]);
  const exhibits = [];
  {
    const ex = new Exhibit({ id: 'dunk', no: '01', title: 'Hulk · Silver Holofoil',
      finish: '1994 Marvel Masterpieces · 4 of 10',
      desc: 'The Hildebrandt painting over silver microflake stock. Dense inks hold the figure steady while thousands of fine foil facets catch the light around him.', actions });
    const art = hulkPrint(hulk);
    const front = createHoloMaterial({ map: colorTex(art.map), roughness: 0.46, clearcoat: 0.45,
      holo: { mask: dataTex(art.mask), prism: 0.7, pattern: 'linear', patternScale: 85, patternMix: 0.3,
        inkOver: 1, sparkle: 0.85, sparkleScale: 490, sparkleTilt: 0.75, sparkleRough: 0.2,
        glint: 2.8, tiltGain: [1.1, 0.65], saturation: 0.48, glow: 0, aspect: 5 / 7 } });
    addCard(ex, front, paper(archiveReverse('Hulk', '1994 Marvel Masterpieces · Silver Holofoil',
      ['4 of 10 · Fleer', 'Artwork: Greg and Tim Hildebrandt', 'Silver foil stock with a fine speckled finish.'])));
    exhibits.push(ex);
  }
  exhibits.push(wolverine);
  {
    const ex = new Exhibit({ id: 'comic', no: '03', title: 'Spider-Man #50',
      finish: 'September 1994 · Holo-Grafx eyes',
      desc: 'Tom Lyle’s giant-sized cover. The hunter reflections stay in the original artwork; only the two eye lenses diffract cyan, violet and gold as you tilt the book.', actions });
    const art = spiderManPrint(comic);
    const front = createHoloMaterial({ map: colorTex(art.map), roughness: 0.65, clearcoat: 0.1,
      holo: { mask: dataTex(art.mask), prism: 0.9, pattern: 'linear', patternScale: 130, patternAngle: 0.12,
        patternMix: 0.35, inkOver: 1, tiltGain: [1.45, 0.8], saturation: 0.78, prismRough: 0.18,
        sparkle: 0, glow: 0, aspect: art.aspect } });
    addCard(ex, front, paper(archiveReverse('Spider-Man #50', 'September 1994 · Marvel Comics',
      ['Giant-sized 50th issue · Holo-Grafx cover', 'Cover artist: Tom Lyle', 'Son of the Hunter · Rite of Passage', 'The reflection depicts Grim Hunter, son of Kraven.'], art.aspect)),
      { width: 0.34 * art.aspect, height: 0.34, radius: 0.0007, depth: 0.003 });
    ex.inspect.scale = 1.85; exhibits.push(ex);
  }
  exhibits.push(toy);
  {
    const ex = new Exhibit({ id: 'motion', no: '05', title: 'Bartman · Muscle',
      finish: '1994 SkyBox Simpsons · Wiggle W2',
      desc: 'Tilt left and right to switch between the real relaxed and flexed poses. The fine lens ridges and the optical transition recreate the original wiggle card.', actions });
    const front = createHoloMaterial({ map: colorTex(simpsons.map), roughness: 0.38,
      clearcoat: 0.48, clearcoatRoughness: 0.18,
      holo: { prism: 0, sparkle: 0, glow: 0, lenticular: {
        frames: colorTex(simpsons.atlas), grid: [simpsons.cols, simpsons.rows], count: simpsons.count,
        rect: simpsons.rect, lensCount: 230, gain: 2.3, spread: 0.055, ridge: 0.15,
      } } });
    addCard(ex, front, paper(simpsons.back), { depth: 0.0018 });
    exhibits.push(ex);
  }
  exhibits.push(packet);
  return exhibits;
}
