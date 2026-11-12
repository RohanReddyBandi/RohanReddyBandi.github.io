import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useLayoutEffect, type RefObject } from 'react'
import { reducedMotion } from './motion'

gsap.registerPlugin(ScrollTrigger, SplitText)

// Scroll-in reveals shared by every section: text rises line by line out of
// masks, media wipes in with a clip-path. Each plays once, when its element
// comes into view. With reduced motion nothing is hidden or moved.

const START = 'top 85%'

/**
 * Split an element's text into masked lines that rise into view. SplitText
 * re-splits when fonts load or the width changes; after the first play the
 * lines just stay put.
 */
export function useRevealLines(ref: RefObject<HTMLElement | null>, { delay = 0, stagger = 0.09 } = {}) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reducedMotion.matches) return
    let played = false
    const split = SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      // Lines keep words whole, so screen readers read it as-is. (The default
      // puts aria-label on the element, which isn't allowed on a <p>.)
      aria: 'none',
      autoSplit: true,
      onSplit(self) {
        if (played) return
        return gsap.from(self.lines, {
          yPercent: 110,
          duration: 1.2,
          ease: 'expo.out',
          stagger,
          delay,
          scrollTrigger: { trigger: el, start: START, once: true },
          onStart: () => {
            played = true
          },
        })
      },
    })
    return () => split.revert()
  }, [ref, delay, stagger])
}

/** Children matching `selector` each rise out of their own mask, staggered. */
export function useRevealRows(ref: RefObject<HTMLElement | null>, selector: string, { delay = 0, stagger = 0.08 } = {}) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reducedMotion.matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        selector,
        { clipPath: 'inset(0% 0% 100% 0%)', yPercent: 60 },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          yPercent: 0,
          duration: 1.1,
          ease: 'expo.out',
          stagger,
          delay,
          // leave nothing behind (a lingering clip-path would cut off focus rings)
          clearProps: 'clipPath,transform',
          scrollTrigger: { trigger: el, start: START, once: true },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [ref, selector, delay, stagger])
}

/** Wipe an element in from the bottom edge with a clip-path. */
export function useRevealClip(ref: RefObject<HTMLElement | null>, { delay = 0, from = 'inset(100% 0% 0% 0%)' } = {}) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reducedMotion.matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { clipPath: from },
        {
          clipPath: 'inset(0% 0% 0% 0%)',
          duration: 1.4,
          ease: 'expo.inOut',
          delay,
          scrollTrigger: { trigger: el, start: START, once: true },
        },
      )
    })
    return () => ctx.revert()
  }, [ref, delay, from])
}
