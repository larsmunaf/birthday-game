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
  }

  update(dt, input, playerPos) {
    this.yaw -= input.mouseDX * this.sensitivity;
    this.pitch += input.mouseDY * this.sensitivity;
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.2, 1.3);
    this.distance = THREE.MathUtils.clamp(this.distance + input.wheel * 0.8, 4, 16);

    // smooth follow of a point slightly above the player's head
    const goal = playerPos.clone().add(new THREE.Vector3(0, 1.6, 0));
    this.target.lerp(goal, 1 - Math.exp(-dt * 12));

    const cp = Math.cos(this.pitch);
    const offset = new THREE.Vector3(Math.sin(this.yaw) * cp, Math.sin(this.pitch), Math.cos(this.yaw) * cp)
      .multiplyScalar(this.distance);
    const pos = this.target.clone().add(offset);
    const minY = heightAt(pos.x, pos.z) + 0.6;
    if (pos.y < minY) pos.y = minY;

    this.camera.position.copy(pos);
    this.camera.lookAt(this.target);
  }
}
