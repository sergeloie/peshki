/**
 * §10 sound: short synthesized cues, Web Audio API only (platform 1.6.1.6 —
 * media tags spawn the system player, so the bank never touches them).
 * No assets: every sound is noise- and oscillator-built.
 * Two independent mutes: the user's sound preference and the system gate
 * (window focus loss / Yandex pause) fed through the facade's setMuted hook.
 */

export type SoundName =
  | 'dice'
  | 'settle'
  | 'step'
  | 'kill'
  | 'place'
  | 'home'
  | 'win'
  | 'lose'
  | 'deny'
  | 'button';

/** Test seam: the slice of AudioContext the bank needs. */
export interface AudioContextLike {
  currentTime: number;
  destination: unknown;
  resume(): Promise<void>;
  createOscillator(): OscillatorNodeLike;
  createGain(): GainNodeLike;
}

export interface OscillatorNodeLike {
  type: OscillatorType;
  frequency: { value: number; setValueAtTime(value: number, time: number): void; exponentialRampToValueAtTime(value: number, time: number): void };
  connect(destination: unknown): void;
  start(time: number): void;
  stop(time: number): void;
}

export interface GainNodeLike {
  gain: { value: number; setValueAtTime(value: number, time: number): void; exponentialRampToValueAtTime(value: number, time: number): void };
  connect(destination: unknown): void;
}

export interface AudioEngine {
  play(name: SoundName): void;
  /** Player's sound toggle from the settings blob. */
  setPreference(muted: boolean): void;
  /** System gate: window blur/hidden and the Yandex pause event. */
  setMuted(muted: boolean): void;
  /** First user gesture resumes/suspends the context per browser policy. */
  unlock(): void;
}

export function createAudio(factory?: () => AudioContextLike | null): AudioEngine {
  const contextFactory =
    factory ??
    (() => {
      const Ctor = (globalThis as unknown as { AudioContext?: new () => AudioContextLike }).AudioContext;
      return Ctor ? new Ctor() : null;
    });

  let context: AudioContextLike | null = null;
  let master: GainNodeLike | null = null;
  let preferenceMuted = false;
  let systemMuted = false;

  const allowed = (): boolean => !preferenceMuted && !systemMuted;

  function ensureContext(): GainNodeLike | null {
    if (context === null) context = contextFactory();
    if (context === null) return null;
    if (master === null) {
      master = context.createGain();
      master.gain.value = allowed() ? 1 : 0;
      master.connect(context.destination);
    }
    return master;
  }

  /** Percussive burst from three fast square strikes — reads as a knock without noise buffers. */
  function strike(out: GainNodeLike, at: number, gain: number): void {
    const ctx = context!;
    for (let index = 0; index < 3; index += 1) {
      const t0 = at + index * 0.018;
      if (t0 >= at + 0.09) break;
      const osc = ctx.createOscillator();
      const env = ctx.createGain();
      osc.type = 'square';
      const freq = 320 + Math.random() * 480;
      osc.frequency.setValueAtTime(freq, t0);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.6, t0 + 0.05);
      env.gain.setValueAtTime(gain, t0);
      env.gain.exponentialRampToValueAtTime(0.001, t0 + 0.05);
      osc.connect(env);
      env.connect(out);
      osc.start(t0);
      osc.stop(t0 + 0.055);
    }
  }

  /** Single enveloped tone with an optional pitch fall. */
  function tone(out: GainNodeLike, at: number, options: {
    type?: OscillatorType;
    from: number;
    to?: number;
    dur: number;
    gain: number;
  }): void {
    const ctx = context!;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = options.type ?? 'sine';
    osc.frequency.setValueAtTime(options.from, at);
    if (options.to !== undefined) osc.frequency.exponentialRampToValueAtTime(options.to, at + options.dur);
    env.gain.setValueAtTime(options.gain, at);
    env.gain.exponentialRampToValueAtTime(0.001, at + options.dur);
    osc.connect(env);
    env.connect(out);
    osc.start(at);
    osc.stop(at + options.dur + 0.02);
  }

  function cue(name: SoundName, out: GainNodeLike, now: number): void {
    // §10 table: everything ≤ ~300 ms, soft — wood knocks and brass, no drama
    switch (name) {
      case 'dice':
        strike(out, now, 0.16);
        strike(out, now + 0.09, 0.13);
        break;
      case 'settle':
        tone(out, now, { type: 'triangle', from: 1650, to: 1900, dur: 0.045, gain: 0.1 });
        break;
      case 'step':
        strike(out, now, 0.07);
        tone(out, now, { from: 190, to: 120, dur: 0.09, gain: 0.14 });
        break;
      case 'kill':
        tone(out, now, { from: 150, to: 65, dur: 0.13, gain: 0.3 });
        tone(out, now + 0.03, { type: 'square', from: 1250, to: 980, dur: 0.09, gain: 0.05 });
        strike(out, now, 0.1);
        break;
      case 'place':
        strike(out, now, 0.08);
        tone(out, now + 0.01, { from: 880, dur: 0.2, gain: 0.07 });
        break;
      case 'home':
        tone(out, now, { from: 330, dur: 0.26, gain: 0.12 });
        tone(out, now + 0.02, { from: 415, dur: 0.22, gain: 0.06 });
        break;
      case 'win':
        tone(out, now, { from: 523, dur: 0.18, gain: 0.12 });
        tone(out, now + 0.14, { from: 659, dur: 0.18, gain: 0.12 });
        tone(out, now + 0.28, { from: 784, dur: 0.26, gain: 0.13 });
        break;
      case 'lose':
        tone(out, now, { from: 196, to: 165, dur: 0.32, gain: 0.12 });
        break;
      case 'deny':
        tone(out, now, { from: 110, dur: 0.09, gain: 0.12 });
        break;
      case 'button':
        tone(out, now, { type: 'triangle', from: 900, to: 700, dur: 0.03, gain: 0.08 });
        break;
    }
  }

  return {
    play(name) {
      if (!allowed()) return;
      const out = ensureContext();
      if (out === null || context === null) return;
      // context needs a gesture; before one arrives the context is new and suspended
      cue(name, out, context.currentTime);
    },
    setPreference(muted) {
      preferenceMuted = muted;
      if (master !== null && context !== null) {
        master.gain.setValueAtTime(allowed() ? 1 : 0, context.currentTime);
      }
    },
    setMuted(muted) {
      systemMuted = muted;
      if (master !== null && context !== null) {
        master.gain.setValueAtTime(allowed() ? 1 : 0, context.currentTime);
      }
    },
    unlock() {
      const out = ensureContext();
      if (context !== null && out !== null) void context.resume();
    },
  };
}

/** App-wide singleton: built once, resumed by the first gesture. */
export const audio: AudioEngine = createAudio();

if (typeof window !== 'undefined') {
  const unlockOnGesture = (): void => {
    audio.unlock();
    window.removeEventListener('pointerdown', unlockOnGesture);
    window.removeEventListener('keydown', unlockOnGesture);
  };
  window.addEventListener('pointerdown', unlockOnGesture);
  window.addEventListener('keydown', unlockOnGesture);
}
