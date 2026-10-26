import gsap from 'gsap'

// The live accent color. The hero's market state tweens these numbers; the
// canvas reads them every frame and CSS gets them as --accent, so both always
// match. Keep in sync with --bull / --bear in tokens.css.

export type Market = 'bull' | 'bear'

export const BULL = { r: 200, g: 255, b: 61 }
export const BEAR = { r: 255, g: 59, b: 59 }

export const accent = { ...BULL }

let market: Market = 'bull'

export function accentRgba(alpha = 1) {
  return `rgba(${Math.round(accent.r)}, ${Math.round(accent.g)}, ${Math.round(accent.b)}, ${alpha})`
}

function applyToCss() {
  document.documentElement.style.setProperty('--accent', accentRgba(1))
}

export function getMarket() {
  return market
}

/** Flip the site between BULL (lime) and BEAR (red). */
export function setMarket(next: Market, { instant = false } = {}) {
  if (next === market) return
  market = next
  document.documentElement.dataset.market = next
  const to = next === 'bull' ? BULL : BEAR
  gsap.killTweensOf(accent)
  if (instant) {
    Object.assign(accent, to)
    applyToCss()
  } else {
    gsap.to(accent, { ...to, duration: 0.6, ease: 'power2.out', onUpdate: applyToCss })
  }
}
