import gsap from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import signature from '../assets/signature.svg?raw'
import { reducedMotion } from '../lib/motion'

const SHAPES = 'path, line, polyline, polygon, circle, ellipse, rect'

/**
 * The handwritten signature, drawn by scroll in the accent color. Stroked
 * paths draw themselves at an even speed (each gets time in proportion to its
 * length); a filled outline wipes in left to right instead.
 */
export default function Signature({ className = '' }: { className?: string }) {
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
        // fully signed by the time the section sits at the top of the screen
        scrollTrigger: { trigger: el, start: 'top 92%', end: 'bottom 62%', scrub: 0.8 },
      })
      if (stroked.length) {
        for (const s of stroked) {
          const length = s.getTotalLength()
          s.setAttribute('pathLength', '1')
          s.style.strokeDasharray = '1'
          tl.fromTo(s, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: length, ease: 'none' })
        }
      } else {
        tl.fromTo(svg, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', ease: 'none' })
      }
    }, el)
    return () => ctx.revert()
  }, [])

  return <div ref={ref} className={`signature ${className}`} dangerouslySetInnerHTML={{ __html: signature }} />
}
