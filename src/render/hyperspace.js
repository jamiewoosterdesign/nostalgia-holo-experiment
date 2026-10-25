import * as THREE from 'three';

// Holographic foil wall prints.
// Static, like a printed holographic sheet: a graphite-silver base with an
// embossed diffraction-grating design. Nothing animates — colour only appears
// where light reflects toward the viewer, and the grating splits that
// reflection into a spectrum. Move your head and the rainbow slides across
// the wall; stand still and it holds.
//
// Motifs (the printed grating design):
//   0 starburst – radial grooves with faint sunburst rays (back wall)
//   1 diamond   – rotated lattice, every cell's grating at its own angle
//   2 sparkle   – fine cells with random angles, glints like cracked-ice foil

export const hyperspaceUniforms = {
  uTime: { value: 0 }, // kept for compatibility; foil prints are static
};

// Lights the foil responds to (world space). The first follows the viewer's
// eye, like light bouncing off you, and is updated each frame.
export const foilLights = {
  uEyeLight: { value: new THREE.Vector3(0, 0.05, 2.8) },
  uKeyPos: { value: new THREE.Vector3(-0.9, 1.6, 1.4) },
  uFillPos: { value: new THREE.Vector3(1.2, 0.9, 1.6) },
};

const vert = /* glsl */`
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const frag = /* glsl */`
  uniform int uMotif;
  uniform vec2 uSize;
  uniform float uScale;
  uniform vec3 uBase;
  uniform float uGain;
  uniform float uLobe;
  uniform vec3 uEyeLight;
  uniform vec3 uKeyPos;
  uniform vec3 uFillPos;
  varying vec3 vWorld;
  varying vec3 vNormalW;
  varying vec2 vUv;

  #define TAU 6.28318530718

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  vec2 hash2(vec2 p) { return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453); }

  // Smooth spectrum, slightly pastel like real foil.
  vec3 spectrum(float x) {
    x = fract(x);
    vec3 c = clamp(vec3(abs(x * 6.0 - 3.0) - 1.0, 2.0 - abs(x * 6.0 - 2.0), 2.0 - abs(x * 6.0 - 4.0)), 0.0, 1.0);
    return mix(vec3(0.85), c, 0.82);
  }

  // Returns grating angle (radians, in the surface plane) and print mask.
  vec2 motif(vec2 p) {
    if (uMotif == 0) {
      float a = atan(p.y, p.x);
      float r = length(p);
      float rays = 0.5 + 0.5 * cos(a * 140.0);
      float rings = 0.5 + 0.5 * cos(r * 260.0);
      float mask = mix(0.75, 1.0, rays) * mix(0.9, 1.0, rings);
      return vec2(a + 1.5708, mask);                // concentric grooves
    } else if (uMotif == 1) {
      vec2 q = mat2(0.7071, -0.7071, 0.7071, 0.7071) * p * uScale;
      vec2 id = floor(q);
      vec2 f = fract(q) - 0.5;
      float border = smoothstep(0.47, 0.43, max(abs(f.x), abs(f.y)));
      float ang = floor(hash(id) * 6.0) / 6.0 * 3.14159;
      return vec2(ang, mix(0.35, 1.0, border));
    } else {
      vec2 q = p * uScale;
      vec2 id = floor(q);
      vec2 f = fract(q);
      float best = 9.0; vec2 bid = id;
      for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
        vec2 o = vec2(float(x), float(y));
        vec2 c = o + hash2(id + o);
        float d = length(c - f);
        if (d < best) { best = d; bid = id + o; }
      }
      return vec2(hash(bid) * 3.14159, 1.0);
    }
  }

  vec3 foil(vec3 N, vec3 V, vec3 T, vec3 B, vec2 m, vec3 lightPos, float strength) {
    vec3 L = normalize(lightPos - vWorld);
    vec3 H = normalize(L + V);
    vec3 G = T * cos(m.x) + B * sin(m.x);           // grating direction
    float nh = max(dot(N, H), 0.0);
    // diffraction: the tilt of H along the grating picks the colour
    float d = dot(H, G);
    float lobe = exp(-(1.0 - nh) * uLobe);             // sheen width
    vec3 rainbow = spectrum(d * 2.6 + 0.15) * lobe * m.y;
    float glint = pow(nh, 220.0) * 1.2;               // tight specular
    return (rainbow * 1.1 + glint) * strength;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    vec3 V = normalize(cameraPosition - vWorld);
    vec3 N = normalize(vNormalW);
    if (dot(N, V) < 0.0) N = -N;
    vec3 up = abs(N.y) > 0.9 ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
    vec3 T = normalize(cross(up, N));
    vec3 B = cross(N, T);

    vec2 m = motif(p);

    // base: graphite-silver print, very slightly brushed by the grating
    vec3 col = uBase * (0.75 + 0.25 * m.y);
    col += foil(N, V, T, B, m, uEyeLight, 0.4);
    col += foil(N, V, T, B, m, uKeyPos, 0.5);
    col += foil(N, V, T, B, m, uFillPos, 0.3);
    col *= uGain;

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export function holoPanelMaterial({ motif = 0, size = [1, 1], scale = 8, base = '#2b2a33', gain = 1, lobe = 30 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...foilLights,
      uMotif: { value: motif },
      uSize: { value: new THREE.Vector2(size[0], size[1]) },
      uScale: { value: scale },
      uBase: { value: new THREE.Color(base) },
      uGain: { value: gain },
      uLobe: { value: lobe },
    },
    vertexShader: vert,
    fragmentShader: frag,
    side: THREE.DoubleSide,
  });
}

// One foil sheet covering a whole wall.
export function foilWall({ width, height, ...opts }) {
  return new THREE.Mesh(new THREE.PlaneGeometry(width, height), holoPanelMaterial({ ...opts, size: [width, height] }));
}
