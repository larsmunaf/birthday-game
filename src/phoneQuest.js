// Mama's quest: find her lost (ringing) Fairphone, bring it back, then take a photo together
// with its famously bad camera: press the shutter at the moment the picture is sharp.
import * as THREE from 'three';
import { sketchMesh } from './sketch.js';
import { heightAt } from './world.js';
import { setText } from './game.js';

const PICKUP_DIST = 1.8;
const RING_PERIOD = 2.6; // seconds between rings
const RING_LENGTH = 1.2;
const SHARP_BLUR = 1.6;  // px of blur that still counts as a sharp photo

const $ = (s) => document.querySelector(s);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function createPhone() {
  const phone = new THREE.Group();
  const body = sketchMesh(new THREE.BoxGeometry(0.34, 0.66, 0.07), '#2c2b31', { thickness: 1.6, wobble: 0.01 });
  phone.add(body);
  const screen = sketchMesh(new THREE.BoxGeometry(0.28, 0.54, 0.01), '#86e0c8', { outline: false, emissive: 0.8, hatch: 0, wobble: 0.01 });
  screen.position.z = 0.04;
  phone.add(screen);
  return phone;
}

export class PhoneQuest {
  constructor(game, npc) {
    this.game = game;
    this.npc = npc;
    this.cfg = npc.def.puzzle;
    this.stage = 'lost'; // lost -> searching -> carrying -> returned -> photo -> done
    this.time = 0;

    // the phone lies flat in the grass, screen up
    const [x, z] = this.cfg.phonePosition;
    this.phone = createPhone();
    this.phone.position.set(x, heightAt(x, z) + 0.06, z);
    this.phone.rotation.set(-Math.PI / 2, 0, 0.4);
    this.phone.scale.setScalar(1.3);
    game.scene.add(this.phone);
    this.ringLabel = game.makeLabel('bubble ring', '♪ Rrring! ♪');

    // photo UI
    this.ui = {
      photo: $('#photo'), meter: $('#focus-bar'), flash: $('#flash'),
      polaroid: $('#polaroid'), img: $('#polaroid-img'), thumb: $('#polaroid-thumb'),
      caption: $('#polaroid-caption'), button: $('#polaroid-btn'), card: $('#polaroid .polaroid-card'),
    };
    this.ui.photo.addEventListener('click', () => this.shoot());
    this.ui.button.addEventListener('click', () => this.afterPolaroid());
    addEventListener('keydown', (e) => {
      if (this.stage !== 'photo') return;
      if (e.code !== 'Space' && e.code !== 'Enter') return;
      e.preventDefault();
      if (this.polaroidOpen) this.afterPolaroid();
      else this.shoot();
    });
  }

  get ringing() {
    return this.stage === 'searching' && this.time % RING_PERIOD < RING_LENGTH;
  }

  promptText() {
    return this.stage === 'carrying' ? `E: ${this.npc.def.name} das Handy geben` : null;
  }

  // ---------- talking to Mama ----------

  talk() {
    const g = this.game, c = this.cfg;
    if (this.stage === 'lost') {
      g.showCard(this.npc, {
        text: c.intro,
        buttons: [{ label: c.introButton, onClick: () => {
          this.stage = 'searching';
          this.time = 0;
          g.closeDialog();
          g.toast(c.searchToast);
        } }],
      });
    } else if (this.stage === 'searching') {
      g.showCard(this.npc, { text: c.waiting, buttons: [{ label: c.waitingButton, onClick: () => g.closeDialog() }] });
    } else if (this.stage === 'carrying' || this.stage === 'returned') {
      if (this.stage === 'carrying') {
        // she takes the phone back
        this.stage = 'returned';
        this.npc.char.armR.add(this.phone);
        this.holdInHand();
      }
      g.showCard(this.npc, {
        text: c.returned,
        buttons: [{ label: c.photoButton, onClick: () => { g.hideDialog(); this.startPhoto(); } }],
      });
    }
  }

  holdInHand() {
    this.phone.position.set(0, -0.68, 0.1);
    this.phone.rotation.set(0, 0, 0);
    this.phone.scale.setScalar(0.6);
  }

  // ---------- per frame ----------

  update(dt) {
    this.time += dt;
    const p = this.game.player.position;

    if (this.stage === 'searching') {
      // vibrate while ringing
      this.phone.rotation.z = 0.4 + (this.ringing ? Math.sin(this.time * 60) * 0.12 : 0);
      if (Math.hypot(this.phone.position.x - p.x, this.phone.position.z - p.z) < PICKUP_DIST) {
        this.stage = 'carrying';
        this.game.player.char.armR.add(this.phone);
        this.holdInHand();
        this.game.toast(this.cfg.foundToast);
      }
    }
    if (this.stage === 'photo') this.updatePhoto(dt);
  }

