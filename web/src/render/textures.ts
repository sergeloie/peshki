import { Texture } from 'pixi.js';

export interface GameTextures {
  wood: Texture;
  vignette: Texture;
  grain: Texture;
  shadow: Texture;
  cellShadow: Texture;
  medallion: Texture;
  glow: Texture;
}

/**
 * All surfaces from docs/art-direction.md §2–§3, generated once at boot on
 * 2D canvases (procedural, zero downloaded bytes — not per frame).
 */
export function createGameTextures(): GameTextures {
  return {
    wood: Texture.from(woodCanvas()),
    vignette: Texture.from(vignetteCanvas()),
    grain: Texture.from(grainCanvas()),
    shadow: Texture.from(shadowCanvas(160, 120)),
    cellShadow: Texture.from(cellShadowCanvas()),
    medallion: Texture.from(medallionCanvas()),
    glow: Texture.from(glowCanvas()),
  };
}

function canvas(size: number, square: false): HTMLCanvasElement;
function canvas(width: number, square: number): HTMLCanvasElement;
function canvas(width: number): HTMLCanvasElement;
function canvas(...args: unknown[]): HTMLCanvasElement {
  const width = args[0] as number;
  const height = args.length > 1 ? (args[1] as number) : width;
  const el = document.createElement('canvas');
  el.width = width;
  el.height = height;
  return el;
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** Table wood tile: horizontal fibre bands (#2E1710 base, #4A2517 light, #1A0C07 deep). */
function woodCanvas(): HTMLCanvasElement {
  const size = 512;
  const el = canvas(size);
  const ctx = el.getContext('2d')!;
  const rng = random(0x503018);
  ctx.fillStyle = '#331a10'; // between table base #2E1710 and light #4A2517; bands swing around it
  ctx.fillRect(0, 0, size, size);

  const base = [0x2e, 0x17, 0x10] as const;
  const light = [0x4a, 0x25, 0x17] as const;
  const deep = [0x1a, 0x0c, 0x07] as const;
  const mix = (a: readonly number[], b: readonly number[], t: number): string =>
    `rgb(${a.map((c, i) => Math.round(c + (b[i] - c) * t)).join(',')})`;

  for (let y = 0; y < size; y += 2) {
    const wave = Math.sin((y / size) * Math.PI * 2 * 7) * 0.5 + 0.5;
    const bandNoise = wave * 0.55 + rng() * 0.45;
    const tone = bandNoise > 0.72 ? deep : base;
    const toward = bandNoise > 0.62 ? light : deep;
    ctx.fillStyle = mix(tone, toward, Math.min(1, Math.abs(bandNoise - 0.62) * 2.4));
    ctx.fillRect(0, y, size, 2);
  }

  // fibres: short horizontal breaks, deepest value
  for (let i = 0; i < 900; i += 1) {
    const x = rng() * size;
    const y = rng() * size;
    const length = 8 + rng() * 70;
    ctx.fillStyle = `rgba(26,12,7,${0.06 + rng() * 0.14})`;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(length), 1);
  }
  // a few warm fibre highlights along the light bands
  for (let i = 0; i < 260; i += 1) {
    const x = rng() * size;
    const y = rng() * size;
    const length = 6 + rng() * 40;
    ctx.fillStyle = `rgba(255,190,130,${0.02 + rng() * 0.05})`;
    ctx.fillRect(Math.round(x), Math.round(y), Math.round(length), 1);
  }
  return el;
}

/** §2: radial darkening from centre to corners, #6B3A20→#4A2A16 feel reused for the table edge. */
function vignetteCanvas(): HTMLCanvasElement {
  const el = canvas(512);
  const ctx = el.getContext('2d')!;
  const gradient = ctx.createRadialGradient(256, 256, 120, 256, 256, 380);
  gradient.addColorStop(0, 'rgba(26,12,7,0)');
  gradient.addColorStop(0.6, 'rgba(26,12,7,0.22)');
  gradient.addColorStop(1, 'rgba(26,12,7,0.62)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  return el;
}

/** §3: full-screen grain overlay, 2 px cells, drawn at alpha by the sprite. */
function grainCanvas(): HTMLCanvasElement {
  const el = canvas(128);
  const ctx = el.getContext('2d')!;
  const rng = random(0x2a140d);
  for (let y = 0; y < 128; y += 2) {
    for (let x = 0; x < 128; x += 2) {
      const value = rng();
      if (value > 0.82) ctx.fillStyle = `rgba(255,246,225,${(value - 0.82) * 1.4})`;
      else if (value < 0.16) ctx.fillStyle = `rgba(10,4,2,${(0.16 - value) * 1.6})`;
      else continue;
      ctx.fillRect(x, y, 2, 2);
    }
  }
  return el;
}

/** §3 contact shadow: pre-blurred ellipse sprite, offset (3,5) applied by the caller. */
function shadowCanvas(width: number, height: number): HTMLCanvasElement {
  const el = canvas(width, height);
  const ctx = el.getContext('2d')!;
  const radius = width / 2;
  const gradient = ctx.createRadialGradient(width / 2, height / 2, radius * 0.15, width / 2, height / 2, radius);
  gradient.addColorStop(0, 'rgba(26,12,7,0.78)');
  gradient.addColorStop(0.45, 'rgba(26,12,7,0.42)');
  gradient.addColorStop(0.75, 'rgba(26,12,7,0.14)');
  gradient.addColorStop(1, 'rgba(26,12,7,0)');
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(1, (height / width) * 2);
  ctx.fillStyle = gradient;
  ctx.fillRect(-radius, -radius, width, width);
  ctx.restore();
  return el;
}

/** §3 cell shadow: offset (4,6), blur 10, alpha 0.25 — a three-pass soft rounded square, no filter. */
function cellShadowCanvas(): HTMLCanvasElement {
  const size = 200;
  const el = canvas(size);
  const ctx = el.getContext('2d')!;
  const rect = (inset: number, width: number, alpha: number): void => {
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.roundRect(inset, inset, size - inset * 2, size - inset * 2, 14);
    ctx.strokeStyle = `rgba(26,12,7,${alpha})`;
    ctx.fillStyle = `rgba(26,12,7,${alpha})`;
    ctx.fill();
    ctx.stroke();
  };
  rect(34, 26, 0.05);
  rect(22, 18, 0.07);
  rect(12, 10, 0.11);
  ctx.beginPath();
  ctx.roundRect(20, 20, size - 40, size - 40, 12);
  ctx.fillStyle = 'rgba(26,12,7,0.12)';
  ctx.fill();
  return el;
}

/** §4 medallion: brass Ø 220 gradient disc with engraved monogram «П» and a static narrow glare. */
function medallionCanvas(): HTMLCanvasElement {
  const el = canvas(256);
  const ctx = el.getContext('2d')!;
  const c = 128;

  const disc = ctx.createRadialGradient(c - 44, c - 52, 18, c, c, 126);
  disc.addColorStop(0, '#f3d77b');
  disc.addColorStop(0.32, '#c9a227');
  disc.addColorStop(0.86, '#8a6c15');
  disc.addColorStop(1, '#6e5410');
  ctx.beginPath();
  ctx.arc(c, c, 124, 0, Math.PI * 2);
  ctx.fillStyle = disc;
  ctx.fill();

  // dark bevel bottom-right, light bevel top-left (§3 key light direction)
  ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(30,20,4,0.55)';
  ctx.beginPath();
  ctx.arc(c, c, 121, Math.PI * 0.1, Math.PI * 0.85);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(243,215,123,0.65)';
  ctx.beginPath();
  ctx.arc(c, c, 121, Math.PI * 0.95, Math.PI * 1.75);
  ctx.stroke();

  // narrow brass specular
  const glare = ctx.createRadialGradient(c - 48, c - 58, 2, c - 48, c - 58, 30);
  glare.addColorStop(0, 'rgba(255,244,200,0.85)');
  glare.addColorStop(1, 'rgba(255,244,200,0)');
  ctx.fillStyle = glare;
  ctx.beginPath();
  ctx.arc(c - 48, c - 58, 30, 0, Math.PI * 2);
  ctx.fill();

  // engraved monogram: light pass under, dark pass above
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '700 132px "PT Sans", serif';
  ctx.fillStyle = 'rgba(255,240,190,0.22)';
  ctx.fillText('П', c + 2, c + 14);
  ctx.fillStyle = 'rgba(26,12,7,0.5)';
  ctx.fillText('П', c, c + 12);
  return el;
}

/** Warm key light from top-left (§3, L = normalize(-0.55,-1.0,0.7)), drawn additively. */
function glowCanvas(): HTMLCanvasElement {
  const el = canvas(512);
  const ctx = el.getContext('2d')!;
  const gradient = ctx.createRadialGradient(150, 130, 20, 150, 130, 460);
  gradient.addColorStop(0, 'rgba(255,196,140,0.16)');
  gradient.addColorStop(0.4, 'rgba(255,190,130,0.06)');
  gradient.addColorStop(1, 'rgba(255,190,130,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  return el;
}
