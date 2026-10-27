// Gameplay: talk to the family, solve their puzzles, collect hearts (and hugs), open the gift.
import * as THREE from 'three';
import { NPC } from './npc.js';
import { GiftBox } from './giftbox.js';
import { CONFIG, FAMILY } from './config.js';

const TALK_DIST = 3.2;
const HUG_TIME = 2.8;
const BUBBLE_TIME = 6;

const $ = (s) => document.querySelector(s);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Game {
  constructor({ scene, world, player, input, camera, canvas }) {
    Object.assign(this, { player, input, camera, canvas });
    this.state = 'explore'; // explore | dialog | hug | won
    this.time = 0;
    this.hearts = 0;

    this.npcs = FAMILY.map((def) => {
      const npc = new NPC(scene, def);
      world.addCollider(npc.position.x, npc.position.z, 0.7);
      npc.tag = this.makeLabel('nametag', def.name);
      npc.bubble = this.makeLabel('bubble', def.hugText);
      npc.bubbleTimer = 0;
      return npc;
    });

    this.box = new GiftBox(scene, FAMILY);
    world.addCollider(0, 0, this.box.radius);

    this.ui = {
      hearts: $('#hearts'), prompt: $('#prompt'), toast: $('#toast'),
      dialog: $('#dialog'), name: $('#dialog-name'), text: $('#dialog-text'),
      question: $('#dialog-question'), answers: $('#dialog-answers'), feedback: $('#dialog-feedback'),
    };
    $('#dialog-close').addEventListener('click', () => this.closeDialog());
    this.ui.dialog.firstElementChild.addEventListener('animationend', (e) => e.target.classList.remove('shake'));
    addEventListener('keydown', (e) => this.onDialogKey(e));
    this.renderHearts();
  }

  // ---------- HTML helpers ----------

  makeLabel(cls, text) {
    const el = document.createElement('div');
    el.className = `label ${cls}`;
    el.textContent = text;
    $('#labels').appendChild(el);
    return el;
  }

  placeLabel(el, worldPos, offsetY, visible) {
    const p = worldPos.clone().project(this.camera);
    const dist = worldPos.distanceTo(this.camera.position);
    if (!visible || p.z > 1 || dist > 40) { el.style.display = 'none'; return; }
    el.style.display = '';
    const x = (p.x * 0.5 + 0.5) * innerWidth;
    const y = (-p.y * 0.5 + 0.5) * innerHeight - offsetY;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
  }

  renderHearts() {
    this.ui.hearts.innerHTML = this.npcs
      .map((_, i) => `<span class="${i < this.hearts ? 'full' : ''}">${i < this.hearts ? '♥' : '♡'}</span>`)
      .join('');
  }

  toast(text) {
    const el = this.ui.toast;
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth; // restart animation
    el.classList.add('show');
  }

  lockPointer() {
    try { this.canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* needs a user gesture */ }
  }

  // ---------- dialog ----------

  openDialog(npc) {
    this.state = 'dialog';
    this.talking = npc;
    this.player.frozen = true;
    this.input.enabled = false;
    document.exitPointerLock?.();

    const { def } = npc;
    this.ui.name.textContent = def.name;
    this.ui.text.textContent = def.greeting;
    this.ui.question.textContent = def.puzzle.question;
    this.ui.feedback.textContent = '';
    this.ui.answers.innerHTML = '';
    def.puzzle.answers.forEach((answer, i) => {
      const btn = document.createElement('button');
      btn.innerHTML = `<b>${'ABCD'[i]}:</b> `;
      btn.append(answer);
      btn.addEventListener('click', () => this.answer(i));
      this.ui.answers.appendChild(btn);
    });
    this.ui.dialog.classList.remove('hidden');
  }

  onDialogKey(e) {
    if (this.state !== 'dialog') return;
    if (e.code === 'Escape') return this.closeDialog();
    const i = ['KeyA', 'KeyB', 'KeyC', 'KeyD'].indexOf(e.code);
    const j = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    const idx = i >= 0 ? i : j;
    if (idx >= 0 && idx < this.talking.def.puzzle.answers.length) this.answer(idx);
  }

  answer(i) {
    const npc = this.talking;
    if (i === npc.def.puzzle.correct) {
      this.closeDialog();
      this.startHug(npc);
    } else {
      this.ui.feedback.textContent = pick(npc.def.wrong);
      const card = this.ui.dialog.firstElementChild;
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
    }
  }

  closeDialog() {
    this.ui.dialog.classList.add('hidden');
    this.state = 'explore';
    this.player.frozen = false;
    this.input.enabled = true;
    this.lockPointer();
  }

  // ---------- hug ----------

  startHug(npc) {
    this.state = 'hug';
    this.hugging = npc;
    this.hugTime = 0;
    this.player.frozen = true;
    this.player.pose = 'hug';
    npc.pose = 'hug';
  }

  updateHug(dt) {
    const npc = this.hugging;
    const p = this.player.position;
    this.hugTime += dt;

    // walk into the hug: stand right in front of the family member, facing them
    const dx = p.x - npc.position.x, dz = p.z - npc.position.z;
    const d = Math.hypot(dx, dz) || 1;
    const k = Math.min(1, dt * 6);
    p.x += (npc.position.x + (dx / d) * 1.2 - p.x) * k;
    p.z += (npc.position.z + (dz / d) * 1.2 - p.z) * k;
    this.player.turnTowards(Math.atan2(-dx, -dz), dt);

    if (this.hugTime > 0.4 && npc.bubbleTimer <= 0) npc.bubbleTimer = BUBBLE_TIME;

    if (this.hugTime >= HUG_TIME) {
      npc.solved = true;
      npc.pose = null;
      this.player.pose = null;
      this.player.frozen = false;
      this.box.fillSlot(this.hearts);
      this.hearts++;
      this.renderHearts();
      this.toast(this.hearts === this.npcs.length
        ? 'Alle Herzen gesammelt! Öffne das Geschenk in der Mitte!'
        : `Herz erhalten! (${this.hearts}/${this.npcs.length})`);
      this.state = 'explore';
    }
  }

  // ---------- gift ----------

  openGift() {
    this.state = 'won';
    this.player.frozen = true;
    this.player.pose = 'jump'; // arms up, yay!
    this.box.open();
    setTimeout(() => {
      document.exitPointerLock?.();
      this.input.enabled = false;
      $('#win-title').textContent = CONFIG.gift.title;
      $('#win-text').textContent = CONFIG.gift.text;
      $('#win').classList.remove('hidden');
    }, 2500);
  }

  // ---------- per frame ----------

  update(dt) {
    this.time += dt;
    const p = this.player.position;
    let prompt = '';

    if (this.state === 'hug') this.updateHug(dt);

    if (this.state === 'explore') {
      const near = this.npcs.find((n) => !n.solved && Math.hypot(n.position.x - p.x, n.position.z - p.z) < TALK_DIST);
      const boxDist = Math.hypot(p.x, p.z);
      if (near) {
        prompt = `E: Mit ${near.def.name} reden`;
        if (this.input.justPressed('KeyE')) this.openDialog(near);
      } else if (boxDist < this.box.radius + 2.5) {
        const missing = this.npcs.length - this.hearts;
        prompt = missing > 0 ? `🔒 Noch ${missing} ♥ fehlen` : 'E: Geschenk öffnen!';
        if (missing === 0 && this.input.justPressed('KeyE')) this.openGift();
      }
    }

    this.ui.prompt.textContent = prompt;
    this.ui.prompt.style.opacity = prompt ? 1 : 0;

    for (const npc of this.npcs) npc.update(dt, this.player);
    this.box.update(dt, this.time, this.hearts === this.npcs.length);
  }

  // called after the camera moved
  updateLabels(dt) {
    const head = new THREE.Vector3();
    for (const npc of this.npcs) {
      npc.headPosition(head);
      npc.bubbleTimer = Math.max(0, npc.bubbleTimer - dt);
      const showBubble = npc.bubbleTimer > 0;
      this.placeLabel(npc.tag, head, 0, !showBubble);
      this.placeLabel(npc.bubble, head, 0, showBubble);
    }
  }
}
