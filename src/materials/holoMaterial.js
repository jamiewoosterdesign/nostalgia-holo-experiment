import * as THREE from 'three';

// ---------------------------------------------------------------------------
// HoloMaterial: MeshPhysicalMaterial with a print/foil layer injected before
// lighting. Because we only change base colour, metalness, roughness and the
// shading normal, every finish still receives the real environment map,
// lights, shadows and clear-coat from three's PBR pipeline — the rainbow is
// a coloured *reflection*, not a painted-on gradient.
//
// Mask texture channels:  R = prismatic foil   G = sparkle / flake foil
//                         B = metallic ink (art colour becomes tinted metal)
// Height texture (R)    : embossing relief
// ---------------------------------------------------------------------------

// Uniforms shared by every holo material (time, key light direction in view space…).
export const holoGlobals = {
  uTime: { value: 0 },
  uKeyDirView: { value: new THREE.Vector3(0.3, 0.6, 0.7).normalize() },
  uTorchView: { value: new THREE.Vector3(0, 0, 1) },
  uTorchOn: { value: 0 },
};

const PATTERNS = { none: 0, linear: 1, concentric: 2, crackedIce: 3, diamond: 4, starburst: 5 };

const PARS = /* glsl */ `
varying vec2 vHoloUv;
uniform float uTime;
uniform vec3 uKeyDirView;
uniform vec3 uTorchView;
uniform float uTorchOn;

uniform sampler2D uMask;
uniform float uPrism;
uniform float uPrismRough;
uniform float uSat;
uniform float uHueShift;
uniform vec2 uTiltGain;
uniform float uPatternScale;
uniform float uPatternAngle;
uniform float uPatternMix;
uniform float uInkOver;
uniform float uGlow;
uniform float uMetalInkRough;
uniform float uAspect;

uniform float uSparkle;
uniform float uSparkleScale;
uniform float uSparkleTilt;
uniform float uSparkleRough;
uniform float uGlint;

uniform sampler2D uHeight;
uniform vec2 uHeightTexel;
uniform float uEmboss;

uniform sampler2D uLayer;
uniform float uLayerMatte;

uniform sampler2D uFrames;
uniform vec2 uFrameGrid;
uniform float uFrameCount;
uniform vec4 uLensRect;
uniform float uLensCount;
uniform float uLensGain;
uniform float uLensSpread;
uniform float uLensRidge;

uniform float uCrinkle;
uniform float uBrush;

float hHash12(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 hHash22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }

float hNoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hHash12(i), hHash12(i+vec2(1,0)), u.x), mix(hHash12(i+vec2(0,1)), hHash12(i+vec2(1,1)), u.x), u.y);
}
float hFbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++){ s += a * hNoise(p); p *= 2.03; a *= 0.5; } return s; }

// Voronoi: x = distance to nearest feature, y = distance to cell border, zw = cell id
vec4 hVoronoi(vec2 x){
  vec2 n = floor(x), f = fract(x);
  vec2 mg, mr; float md = 8.0;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){
    vec2 g = vec2(float(i),float(j));
    vec2 o = hHash22(n+g);
    vec2 r = g + o - f;
    float d = dot(r,r);
    if (d < md){ md = d; mr = r; mg = g; }
  }
  float ed = 8.0;
  for (int j=-2;j<=2;j++) for (int i=-2;i<=2;i++){
    vec2 g = mg + vec2(float(i),float(j));
    vec2 o = hHash22(n+g);
    vec2 r = g + o - f;
    if (dot(mr-r,mr-r) > 0.00001) ed = min(ed, dot(0.5*(mr+r), normalize(r-mr)));
  }
  return vec4(sqrt(md), ed, n + mg);
}

vec3 hPalette(float t){
  // Cyan / magenta / gold biased — closer to real holographic film than pure HSV.
  return 0.56 + 0.44 * cos(6.28318 * (t + vec3(0.0, 0.31, 0.62)));
}

mat3 hTangentFrame(vec3 N, vec3 p, vec2 uv){
  vec3 dp1 = dFdx(p), dp2 = dFdy(p);
  vec2 duv1 = dFdx(uv), duv2 = dFdy(uv);
  vec3 dp2perp = cross(dp2, N);
  vec3 dp1perp = cross(N, dp1);
  vec3 T = dp2perp * duv1.x + dp1perp * duv2.x;
  vec3 B = dp2perp * duv1.y + dp1perp * duv2.y;
  float invmax = inversesqrt(max(max(dot(T,T), dot(B,B)), 1e-12));
  return mat3(T * invmax, B * invmax, N);
}

// Diffraction pattern phase. Returns (phase, line) where line is a 0..1 groove.
vec2 hPattern(vec2 uv){
  vec2 p = uv - 0.5; p.x *= uAspect;
  float c = cos(uPatternAngle), s = sin(uPatternAngle);
  vec2 q = vec2(c*p.x - s*p.y, s*p.x + c*p.y);
  #if HOLO_PATTERN == 1
    float t = q.x * uPatternScale;
    // broad bands from position + a fine groove for brightness only
    return vec2(q.x * 0.9 + sin(t * 0.21) * 0.04, 0.5 + 0.5 * sin(t * 6.28318));
  #elif HOLO_PATTERN == 2
    float r = length(q) * uPatternScale;
    return vec2(r * 0.06, 0.5 + 0.5 * sin(r * 6.28318));
  #elif HOLO_PATTERN == 3
    vec4 v = hVoronoi(q * uPatternScale);
    return vec2(hHash12(v.zw) * 0.9, smoothstep(0.0, 0.05, v.y));
  #elif HOLO_PATTERN == 4
    vec2 g = abs(fract(q * uPatternScale) - 0.5);
    float d = max(g.x, g.y);
    vec2 cell = floor(q * uPatternScale);
    return vec2(hHash12(cell) * 0.35 + d * 0.4, smoothstep(0.46, 0.5, d));
  #elif HOLO_PATTERN == 5
    float a = atan(q.y, q.x);
    float rays = 0.5 + 0.5 * sin(a * uPatternScale);
    return vec2(rays * 0.25 + length(q) * 0.3, rays);
  #else
    return vec2(0.0, 0.5);
  #endif
}
`;

