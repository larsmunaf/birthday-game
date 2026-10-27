// The huge gift box in the middle of the map. One heart slot per family member on the front.
import * as THREE from 'three';
import { sketchMesh } from './sketch.js';
import { heightAt } from './world.js';

const SIZE = 6;

export function heartGeometry() {
  const s = new THREE.Shape();
  s.moveTo(0, -0.5);
  s.bezierCurveTo(-0.1, -0.35, -0.6, -0.1, -0.6, 0.2);
  s.bezierCurveTo(-0.6, 0.5, -0.25, 0.65, 0, 0.38);
  s.bezierCurveTo(0.25, 0.65, 0.6, 0.5, 0.6, 0.2);
  s.bezierCurveTo(0.6, -0.1, 0.1, -0.35, 0, -0.5);
  const geo = new THREE.ExtrudeGeometry(s, { depth: 0.15, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 1, curveSegments: 8 });
  geo.center();
  return geo;
}

export class GiftBox {
  constructor(scene, slots) {
    this.scene = scene;
    this.opened = false;
    this.openTime = 0;
    this.confetti = [];

    const paper = '#e8536f', ribbon = '#ffd24a';
    this.root = new THREE.Group();
    this.root.position.set(0, heightAt(0, 0), 0);
    scene.add(this.root);

    const box = sketchMesh(new THREE.BoxGeometry(SIZE, SIZE * 0.8, SIZE), paper, { wobble: 0.06, thickness: 3 });
    box.position.y = SIZE * 0.4;
    this.root.add(box);
    for (const rot of [0, Math.PI / 2]) {
      const band = sketchMesh(new THREE.BoxGeometry(0.8, SIZE * 0.8 + 0.04, SIZE + 0.08), ribbon, { thickness: 2 });
      band.position.y = SIZE * 0.4;
      band.rotation.y = rot;
      this.root.add(band);
    }

    // lid (separate, so it can fly off)
    this.lid = new THREE.Group();
    this.lid.position.y = SIZE * 0.8;
    this.root.add(this.lid);
    const lidBox = sketchMesh(new THREE.BoxGeometry(SIZE + 0.4, 1, SIZE + 0.4), paper, { wobble: 0.06, thickness: 3 });
    lidBox.position.y = 0.5;
    this.lid.add(lidBox);
    for (const rot of [0, Math.PI / 2]) {
      const band = sketchMesh(new THREE.BoxGeometry(0.8, 1.04, SIZE + 0.48), ribbon, { thickness: 2 });
      band.position.y = 0.5;
      band.rotation.y = rot;
      this.lid.add(band);
    }
    const loopGeo = new THREE.TorusGeometry(0.9, 0.3, 8, 16);
    for (const s of [-1, 1]) {
      const loop = sketchMesh(loopGeo, ribbon, { thickness: 2 });
      loop.position.set(s * 0.85, 1.6, 0);
      loop.rotation.set(0, Math.PI / 2, s * 0.5);
      loop.scale.set(1, 1, 0.8);
      this.lid.add(loop);
    }

    // heart slots on the front, grey until filled
    this.slots = [];
    const hg = heartGeometry();
    slots.forEach((_, i) => {
      const heart = sketchMesh(hg, '#b9b0c2', { thickness: 2 });
      heart.position.set((i - (slots.length - 1) / 2) * 1.7, SIZE * 0.55, SIZE / 2 + 0.12);
      heart.scale.setScalar(1.1);
      this.root.add(heart);
      this.slots.push(heart);
    });
  }

  get radius() { return SIZE * 0.7; }

  fillSlot(i) {
    const u = this.slots[i].material.uniforms;
    u.uColor.value.set('#ff3d5e');
    u.uEmissive.value = 0.5;
    this.slots[i].userData.pop = 0.6;
  }

  open() {
    this.opened = true;
    const colors = ['#ff5d73', '#ffd24a', '#5cc2ff', '#7ee07a', '#c47bff', '#ff9a3d'];
    const geo = new THREE.BoxGeometry(0.3, 0.3, 0.06);
    for (let i = 0; i < 120; i++) {
      const c = sketchMesh(geo, colors[i % colors.length], { outline: false, hatch: 0, wobble: 0.02 });
      c.position.set((Math.random() - 0.5) * SIZE, this.root.position.y + SIZE * 0.8, (Math.random() - 0.5) * SIZE);
      c.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 10, 12 + Math.random() * 10, (Math.random() - 0.5) * 10);
      c.userData.spin = new THREE.Vector3(Math.random() * 8, Math.random() * 8, Math.random() * 8);
      this.scene.add(c);
      this.confetti.push(c);
    }
  }

  update(dt, time, unlocked) {
    for (const h of this.slots) {
      h.userData.pop = Math.max(0, (h.userData.pop ?? 0) - dt);
      h.scale.setScalar(1.1 + h.userData.pop * 0.8);
    }

    if (!this.opened) {
      // impatient wiggle once all hearts are in
      this.root.rotation.z = unlocked ? Math.sin(time * 12) * 0.02 * (Math.sin(time * 2) > 0 ? 1 : 0) : 0;
      return;
    }
    this.root.rotation.z = 0;
    this.openTime += dt;
    // lid flies up and tumbles away
    this.lid.position.y = SIZE * 0.8 + this.openTime * 9 - this.openTime * this.openTime * 2;
    this.lid.position.x = this.openTime * 3;
    this.lid.rotation.z = -this.openTime * 1.5;
    this.lid.visible = this.openTime < 6;

    for (const c of this.confetti) {
      const v = c.userData.vel;
      v.y -= 9 * dt;
      v.multiplyScalar(1 - dt * 0.8); // air drag, so it flutters
      c.position.addScaledVector(v, dt);
      c.rotation.x += c.userData.spin.x * dt;
      c.rotation.y += c.userData.spin.y * dt;
      const ground = heightAt(c.position.x, c.position.z) + 0.05;
      if (c.position.y < ground) { c.position.y = ground; v.set(0, 0, 0); c.userData.spin.set(0, 0, 0); }
    }
  }
}
