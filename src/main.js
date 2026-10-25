import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

import { OffAxisCamera } from './render/offAxisCamera.js';
import { buildEnvironment, buildFoilEnvironment } from './render/environment.js';
import { FloorMirror } from './render/mirror.js';
import { holoGlobals } from './materials/holoMaterial.js';
import { buildRoom, ROOM } from './gallery/room.js';
import { ShipStudio } from './ships/studio.js';
import { buildCatalog } from './exhibits/catalog.js';
import { Viewer } from './tracking/viewer.js';
import { UI } from './ui/ui.js';

const canvas = document.getElementById('stage');
const params = new URLSearchParams(location.search);
const ui = new UI();
ui.progress(0.05, 'Warming up the gallery…');

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.toneMapping = THREE.NeutralToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef0f7');
const envMap = buildEnvironment(renderer);
scene.environment = envMap;
const foilEnv = buildFoilEnvironment(renderer);
scene.environmentIntensity = 0.75;

const camera = new OffAxisCamera();
const aspect0 = () => window.innerWidth / window.innerHeight;
camera.aspect = aspect0();
camera.setEye(0, 0.05, 2.8);

// Lights: soft key from upper-front-left (window light), cool fill, warm bounce.
const key = new THREE.DirectionalLight('#fff6ea', 3.0);
key.position.set(-0.9, 1.6, 1.4);
key.target.position.set(0, -0.3, -0.6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -1.4;
key.shadow.camera.right = 1.4;
key.shadow.camera.top = 1.4;
key.shadow.camera.bottom = -1.4;
key.shadow.camera.near = 0.2;
key.shadow.camera.far = 5;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.01;
key.shadow.radius = 6;
scene.add(key, key.target);
scene.add(new THREE.HemisphereLight('#f4f2ff', '#b8b0d0', 0.35));
const torch = new THREE.PointLight('#ffffff', 0, 1.6, 1.6);
scene.add(torch);

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------
let room = null;
let exhibits = [];
let glowRings = [];
const exhibitLayer = new THREE.Group();
scene.add(exhibitLayer);

const mirror = new FloorMirror(renderer, ROOM.floorY, 0.5);

function buildGallery() {
  if (room) { scene.remove(room.group); }
  glowRings = [];
  room = buildRoom(Math.max(1.2, camera.aspect));
  scene.add(room.group);
  mirror.hidden = [room.parts.floor];
  mirror.patch(room.parts.floor.material);
  room.parts.floor.material.needsUpdate = true;
  layout();
}

// Positions are expressed relative to the room width so it adapts to any screen.
function layout() {
  const W = room.W;
  const x = (f) => f * (W / 2);
  const byId = Object.fromEntries(exhibits.map((e) => [e.info.id, e]));
  if (!exhibits.length) return;
  const backZ = -0.95;
  const midZ = -0.4;

  const topRef = room.makePlinth(x(-0.62), backZ, 0.17, 0.4, 0.1, '#8a5cff', '02', 'Starburst refractor');
  const topBlister = room.makePlinth(0, backZ - 0.08, 0.2, 0.36, 0.12, '#ff7a2b', '04', 'Carded blister');
  const topComic = room.makePlinth(x(0.62), backZ, 0.17, 0.38, 0.1, '#2f7bff', '03', 'Embossed cover');

  byId.refractor.setRest(new THREE.Vector3(x(-0.62), topRef + 0.15, backZ), 0.22);
  byId.blister.setRest(new THREE.Vector3(0, topBlister + 0.215, backZ - 0.08), 0);
  byId.comic.setRest(new THREE.Vector3(x(0.62), topComic + 0.19, backZ), -0.22);

  byId.selective.setRest(new THREE.Vector3(x(-0.55), -0.29, midZ), 0.35);
  byId.packet.setRest(new THREE.Vector3(0, -0.31, midZ + 0.1), 0.0, 1, -0.1);
  byId.motion.setRest(new THREE.Vector3(x(0.55), -0.29, midZ), -0.35);

  glowRings.push(room.glowRing(x(-0.55), midZ, 0.12));
  glowRings.push(room.glowRing(0, midZ + 0.1, 0.12));
  glowRings.push(room.glowRing(x(0.55), midZ, 0.12));
}

// ---------------------------------------------------------------------------
// Post-processing
// ---------------------------------------------------------------------------
const size = new THREE.Vector2();
renderer.getDrawingBufferSize(size);
const composerTarget = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, composerTarget);
composer.addPass(new RenderPass(scene, camera));
const bokeh = new BokehPass(scene, camera, { focus: 2.5, aperture: 0.0, maxblur: 0.008 });
bokeh.enabled = false;
composer.addPass(bokeh);
const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.14, 0.2, 2.6);
composer.addPass(bloom);
composer.addPass(new OutputPass());
if (params.has('nobloom')) bloom.enabled = false;

