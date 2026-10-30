export interface LifecycleHooks {
  setPaused(paused: boolean): void;
  setMuted?(muted: boolean): void;
}

export interface EventTargetLike {
  addEventListener(type: string, listener: () => void): void;
  removeEventListener(type: string, listener: () => void): void;
}

export function bindLifecycle(
  target: EventTargetLike,
  isHidden: () => boolean,
  hooks: LifecycleHooks,
): () => void {
  let blurred = false;
  let paused = false;

  const apply = () => {
    const next = blurred || isHidden();
    if (next === paused) return;
    paused = next;
    hooks.setPaused(next);
    hooks.setMuted?.(next);
  };

  const onBlur = () => {
    blurred = true;
    apply();
  };

  const onFocus = () => {
    blurred = false;
    apply();
  };

  target.addEventListener('blur', onBlur);
  target.addEventListener('focus', onFocus);
  target.addEventListener('visibilitychange', apply);

  return () => {
    target.removeEventListener('blur', onBlur);
    target.removeEventListener('focus', onFocus);
    target.removeEventListener('visibilitychange', apply);
  };
}
