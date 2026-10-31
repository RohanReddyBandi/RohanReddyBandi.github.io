// The accent color as numbers, for code that paints it (WebGL, confetti).
// Keep in sync with --brand in tokens.css.

const ACCENT = { r: 43, g: 239, b: 106 }

/** The accent as 0–1 floats, for shaders */
export const accentVec: [number, number, number] = [ACCENT.r / 255, ACCENT.g / 255, ACCENT.b / 255]

export function accentRgba(alpha = 1) {
  return `rgba(${ACCENT.r}, ${ACCENT.g}, ${ACCENT.b}, ${alpha})`
}
