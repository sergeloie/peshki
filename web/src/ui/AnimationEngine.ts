export type EasingFn = (t: number) => number;

export const easings = {
  linear: (t: number) => t,
  easeOutCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutElastic: (t: number) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
  easeInOutQuad: (t: number) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,
  easeOutBounce: (t: number) => {
    const n1 = 7.5625;
    const d1 = 2.75;
    if (t < 1 / d1) return n1 * t * t;
    if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
    if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
    return n1 * (t -= 2.625 / d1) * t + 0.984375;
  },
};

export interface Animation {
  id: number;
  startTime: number;
  duration: number;
  easing: EasingFn;
  onUpdate: (t: number) => void;
  onComplete?: () => void;
  done: boolean;
}

let nextId = 0;

export class AnimationEngine {
  private animations: Animation[] = [];
  private rafId = 0;
  private running = false;

  animate(
    duration: number,
    easing: EasingFn,
    onUpdate: (t: number) => void,
    onComplete?: () => void,
  ): number {
    const id = nextId++;
    this.animations.push({
      id,
      startTime: 0,
      duration,
      easing,
      onUpdate,
      onComplete,
      done: false,
    });
    if (!this.running) this.startLoop();
    return id;
  }

  cancel(id: number): void {
    const idx = this.animations.findIndex(a => a.id === id);
    if (idx !== -1) this.animations.splice(idx, 1);
  }

  cancelAll(): void {
    this.animations.length = 0;
  }

  private startLoop(): void {
    this.running = true;
    this.rafId = requestAnimationFrame((now) => this.tick(now));
  }

  private tick(now: number): void {
    for (const anim of this.animations) {
      if (anim.done) continue;
      if (anim.startTime === 0) anim.startTime = now;

      const elapsed = now - anim.startTime;
      const rawT = Math.min(elapsed / anim.duration, 1);
      const t = anim.easing(rawT);

      anim.onUpdate(t);

      if (rawT >= 1) {
        anim.done = true;
        anim.onComplete?.();
      }
    }

    this.animations = this.animations.filter(a => !a.done);

    if (this.animations.length > 0) {
      this.rafId = requestAnimationFrame((now) => this.tick(now));
    } else {
      this.running = false;
    }
  }

  get isRunning(): boolean {
    return this.running;
  }
}
