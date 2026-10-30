import type { Platform } from '../platform/ysdk';

export interface Flow {
  menuInteractive(): void;
}

export function createFlow(platform: Pick<Platform, 'ready'>): Flow {
  let signalled = false;

  return {
    menuInteractive() {
      if (signalled) return;
      signalled = true;
      platform.ready();
    },
  };
}

/**
 * shortcut: turn alternation and the extra-turn rule are ticket #4; until then
 * the same player rolls again once the dice are spent.
 */
export function nextRollerAfterDiceSpent(currentPlayer: number): number {
  return currentPlayer;
}
