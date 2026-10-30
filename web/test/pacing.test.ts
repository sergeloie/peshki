import { describe, expect, it } from 'vitest';
import { DECISION_MAX_MS, DECISION_MIN_MS, decisionDelay } from '../src/game/pacing';

describe('bot pacing budget', () => {
  it('keeps every decision inside 0.4-0.7 s', () => {
    for (const random of [0, 0.5, 0.999999]) {
      const delay = decisionDelay(() => random);
      expect(delay).toBeGreaterThanOrEqual(DECISION_MIN_MS);
      expect(delay).toBeLessThanOrEqual(DECISION_MAX_MS);
    }
  });
});
