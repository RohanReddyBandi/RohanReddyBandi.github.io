// When the page is ready to make its entrance. For now that's once the fonts
// are in (so nothing reveals in a fallback face); the loading intro will call
// markPageReady itself when its wipe finishes.

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
