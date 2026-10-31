import { describe, expect, it } from 'vitest';
import { createAudio } from '../src/render/audio';
import type { AudioContextLike, GainNodeLike, OscillatorNodeLike } from '../src/render/audio';

interface FakeContext extends AudioContextLike {
  resumed: boolean;
  nodes: number;
}

function makeFakeContext(): FakeContext {
  const ctx: FakeContext = {
    currentTime: 0,
    destination: null,
    resumed: false,
    nodes: 0,
    createOscillator() {
      ctx.nodes += 1;
      const node: OscillatorNodeLike & Partial<GainNodeLike> = {
        type: 'sine',
        frequency: {
          value: 0,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        gain: {
          value: 0,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
        start() {},
        stop() {},
      };
      return node;
    },
    createGain(): GainNodeLike {
      return {
        gain: {
          value: 0,
          setValueAtTime() {},
          exponentialRampToValueAtTime() {},
        },
        connect() {},
      };
    },
    resume() {
      ctx.resumed = true;
      return Promise.resolve();
    },
  };
  return ctx;
}

function fakeFactory(contexts: FakeContext[]): () => AudioContextLike | null {
  return () => {
    const ctx = makeFakeContext();
    contexts.push(ctx);
    return ctx;
  };
}

describe('audio engine', () => {
  it('stays inert when AudioContext is unavailable', () => {
    const engine = createAudio(() => null);
    engine.unlock();
    engine.play('dice');
    engine.setPreference(true);
    engine.setMuted(true);
    expect(true).toBe(true); // no throw is the contract: sound is optional
  });

  it('resumes the context and schedules cues after unlock', () => {
    const contexts: FakeContext[] = [];
    const engine = createAudio(fakeFactory(contexts));
    engine.unlock();
    expect(contexts).toHaveLength(1);
    expect(contexts[0]!.resumed).toBe(true);
    const before = contexts[0]!.nodes;
    engine.play('dice');
    expect(contexts[0]!.nodes).toBeGreaterThan(before);
  });

  it('the sound preference mutes scheduling', () => {
    const contexts: FakeContext[] = [];
    const engine = createAudio(fakeFactory(contexts));
    engine.unlock();
    engine.setPreference(true);
    const before = contexts[0]!.nodes;
    engine.play('step');
    expect(contexts[0]!.nodes).toBe(before);
    engine.setPreference(false);
    engine.play('step');
    expect(contexts[0]!.nodes).toBeGreaterThan(before);
  });

  it('the system gate (focus loss / platform pause) mutes scheduling too', () => {
    const contexts: FakeContext[] = [];
    const engine = createAudio(fakeFactory(contexts));
    engine.unlock();
    engine.setMuted(true);
    const before = contexts[0]!.nodes;
    engine.play('win');
    expect(contexts[0]!.nodes).toBe(before);
    engine.setMuted(false);
    engine.play('win');
    expect(contexts[0]!.nodes).toBeGreaterThan(before);
  });
});

/** Platform 1.6.1.6: media elements spawn the system player — the bank is Web Audio only. */
describe('no media elements', () => {
  it('no <audio>, <video> or media-element creation anywhere in web/src', async () => {
    const { readdirSync, readFileSync, statSync, existsSync } = await import('node:fs');
    const { join } = await import('node:path');
    const root = join(import.meta.dirname ?? '.', '..', 'src');
    expect(existsSync(root)).toBe(true);
    const files: string[] = [];
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { recursive: true }) as string[]) {
        const path = join(dir, entry);
        if (statSync(path).isFile() && /\.(ts|html)$/.test(path)) files.push(path);
      }
    };
    walk(root);
    const offenders = files
      .filter((file) => /<audio|<video|createElement\(\s*['"](audio|video)['"]/.test(readFileSync(file, 'utf8')))
      .map((file) => file.replace(root, ''));
    expect(offenders).toEqual([]);
  });
});
