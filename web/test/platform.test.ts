import { afterEach, describe, expect, it, vi } from 'vitest';
import { createPlatform } from '../src/platform/ysdk';

describe('platform facade', () => {
  afterEach(() => {
    vi.restoreAllMocks();
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
});
