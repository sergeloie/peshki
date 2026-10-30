import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPlatform } from '../src/platform/ysdk';
import { createFakeSdk } from './fake-sdk';

function installSdk(sdk: ReturnType<typeof createFakeSdk>['sdk']) {
  vi.stubGlobal('YaGames', { init: async () => sdk });
}

describe('platform facade', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('degrades to local mode when YaGames is absent', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const platform = createPlatform();
    await platform.boot();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(platform.language()).toBe('ru');
    expect(await platform.loadProgress()).toBeNull();
    expect(await platform.showRewarded('test')).toBe(false);

    platform.ready();
    platform.setPaused(true);
  });

  it('stays paused while either the app or the platform is paused', async () => {
    const { sdk, calls, emit } = createFakeSdk();
    installSdk(sdk);
    const muted: boolean[] = [];

    const platform = createPlatform({ setMuted: (value) => muted.push(value) });
    await platform.boot();
    platform.setGameplayActive(true);

    emit('game_api_pause');
    platform.setPaused(true);
    emit('game_api_resume');
    expect(calls).toEqual(['start', 'stop']);
    expect(muted).toEqual([true]);

    platform.setPaused(false);
    expect(calls).toEqual(['start', 'stop', 'start']);
    expect(muted).toEqual([true, false]);

    emit('game_api_pause');
    platform.setPaused(false);
    emit('game_api_resume');
    expect(calls).toEqual(['start', 'stop', 'start', 'stop', 'start']);
  });

  it('does not touch GameplayAPI before a match starts', async () => {
    const { sdk, calls, emit } = createFakeSdk();
    installSdk(sdk);

    const platform = createPlatform();
    await platform.boot();

    platform.setPaused(true);
    platform.setPaused(false);
    emit('game_api_pause');
    emit('game_api_resume');

    expect(calls).toEqual([]);

    platform.setGameplayActive(true);
    expect(calls).toEqual(['start']);
  });
});
