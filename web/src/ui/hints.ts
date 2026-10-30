import type { HintId } from '../game/progress';
import type { StringKey } from '../i18n';

/** First-game hint pages, in teaching order; ids live in the progress blob. */
export const HINT_TEXT_KEYS: Record<HintId, StringKey> = {
  goal: 'howto.goal.text',
  move: 'howto.move.text',
  six: 'howto.six.text',
  kill: 'howto.kill.text',
};

export const HINT_LABEL_KEYS: Record<HintId, StringKey> = {
  goal: 'howto.goal.label',
  move: 'howto.move.label',
  six: 'howto.six.label',
  kill: 'howto.kill.label',
};

export const HINT_ORDER: readonly HintId[] = ['goal', 'move', 'six', 'kill'];