const VERT_UV = /* glsl */ `
#include <uv_vertex>
vHoloUv = uv;
`;

const FRAG_MAIN = /* glsl */ `
#include <emissivemap_fragment>
{
  vec2 huv = vHoloUv;
  vec3 V = normalize(vViewPosition);
  vec3 N0 = normal;
  mat3 hT = hTangentFrame(N0, -vViewPosition, huv);
  vec3 artColor = diffuseColor.rgb;

  #ifdef HOLO_MASK
    vec3 hm = texture2D(uMask, huv).rgb;
  #else
    vec3 hm = vec3(1.0, 1.0, 0.0);
  #endif
  float foil = hm.r * uPrism;
  float spark = hm.g * uSparkle;
  float ink = hm.b;

  #ifdef HOLO_LAYER
    vec4 lay = texture2D(uLayer, huv);
    artColor = artColor * (1.0 - lay.a) + lay.rgb; // layer is premultiplied (rendered over transparent)
    foil *= 1.0 - lay.a * uLayerMatte;
    spark *= 1.0 - lay.a * uLayerMatte;
    ink *= 1.0 - lay.a * uLayerMatte;
  #endif

  vec3 Np = N0;

  #ifdef HOLO_HEIGHT
    float hL = texture2D(uHeight, huv - vec2(uHeightTexel.x, 0.0)).r;
    float hR = texture2D(uHeight, huv + vec2(uHeightTexel.x, 0.0)).r;
    float hD = texture2D(uHeight, huv - vec2(0.0, uHeightTexel.y)).r;
    float hU = texture2D(uHeight, huv + vec2(0.0, uHeightTexel.y)).r;
    vec3 tn = normalize(vec3((hL - hR) * uEmboss, (hD - hU) * uEmboss, 1.0));
    Np = normalize(hT * tn);
  #endif

  #ifdef HOLO_CRINKLE
    vec2 cq = huv * vec2(uAspect, 1.0) * 9.0;
    float c0 = hFbm(cq);
    vec2 cg = vec2(hFbm(cq + vec2(0.07, 0.0)) - c0, hFbm(cq + vec2(0.0, 0.07)) - c0) / 0.07;
    // Ridged: fold the gradient so creases look sharp, not lumpy.
    cg = sign(cg) * pow(abs(cg), vec2(0.7));
    Np = normalize(Np + hT * vec3(-cg * uCrinkle, 0.0));
  #endif

  // Pattern & tilt-driven hue — this is the diffraction "travel".
  vec2 pat = hPattern(huv);
  float vT = dot(V, hT[0]);
  float vB = dot(V, hT[1]);
  float hue = vT * uTiltGain.x + vB * uTiltGain.y + pat.x * uPatternMix + uHueShift + uTime * 0.015;

  float cellRand = 0.0;
  #ifdef HOLO_SPARKLE
    vec2 sq = huv * vec2(uAspect, 1.0) * uSparkleScale;
    vec4 sv = hVoronoi(sq);
    vec2 r2 = hHash22(sv.zw + 17.0) - 0.5;
    cellRand = hHash12(sv.zw);
    vec3 cn = normalize(vec3(r2 * uSparkleTilt, 1.0));
    vec3 flakeN = normalize(hT * cn);
    float flakeEdge = smoothstep(0.0, 0.035, sv.y);
    Np = normalize(mix(Np, flakeN, spark * flakeEdge));
    hue += cellRand * spark * 0.9;
    // Explicit glints toward the key light and the torch for crisp twinkle.
    vec3 Rv = reflect(-V, flakeN);
    float g1 = pow(max(dot(Rv, uKeyDirView), 0.0), 900.0);
    float g2 = pow(max(dot(Rv, normalize(uTorchView)), 0.0), 500.0) * uTorchOn;
    float glint = (g1 + g2 * 1.4) * spark * flakeEdge * uGlint;
    totalEmissiveRadiance += mix(vec3(1.0), hPalette(hue), 0.55) * glint;
  #endif

  vec3 rainbow = hPalette(hue);
  float lum = dot(rainbow, vec3(0.299, 0.587, 0.114));
  rainbow = mix(vec3(lum), rainbow, uSat);
  // Fresnel: grazing angles wash toward silver like real metallised film.
  float fres = pow(1.0 - clamp(dot(V, N0), 0.0, 1.0), 3.0);
  vec3 foilMetal = mix(rainbow, vec3(0.95), fres * 0.6);
  vec3 foilColor = foilMetal * mix(vec3(1.0), clamp(artColor * 1.35, 0.0, 1.0), uInkOver);

  float metalAmt = clamp(max(max(foil, spark), ink), 0.0, 1.0);
  vec3 col = artColor;
  col = mix(col, artColor, ink);
  col = mix(col, foilColor * (0.9 + 0.1 * pat.y), max(foil, spark));
  diffuseColor.rgb = col;
  metalnessFactor = mix(metalnessFactor, 1.0, metalAmt);
  float rFoil = mix(uPrismRough, uSparkleRough, spark / max(foil + spark, 1e-3));
  roughnessFactor = mix(roughnessFactor, mix(uMetalInkRough, rFoil, max(foil, spark) / max(metalAmt, 1e-3)), metalAmt);
  roughnessFactor *= mix(1.0, 0.85 + 0.3 * pat.y, max(foil, spark) * 0.6);

  #ifdef HOLO_BRUSH
    float streak = hNoise(vec2(huv.x * 6.0, huv.y * 900.0)) * 0.6 + hNoise(vec2(huv.x * 2.0, huv.y * 2400.0)) * 0.4;
    roughnessFactor = clamp(roughnessFactor * mix(1.0, 0.55 + streak * 0.9, metalAmt * uBrush), 0.04, 1.0);
  #endif

  totalEmissiveRadiance += rainbow * foil * uGlow * (0.6 + 0.4 * pat.y);

  #ifdef HOLO_LENT
    vec2 lr = (huv - uLensRect.xy) / (uLensRect.zw - uLensRect.xy);
    if (lr.x >= 0.0 && lr.x <= 1.0 && lr.y >= 0.0 && lr.y <= 1.0) {
      float lensPos = fract(lr.x * uLensCount);
      // Each lens shows a slightly different frame across its width → authentic ghosting.
      float t = clamp(vT * uLensGain + 0.5 + (lensPos - 0.5) * uLensSpread, 0.0, 0.9999);
      float fi = t * uFrameCount;
      float f0 = floor(fi);
      float f1 = min(f0 + 1.0, uFrameCount - 1.0);
      float w = smoothstep(0.72, 1.0, fract(fi));
      vec2 cell0 = vec2(mod(f0, uFrameGrid.x), uFrameGrid.y - 1.0 - floor(f0 / uFrameGrid.x));
      vec2 cell1 = vec2(mod(f1, uFrameGrid.x), uFrameGrid.y - 1.0 - floor(f1 / uFrameGrid.x));
      vec2 inset = mix(vec2(0.004), vec2(0.996), lr);
      vec3 c0 = texture2D(uFrames, (cell0 + inset) / uFrameGrid).rgb;
      vec3 c1 = texture2D(uFrames, (cell1 + inset) / uFrameGrid).rgb;
      vec3 lc = mix(c0, c1, w);
      // Lens ridge darkening between lenticules.
      float ridgeShade = 0.9 + 0.1 * sin(lensPos * 3.14159);
      diffuseColor.rgb = lc * ridgeShade;
      metalnessFactor = 0.0;
      roughnessFactor = 0.22;
      Np = normalize(hT * vec3((lensPos - 0.5) * uLensRidge, 0.0, 1.0));
      totalEmissiveRadiance += lc * 0.07;
    }
  #endif

  normal = Np;
}
`;

