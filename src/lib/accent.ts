// Colors as numbers, for code that paints them (canvas, confetti). Keep in
// sync with --brand and --glow in tokens.css.

const ACCENT = { r: 169, g: 216, b: 176 }

/** The ambient light's warm tint, as 0–255 RGB */
export const glow: [number, number, number] = [243, 214, 166]

export function accentRgba(alpha = 1) {
  return `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${alpha})`
}
