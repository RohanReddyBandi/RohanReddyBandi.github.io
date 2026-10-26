import { reducedMotion } from './motion'

// When the page makes its entrance. If the loading intro plays, it calls
// markPageReady as its wipe starts; otherwise main.tsx does once fonts are in
// (so nothing reveals in a fallback face).

let resolveReady!: () => void
export const pageReady = new Promise<void>((resolve) => (resolveReady = resolve))

export function markPageReady() {
  resolveReady()
}

/** Wait for the faces the first screen uses, but never longer than `max` ms. */
export function fontsLoaded(max = 2500) {
  const faces = ['600 100px "Clash Display"', '400 20px "General Sans"', '400 11px "JetBrains Mono"']
  const load = Promise.all(faces.map((f) => document.fonts.load(f))).then(() => undefined)
  return Promise.race([load, new Promise<void>((r) => setTimeout(r, max))])
}

const INTRO_KEY = 'intro-seen'

/** The intro plays once per browser session, and never with reduced motion. */
export const introWillPlay = (() => {
  if (reducedMotion.matches) return false
  try {
    return sessionStorage.getItem(INTRO_KEY) !== '1'
  } catch {
    return true
  }
})()

export function markIntroSeen() {
  try {
    sessionStorage.setItem(INTRO_KEY, '1')
  } catch {
    // storage blocked: it'll just play again next load
  }
}
