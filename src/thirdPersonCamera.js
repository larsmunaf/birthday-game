import * as THREE from 'three';
import { heightAt } from './world.js';

export class ThirdPersonCamera {
  constructor(camera) {
    this.camera = camera;
    this.yaw = 0;
    this.pitch = 0.35;
    this.distance = 8;
    this.target = new THREE.Vector3();
    this.sensitivity = 0.0025;
    this.currentDistance = this.distance;
  }

  // distance along the ray (origin, unit dir) at which it first enters one of the spheres
  static firstHit(origin, dir, maxDist, blockers) {
    let best = maxDist;
    const oc = new THREE.Vector3();
    for (const { center, r } of blockers) {
      oc.subVectors(origin, center);
      const c = oc.lengthSq() - r * r;
      if (c < 0) continue; // already inside (standing under a tree): ignore this one
      const b = oc.dot(dir);
      const disc = b * b - c;
      if (disc < 0) continue;
      const t = -b - Math.sqrt(disc);
      if (t > 0 && t < best) best = t;
    }
    return best;
  }

  update(dt, input, playerPos, blockers = []) {
    this.yaw -= input.mouseDX * this.sensitivity;
    this.pitch += input.mouseDY * this.sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.2, 1.3);
    this.distance = THREE.MathUtils.clamp(this.distance + input.wheel * 0.8, 4, 16);

    // smooth follow of a point slightly above the player's head
    const goal = playerPos.clone().add(new THREE.Vector3(0, 1.6, 0));
    this.target.lerp(goal, 1 - Math.exp(-dt * 12));

    const cp = Math.cos(this.pitch);
    const dir = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp);

    // don't let trees / rocks / the gift box get between camera and player (or swallow the camera):
    // snap closer immediately, drift back out smoothly
    const free = Math.max(1.5, ThirdPersonCamera.firstHit(this.target, dir, this.distance + 0.5, blockers) - 0.5);
    const want = Math.min(this.distance, free);
    this.currentDistance = want < this.currentDistance ? want : this.currentDistance + (want - this.currentDistance) * (1 - Math.exp(-dt * 3));

    const pos = this.target.clone().addScaledVector(dir, this.currentDistance);
    const minY = heightAt(pos.x, pos.z) + 0.6;
    if (pos.y < minY) pos.y = minY;

    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }
}
