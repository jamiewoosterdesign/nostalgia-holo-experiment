import * as THREE from 'three';
import { makeCanvas, ctxOf, nebula, stars, colorTex } from '../art/canvasKit.js';

// Renders the 3D ships into textures: transparent "art layers" for printed
// cards, and a lenticular frame atlas for the motion card.
export class ShipStudio {
  constructor(renderer, envMap) {
    this.renderer = renderer;
    this.scene = new THREE.Scene();
    this.scene.environment = envMap;
    this.scene.environmentIntensity = 0.45;
    const key = new THREE.DirectionalLight('#fff4e6', 1.9);
    key.position.set(2, 3, 2.5);
    const rim = new THREE.DirectionalLight('#ff5fb0', 1.8);
    rim.position.set(-3, 1, -2);
    const fill = new THREE.DirectionalLight('#5fa8ff', 0.9);
    fill.position.set(-2, -1.5, 2);
    this.scene.add(key, rim, fill, new THREE.AmbientLight('#ffffff', 0.12));
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  }

  // Render `object` with a transparent background into a new texture.
  renderLayer(object, { width = 1024, height = 1430, camPos, target, fov = 30, place }) {
    const rt = new THREE.WebGLRenderTarget(width, height, {
      samples: 4,
      colorSpace: THREE.SRGBColorSpace,
      type: THREE.UnsignedByteType,
    });
    const holder = new THREE.Group();
    holder.add(object);
    if (place) place(holder);
    this.scene.add(holder);
    this.camera.fov = fov;
    this.camera.aspect = width / height;
    this.camera.position.copy(camPos);
    this.camera.lookAt(target || new THREE.Vector3());
    this.camera.updateProjectionMatrix();

    const r = this.renderer;
    const prevTarget = r.getRenderTarget();
    const prevClear = r.getClearColor(new THREE.Color());
    const prevAlpha = r.getClearAlpha();
    const prevTM = r.toneMapping;
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 0);
    r.clear();
    r.render(this.scene, this.camera);
    r.setRenderTarget(prevTarget);
    r.setClearColor(prevClear, prevAlpha);
    r.toneMapping = prevTM;
    this.scene.remove(holder);
    holder.remove(object);
    rt.texture.colorSpace = THREE.SRGBColorSpace;
    return rt.texture;
  }

  // Motion card: a ship swoops past and jumps to light speed across N frames.
  renderMotionAtlas(ship, { cols = 4, rows = 4, frameW = 384, frameH = 536 } = {}) {
    const W = cols * frameW;
    const H = rows * frameH;
    const rt = new THREE.WebGLRenderTarget(W, H, { samples: 4, colorSpace: THREE.SRGBColorSpace });
    const count = cols * rows;

    // Background: deep nebula on a large plane.
    const bgC = makeCanvas(1600, 1600);
    const bctx = ctxOf(bgC);
    const g = bctx.createLinearGradient(0, 0, 0, 1600);
    g.addColorStop(0, '#04051c');
    g.addColorStop(0.55, '#150838');
    g.addColorStop(1, '#3a0d3a');
    bctx.fillStyle = g;
    bctx.fillRect(0, 0, 1600, 1600);
    nebula(bctx, 1600, 1600, ['#3d6bff', '#b03dff', '#ff4f8b', '#22d3c5'], 13, 40, 0.16);
    stars(bctx, 1600, 1600, 900, 4, '#ffffff', 2.6);
    const bgTex = colorTex(bgC);
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshBasicMaterial({ map: bgTex }));
    bg.position.z = -8;

    // Hyperspace streaks
    const streakCount = 420;
    const sp = new Float32Array(streakCount * 6);
    const seeds = [];
    for (let i = 0; i < streakCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 0.3 + Math.random() * 4.5;
      seeds.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr, z: -2 - Math.random() * 5 });
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    const streaks = new THREE.LineSegments(
      sg,
      new THREE.LineBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending }),
    );

    const holder = new THREE.Group();
    holder.add(ship);
    // Engine glow sprite
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
      map: ship.userData.engineGlow, color: '#9fd4ff', transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
    }));
    glow.position.set(0, 0, -0.5);
    glow.scale.set(1.1, 0.35, 1);
    holder.add(glow);

    this.scene.add(bg, streaks, holder);
    const cam = this.camera;
    cam.fov = 38;
    cam.aspect = frameW / frameH;
    cam.position.set(0, 0, 4.2);
    cam.lookAt(0, 0, 0);
    cam.updateProjectionMatrix();

    const r = this.renderer;
    const prev = r.getRenderTarget();
    r.setRenderTarget(rt);
    r.setClearColor(0x000000, 1);
    r.clear();
    rt.scissorTest = true;

    for (let i = 0; i < count; i++) {
      const t = i / (count - 1);
      // Swoop: far-left & low → close, centre, banking → jump away upper-right.
      const e = t * t * (3 - 2 * t);
      holder.position.set(-1.1 + e * 1.6, -0.9 + Math.sin(t * Math.PI) * 1.1 + t * 0.2, -1.5 + Math.sin(t * Math.PI) * 2.0 - Math.max(0, t - 0.75) * 10);
      holder.rotation.set(0.5 - t * 0.6, -0.9 + t * 1.6, 0.6 - t * 1.0);
      const jump = Math.max(0, (t - 0.68) / 0.32);
      holder.scale.setScalar(1.35 + Math.sin(t * Math.PI) * 0.5);
      holder.scale.z *= 1 + jump * 2.5; // stretch into the jump
      glow.material.opacity = 0.5 + jump * 0.5 + Math.sin(t * 30) * 0.05;
      glow.scale.set(1.1 + jump * 2, 0.35 + jump * 0.3, 1);
      bg.position.x = -t * 0.8;
      bg.position.y = t * 0.4;

      for (let s = 0; s < streakCount; s++) {
        const p = seeds[s];
        const len = jump * jump * 3.5;
        sp[s * 6 + 0] = p.x; sp[s * 6 + 1] = p.y; sp[s * 6 + 2] = p.z;
        sp[s * 6 + 3] = p.x * (1 + len * 0.15); sp[s * 6 + 4] = p.y * (1 + len * 0.15); sp[s * 6 + 5] = p.z + len;
      }
      sg.attributes.position.needsUpdate = true;
      streaks.material.opacity = Math.min(1, jump * 1.4);

      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = col * frameW;
      const y = (rows - 1 - row) * frameH;
      rt.viewport.set(x, y, frameW, frameH);
      rt.scissor.set(x, y, frameW, frameH);
      r.setRenderTarget(rt);
      r.render(this.scene, cam);
    }
    rt.scissorTest = false;
    r.setRenderTarget(prev);
    this.scene.remove(bg, streaks, holder);
    holder.remove(ship);
    return { texture: rt.texture, cols, rows, count };
  }
}
