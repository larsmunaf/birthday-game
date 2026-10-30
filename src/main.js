import * as THREE from "three";
import "./style.css";
import { shared, BOIL_FPS } from "./sketch.js";
import { createComposer } from "./postfx.js";
import { World } from "./world.js";
import { Player } from "./player.js";
import { ThirdPersonCamera } from "./thirdPersonCamera.js";
import { Input } from "./input.js";
import { Game } from "./game.js";
import { CONFIG, FAMILY } from "./config.js";

const canvas = document.querySelector("#game");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
renderer.setClearColor(0x000000, 0); // transparent = sky, filled in by the paper pass
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 400);
const composer = createComposer(renderer, scene, camera);

const input = new Input(canvas);
// keep trees and rocks away from the gift box and the family
const reserved = [
  { x: 0, z: 0, r: 7 },
  ...FAMILY.map((f) => ({ x: f.position[0], z: f.position[1], r: 3 })),
];
const world = new World(scene, reserved);
const player = new Player(scene);
const tpc = new ThirdPersonCamera(camera);
const game = new Game({ scene, world, player, input, camera, canvas });

if (import.meta.env.DEV) Object.assign(window, { game, player, tpc }); // handy for debugging in the console

const $ = (s) => document.querySelector(s);
$("#title").textContent =
  `Alles Gute zum Geburtstag, lieber ${CONFIG.brother}!`;
$("#start").addEventListener("click", () => {
  $("#intro").classList.add("hidden");
  $("#hud").classList.remove("hidden");
  $("#labels").classList.remove("hidden");
  input.enabled = true;
  started = true;
  canvas.requestPointerLock?.();
});
let started = false;
$("#restart").addEventListener("click", () => location.reload());

function resize() {
  const w = innerWidth,
    h = innerHeight;
  renderer.setSize(w, h, false);
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.getDrawingBufferSize(shared.uResolution.value);
  shared.uPixelRatio.value = renderer.getPixelRatio();
}
addEventListener("resize", resize);
resize();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  // the "drawing" only changes BOIL_FPS times per second, like hand-drawn animation
  shared.uBoil.value = Math.floor(t * BOIL_FPS) % 64;

  if (started) {
    game.update(dt);
    player.update(dt, input, tpc.yaw, world);
  } else {
    tpc.yaw += dt * 0.15; // slow orbit on the title screen
  }
  world.update(dt);
  tpc.update(dt, input, player.position);
  game.updateLabels(dt);
  input.endFrame();

  composer.render();
});
