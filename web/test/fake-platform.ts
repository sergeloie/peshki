import type { Platform } from '../src/platform/ysdk';

export function createFakePlatform() {
  const calls: string[] = [];
  const writes: string[] = [];

  const platform: Platform = {
    boot: async () => {
      calls.push('boot');
    },
    ready: () => {
      calls.push('ready');
    },
    setPaused: (paused) => {
      calls.push(`setPaused:${paused}`);
    },
    setGameplayActive: (active) => {
      calls.push(`setGameplayActive:${active}`);
    },
    saveProgress: async (data) => {
      calls.push('saveProgress');
      writes.push(data);
    },
    loadProgress: async () => null,
    language: () => 'ru',
    submitScore: async () => {
      calls.push('submitScore');
    },
    showAdBreak: async () => {
      calls.push('showAdBreak');
    },
    showRewarded: async () => {
      calls.push('showRewarded');
      return false;
    },
  };

  return { platform, calls, writes };
}
