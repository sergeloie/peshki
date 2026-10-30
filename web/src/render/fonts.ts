import './fonts.css';

/** §9 bundled faces; loadFonts() is awaited at boot so canvas Text renders with them. */
export const FONTS = {
  display: '"Playfair Display", Georgia, serif',
  body: '"PT Sans", sans-serif',
  mono: '"PT Mono", monospace',
} as const;

let loaded = false;

export async function loadFonts(): Promise<void> {
  if (loaded || typeof document === 'undefined') return;
  // Pixi Text rasterises immediately: the faces must be in document.fonts first
  await Promise.all([
    document.fonts.load('600 32px "Playfair Display"'),
    document.fonts.load('400 16px "PT Sans"'),
    document.fonts.load('700 16px "PT Sans"'),
    document.fonts.load('400 16px "PT Mono"'),
  ]).catch(() => undefined);
  await document.fonts.ready;
  loaded = true;
}
