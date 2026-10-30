import type { SDK } from 'ysdk';

export interface Platform {
  boot(): Promise<void>;
  ready(): void;
  setPaused(paused: boolean): void;
  saveProgress(data: string): Promise<void>;
  loadProgress(): Promise<string | null>;
  language(): string;
  submitScore(score: number): Promise<void>;
  showAdBreak(): Promise<void>;
  showRewarded(placement: string): Promise<boolean>;
}

const SAVE_KEY = 'save';
const SCORE_BOARD = 'score';
const FALLBACK_LANGUAGE = 'ru';

// The only module allowed to touch the Yandex SDK; everything else uses Platform.
export function createPlatform(): Platform {
  let sdk: SDK | null = null;

  return {
    async boot() {
      if (typeof YaGames === 'undefined') {
        console.warn(
          '[platform] YaGames is missing: local mode. Use @yandex-games/sdk-dev-proxy to run with the real SDK.',
        );
        return;
      }
      sdk = await YaGames.init();
    },

    ready() {
      sdk?.features?.LoadingAPI?.ready?.();
    },

    setPaused(paused) {
      const gameplay = sdk?.features?.GameplayAPI;
      if (paused) {
        gameplay?.stop?.();
      } else {
        gameplay?.start?.();
      }
    },

    async saveProgress(data) {
      const player = await sdk?.getPlayer();
      await player?.setData({ [SAVE_KEY]: data }, true);
    },

    async loadProgress() {
      const player = await sdk?.getPlayer();
      const stored = await player?.getData([SAVE_KEY]);
      const value = stored?.[SAVE_KEY];
      return typeof value === 'string' ? value : null;
    },

    language() {
      return sdk?.environment?.i18n?.lang ?? FALLBACK_LANGUAGE;
    },

    async submitScore(score) {
      await sdk?.leaderboards?.setScore(SCORE_BOARD, score);
    },

    showAdBreak() {
      return new Promise((resolve) => {
        if (!sdk) {
          resolve();
          return;
        }
        sdk.adv.showFullscreenAdv({ callbacks: { onClose: () => resolve() } });
      });
    },

    showRewarded(_placement) {
      return new Promise((resolve) => {
        if (!sdk) {
          resolve(false);
          return;
        }
        let rewarded = false;
        sdk.adv.showRewardedVideo({
          callbacks: {
            onRewarded: () => {
              rewarded = true;
            },
            onClose: () => resolve(rewarded),
          },
        });
      });
    },
  };
}
