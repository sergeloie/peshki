import type { SDK } from 'ysdk';

export function createFakeSdk() {
  const calls: string[] = [];
  const listeners = new Map<string, Array<() => void>>();

  const sdk = {
    on(event: string, listener: () => void) {
      const registered = listeners.get(event) ?? [];
      registered.push(listener);
      listeners.set(event, registered);
      return () => {};
    },
    features: {
      LoadingAPI: { ready: () => calls.push('ready') },
      GameplayAPI: {
        start: () => calls.push('start'),
        stop: () => calls.push('stop'),
      },
    },
    environment: { i18n: { lang: 'ru' } },
    adv: {},
    leaderboards: {},
    getPlayer: async () => ({
      setData: async () => {},
      getData: async () => ({}),
    }),
  } as unknown as SDK;

  return {
    sdk,
    calls,
    emit(event: string) {
      for (const listener of listeners.get(event) ?? []) listener();
    },
  };
}
