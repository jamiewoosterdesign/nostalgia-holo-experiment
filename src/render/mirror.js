import * as THREE from 'three';

// Planar floor reflection that works with an off-axis camera.
// We render the scene through a camera mirrored about the floor plane, then
// flip the image in clip space so triangle winding stays correct. Because the
// mirrored camera shares the real camera's (skewed) frustum, a floor pixel's
// reflection lives at the same screen position — so the floor shader can
// sample it with gl_FragCoord and blur it via mip bias for glossy roughness.
export class FloorMirror {
  constructor(renderer, planeY, scale = 0.5) {
    this.renderer = renderer;
    this.planeY = planeY;
    this.scale = scale;
    this.enabled = true;
    this.rt = new THREE.WebGLRenderTarget(4, 4, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
      magFilter: THREE.LinearFilter,
    });
    this.camera = new THREE.PerspectiveCamera();
    this.camera.matrixAutoUpdate = false;
    this.camera.matrixWorldAutoUpdate = false;
    this.reflect = new THREE.Matrix4().set(
      1, 0, 0, 0,
      0, -1, 0, 2 * planeY,
      0, 0, 1, 0,
      0, 0, 0, 1,
    );
    this.flip = new THREE.Matrix4().makeScale(1, -1, 1);
    this.uniforms = {
      uMirror: { value: this.rt.texture },
      uMirrorRes: { value: new THREE.Vector2(1, 1) },
      uMirrorMix: { value: 1 },
      uMirrorBias: { value: 1.5 },
    };
    this.hidden = [];
  }

  setSize(w, h) {
    this.rt.setSize(Math.max(4, Math.floor(w * this.scale)), Math.max(4, Math.floor(h * this.scale)));
    this.uniforms.uMirrorRes.value.set(w, h);
  }

  render(scene, camera) {
    if (!this.enabled) { this.uniforms.uMirrorMix.value = 0; return; }
    this.uniforms.uMirrorMix.value = 1;
    const cam = this.camera;
    cam.matrixWorld.multiplyMatrices(this.reflect, camera.matrixWorld);
    cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
    cam.projectionMatrix.multiplyMatrices(this.flip, camera.projectionMatrix);
    cam.projectionMatrixInverse.copy(cam.projectionMatrix).invert();
    cam.near = camera.near;
    cam.far = camera.far;

    const r = this.renderer;
    const prev = r.getRenderTarget();
    const prevShadow = r.shadowMap.autoUpdate;
    r.shadowMap.autoUpdate = false;
    for (const o of this.hidden) o.visible = false;
    r.setRenderTarget(this.rt);
    r.clear();
    r.render(scene, cam);
    for (const o of this.hidden) o.visible = true;
    r.setRenderTarget(prev);
    r.shadowMap.autoUpdate = prevShadow;
  }

  // Patch a MeshPhysicalMaterial so its indirect specular comes from the mirror.
  patch(material) {
    const u = this.uniforms;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, u);
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
          uniform sampler2D uMirror; uniform vec2 uMirrorRes; uniform float uMirrorMix; uniform float uMirrorBias;`,
        )
        .replace(
          '#include <lights_fragment_end>',
          `#include <lights_fragment_end>
          {
            vec2 suv = gl_FragCoord.xy / uMirrorRes;
            suv.y = 1.0 - suv.y;
            suv += normal.xy * 0.015;
            vec3 mir = texture2D(uMirror, suv, uMirrorBias).rgb;
            float nv = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
            float F = 0.06 + 0.94 * pow(1.0 - nv, 5.0);
            reflectedLight.indirectSpecular = mix(reflectedLight.indirectSpecular, mir * F * 1.6, uMirrorMix * 0.85);
          }`,
        );
    };
    material.customProgramCacheKey = () => 'floor-mirror';
  }
}
