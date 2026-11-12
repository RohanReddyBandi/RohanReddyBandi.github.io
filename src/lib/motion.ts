import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
/** A mouse or trackpad: the custom cursor and magnetic effects only make sense here */
export const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)')

let lenis: Lenis | null = null
const scrollListeners = new Set<(y: number) => void>()

/** Subscribe to scroll position, smoothed or native. Returns an unsubscribe. */
export function onScroll(listener: (y: number) => void) {
  scrollListeners.add(listener)
  return () => {
    scrollListeners.delete(listener)
  }
}

window.addEventListener('scroll', () => {
  if (!lenis) scrollListeners.forEach((l) => l(window.scrollY))
}, { passive: true })

/** Freeze page scrolling (e.g. under the mobile menu). */
export function lockScroll(locked: boolean) {
  if (lenis) {
    if (locked) lenis.stop()
    else lenis.start()
  }
  document.documentElement.style.overflow = locked ? 'hidden' : ''
}

/**
 * Lenis smooths the scroll, and GSAP's ticker drives Lenis, so ScrollTrigger
 * and the scroll position always update on the same frame. With reduced motion
 * the page keeps native scrolling.
 */
export function startSmoothScroll() {
  if (lenis || reducedMotion.matches) return
  lenis = new Lenis({ autoRaf: false })
  lenis.on('scroll', ScrollTrigger.update)
  lenis.on('scroll', (l: Lenis) => scrollListeners.forEach((fn) => fn(l.scroll)))
  gsap.ticker.add(driveLenis)
  gsap.ticker.add(watchFrames)
  gsap.ticker.lagSmoothing(0)
  document.addEventListener('click', onAnchorClick)
}

const driveLenis = (time: number) => lenis?.raf(time * 1000)

// At 30fps or less (Chromium's Energy Saver caps pages at 30 on a low
// battery, and slow machines get there on their own) smoothing only adds
// lag on top of choppy frames, so hand scrolling back to the browser for
// good. Judged on the median of the last 120 frames, so one hitch doesn't
// count.
const SLOW_FRAME_MS = 25
const SAMPLE = 120
const gaps: number[] = []

function watchFrames(_time: number, deltaMs: number) {
  if (deltaMs > 250) return // back from a background tab
  gaps.push(deltaMs)
  if (gaps.length < SAMPLE) return
  const median = gaps.sort((a, b) => a - b)[SAMPLE / 2]
  gaps.length = 0
  if (median > SLOW_FRAME_MS) stopSmoothScroll()
}

function stopSmoothScroll() {
  gsap.ticker.remove(driveLenis)
  gsap.ticker.remove(watchFrames)
  // Lenis scrolls the window itself, so the page stays where it is
  lenis?.destroy()
  lenis = null
}

// Quartic in-out: Lenis' default expo-out covers most of a long jump in the
// first few frames, which reads as a cut rather than a glide.
const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2)

/** Scroll to an element (or the top), smoothly unless motion is reduced. */
export function scrollToTarget(target: HTMLElement | 'top') {
  // A pinned section's own position moves while pinned; aim for the spacer
  // GSAP wraps it in, which marks where the section really starts
  if (target !== 'top' && target.parentElement?.classList.contains('pin-spacer')) target = target.parentElement
  const y = target === 'top' ? 0 : target
  if (lenis) lenis.scrollTo(y, { duration: 1.2, easing: easeInOutQuart })
  else if (target === 'top') window.scrollTo(0, 0)
  else target.scrollIntoView()
}

/** Jump straight to a scroll position (no easing), smoothed scroll or not. */
export function scrollToY(y: number) {
  if (lenis) lenis.scrollTo(y, { immediate: true })
  else window.scrollTo(0, y)
}

/**
 * Go to an in-page section ("#work", "#top"): scroll there, update the URL,
 * and move keyboard focus so Tab continues from the new section.
 * Returns false if there's no such section.
 */
export function goTo(hash: string) {
  const el = document.getElementById(decodeURIComponent(hash.slice(1)))
  const top = hash === '#top'
  if (!el && !top) return false
  scrollToTarget(top ? 'top' : el!)
  history.pushState(null, '', top ? location.pathname : hash)
  if (el) {
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    el.focus({ preventScroll: true })
  }
  return true
}

// Lenis' own `anchors` option doesn't cancel the browser's jump, so the page
// flashes to the target before easing. Handle in-page links here instead.
function onAnchorClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]')
  const hash = link?.getAttribute('href')
  if (hash && goTo(hash)) event.preventDefault()
}
