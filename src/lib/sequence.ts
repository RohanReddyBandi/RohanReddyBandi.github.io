// When the page makes its entrance: main.tsx calls markPageReady once the
// fonts are in (so nothing reveals in a fallback face).

let resolveReady!: () => void
export const pageReady = new Promise<void>((resolve) => (resolveReady = resolve))

export function markPageReady() {
  resolveReady()
}

/** Wait for the faces the first screen uses, but never longer than `max` ms. */
export function fontsLoaded(max = 2500) {
  const faces = ['400 16px "General Sans"', '500 16px "Caveat"']
  const load = Promise.all(faces.map((f) => document.fonts.load(f))).then(() => undefined)
  return Promise.race([load, new Promise<void>((r) => setTimeout(r, max))])
}
