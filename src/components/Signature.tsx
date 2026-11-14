import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { signature } from '../content/signature'
import { reducedMotion } from '../lib/motion'
import { pageReady } from '../lib/sequence'

// The name as a handwritten signature (paths in content/signature.ts). It
// writes itself: each letter wipes in from the left, one running into the
// next like a pen, with a breath between the names. `when` says when the pen
// starts: once the page makes its entrance, or once the signature scrolls
// into view. With reduced motion it's simply there.

const PEN = 2.1 // s for the pen to cross the whole name
const BREATH = 0.14 // s pause between names

const { width, height, letters } = signature

// Letters overlap (cursive), so each starts when the pen reaches its left
// edge and takes as long as the pen needs to cross it
const timing = (() => {
  let word = 0
  return letters.map((l, i) => {
    if (i > 0 && l.ch === l.ch.toUpperCase()) word++ // R, R, B start the names
    return {
      '--delay': `${((l.x1 / width) * PEN + word * BREATH).toFixed(3)}s`,
      '--dur': `${Math.max(0.12, ((l.x2 - l.x1) / width) * PEN).toFixed(3)}s`,
    } as CSSProperties
  })
})()

export default function Signature({ when, className = '' }: { when: 'ready' | 'view'; className?: string }) {
  const svg = useRef<SVGSVGElement>(null)
  const [state, setState] = useState<'still' | 'waiting' | 'writing'>(() => (reducedMotion.matches ? 'still' : 'waiting'))

  useEffect(() => {
    if (state !== 'waiting') return
    if (when === 'ready') {
      let live = true
      pageReady.then(() => live && setState('writing'))
      return () => {
        live = false
      }
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setState('writing')
        io.disconnect()
      },
      // all of it on screen, since at the foot of the page it can't scroll
      // any higher
      { threshold: 0.9 },
    )
    io.observe(svg.current!)
    return () => io.disconnect()
  }, [state, when])

  return (
    <svg
      ref={svg}
      className={`signature is-${state} ${className}`}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      focusable="false"
    >
      {letters.map((l, i) => (
        <path key={i} className="signature__letter" d={l.d} style={timing[i]} />
      ))}
    </svg>
  )
}
