import * as THREE from 'three';
import { createCharacter, animateCharacter, createShadow } from './character.js';
import { heightAt } from './world.js';

export class NPC {
  constructor(scene, def) {
    this.def = def;
    this.solved = false;
    this.pose = null; // set by the game (e.g. 'hug')
    this.forceFacing = null; // angle to look at instead of the player

    const [x, z] = def.position;
    this.position = new THREE.Vector3(x, heightAt(x, z), z);
    this.facing = Math.atan2(-x, -z); // look towards the gift box in the middle

    this.char = createCharacter(def.look);
    this.char.root.position.copy(this.position);
    const shadow = createShadow();
    shadow.position.y = 0.03;
    this.char.root.add(shadow);
    scene.add(this.char.root);
  }

  // world position of the top of the head (for name tags / speech bubbles)
  headPosition(target = new THREE.Vector3()) {
    return target.copy(this.position).setY(this.position.y + 2.7 * (this.def.look.scale ?? 1));
  }

  update(dt, player) {
    const dx = player.position.x - this.position.x;
    const dz = player.position.z - this.position.z;
    const dist = Math.hypot(dx, dz);

    // turn to face the player when they come close (or wherever a quest says, e.g. into a camera)
    const target = this.forceFacing ?? (dist < 10 ? Math.atan2(dx, dz) : null);
    if (target !== null) {
      const diff = Math.atan2(Math.sin(target - this.facing), Math.cos(target - this.facing));
      this.facing += diff * Math.min(1, dt * 5);
    }
    // wave at the player until the puzzle is solved
    const pose = this.pose ?? (!this.solved && dist < 12 ? 'wave' : 'walk');
    animateCharacter(this.char, dt, { pose });

    this.char.root.position.copy(this.position);
    this.char.root.rotation.y = this.facing;
  }
}
