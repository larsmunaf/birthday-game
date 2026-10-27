import * as THREE from 'three';
import './style.css';
import { shared, BOIL_FPS } from './sketch.js';
import { createComposer } from './postfx.js';
import { World } from './world.js';
import { Player } from './player.js';
import { ThirdPersonCamera } from './thirdPersonCamera.js';
import { Input } from './input.js';

const canvas = document.querySelector('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
scene.background = shared.uPaper.value;
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
const composer = createComposer(renderer, scene, camera);

const input = new Input(canvas);
const world = new World(scene);
const player = new Player(scene);
const tpc = new ThirdPersonCamera(camera);

const $ = (s) => document.querySelector(s);
$('#start').addEventListener('click', () => {
  $('#intro').classList.add('hidden');
  input.enabled = true;
  canvas.requestPointerLock?.();
});

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.getDrawingBufferSize(shared.uResolution.value);
  shared.uPixelRatio.value = renderer.getPixelRatio();
}
addEventListener('resize', resize);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  // the "drawing" only changes BOIL_FPS times per second, like hand-drawn animation
  shared.uBoil.value = Math.floor(t * BOIL_FPS) % 64;

  if (input.enabled) {
    player.update(dt, input, tpc.yaw, world);
  } else {
    tpc.yaw += dt * 0.15; // slow orbit on the title screen
  }
  world.update(dt);
  tpc.update(dt, input, player.position);
  input.endFrame();

  composer.render();
});
