// The accent color as numbers, for code that paints it (canvas glyphs,
// confetti). Keep in sync with --accent in tokens.css.

const ACCENT = { r: 200, g: 255, b: 61 }

export function accentRgba(alpha = 1) {
  return `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${alpha})`
}
