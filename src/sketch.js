// Hand-drawn "line boil" look:
//  - every vertex wobbles a bit, re-randomised a few times per second (like a new drawing frame)
//  - toon shading with a jittery shadow edge
//  - screen-space pencil hatching in the shadows (broken, wiggly strokes)
//  - ink outlines via inverted hull, with varying stroke thickness that also boils
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// Uniforms shared by every sketch material (same objects -> update once, applies everywhere)
export const shared = {
  uBoil: { value: 0 },                  // stepped "drawing frame" counter
  uResolution: { value: new THREE.Vector2(1, 1) },
  uPixelRatio: { value: 1 },
  uLightDir: { value: new THREE.Vector3(0.5, 0.85, 0.35).normalize() },
  uInk: { value: new THREE.Color('#2a2035') },
  uSkyHorizon: { value: new THREE.Color('#b4dcf5') }, // also the fog colour
  uSkyTop: { value: new THREE.Color('#3b8de0') },
  uFogNear: { value: 45 },
  uFogFar: { value: 120 },
};

export const BOIL_FPS = 8;

const noiseGLSL = /* glsl */ `
  uniform float uBoil;
  float hash31(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float vnoise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash31(i + vec3(0,0,0)), hash31(i + vec3(1,0,0)), f.x),
                   mix(hash31(i + vec3(0,1,0)), hash31(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash31(i + vec3(0,0,1)), hash31(i + vec3(1,0,1)), f.x),
                   mix(hash31(i + vec3(0,1,1)), hash31(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  vec3 wobbleOffset(vec3 p, float seed) {
    float s = uBoil * 7.31 + seed;
    return vec3(vnoise(p * 1.7 + s), vnoise(p * 1.7 + s + 19.1), vnoise(p * 1.7 + s + 41.7)) - 0.5;
  }
`;

const sketchVert = /* glsl */ `
  ${noiseGLSL}
  uniform float uWobble;
  uniform float uSeed;
  varying vec3 vN;
  varying vec3 vW;
  #ifdef USE_COLOR
    varying vec3 vColor;
  #endif
  #ifdef SKETCH_MAP
    uniform vec2 uMapOffset;
    varying vec2 vUv;
  #endif
  void main() {
    #ifdef SKETCH_MAP
      vUv = uv + uMapOffset;
    #endif
    vec3 p = position + wobbleOffset(position, uSeed) * uWobble;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vW = wp.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    #ifdef USE_COLOR
      vColor = color;
    #endif
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const sketchFrag = /* glsl */ `
  ${noiseGLSL}
  uniform vec3 uColor;
  uniform vec3 uShadeTint;
  uniform vec3 uLightDir;
  uniform vec3 uInk;
  uniform vec3 uSkyHorizon;
  uniform float uHatch;
  uniform float uEmissive;
  uniform float uSeed;
  uniform float uPixelRatio;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vN;
  varying vec3 vW;
  #ifdef USE_COLOR
    varying vec3 vColor;
  #endif

  // one family of hand-drawn hatch strokes at angle 'ang'
  float hatchLines(vec2 sc, float ang, float spacing, float s) {
    vec2 dir = vec2(cos(ang), sin(ang));
    float across = dot(sc, vec2(-dir.y, dir.x));
    float along = dot(sc, dir);
    across += (vnoise(vec3(sc * 0.025, s)) - 0.5) * 5.0;   // wiggle the stroke
    float id = floor(across / spacing);
    float f = abs(fract(across / spacing) - 0.5) * 2.0;     // 0 at stroke centre
    float width = 0.15 + 0.2 * vnoise(vec3(along * 0.04, id, s));
    float line = 1.0 - smoothstep(width, width + 0.2, f);
    // break strokes into dashes of random length
    float gap = smoothstep(0.3, 0.4, vnoise(vec3(along * 0.035 + id * 13.7, id * 3.1, s)));
    return line * gap;
  }

  #ifdef SKETCH_MAP
    uniform sampler2D uMap;
    varying vec2 vUv;
  #endif

  void main() {
    vec3 base = uColor;
    #ifdef USE_COLOR
      base *= vColor;
    #endif
    #ifdef SKETCH_MAP
      base *= texture2D(uMap, vUv).rgb; // e.g. a shirt print
    #endif
    vec3 n = normalize(vN);
    if (!gl_FrontFacing) n = -n;
    float ndl = dot(n, uLightDir) * 0.5 + 0.5;

    vec2 sc = gl_FragCoord.xy / uPixelRatio;
    float s = uBoil * 3.17 + uSeed;
    float jit = (vnoise(vec3(sc * 0.04, s)) - 0.5) * 0.12;

    // two-tone toon shading with a wobbly terminator
    float lit = smoothstep(0.47, 0.5, ndl + jit);
    vec3 col = mix(base * uShadeTint, base, lit);
    col = mix(col, base, uEmissive);

    // pencil hatching, cross-hatching in the darkest parts
    float dark1 = 1.0 - smoothstep(0.28, 0.52, ndl + jit);
    float dark2 = 1.0 - smoothstep(0.05, 0.28, ndl + jit);
    float ink = max(hatchLines(sc, 0.9, 6.0, s) * dark1, hatchLines(sc, -0.7, 5.0, s + 5.0) * dark2);
    col = mix(col, uInk, ink * 0.65 * uHatch * (1.0 - uEmissive));

    float d = distance(vW, cameraPosition);
    col = mix(col, uSkyHorizon, smoothstep(uFogNear, uFogFar, d));
    gl_FragColor = vec4(col, 1.0);
  }