// ---------------------------------------------------------------------------
// Tracking
// ---------------------------------------------------------------------------
// Lightweight stand-in until the MediaPipe tracker is loaded on demand.
let tracker = { running: false, locked: null, update() {}, drawPreview() {}, stop() {}, hfovDeg: 62 };
const IS_ARTIFACT = import.meta.env.VITE_ARTIFACT === '1';
const viewer = new Viewer(tracker);
ui.onToggleTracking = async () => {
  if (tracker.running) {
    tracker.stop();
    ui.trackingStatus('', 'Enable head tracking');
    return;
  }
  if (IS_ARTIFACT) {
    ui.trackingStatus('lost', 'Camera needs the local version — mouse mode');
    return;
  }
  try {
    if (!tracker.start) {
      const { HeadTracker } = await import('./tracking/headTracker.js');
      const t = new HeadTracker();
      t.hfovDeg = tracker.hfovDeg;
      t.onStatus = (state, label) => ui.trackingStatus(state, label);
      tracker = t;
      viewer.tracker = t;
    }
    await tracker.start();
  } catch (e) {
    console.error(e);
    ui.trackingStatus('lost', e && e.name === 'NotAllowedError' ? 'Camera blocked — mouse mode' : 'Camera unavailable — mouse mode');
  }
};
ui.onSettings = (s) => {
  Object.assign(viewer.settings, { parallax: s.parallax, screenCm: s.screenCm, smoothing: s.smoothing });
  viewer.applySmoothing();
  tracker.hfovDeg = s.camFov;
  mirror.enabled = s.reflect;
  bloom.enabled = s.bloom && !params.has('nobloom');
  dofAllowed = s.dof;
  ui.showPreview(s.preview);
};
let dofAllowed = true;

// ---------------------------------------------------------------------------
// Interaction
// ---------------------------------------------------------------------------
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerInside = false;
let hovered = null;
let selected = null;
let drag = null;
const torchPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const tmpV = new THREE.Vector3();

function setPointer(e) {
  pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(e.clientY / window.innerHeight) * 2 + 1;
  pointerInside = true;
  viewer.mouse.x = pointer.x;
  viewer.mouse.y = pointer.y;
}

function pick() {
  raycaster.setFromCamera(pointer, camera);
  const targets = exhibits.flatMap((e) => e.hit);
  const hit = raycaster.intersectObjects(targets, false)[0];
  return hit ? hit.object.userData.exhibit : null;
}

function select(ex) {
  if (selected === ex) return;
  if (selected) selected.deselect();
  selected = ex;
  if (ex) {
    ex.select();
    ui.showLabel(ex, (id) => runAction(id));
  } else {
    ui.hideLabel();
  }
  ui.dimHint(!!ex);
}

function runAction(id) {
  if (!selected) return;
  if (id === 'back') { select(null); return; }
  const r = selected.action(id);
  if (r === 'relabel') ui.showLabel(selected, (a) => runAction(a));
}

