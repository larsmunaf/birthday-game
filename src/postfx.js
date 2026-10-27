// Full-screen pass: wobbles the whole image (line boil) and lays it onto paper.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { shared } from './sketch.js';

const PaperShader = {
  uniforms: {
    tDiffuse: { value: null },
    uBoil: shared.uBoil,
    uResolution: shared.uResolution,
    uPixelRatio: shared.uPixelRatio,
    uInk: shared.uInk,
    uSkyTop: shared.uSkyTop,
    uSkyHorizon: shared.uSkyHorizon,
    uInvProjection: { value: null },
    uCameraWorld: { value: null },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uBoil;
    uniform vec2 uResolution;
    uniform float uPixelRatio;
    uniform vec3 uInk;
    uniform vec3 uSkyTop;
    uniform vec3 uSkyHorizon;
    uniform mat4 uInvProjection;
    uniform mat4 uCameraWorld;
    varying vec2 vUv;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
    }

    void main() {
      vec2 css = uResolution / uPixelRatio;
      vec2 px = vUv * css;
      float s = uBoil * 1.37;
      // boil: distort the image slightly, new distortion every drawing frame
      vec2 off = vec2(vnoise(px * 0.02 + s), vnoise(px * 0.02 + s + 17.3)) - 0.5;
      // scene is rendered on a transparent background (premultiplied after MSAA resolve)
      vec4 scene = texture2D(tDiffuse, vUv + off * 3.0 / css);

      // sky: smooth gradient by view direction, deliberately NOT wobbled
      vec4 ray = uInvProjection * vec4(vUv * 2.0 - 1.0, 1.0, 1.0);
      vec3 dir = normalize((uCameraWorld * vec4(ray.xyz / ray.w, 0.0)).xyz);
      vec3 sky = mix(uSkyHorizon, uSkyTop, smoothstep(-0.02, 0.45, dir.y));

      // soft pencil-smudge vignette (on the drawing only, not on the sky)
      float vig = smoothstep(0.35, 0.95, length(vUv - 0.5) * 1.3);
      vec3 drawn = mix(scene.rgb, scene.rgb * uInk * 2.0, vig * 0.15);
      vec3 c = drawn + sky * (1.0 - scene.a);

      // static paper grain + fibres
      float grain = vnoise(px * 0.9) * 0.6 + vnoise(px * 0.12) * 0.4;
      float fibre = vnoise(vec2(px.x * 0.02, px.y * 0.6));
      c *= 0.9 + 0.08 * grain + 0.02 * fibre;
      gl_FragColor = vec4(c, 1.0);
    }
  `,
};

export function createComposer(renderer, scene, camera) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const paper = new ShaderPass(PaperShader);
  // ShaderPass clones its uniforms -> re-link the shared ones so they stay in sync
  for (const k of ['uBoil', 'uResolution', 'uPixelRatio', 'uInk', 'uSkyTop', 'uSkyHorizon']) paper.uniforms[k] = shared[k];
  // live references: these matrices are updated in place by three.js every frame
  paper.uniforms.uInvProjection.value = camera.projectionMatrixInverse;
  paper.uniforms.uCameraWorld.value = camera.matrixWorld;
  composer.addPass(paper);
  composer.addPass(new OutputPass());
  return composer;
}
