import gsap from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import signature from '../assets/signature.svg?raw'
import { reducedMotion } from '../lib/motion'

const SHAPES = 'path, line, polyline, polygon, circle, ellipse, rect'

/**
 * The handwritten signature in the accent color. Stroked paths draw
 * themselves at an even speed (each gets time in proportion to its length);
 * a filled outline wipes in left to right instead. `scrub` ties the drawing
 * to scrolling; `play` draws it once when it comes into view (for spots near
 * the bottom of the page, where there isn't enough scroll left to scrub).
 */
export default function Signature({ className = '', mode = 'scrub' }: { className?: string; mode?: 'scrub' | 'play' }) {
  const ref = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const el = ref.current!
    const svg = el.querySelector('svg')
    if (!svg) return
    svg.setAttribute('aria-hidden', 'true')
    svg.setAttribute('focusable', 'false')
    if (reducedMotion.matches) return

    const shapes = [...svg.querySelectorAll<SVGGeometryElement>(SHAPES)]
    const stroked = shapes.filter((s) => getComputedStyle(s).stroke !== 'none')
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        scrollTrigger:
          mode === 'scrub'
            ? // fully signed by the time the section sits at the top of the screen
              { trigger: el, start: 'top 92%', end: 'bottom 62%', scrub: 0.8 }
            : { trigger: el, start: 'top 95%', once: true },
      })
      if (stroked.length) {
        const lengths = stroked.map((s) => s.getTotalLength())
        const total = lengths.reduce((a, b) => a + b, 0)
        stroked.forEach((s, i) => {
          s.setAttribute('pathLength', '1')
          s.style.strokeDasharray = '1'
          // scrub: durations are just proportions; play: ~1.6s for the whole thing
          const duration = mode === 'scrub' ? lengths[i] : (lengths[i] / total) * 1.6
          tl.fromTo(s, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration, ease: mode === 'scrub' ? 'none' : 'power1.inOut' })
        })
      } else {
        tl.fromTo(svg, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 1.2, ease: 'none' })
      }
    }, el)
    return () => ctx.revert()
  }, [mode])

  return <div ref={ref} className={`signature ${className}`} dangerouslySetInnerHTML={{ __html: signature }} />
}
