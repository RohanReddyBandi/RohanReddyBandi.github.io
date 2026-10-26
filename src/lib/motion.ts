import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'

gsap.registerPlugin(ScrollTrigger)

export const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')

let lenis: Lenis | null = null

/**
 * Lenis smooths the scroll, and GSAP's ticker drives Lenis, so ScrollTrigger
 * and the scroll position always update on the same frame. With reduced motion
 * the page keeps native scrolling.
 */
export function startSmoothScroll() {
  if (lenis || reducedMotion.matches) return
  lenis = new Lenis({ autoRaf: false })
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis?.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)
  document.addEventListener('click', onAnchorClick)
}

// Quartic in-out: Lenis' default expo-out covers most of a long jump in the
// first few frames, which reads as a cut rather than a glide.
const easeInOutQuart = (t: number) => (t < 0.5 ? 8 * t ** 4 : 1 - (-2 * t + 2) ** 4 / 2)

/** Scroll to an element (or the top), smoothly unless motion is reduced. */
export function scrollToTarget(target: HTMLElement | 'top') {
  const y = target === 'top' ? 0 : target
  if (lenis) lenis.scrollTo(y, { duration: 1.2, easing: easeInOutQuart })
  else if (target === 'top') window.scrollTo(0, 0)
  else target.scrollIntoView()
}

// Lenis' own `anchors` option doesn't cancel the browser's jump, so the page
// flashes to the target before easing. Handle in-page links here instead.
function onAnchorClick(event: MouseEvent) {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
  const link = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href^="#"]')
  const hash = link?.getAttribute('href')
  if (!hash) return
  const target = hash === '#top' ? 'top' : document.getElementById(decodeURIComponent(hash.slice(1)))
  if (!target) return
  event.preventDefault()
  scrollToTarget(target)
  history.pushState(null, '', hash === '#top' ? location.pathname : hash)
  // Move keyboard focus with the scroll so Tab continues from the new section.
  if (target !== 'top') {
    if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
    target.focus({ preventScroll: true })
  }
}
