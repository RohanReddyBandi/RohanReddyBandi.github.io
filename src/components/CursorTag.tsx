import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { finePointer, reducedMotion } from '../lib/motion'

// The system cursor stays. Over something you can act on (elements tagged
// data-cursor="open" | "copy" | "drag"), a small tag pops up beside it
// saying what a click or drag will do. Mouse/trackpad only.

const LABELS: Record<string, string> = { open: 'Open ↗', copy: 'Copy', drag: 'Drag' }
const OFFSET = { x: 16, y: 20 }

export default function CursorTag() {
  const tag = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!finePointer.matches) return
    const el = tag.current!
    const follow = (prop: 'x' | 'y') =>
      reducedMotion.matches
        ? (v: number) => gsap.set(el, { [prop]: v })
        : gsap.quickTo(el, prop, { duration: 0.18, ease: 'power3.out' })
    const xTo = follow('x')
    const yTo = follow('y')
    let shown = ''

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (!shown) gsap.set(el, { x: e.clientX + OFFSET.x, y: e.clientY + OFFSET.y }) // appear in place, don't fly in
      xTo(e.clientX + OFFSET.x)
      yTo(e.clientY + OFFSET.y)
    }
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      // while dragging the market, keep saying "Drag" wherever the pointer goes
      const kind = document.documentElement.hasAttribute('data-dragging')
        ? 'drag'
        : ((e.target as Element).closest<HTMLElement>('[data-cursor]')?.dataset.cursor ?? '')
      const label = LABELS[kind] ?? ''
      if (label === shown) return
      shown = label
      if (label) el.textContent = label
      el.classList.toggle('is-shown', Boolean(label))
    }
    const hide = () => {
      shown = ''
      el.classList.remove('is-shown')
    }

    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over)
    document.documentElement.addEventListener('mouseleave', hide)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      document.documentElement.removeEventListener('mouseleave', hide)
    }
  }, [])

  return <div ref={tag} className="cursor-tag label" aria-hidden="true" />
}