`;

const outlineVert = /* glsl */ `
  ${noiseGLSL}
  uniform float uWobble;
  uniform float uSeed;
  uniform float uThickness;
  uniform vec2 uResolution;
  uniform float uPixelRatio;
  varying vec3 vW;
  void main() {
    // identical wobble to the fill mesh, so they stay glued together
    vec3 p = position + wobbleOffset(position, uSeed) * uWobble;
    vec4 wp = modelMatrix * vec4(p, 1.0);
    vW = wp.xyz;
    vec3 wn = normalize(mat3(modelMatrix) * normal);
    vec4 clip = projectionMatrix * viewMatrix * wp;
    vec4 cn = projectionMatrix * viewMatrix * vec4(wn, 0.0);
    // stroke thickness varies along the line and boils over time
    float w = uThickness * uPixelRatio * (0.35 + 1.3 * vnoise(position * 2.5 + uSeed + uBoil * 3.1));
    clip.xy += normalize(cn.xy + 1e-5) * w * 2.0 / uResolution * clip.w;
    gl_Position = clip;
  }
`;

const outlineFrag = /* glsl */ `
  uniform vec3 uInk;
  uniform vec3 uSkyHorizon;
  uniform float uFogNear;
  uniform float uFogFar;
  varying vec3 vW;
  void main() {
    float d = distance(vW, cameraPosition);
    gl_FragColor = vec4(mix(uInk, uSkyHorizon, smoothstep(uFogNear, uFogFar, d)), 1.0);
  }
`;

export function createSketchMaterial({
  color = '#ffffff',
  shadeTint = '#8a7fb0',
  wobble = 0.035,
  hatch = 1,
  emissive = 0,
  seed = Math.random() * 100,
  vertexColors = false,
  side = THREE.FrontSide,
  map = null,                 // optional texture, multiplied with color
  mapOffset = [0, 0],
} = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: sketchVert,
    fragmentShader: sketchFrag,
    vertexColors,
    side,
    defines: map ? { SKETCH_MAP: '' } : {},
    uniforms: {
      uMap: { value: map },
      uMapOffset: { value: new THREE.Vector2(...mapOffset) },
      ...shared,
      uColor: { value: new THREE.Color(color) },
      uShadeTint: { value: new THREE.Color(shadeTint) },
      uWobble: { value: wobble },
      uHatch: { value: hatch },
      uEmissive: { value: emissive },
      uSeed: { value: seed },
    },
  });
}

export function createOutlineMaterial({ thickness = 2, wobble = 0.035, seed = 0 } = {}) {
  return new THREE.ShaderMaterial({
    vertexShader: outlineVert,
    fragmentShader: outlineFrag,
    side: THREE.BackSide,
    uniforms: {
      ...shared,
      uThickness: { value: thickness },
      uWobble: { value: wobble },
      uSeed: { value: seed },
    },
  });
}

// Inverted-hull outlines need smooth (welded) normals, otherwise hard edges crack open.
const outlineGeoCache = new WeakMap();
function outlineGeometry(geo) {
  let og = outlineGeoCache.get(geo);
  if (!og) {
    og = new THREE.BufferGeometry();
    og.setAttribute('position', geo.getAttribute('position'));
    if (geo.index) og.setIndex(geo.index);
    og = mergeVertices(og, 1e-4);
    og.computeVertexNormals();
    outlineGeoCache.set(geo, og);
  }
  return og;
}

/**
 * Create a hand-drawn mesh (fill + ink outline).
 * opts: color, wobble, hatch, emissive, thickness, outline (bool), vertexColors, shadeTint
 */
export function sketchMesh(geometry, color, opts = {}) {
  const seed = Math.random() * 100;
  const wobble = opts.wobble ?? 0.035;
  const mesh = new THREE.Mesh(geometry, createSketchMaterial({ ...opts, color, seed, wobble }));
  if (opts.outline !== false) {
    const outline = new THREE.Mesh(
      outlineGeometry(geometry),
      createOutlineMaterial({ thickness: opts.thickness ?? 2.6, wobble, seed }),
    );
    outline.raycast = () => {};
    mesh.add(outline);
  }
  return mesh;
}
