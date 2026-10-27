import * as THREE from 'three';
import { sketchMesh, shared } from './sketch.js';
import { heightAt } from './world.js';

const GRAVITY = -32;
const JUMP_SPEED = 12;
const WALK_SPEED = 7;
const RUN_SPEED = 12;
const RADIUS = 0.5;

export class Player {
  constructor(scene) {
    this.position = new THREE.Vector3(0, 0, 10);
    this.velocityY = 0;
    this.onGround = false;
    this.facing = Math.PI;
    this.walkPhase = 0;
    this.speed01 = 0;

    this.root = new THREE.Group();
    this.body = new THREE.Group(); // bobs/squashes, root only moves
    this.root.add(this.body);
    this.buildModel();
    scene.add(this.root);

    // hand-drawn blob shadow
    this.shadow = new THREE.Mesh(
      new THREE.CircleGeometry(0.6, 20).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: shared.uInk.value, transparent: true, opacity: 0.25, depthWrite: false }),
    );
    scene.add(this.shadow);
  }

  buildModel() {
    const shirt = '#ff8a5c';
    const skin = '#ffd9b3';
    const pants = '#5d7bd6';

    const torso = sketchMesh(new THREE.CapsuleGeometry(0.42, 0.5, 4, 10), shirt);
    torso.position.y = 1.05;
    this.body.add(torso);

    const head = sketchMesh(new THREE.SphereGeometry(0.42, 16, 12), skin);
    head.position.y = 1.85;
    this.body.add(head);
    this.head = head;

    // hair tuft / hat
    const hat = sketchMesh(new THREE.ConeGeometry(0.36, 0.5, 8), '#6b4bc2');
    hat.position.set(0, 0.42, -0.05);
    hat.rotation.x = -0.25;
    head.add(hat);

    const eyeGeo = new THREE.SphereGeometry(0.06, 8, 6);
    const eyeMat = new THREE.MeshBasicMaterial({ color: shared.uInk.value });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.scale.y = 1.6;
      eye.position.set(0.15 * s, 0.05, 0.38);
      head.add(eye);
    }

    const limbGeo = new THREE.CapsuleGeometry(0.13, 0.4, 3, 8);
    const makeLimb = (color, x, y) => {
      const pivot = new THREE.Group();
      pivot.position.set(x, y, 0);
      const limb = sketchMesh(limbGeo, color, { thickness: 1.6 });
      limb.position.y = -0.3;
      pivot.add(limb);
      this.body.add(pivot);
      return pivot;
    };
    this.legL = makeLimb(pants, -0.2, 0.6);
    this.legR = makeLimb(pants, 0.2, 0.6);
    this.armL = makeLimb(skin, -0.52, 1.35);
    this.armR = makeLimb(skin, 0.52, 1.35);
  }

  update(dt, input, camYaw, world) {
    const { x, y } = input.axis();
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
    if (this.onGround && input.justPressed('Space')) {
      this.velocityY = JUMP_SPEED;
      this.onGround = false;
    }
    this.velocityY += GRAVITY * dt;
    this.position.y += this.velocityY * dt;
    if (this.position.y <= ground) {
      if (!this.onGround && this.velocityY < -8) this.squash = 0.25; // landing squash
      this.position.y = ground;
      this.velocityY = 0;
      this.onGround = true;
    } else if (this.position.y > ground + 0.15) {
      this.onGround = false;
    }

    // face movement direction (smoothly)
    if (moving) {
      const target = Math.atan2(mx, mz);
      let diff = target - this.facing;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      this.facing += diff * Math.min(1, dt * 12);
    }

    this.animate(dt, moving ? speed / RUN_SPEED : 0);

    this.root.position.copy(this.position);
    this.root.rotation.y = this.facing;
    this.shadow.position.set(this.position.x, ground + 0.03, this.position.z);
    const air = Math.min(1, (this.position.y - ground) / 4);
    this.shadow.scale.setScalar(1 - air * 0.5);
  }

  animate(dt, targetSpeed) {
    this.speed01 += (targetSpeed - this.speed01) * Math.min(1, dt * 10);
    this.walkPhase += dt * (6 + this.speed01 * 10) * (this.speed01 > 0.05 ? 1 : 0);
    const swing = Math.sin(this.walkPhase) * 0.9 * Math.min(1, this.speed01 * 2);

    if (this.onGround) {
      this.legL.rotation.x = swing;
      this.legR.rotation.x = -swing;
      this.armL.rotation.x = -swing * 0.8;
      this.armR.rotation.x = swing * 0.8;
      this.armL.rotation.z = this.armR.rotation.z = 0;
    } else {
      // arms up while jumping
      this.legL.rotation.x = 0.5;
      this.legR.rotation.x = -0.3;
      this.armL.rotation.z = -2.4;
      this.armR.rotation.z = 2.4;
    }

    const bob = this.onGround ? Math.abs(Math.sin(this.walkPhase)) * 0.12 * this.speed01 : 0;
    this.squash = Math.max(0, (this.squash || 0) - dt);
    const sq = this.squash * 1.2;
    this.body.position.y = bob;
    this.body.scale.set(1 + sq * 0.5, 1 - sq, 1 + sq * 0.5);
    this.head.rotation.z = Math.sin(this.walkPhase * 0.5) * 0.08 * this.speed01;
  }
}
