// The accent color as numbers, for code that paints it (confetti). Keep in
// sync with --red in tokens.css.

const ACCENT = { r: 244, g: 20, b: 60 }

export function accentRgba(alpha = 1) {
  return `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${alpha})`
}
