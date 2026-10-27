import * as THREE from 'three';
import { sketchMesh } from './sketch.js';

export const WORLD_RADIUS = 70;

// deterministic random so the world looks the same every time
export function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const smoothstep = (a, b, x) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

export function heightAt(x, z) {
  const d = Math.hypot(x, z);
  let h =
    Math.sin(x * 0.08) * Math.cos(z * 0.07) * 2.2 +
    Math.sin(x * 0.023 + 1.3) * Math.sin(z * 0.031) * 4 +
    Math.sin((x + z) * 0.15) * 0.4;
  h *= smoothstep(6, 20, d);            // flat clearing in the middle (for the chest)
  h += Math.max(0, d - WORLD_RADIUS + 8) ** 1.6 * 0.25; // hills around the edge
  return h;
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = []; // { x, z, r }
    this.rand = mulberry32(19);
    this.clouds = [];

    this.buildTerrain();
    this.scatter();
    this.buildClouds();
  }

  buildTerrain() {
    const size = 260;
    const geo = new THREE.PlaneGeometry(size, size, 160, 160);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const colors = [];
    const grass = new THREE.Color('#8fcf6a');
    const dry = new THREE.Color('#c9d67a');
    const dirt = new THREE.Color('#c79a63');
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h);
      const n = Math.sin(x * 0.3) * Math.sin(z * 0.27) * 0.5 + 0.5;
      c.copy(grass).lerp(dry, n * 0.6);
      if (h > 9) c.lerp(dirt, smoothstep(9, 16, h));
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.computeVertexNormals();
    const terrain = sketchMesh(geo, '#ffffff', { outline: false, wobble: 0, vertexColors: true, hatch: 0.8 });
    this.scene.add(terrain);
  }

  addCollider(x, z, r) { this.colliders.push({ x, z, r }); }

  freeSpot(minDist = 10, maxDist = WORLD_RADIUS - 6, clearance = 2.5) {
    for (let tries = 0; tries < 200; tries++) {
      const a = this.rand() * Math.PI * 2;
      const d = minDist + this.rand() * (maxDist - minDist);
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      if (this.colliders.every((c) => Math.hypot(c.x - x, c.z - z) > c.r + clearance)) return { x, z };
    }
    return { x: 0, z: minDist };
  }

  scatter() {
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.45, 2.4, 7);
    const leafGeo = new THREE.IcosahedronGeometry(1.6, 1);
    const rockGeo = new THREE.DodecahedronGeometry(1, 0);
    const leafColors = ['#5fb85a', '#7cc95b', '#4ea86b', '#9bd45c'];

    for (let i = 0; i < 70; i++) {
      const { x, z } = this.freeSpot(12, WORLD_RADIUS - 4, 2);
      const tree = new THREE.Group();
      const s = 0.8 + this.rand() * 0.7;
      const trunk = sketchMesh(trunkGeo, '#9a6a45');
      trunk.position.y = 1.2;
      tree.add(trunk);
      const blobs = 2 + Math.floor(this.rand() * 2);
      for (let b = 0; b < blobs; b++) {
        const leaf = sketchMesh(leafGeo, leafColors[Math.floor(this.rand() * leafColors.length)], { wobble: 0.06, thickness: 2.4 });
        leaf.position.set((this.rand() - 0.5) * 1.2, 2.8 + b * 1.1, (this.rand() - 0.5) * 1.2);
        leaf.scale.setScalar(1 - b * 0.22);
        tree.add(leaf);
      }
      tree.scale.setScalar(s);
      tree.rotation.y = this.rand() * Math.PI * 2;
      tree.position.set(x, heightAt(x, z) - 0.1, z);
      this.scene.add(tree);
      this.addCollider(x, z, 0.5 * s);
    }

    for (let i = 0; i < 30; i++) {
      const { x, z } = this.freeSpot(10, WORLD_RADIUS - 4, 1.5);
      const s = 0.5 + this.rand() * 1.1;
      const rock = sketchMesh(rockGeo, '#b8b0c4', { wobble: 0.04 });
      rock.scale.set(s * 1.2, s * 0.8, s);
      rock.rotation.set(this.rand(), this.rand() * 6, this.rand());
      rock.position.set(x, heightAt(x, z) + s * 0.3, z);
      this.scene.add(rock);
      this.addCollider(x, z, s * 1.0);
    }
  }

  buildClouds() {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    for (let i = 0; i < 14; i++) {
      const cloud = new THREE.Group();
      const puffs = 3 + Math.floor(this.rand() * 3);
      for (let p = 0; p < puffs; p++) {
        const puff = sketchMesh(geo, '#ffffff', { wobble: 0.08, hatch: 0.4, shadeTint: '#c9dcf0', thickness: 2.5 });
        const s = 1.8 + this.rand() * 1.6;
        puff.scale.set(s * 1.3, s, s);
        puff.position.set(p * 2.4 - puffs, this.rand() * 0.8, (this.rand() - 0.5) * 1.5);
        cloud.add(puff);
      }
      const a = this.rand() * Math.PI * 2, d = 20 + this.rand() * 60;
      cloud.position.set(Math.cos(a) * d, 28 + this.rand() * 12, Math.sin(a) * d);
      cloud.userData.speed = 0.4 + this.rand() * 0.6;
      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  // push a circle (player) out of all obstacles + keep inside the world
  resolveCollisions(pos, radius) {
    for (const c of this.colliders) {
      const dx = pos.x - c.x, dz = pos.z - c.z;
      const d = Math.hypot(dx, dz), min = c.r + radius;
      if (d < min && d > 1e-5) {
        pos.x = c.x + (dx / d) * min;
        pos.z = c.z + (dz / d) * min;
      }
    }
    const d = Math.hypot(pos.x, pos.z), max = WORLD_RADIUS;
    if (d > max) { pos.x *= max / d; pos.z *= max / d; }
  }

  update(dt) {
    for (const c of this.clouds) {
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 90) c.position.x = -90;
    }
  }
}
