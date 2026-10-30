// Shared cartoon figure used for the player and the family NPCs.
import * as THREE from 'three';
import { sketchMesh, shared } from './sketch.js';

const torsoGeo = new THREE.CapsuleGeometry(0.42, 0.5, 8, 16);
{
  // v proportional to height (CapsuleGeometry spaces v per ring, which stretches prints),
  // so 1 texture pixel is equally tall and wide on the shirt
  const pos = torsoGeo.attributes.position, uv = torsoGeo.attributes.uv;
  const half = 0.25 + 0.42;
  for (let i = 0; i < uv.count; i++) uv.setY(i, (pos.getY(i) + half) / (2 * half));
}
const headGeo = new THREE.SphereGeometry(0.42, 16, 12);
const limbGeo = new THREE.CapsuleGeometry(0.13, 0.4, 3, 8);
const eyeGeo = new THREE.SphereGeometry(0.06, 8, 6);
const hairCapGeo = new THREE.SphereGeometry(0.45, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5);
const longHairGeo = new THREE.CapsuleGeometry(0.34, 0.45, 4, 10);
const beardGeo = new THREE.SphereGeometry(0.3, 12, 8);
// thin shell over the lower front of the head: cheeks + chin (front is +z, i.e. phi = PI/2)
const stubbleGeo = new THREE.SphereGeometry(0.445, 16, 8, Math.PI / 2 - 1.1, 2.2, Math.PI * 0.6, Math.PI * 0.32);
const coneHatGeo = new THREE.ConeGeometry(0.36, 0.5, 8);
const capGeo = new THREE.SphereGeometry(0.46, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.42);
const brimGeo = new THREE.BoxGeometry(0.5, 0.06, 0.4);
const collarGeo = new THREE.TorusGeometry(0.24, 0.07, 6, 16);
const shadowGeo = new THREE.CircleGeometry(0.6, 20).rotateX(-Math.PI / 2);

export function createShadow() {
  return new THREE.Mesh(
    shadowGeo,
    new THREE.MeshBasicMaterial({ color: shared.uInk.value, transparent: true, opacity: 0.25, depthWrite: false }),
  );
}

/**
 * look: { shirt, pants, skin, hat: 'cone' | 'cap' | 'none', hatColor, hair, longHair, beard, stubble, scale,
 *         print (texture on the shirt front), sleeves (colour -> long sleeves), pantsWidth, collar }
 */