  updateLabels() {
    const pos = this.phone.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.6, 0));
    this.game.placeLabel(this.ringLabel, pos, 0, this.ringing, 90);
  }

  // ---------- photo mini-game ----------

  startPhoto() {
    const g = this.game, npc = this.npc;
    this.stage = 'photo';
    g.state = 'photo';
    this.shots = 0;
    this.photoTime = 0;
    this.polaroidOpen = false;

    // Mama faces the middle of the map; the brother stands on her left, the camera in front of them
    const f = Math.atan2(-npc.position.x, -npc.position.z);
    const fwd = new THREE.Vector3(Math.sin(f), 0, Math.cos(f));
    const left = new THREE.Vector3(-Math.cos(f), 0, Math.sin(f));
    const pl = g.player;
    pl.position.copy(npc.position).addScaledVector(left, 1.05);
    pl.facing = f;
    pl.frozen = true;
    pl.pose = 'cheese';
    npc.forceFacing = f;
    npc.facing = f;
    npc.pose = 'selfie';

    const mid = npc.position.clone().addScaledVector(left, 0.5);
    g.cameraOverride = {
      position: mid.clone().addScaledVector(fwd, 3.2).setY(npc.position.y + 2.0),
      target: mid.clone().setY(npc.position.y + 1.45),
    };

    $('#hud').classList.add('hidden');
    $('#labels').classList.add('hidden');
    this.ui.photo.classList.remove('hidden');
  }

  updatePhoto(dt) {
    if (this.polaroidOpen) return;
    this.photoTime += dt;
    // the Fairphone autofocus "hunts": sharpness swings back and forth, with a little jitter
    const t = this.photoTime;
    const focus = Math.min(1, Math.max(0, (Math.sin(t * 2.3) + 1) / 2 + Math.sin(t * 17) * 0.04));
    this.blur = focus * 9;
    this.game.canvas.style.filter = `blur(${this.blur.toFixed(2)}px)`;
    const sharp = this.blur < this.sharpLimit;
    this.ui.meter.style.width = `${(1 - focus) * 100}%`;
    this.ui.meter.classList.toggle('sharp', sharp);
  }

  // a little more forgiving after every failed attempt
  get sharpLimit() { return SHARP_BLUR + this.shots * 0.6; }

  shoot() {
    if (this.stage !== 'photo' || this.polaroidOpen) return;
    const blur = this.blur;
    const good = blur < this.sharpLimit;
    this.shots++;
    this.polaroidOpen = true;
    this.ui.flash.classList.remove('flash');
    void this.ui.flash.offsetWidth;
    this.ui.flash.classList.add('flash');
    this.game.requestSnapshot((url) => this.showPolaroid(url, good, blur));
  }

  showPolaroid(url, good, blur) {
    const c = this.cfg;
    this.good = good;
    this.ui.img.src = url;
    // a bad shot: blurry, washed out, and of course a thumb in the corner
    this.ui.img.style.filter = good ? 'none' : `blur(${Math.max(3, blur).toFixed(1)}px) brightness(1.35) saturate(0.6) contrast(0.85)`;
    this.ui.thumb.classList.toggle('hidden', good);
    this.ui.card.classList.toggle('bad', !good);
    setText(this.ui.caption, good ? c.goodPhoto : pick(c.badPhoto));
    setText(this.ui.button, good ? c.goodPhotoButton : c.badPhotoButton);
    setTimeout(() => this.ui.polaroid.classList.remove('hidden'), 350); // after the flash
  }

  afterPolaroid() {
    if (!this.polaroidOpen) return;
    this.ui.polaroid.classList.add('hidden');
    if (!this.good) {
      this.polaroidOpen = false; // try again
      return;
    }
    this.endPhoto();
  }

  endPhoto() {
    const g = this.game, npc = this.npc;
    this.stage = 'done';
    this.polaroidOpen = false;
    this.ui.photo.classList.add('hidden');
    g.canvas.style.filter = '';
    $('#hud').classList.remove('hidden');
    $('#labels').classList.remove('hidden');
    g.cameraOverride = null;
    npc.forceFacing = null;
    npc.pose = null;
    g.player.pose = null;
    g.input.enabled = true;
    g.lockPointer();
    g.startHug(npc);
  }
}
