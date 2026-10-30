import type { Container } from 'pixi.js';
import type { Button } from './widgets';

/**
 * Keyboard / remote navigation for menus and dialogs: Tab or arrow keys move
 * focus, Enter/Space activates, Escape closes. Only the top-most attached group
 * that is still on the stage (and visible) processes keys.
 */
export interface KeyGroup {
  root: Container;
  /** Reads the current focusable list each time — dialog banners rebuild. */
  focusable(): readonly Button[];
  onEscape?: () => void;
}

const groups: KeyGroup[] = [];
let listening = false;

function handle(event: KeyboardEvent): void {
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (group.root.parent === null || !group.root.visible) continue;
    const buttons = group.focusable();
    if (group.onEscape !== undefined && event.key === 'Escape') {
      event.preventDefault();
      group.onEscape();
      return;
    }
    if (buttons.length === 0) return;

    const step = event.key === 'Tab' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (step !== 0) {
      event.preventDefault();
      const currentIndex = buttons.findIndex((button) => button.isFocused());
      const next = currentIndex < 0 ? 0 : (currentIndex + step + buttons.length) % buttons.length;
      buttons.forEach((button, buttonIndex) => button.setFocused(buttonIndex === next));
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const currentIndex = buttons.findIndex((button) => button.isFocused());
      buttons[currentIndex < 0 ? 0 : currentIndex].activate();
      return;
    }
    // top-most visible group owns all navigation keys
    return;
  }
}

export function attachKeyGroup(group: KeyGroup): void {
  if (!listening && typeof window !== 'undefined') {
    listening = true;
    window.addEventListener('keydown', handle);
  }
  groups.push(group);
}

export function detachKeyGroup(group: KeyGroup): void {
  const index = groups.indexOf(group);
  if (index >= 0) groups.splice(index, 1);
}
