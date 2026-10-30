import type { StringKey } from '../i18n';
import { format, t } from '../i18n';

const BOT_KEYS: readonly StringKey[] = ['game.botName1', 'game.botName2', 'game.botName3'];

/** The three opponent characters; one source for the HUD chips and every screen (ticket #7). */
export function botName(index: number): string {
  const key = BOT_KEYS[index];
  return key === undefined ? format(t('game.playerN'), { n: index + 2 }) : t(key);
}

/** Seat label: engine player index -> display name. */
export function seatLabel(playerIndex: number): string {
  if (playerIndex === 0) return t('game.you');
  return botName(playerIndex - 1);
}