canvas.addEventListener('pointermove', (e) => {
  setPointer(e);
  if (drag) {
    const dx = (e.clientX - drag.x) / window.innerWidth;
    const dy = (e.clientY - drag.y) / window.innerHeight;
    drag.x = e.clientX;
    drag.y = e.clientY;
    drag.moved += Math.abs(dx) + Math.abs(dy);
    if (selected) selected.drag(dx, dy);
  }
});
canvas.addEventListener('pointerleave', () => { pointerInside = false; });
canvas.addEventListener('pointerdown', (e) => {
  setPointer(e);
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, moved: 0, target: pick() };
  if (selected && drag.target === selected) {
    selected.dragging = true;
    document.body.classList.add('dragging');
  }
});
canvas.addEventListener('pointerup', (e) => {
  if (!drag) return;
  const wasClick = drag.moved < 0.01;
  if (selected) selected.dragging = false;
  document.body.classList.remove('dragging');
  if (wasClick) {
    const t = pick();
    if (!selected) select(t);
    else if (t !== selected) select(t); // click another exhibit or empty space
  }
  drag = null;
});
canvas.addEventListener('dblclick', () => { if (selected) runAction('flip'); });
canvas.addEventListener('wheel', (e) => {
  viewer.mouseWheelZ = THREE.MathUtils.clamp(viewer.mouseWheelZ + e.deltaY * 0.002, -1.2, 1.6);
}, { passive: true });
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') select(null);
  if (!selected) return;
  const k = e.key.toLowerCase();
  for (const a of selected.info.actions) if (a.key && a.key.toLowerCase() === k) runAction(a.id);
});

// ---------------------------------------------------------------------------
// Resize
// ---------------------------------------------------------------------------
let resizeTimer = 0;
function onResize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  renderer.getDrawingBufferSize(size);
  composer.setSize(w, h);
  mirror.setSize(size.x, size.y);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (room && Math.abs(room.W - Math.max(1.2, camera.aspect)) > 0.03) buildGallery();
  }, 250);
}
window.addEventListener('resize', onResize);

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------
async function boot() {
  try { await document.fonts.ready; } catch {}
  ui.progress(0.2, 'Building starships…');
  await new Promise((r) => setTimeout(r, 30));
  const studio = new ShipStudio(renderer, foilEnv);
  ui.progress(0.4, 'Printing foils…');
  exhibits = await buildCatalog({ studio, foilEnv });
  exhibits.forEach((e) => exhibitLayer.add(e.root));
  ui.progress(0.75, 'Hanging the exhibits…');
  buildGallery();
  onResize();
  // Warm up shaders so the first frames don't hitch.
  renderer.compile(scene, camera);
  ui.progress(1, 'Ready');
  setTimeout(() => ui.ready(), 250);
  renderer.setAnimationLoop(frame);
  if (params.has('debug')) window.__holo = { exhibits, select, pick, pointer, camera, setPointer };
}

const clock = new THREE.Clock();
// Adaptive resolution: if frames run slow for a couple of seconds, step the pixel ratio down.
const perf = { acc: 0, n: 0, ratio: Math.min(window.devicePixelRatio, 2), cooldown: 3 };
function adaptQuality(dt) {
  perf.cooldown -= dt;
  perf.acc += dt; perf.n++;
  if (perf.acc < 2) return;
  const avg = perf.acc / perf.n;
  perf.acc = 0; perf.n = 0;
  if (perf.cooldown > 0) return;
  let next = perf.ratio;
  if (avg > 0.024 && perf.ratio > 1) next = Math.max(1, perf.ratio - 0.25);
  else if (avg < 0.0135 && perf.ratio < Math.min(window.devicePixelRatio, 2)) next = Math.min(Math.min(window.devicePixelRatio, 2), perf.ratio + 0.25);
  if (next !== perf.ratio) {
    perf.ratio = next;
    perf.cooldown = 4;
    renderer.setPixelRatio(next);
    composer.setPixelRatio(next);
    onResize();
  }
}
const keyDirWorld = new THREE.Vector3();
const glintSpots = [[-1.2, 1.4, 2.5], [1.0, 1.2, 2.8], [0, 0.5, 3.2], [-0.4, 1.8, 0.6], [0.8, 1.6, -0.2], [-1.6, 0.2, 1.6]].map((p) => new THREE.Vector3(...p));
const glintCentre = new THREE.Vector3(0, -0.1, -0.6);

