import { describe, expect, it } from 'vitest';
import { createFlow } from '../src/game/flow';
import { bindLifecycle } from '../src/platform/lifecycle';
import { createFakePlatform } from './fake-platform';

describe('menu readiness', () => {
  it('signals ready exactly once, when the menu becomes interactive', () => {
    const { platform, calls } = createFakePlatform();
    const flow = createFlow(platform);

    expect(calls).toEqual([]);

    flow.menuInteractive();
    flow.menuInteractive();

    expect(calls).toEqual(['ready']);
  });
});

describe('lifecycle', () => {
  it('pauses and mutes on focus loss, resumes on focus', () => {
    const { platform, calls } = createFakePlatform();
    const muted: boolean[] = [];
    const target = new EventTarget();

    bindLifecycle(target, () => false, {
      setPaused: platform.setPaused,
      setMuted: (value) => muted.push(value),
    });

    target.dispatchEvent(new Event('blur'));
    expect(calls).toEqual(['setPaused:true']);
    expect(muted).toEqual([true]);

    target.dispatchEvent(new Event('focus'));
    expect(calls).toEqual(['setPaused:true', 'setPaused:false']);
    expect(muted).toEqual([true, false]);
  });

  it('stays paused while the document is hidden', () => {
    const { platform, calls } = createFakePlatform();
    const target = new EventTarget();
    let hidden = false;

    bindLifecycle(target, () => hidden, { setPaused: platform.setPaused });

    hidden = true;
    target.dispatchEvent(new Event('visibilitychange'));
    expect(calls).toEqual(['setPaused:true']);

    target.dispatchEvent(new Event('focus'));
    expect(calls).toEqual(['setPaused:true']);

    hidden = false;
    target.dispatchEvent(new Event('visibilitychange'));
    expect(calls).toEqual(['setPaused:true', 'setPaused:false']);
  });

  it('stops reacting after detach', () => {
    const { platform, calls } = createFakePlatform();
    const target = new EventTarget();

    const detach = bindLifecycle(target, () => false, { setPaused: platform.setPaused });
    detach();
    target.dispatchEvent(new Event('blur'));

    expect(calls).toEqual([]);
  });
});
