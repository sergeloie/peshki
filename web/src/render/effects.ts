import { Container, Graphics, Sprite } from 'pixi.js';
import type { Texture } from 'pixi.js';

/** §8 budget: ≤ 2 "expensive" effects at once (particles), ≤ 40 particles alive. */
const PARTICLE_CAP = 40;
const EXPENSIVE_CAP = 2;
const DUST_COUNT = 20; // §8: desktop-only dust motes

interface Particle {
  sprite: Sprite;
  vx: number;
  vy: number;
  drag: number;
  gravity: number;
  spin: number;
  life: number;
  age: number;
}

interface Flash {
  node: Graphics | Sprite;
  life: number;
  age: number;
  grow: number;
}

export interface EffectsLayer {
  root: Container;
  /** Ticker upkeep; not on the hot path for sprites — sprite.x/y writes only. */
  tick(elapsedMs: number): void;
  /** Table shake: caller reads shakeOffset() each frame and applies it to the board. */
  shake(distancePx?: number): void;
  shakeOffset(): { x: number; y: number };
  /** Square particle burst (§8: one kill per turn may spend a slot). */
  burst(x: number, y: number, color: number, count: number): void;
  /** §5 kill flash: expanding brass ring on the cell, 300 ms. */
  ringFlash(x: number, y: number, scale: number): void;
  /** §8 home entry: porcelain warmth that dims out, 260 ms. */
  glowFlash(x: number, y: number, size: number): void;
  /** Desktop-only dust motes in the key light; skipped on touch devices. */
  startDust(width: number, height: number): void;
  /** Expensive slot gate: false when the budget is spent (rare, but the cap is normative). */
  claimExpensive(): boolean;
  releaseExpensive(): void;
  budget(): { particles: number; expensive: number; dust: number };
}

