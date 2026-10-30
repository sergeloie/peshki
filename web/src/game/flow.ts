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