function frame() {
  const rawDt = clock.getDelta();
  const dt = Math.min(0.05, rawDt);
  if (!params.has('fixedres')) adaptQuality(rawDt);
  const t = clock.elapsedTime;
  const now = performance.now();

  tracker.update(now);
  if (ui.previewOn && tracker.running) tracker.drawPreview(ui.previewCanvas);

  // Viewer → camera. While dragging an exhibit the mouse shouldn't steer the view.
  if (drag && selected) { /* keep previous mouse eye */ } else if (!pointerInside) {
    viewer.mouse.x *= 0.98; viewer.mouse.y *= 0.98;
  }
  const eye = viewer.update(dt, t, camera.aspect);
  camera.setEye(eye.x, eye.y, eye.z);

  // Hover
  if (!drag) {
    const h = pointerInside ? pick() : null;
    if (h !== hovered) {
      if (hovered) hovered.hoverTarget = 0;
      hovered = h;
      if (hovered && hovered !== selected) hovered.hoverTarget = 1;
      document.body.classList.toggle('hovering', !!hovered);
      if (!selected) { if (hovered) ui.peekLabel(hovered); else ui.hideLabel(); }
    }
  }

  for (const e of exhibits) e.update(dt, t);

  // Torch: follows the pointer just in front of the inspected exhibit.
  const inspecting = selected && selected.k > 0.5;
  if (inspecting) {
    raycaster.setFromCamera(pointer, camera);
    torchPlane.constant = -(selected.root.position.z + 0.25);
    if (raycaster.ray.intersectPlane(torchPlane, tmpV)) torch.position.copy(tmpV);
  }
  torch.intensity += ((inspecting ? 0.35 : 0) - torch.intensity) * (1 - Math.exp(-dt * 5));
  holoGlobals.uTorchOn.value = torch.intensity;

  // Shader globals in view space
  holoGlobals.uTime.value = t;
  glintSpots.forEach((p, i) => holoGlobals.uGlintDirs.value[i].copy(p).sub(glintCentre).normalize().transformDirection(camera.matrixWorldInverse));
  keyDirWorld.copy(key.position).sub(key.target.position).normalize();
  holoGlobals.uKeyDirView.value.copy(keyDirWorld).transformDirection(camera.matrixWorldInverse);
  holoGlobals.uTorchView.value.copy(torch.position).applyMatrix4(camera.matrixWorldInverse);
  // uTorchView must be a direction from the surface; approximate from the inspected object.
  if (selected) {
    const objView = selected.root.position.clone().applyMatrix4(camera.matrixWorldInverse);
    holoGlobals.uTorchView.value.sub(objView).normalize();
  }

  // Depth of field when inspecting
  const dofK = selected && dofAllowed ? selected.k : 0;
  bokeh.enabled = dofK > 0.02;
  if (bokeh.enabled) {
    const focus = camera.position.distanceTo(selected.root.position);
    bokeh.uniforms.focus.value = focus;
    bokeh.uniforms.aperture.value = 0.0045 * dofK;
  }

  for (const ring of glowRings) ring.material.opacity = 0.55 + Math.sin(t * 1.5) * 0.15;

  mirror.render(scene, camera);
  if (params.has('nopost')) renderer.render(scene, camera); else composer.render(dt);
}

boot().catch((e) => {
  console.error(e);
  ui.progress(1, 'Something went wrong — see console');
});