export function createEffectsLayer(textures: { glow: Texture; spark: Texture }): EffectsLayer {
  const root = new Container();
  root.label = 'effects';

  const particles: Particle[] = [];

  const flashes: Flash[] = [];

  const dust: Array<{ sprite: Sprite; vx: number; vy: number; phase: number }> = [];

  let expensiveSlots = 0;

  /* ---- shake: decaying offset the game screen adds to the board position ---- */

  let shakeAge = 1;
  const SHAKE_MS = 240;
  let shakeDistance = 3;

  function shake(distancePx = 3): void {
    shakeDistance = distancePx;
    shakeAge = 0;
  }

  function shakeOffset(): { x: number; y: number } {
    if (shakeAge >= 1) return { x: 0, y: 0 };
    // key light stays from top-left: decay is uniform, direction random ±
    const decay = (1 - shakeAge) ** 2 * shakeDistance;
    const t = shakeAge * 55;
    return { x: Math.sin(t) * decay, y: Math.cos(t * 0.8) * decay * 0.6 };
  }

  /* ---- particles ---- */

  function spawn(x: number, y: number, color: number, strength: number): void {
    const sprite = new Sprite({ texture: textures.spark });
    sprite.anchor.set(0.5);
    sprite.tint = color;
    sprite.position.set(x, y);
    sprite.width = 5 * strength;
    sprite.height = 5 * strength;
    root.addChild(sprite);
    const angle = Math.random() * Math.PI * 2;
    const speed = (40 + Math.random() * 90) * strength;
    particles.push({
      sprite,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 60 * strength,
      drag: 2.2,
      gravity: 260,
      spin: (Math.random() - 0.5) * 6,
      life: 450 + Math.random() * 250,
      age: 0,
    });
  }

  function burst(x: number, y: number, color: number, count: number): void {
    // brass and ivory mix reads as wood chips + porcelain dust (§8)
    const allowed = Math.min(count, PARTICLE_CAP - particles.length);
    for (let index = 0; index < allowed; index += 1) {
      spawn(x, y, index % 3 === 0 ? 0xf3d77b : color, 0.7 + Math.random() * 0.6);
    }
  }

  /* ---- flashes ---- */

  function ringFlash(x: number, y: number, scale: number): void {
    const ring = new Graphics();
    ring.circle(0, 0, 30 * scale).stroke({ width: 5 * scale, color: 0xf3d77b, alpha: 0.95 });
    ring.position.set(x, y);
    root.addChild(ring);
    flashes.push({ node: ring, life: 300, age: 0, grow: 1.35 });
  }

  function glowFlash(x: number, y: number, size: number): void {
    const sprite = new Sprite({ texture: textures.glow, blendMode: 'add' });
    sprite.anchor.set(0.5);
    sprite.width = size;
    sprite.height = size;
    sprite.position.set(x, y);
    root.addChild(sprite);
    flashes.push({ node: sprite, life: 260, age: 0, grow: 0.3 });
  }

  /* ---- desktop-only dust ---- */

  function startDust(width: number, height: number): void {
    if (dust.length > 0 || typeof window === 'undefined') return;
    // §8: dust motes live only where a pointer is fine — phones bake the glare
    const fine = window.matchMedia?.('(pointer: fine)').matches ?? false;
    if (!fine) return;
    for (let index = 0; index < DUST_COUNT; index += 1) {
      const sprite = new Sprite({ texture: textures.glow, blendMode: 'add' });
      sprite.anchor.set(0.5);
      sprite.width = 10 + Math.random() * 14;
      sprite.height = sprite.width;
      sprite.position.set(Math.random() * width, Math.random() * height);
      sprite.alpha = 0.06 + Math.random() * 0.1;
      root.addChild(sprite);
      dust.push({ sprite, vx: 4 + Math.random() * 10, vy: -3 - Math.random() * 6, phase: Math.random() * 7 });
    }
  }

  /* ---- tick ---- */

  function tick(elapsedMs: number): void {
    const dt = Math.min(elapsedMs, 50) / 1000;

    if (shakeAge < 1) shakeAge = Math.min(1, shakeAge + elapsedMs / SHAKE_MS);

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const p = particles[index];
      p.age += elapsedMs;
      const fade = 1 - p.age / p.life;
      if (fade <= 0) {
        p.sprite.destroy();
        particles.splice(index, 1);
        continue;
      }
      const drag = Math.exp(-p.drag * dt);
      p.vx *= drag;
      p.vy = p.vy * drag + p.gravity * dt;
      p.sprite.x += p.vx * dt;
      p.sprite.y += p.vy * dt;
      p.sprite.rotation += p.spin * dt;
      p.sprite.alpha = Math.min(0.85, fade * 1.4);
      p.sprite.scale.set(Math.max(0.35, fade));
    }

    for (let index = flashes.length - 1; index >= 0; index -= 1) {
      const f = flashes[index];
      f.age += elapsedMs;
      const t = f.age / f.life;
      if (t >= 1) {
        f.node.destroy();
        flashes.splice(index, 1);
        continue;
      }
      const eased = 1 - (1 - t) ** 3;
      f.node.scale.set(1 + (f.grow - 1) * eased);
      f.node.alpha = 1 - eased;
    }

    for (const mote of dust) {
      mote.phase += dt;
      const s = mote.sprite;
      s.x += (mote.vx + Math.sin(mote.phase) * 5) * dt;
      s.y += mote.vy * dt;
      if (s.y < -20) {
        s.y = window.innerHeight + 20;
        s.x = Math.random() * window.innerWidth;
      }
      if (s.x > window.innerWidth + 20) s.x = -20;
    }
  }

  return {
    root,
    tick,
    shake,
    shakeOffset,
    burst,
    ringFlash,
    glowFlash,
    startDust,
    claimExpensive() {
      if (expensiveSlots >= EXPENSIVE_CAP) return false;
      expensiveSlots += 1;
      return true;
    },
    releaseExpensive() {
      expensiveSlots = Math.max(0, expensiveSlots - 1);
    },
    budget() {
      return { particles: particles.length, expensive: expensiveSlots, dust: dust.length };
    },
  };
}