export function createHoloMaterial(opts = {}) {
  const h = opts.holo || {};
  const base = { ...opts };
  delete base.holo;
  const mat = new THREE.MeshPhysicalMaterial({
    roughness: 0.55,
    metalness: 0.0,
    clearcoat: 0.35,
    clearcoatRoughness: 0.12,
    ...base,
  });

  const uniforms = {
    uMask: { value: h.mask || null },
    uPrism: { value: h.prism ?? 0 },
    uPrismRough: { value: h.prismRough ?? 0.22 },
    uSat: { value: h.saturation ?? 0.9 },
    uHueShift: { value: h.hueShift ?? 0 },
    uTiltGain: { value: new THREE.Vector2(...(h.tiltGain || [1.6, 0.9])) },
    uPatternScale: { value: h.patternScale ?? 40 },
    uPatternAngle: { value: h.patternAngle ?? 0.6 },
    uPatternMix: { value: h.patternMix ?? 1 },
    uInkOver: { value: h.inkOver ?? 0 },
    uGlow: { value: h.glow ?? 0.06 },
    uMetalInkRough: { value: h.metalInkRough ?? 0.28 },
    uAspect: { value: h.aspect ?? 0.72 },
    uSparkle: { value: h.sparkle ?? 0 },
    uSparkleScale: { value: h.sparkleScale ?? 160 },
    uSparkleTilt: { value: h.sparkleTilt ?? 1.2 },
    uSparkleRough: { value: h.sparkleRough ?? 0.08 },
    uGlint: { value: h.glint ?? 6 },
    uHeight: { value: h.height || null },
    uHeightTexel: { value: new THREE.Vector2(1 / 1024, 1 / 1024) },
    uEmboss: { value: h.emboss ?? 3 },
    uLayer: { value: h.layer || null },
    uLayerMatte: { value: h.layerMatte ?? 1 },
    uFrames: { value: h.lenticular?.frames || null },
    uFrameGrid: { value: new THREE.Vector2(...(h.lenticular?.grid || [4, 4])) },
    uFrameCount: { value: h.lenticular?.count ?? 16 },
    uLensRect: { value: new THREE.Vector4(...(h.lenticular?.rect || [0, 0, 1, 1])) },
    uLensCount: { value: h.lenticular?.lensCount ?? 90 },
    uLensGain: { value: h.lenticular?.gain ?? 2.6 },
    uLensSpread: { value: h.lenticular?.spread ?? 0.12 },
    uLensRidge: { value: h.lenticular?.ridge ?? 0.9 },
    uCrinkle: { value: h.crinkle ?? 0 },
    uBrush: { value: h.brush ?? 0 },
  };
  if (h.height && h.height.image) {
    const img = h.height.image;
    uniforms.uHeightTexel.value.set(1 / (img.width || 1024), 1 / (img.height || 1024));
  }

  const defines = {
    HOLO_PATTERN: PATTERNS[h.pattern || 'linear'] ?? 1,
  };
  if (h.mask) defines.HOLO_MASK = '';
  if (h.sparkle) defines.HOLO_SPARKLE = '';
  if (h.height) defines.HOLO_HEIGHT = '';
  if (h.layer) defines.HOLO_LAYER = '';
  if (h.lenticular) defines.HOLO_LENT = '';
  if (h.crinkle) defines.HOLO_CRINKLE = '';
  if (h.brush) defines.HOLO_BRUSH = '';
  mat.defines = { ...(mat.defines || {}), ...defines };

  mat.userData.holo = uniforms;
  const key = 'holo:' + JSON.stringify(defines);
  mat.customProgramCacheKey = () => key;

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms, holoGlobals);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vHoloUv;')
      .replace('#include <uv_vertex>', VERT_UV);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\n' + PARS)
      .replace('#include <emissivemap_fragment>', FRAG_MAIN);
  };
  return mat;
}
