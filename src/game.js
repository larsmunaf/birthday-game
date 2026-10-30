// Gameplay: talk to the family, solve their puzzles, collect hearts (and hugs), open the gift.
import * as THREE from 'three';
import { NPC } from './npc.js';
import { GiftBox } from './giftbox.js';
import { PhoneQuest } from './phoneQuest.js';
import { CONFIG, FAMILY } from './config.js';

const TALK_DIST = 3.2;
const HUG_TIME = 2.8;

const $ = (s) => document.querySelector(s);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

// set an element's text, drawing every ♥ in red
const escape = (t) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
export function setText(el, text) {
  const html = escape(text).replace(/♥|❤️?/g, '<span class="heart">♥</span>');
  if (el.innerHTML !== html) el.innerHTML = html;
}

export class Game {
  constructor({ scene, world, player, input, camera, canvas }) {
    Object.assign(this, { scene, player, input, camera, canvas });
    this.state = 'explore'; // explore | dialog | hug | photo | won
    this.cameraOverride = null; // { position, target } while a quest takes over the camera
    this.snapshotCallback = null;
    this.time = 0;
    this.hearts = 0;

    this.npcs = FAMILY.map((def) => {
      const npc = new NPC(scene, def);
      world.addCollider(npc.position.x, npc.position.z, 0.7);
      npc.tag = this.makeLabel('nametag', def.name);
      npc.bubble = this.makeLabel('bubble', def.hugText);
      npc.showBubble = false; // once solved, the heart bubble stays for good
      return npc;
    });
    // puzzles that are more than a quiz get their own controller
    for (const npc of this.npcs) {
      if (npc.def.puzzle.type === 'phone') npc.quest = new PhoneQuest(this, npc);
    }

    this.box = new GiftBox(scene, FAMILY);
    world.addCollider(0, 0, this.box.radius);
    world.cameraBlockers.push({ center: new THREE.Vector3(0, this.box.root.position.y + 2.6, 0), r: 4.2 });

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
    setText(el, text);
    $('#labels').appendChild(el);
    return el;
  }

  placeLabel(el, worldPos, offsetY, visible, maxDist = 40) {
    const p = worldPos.clone().project(this.camera);
    const dist = worldPos.distanceTo(this.camera.position);
    if (!visible || p.z > 1 || dist > maxDist) { el.style.display = 'none'; return; }
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
    setText(el, text);
    el.classList.remove('show');
    void el.offsetWidth; // restart animation
    el.classList.add('show');
  }

  lockPointer() {
    try { this.canvas.requestPointerLock?.()?.catch?.(() => {}); } catch { /* needs a user gesture */ }
  }

  // ---------- dialog ----------

  openDialog(npc) {
    if (npc.quest) return npc.quest.talk();
    const { def } = npc;
    this.showCard(npc, {
      text: def.greeting,
      question: def.puzzle.question,
      buttons: def.puzzle.answers.map((answer, i) => ({ label: answer, prefix: `${'ABCD'[i]}:`, onClick: () => this.answer(i) })),
    });
  }

  // generic dialog card: some text, an optional question, and buttons [{ label, prefix?, onClick }]
  showCard(npc, { text = '', question = '', buttons = [] }) {
    this.state = 'dialog';
    this.talking = npc;
    this.player.frozen = true;
    this.input.enabled = false;
    document.exitPointerLock?.();

    this.ui.name.textContent = npc.def.name;
    setText(this.ui.text, text);
    setText(this.ui.question, question);
    this.ui.question.style.display = question ? '' : 'none';
    this.ui.feedback.textContent = '';
    this.ui.answers.innerHTML = '';
    this.ui.answers.classList.toggle('single', buttons.length === 1);
    this.cardButtons = buttons.map(({ label, prefix, onClick }) => {
      const btn = document.createElement('button');
      if (prefix) btn.innerHTML = `<b>${prefix}</b> `;
      btn.append(label);
      btn.addEventListener('click', onClick);
      this.ui.answers.appendChild(btn);
      return btn;
    });
    this.ui.dialog.classList.remove('hidden');
  }

  onDialogKey(e) {
    if (this.state !== 'dialog') return;
    if (e.code === 'Escape') return this.closeDialog();
    const i = ['KeyA', 'KeyB', 'KeyC', 'KeyD'].indexOf(e.code);
    const j = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
    const idx = i >= 0 ? i : j;
    if (idx >= 0 && idx < this.cardButtons.length) this.cardButtons[idx].click();
  }

  answer(i) {
    const npc = this.talking;
    if (i === npc.def.puzzle.correct) {
      this.closeDialog();
      this.startHug(npc);
    } else {
      setText(this.ui.feedback, pick(npc.def.wrong));
      const card = this.ui.dialog.firstElementChild;
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
    }
  }

  // hide the card without handing control back (e.g. when a quest takes over)
  hideDialog() {
    this.ui.dialog.classList.add('hidden');
  }

  closeDialog() {
    this.hideDialog();
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

    if (this.hugTime > 0.4) npc.showBubble = true;

    if (this.hugTime >= HUG_TIME) {
      npc.solved = true;
      npc.tag.classList.add('solved');
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
      setText($('#win-title'), CONFIG.gift.title);
      setText($('#win-text'), CONFIG.gift.text);
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
        prompt = near.quest?.promptText() ?? `E: Mit ${near.def.name} reden`;
        if (this.input.justPressed('KeyE')) this.openDialog(near);
      } else if (boxDist < this.box.radius + 2.5) {
        const missing = this.npcs.length - this.hearts;
        prompt = missing > 0 ? `🔒 Noch ${missing} ♥ fehlen` : 'E: Geschenk öffnen!';
        if (missing === 0 && this.input.justPressed('KeyE')) this.openGift();
      }
    }

    setText(this.ui.prompt, prompt);
    this.ui.prompt.style.opacity = prompt ? 1 : 0;

    for (const npc of this.npcs) {
      npc.quest?.update(dt);
      npc.update(dt, this.player);
    }
    this.box.update(dt, this.time, this.hearts === this.npcs.length);
  }

  // called after the camera moved
  updateLabels(dt) {
    const head = new THREE.Vector3();
    for (const npc of this.npcs) {
      npc.headPosition(head);
      this.placeLabel(npc.tag, head, 0, true);
      this.placeLabel(npc.bubble, head, 34, npc.showBubble); // sits above the name tag
      npc.quest?.updateLabels();
    }
  }

  // ---------- camera snapshot (for the photo quest) ----------

  requestSnapshot(callback) {
    this.snapshotCallback = callback;
  }

  // called right after rendering, while the frame is still in the canvas
  afterRender() {
    if (!this.snapshotCallback) return;
    const cb = this.snapshotCallback;
    this.snapshotCallback = null;
    cb(this.canvas.toDataURL('image/jpeg', 0.9));
  }
}
