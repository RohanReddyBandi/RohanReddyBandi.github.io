import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, type RefObject } from 'react'
import { reducedMotion } from './motion'

gsap.registerPlugin(ScrollTrigger)

// Scroll-in reveals shared by every section: things drift up a few pixels
// and come out of a soft blur, one after another. Each plays once, when its
// element comes into view. With reduced motion nothing is hidden or moved.

const START = 'top 88%'

/** Children matching `selector` each fade up out of a blur, staggered. */
export function useRevealRows(ref: RefObject<HTMLElement | null>, selector: string, { delay = 0, stagger = 0.1 } = {}) {
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || reducedMotion.matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        selector,
        { autoAlpha: 0, y: 16, filter: 'blur(6px)' },
        {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1.4,
          ease: 'power2.out',
          stagger,
          delay,
          // leave nothing behind (a lingering filter makes its own layer)
          clearProps: 'filter,transform',
          scrollTrigger: { trigger: el, start: START, once: true },
        },
      )
    }, el)
    return () => ctx.revert()
  }, [ref, selector, delay, stagger])
}
