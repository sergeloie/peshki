import type { SDK } from 'ysdk';

export interface Platform {
  boot(): Promise<void>;
  ready(): void;
  setPaused(paused: boolean): void;
  setGameplayActive(active: boolean): void;
  saveProgress(data: string): Promise<void>;
  loadProgress(): Promise<string | null>;
  language(): string;
  submitScore(score: number): Promise<void>;
  showAdBreak(): Promise<void>;
  showRewarded(placement: string): Promise<boolean>;
}

export interface PlatformOptions {
  setMuted?(muted: boolean): void;
}

const SAVE_KEY = 'save';
const SCORE_BOARD = 'score';
const FALLBACK_LANGUAGE = 'ru';

// The only module allowed to touch the Yandex SDK; everything else uses Platform.
export function createPlatform(options: PlatformOptions = {}): Platform {
  let sdk: SDK | null = null;
  let appPaused = false;
  let platformPaused = false;
  let paused = false;
  let gameplayActive = false;
  let gameplayRunning = false;

  const applyGameplay = () => {
    const running = gameplayActive && !paused;
    if (running === gameplayRunning) return;
    gameplayRunning = running;
    const gameplay = sdk?.features?.GameplayAPI;
    if (running) {
      gameplay?.start?.();
    } else {
      gameplay?.stop?.();
    }
  };

  const applyPause = () => {
    const next = appPaused || platformPaused;
    if (next === paused) return;
    paused = next;
    applyGameplay();
    options.setMuted?.(next);
  };

  return {
    async boot() {
      if (typeof YaGames === 'undefined') {
        console.warn(
          '[platform] YaGames is missing: local mode. Use @yandex-games/sdk-dev-proxy to run with the real SDK.',
        );
        return;
      }
      sdk = await YaGames.init();

      if (typeof sdk.on === 'function') {
        sdk.on('game_api_pause', () => {
          platformPaused = true;
          applyPause();
        });
        sdk.on('game_api_resume', () => {
          platformPaused = false;
          applyPause();
        });
      }
    },

    ready() {
      sdk?.features?.LoadingAPI?.ready?.();
    },

    setPaused(value) {
      appPaused = value;
      applyPause();
    },

    setGameplayActive(active) {
      gameplayActive = active;
      applyGameplay();
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
