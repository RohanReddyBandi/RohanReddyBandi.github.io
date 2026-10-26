// The live accent color as numbers, so the canvas can read it every frame
// without touching CSS. Keep in sync with --bull / --bear in tokens.css.

export const BULL = { r: 200, g: 255, b: 61 }
export const BEAR = { r: 255, g: 59, b: 59 }

export const accent = { ...BULL }

export function accentRgba(alpha = 1) {
  return `rgba(${Math.round(accent.r)}, ${Math.round(accent.g)}, ${Math.round(accent.b)}, ${alpha})`
}
