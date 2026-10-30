import { Container, Sprite, TilingSprite } from 'pixi.js';
import type { GameTextures } from './textures';
import { createGameTextures } from './textures';

/** §3: table worlds share one light model; generated once at boot, zero per-frame cost. */
export interface TableSurface {
  root: Container;
  layout(width: number, height: number): void;
}

let textures: GameTextures | null = null;

function wood(): GameTextures {
  if (textures === null) textures = createGameTextures();
  return textures;
}

export function createTableSurface(): TableSurface {
  const assets = wood();
  const root = new Container();
  const woodTile = new TilingSprite({ texture: assets.wood, width: 16, height: 16 });
  const grain = new TilingSprite({ texture: assets.grain, width: 16, height: 16 });
  grain.alpha = 0.05; // §3: full-screen grain, opacity 0.05
  const glow = new Sprite({ texture: assets.glow, blendMode: 'add' });
  const vignette = new Sprite({ texture: assets.vignette });
  root.addChild(woodTile, glow, vignette, grain);

  return {
    root,
    layout(width, height) {
      woodTile.width = width;
      woodTile.height = height;
      grain.width = width;
      grain.height = height;
      const spill = Math.max(width, height) * 0.35;
      glow.width = width + spill * 2;
      glow.height = height + spill * 2;
      glow.position.set(-spill + width * 0.06, -spill + height * 0.03);
      vignette.width = width;
      vignette.height = height;
    },
  };
}

export { wood as sharedTextures };
