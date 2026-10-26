import gsap from 'gsap'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import type { Market } from '../lib/accent'

gsap.registerPlugin(ScrambleTextPlugin)

const PANIC_CHARS = '!<>-_\\/[]{}=+*^?#$%&'

/**
 * Swap the subheadline's second line. Going BEAR it glitches: scrambled
 * symbols plus a little shake. Going BULL it resolves calmly.
 */
export function swapMood(el: HTMLElement, text: string, market: Market, instant: boolean) {
  gsap.killTweensOf(el)
  if (instant) {
    gsap.set(el, { x: 0 })
    el.textContent = text
    return
  }
  if (market === 'bear') {
    gsap.to(el, {
      duration: 0.75,
      ease: 'none',
      scrambleText: { text, chars: PANIC_CHARS, speed: 1.2, revealDelay: 0.25 },
    })
    gsap.to(el, { keyframes: { x: [-4, 3, -2, 2, -1, 0] }, duration: 0.42, ease: 'steps(6)' })
  } else {
    gsap.set(el, { x: 0 })
    gsap.to(el, {
      duration: 0.55,
      ease: 'none',
      scrambleText: { text, chars: 'lowerCase', speed: 0.8, revealDelay: 0.1 },
    })
  }
}