export function createCharacter(look = {}) {
  const o = {
    shirt: '#ff8a5c', pants: '#5d7bd6', skin: '#ffd9b3',
    hat: 'none', hatColor: '#6b4bc2', hair: null, longHair: false, beard: null, stubble: null, scale: 1,
    print: null, sleeves: null, pantsWidth: 1, collar: false,
    ...look,
  };
  const root = new THREE.Group();
  const body = new THREE.Group(); // bobs / squashes, root only moves
  root.add(body);

  // mapOffset 0.5: centre the print on the front of the capsule
  const torso = sketchMesh(torsoGeo, o.shirt, o.print ? { map: o.print, mapOffset: [0.5, 0] } : {});
  torso.position.y = 1.05;
  body.add(torso);

  if (o.collar) {
    const collar = sketchMesh(collarGeo, o.shirt, { thickness: 1.4 });
    collar.rotation.x = Math.PI / 2;
    collar.position.y = 1.58;
    body.add(collar);
  }

  const head = sketchMesh(headGeo, o.skin);
  head.position.y = 1.85;
  body.add(head);

  const eyeMat = new THREE.MeshBasicMaterial({ color: shared.uInk.value });
  for (const s of [-1, 1]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.scale.y = 1.6;
    eye.position.set(0.15 * s, 0.05, 0.38);
    head.add(eye);
  }

  if (o.hair) {
    const cap = sketchMesh(hairCapGeo, o.hair, { side: THREE.DoubleSide, thickness: 1.8 });
    cap.rotation.x = -0.45;
    cap.position.y = 0.04;
    head.add(cap);
    if (o.longHair) {
      const long = sketchMesh(longHairGeo, o.hair, { thickness: 1.8 });
      long.position.set(0, -0.3, -0.22);
      head.add(long);
    }
  }
  if (o.beard) {
    const beard = sketchMesh(beardGeo, o.beard, { thickness: 1.6 });
    beard.scale.set(1, 0.75, 0.6);
    beard.position.set(0, -0.24, 0.24);
    head.add(beard);
  }
  if (o.stubble) {
    // a light beard: no outline, just a tinted patch
    const stubble = sketchMesh(stubbleGeo, o.stubble, { outline: false, hatch: 1.4 });
    head.add(stubble);
  }
  if (o.hat === 'cone') {
    const hat = sketchMesh(coneHatGeo, o.hatColor);
    hat.position.set(0, 0.42, -0.05);
    hat.rotation.x = -0.25;
    head.add(hat);
  } else if (o.hat === 'cap') {
    const cap = sketchMesh(capGeo, o.hatColor, { side: THREE.DoubleSide });
    cap.position.y = 0.06;
    head.add(cap);
    const brim = sketchMesh(brimGeo, o.hatColor, { thickness: 1.4 });
    brim.position.set(0, 0.22, 0.42);
    head.add(brim);
  }

  const makeLimb = (color, x, y, width = 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const limb = sketchMesh(limbGeo, color, { thickness: 1.6 });
    limb.position.y = -0.3;
    limb.scale.set(width, 1, width);
    pivot.add(limb);
    body.add(pivot);
    return pivot;
  };

  root.scale.setScalar(o.scale);
  return {
    root, body, head,
    legL: makeLimb(o.pants, -0.2 * Math.max(1, o.pantsWidth * 0.9), 0.6, o.pantsWidth),
    legR: makeLimb(o.pants, 0.2 * Math.max(1, o.pantsWidth * 0.9), 0.6, o.pantsWidth),
    armL: makeLimb(o.sleeves ?? o.skin, -0.52, 1.35),
    armR: makeLimb(o.sleeves ?? o.skin, 0.52, 1.35),
    walkPhase: 0, speed01: 0, squash: 0, time: 0,
  };
}

/**
 * pose: 'walk' (default, uses targetSpeed), 'jump', 'hug', 'wave'
 */
export function animateCharacter(c, dt, { targetSpeed = 0, pose = 'walk' } = {}) {
  c.time += dt;
  c.speed01 += (targetSpeed - c.speed01) * Math.min(1, dt * 10);
  if (c.speed01 > 0.05) c.walkPhase += dt * (6 + c.speed01 * 10);
  const swing = Math.sin(c.walkPhase) * 0.9 * Math.min(1, c.speed01 * 2);

  c.legL.rotation.set(swing, 0, 0);
  c.legR.rotation.set(-swing, 0, 0);
  c.armL.rotation.set(-swing * 0.8, 0, 0);
  c.armR.rotation.set(swing * 0.8, 0, 0);
  c.body.rotation.z = 0;

  if (pose === 'jump') {
    c.legL.rotation.x = 0.5;
    c.legR.rotation.x = -0.3;
    c.armL.rotation.z = -2.4;
    c.armR.rotation.z = 2.4;
  } else if (pose === 'hug') {
    // arms forward and wrapped inwards, swaying happily
    c.armL.rotation.set(-1.3, 0, 0.45);
    c.armR.rotation.set(-1.3, 0, -0.45);
    c.body.rotation.z = Math.sin(c.time * 5) * 0.1;
  } else if (pose === 'wave') {
    c.armR.rotation.z = 2.5 + Math.sin(c.time * 9) * 0.35;
  }

  const bob = pose === 'walk' ? Math.abs(Math.sin(c.walkPhase)) * 0.12 * c.speed01 : 0;
  const breathe = Math.sin(c.time * 2.2) * 0.015;
  c.squash = Math.max(0, c.squash - dt);
  const sq = c.squash * 1.2;
  c.body.position.y = bob;
  c.body.scale.set(1 + sq * 0.5, 1 - sq + breathe, 1 + sq * 0.5);
  c.head.rotation.z = Math.sin(c.walkPhase * 0.5) * 0.08 * c.speed01;
}
