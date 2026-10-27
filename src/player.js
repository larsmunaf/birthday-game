import * as THREE from 'three';
import { createCharacter, animateCharacter, createShadow } from './character.js';
import { heightAt } from './world.js';

const GRAVITY = -32;
const JUMP_SPEED = 12;
const WALK_SPEED = 7;
const RUN_SPEED = 12;
const RADIUS = 0.5;

export class Player {
  constructor(scene) {
    this.position = new THREE.Vector3(0, 0, 13);
    this.velocityY = 0;
    this.onGround = false;
    this.facing = Math.PI;
    this.frozen = false; // true while talking / hugging: no input movement
    this.pose = null;    // overrides the automatic pose (e.g. 'hug')

    // the birthday boy, with a party hat
    this.char = createCharacter({ hat: 'cone', hatColor: '#6b4bc2', hair: '#5a3a22' });
    this.root = this.char.root;
    scene.add(this.root);

    this.shadow = createShadow();
    scene.add(this.shadow);
  }

  update(dt, input, camYaw, world) {
    const { x, y } = this.frozen ? { x: 0, y: 0 } : input.axis();
    const run = input.down('ShiftLeft', 'ShiftRight');
    const moving = x !== 0 || y !== 0;

    // camera-relative movement
    const fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw);
    const rightX = Math.cos(camYaw), rightZ = -Math.sin(camYaw);
    let mx = fwdX * y + rightX * x;
    let mz = fwdZ * y + rightZ * x;
    const len = Math.hypot(mx, mz) || 1;
    mx /= len; mz /= len;

    const speed = moving ? (run ? RUN_SPEED : WALK_SPEED) : 0;
    this.position.x += mx * speed * dt;
    this.position.z += mz * speed * dt;
    world.resolveCollisions(this.position, RADIUS);

    // jump + gravity
    const ground = heightAt(this.position.x, this.position.z);
    if (!this.frozen && this.onGround && input.justPressed('Space')) {
      this.velocityY = JUMP_SPEED;
      this.onGround = false;
    }
    this.velocityY += GRAVITY * dt;
    this.position.y += this.velocityY * dt;
    if (this.position.y <= ground) {
      if (!this.onGround && this.velocityY < -8) this.char.squash = 0.25; // landing squash
      this.position.y = ground;
      this.velocityY = 0;
      this.onGround = true;
    } else if (this.position.y > ground + 0.15) {
      this.onGround = false;
    }

    // face movement direction (smoothly)
    if (moving) this.turnTowards(Math.atan2(mx, mz), dt);

    const pose = this.pose ?? (this.onGround ? 'walk' : 'jump');
    animateCharacter(this.char, dt, { targetSpeed: moving ? speed / RUN_SPEED : 0, pose });

    this.root.position.copy(this.position);
    this.root.rotation.y = this.facing;
    this.shadow.position.set(this.position.x, ground + 0.03, this.position.z);
    const air = Math.min(1, (this.position.y - ground) / 4);
    this.shadow.scale.setScalar(1 - air * 0.5);
  }

  turnTowards(angle, dt) {
    const diff = Math.atan2(Math.sin(angle - this.facing), Math.cos(angle - this.facing));
    this.facing += diff * Math.min(1, dt * 12);
  }
}
