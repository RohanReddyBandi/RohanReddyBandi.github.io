import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { finePointer, reducedMotion } from '../lib/motion'

// An off-white disc that inverts whatever is under it (mix-blend-mode:
// difference). A small dot over plain page, it swells over anything
// clickable, and over elements tagged data-cursor="open" | "copy" | "drag"
// it grows into a disc with the action written in it. Mouse/trackpad with
// motion allowed only; everyone else keeps the system cursor.

const INTERACTIVE = 'a, button, [role="button"], [role="slider"], summary, label'
const LABELS: Record<string, string> = { open: 'Open ↗', copy: 'Copy', drag: 'Drag' }

export default function Cursor() {
  const blob = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!finePointer.matches || reducedMotion.matches) return
    const root = document.documentElement
    const el = blob.current!
    root.classList.add('has-cursor')
    const xTo = gsap.quickTo(el, 'x', { duration: 0.22, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.22, ease: 'power3.out' })
    let mode = ''
    let placed = false

    const setMode = (next: string) => {
      if (next === mode) return
      mode = next
      el.dataset.mode = next
      if (LABELS[next]) label.current!.textContent = LABELS[next]
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (!placed) {
        // first sighting: appear under the pointer instead of flying in
        gsap.set(el, { x: e.clientX, y: e.clientY })
        placed = true
      }
      el.classList.add('is-visible')
      xTo(e.clientX)
      yTo(e.clientY)
    }
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (root.hasAttribute('data-dragging')) return setMode('drag')
      const t = e.target as Element
      const tagged = t.closest<HTMLElement>('[data-cursor]')?.dataset.cursor
      setMode(tagged ?? (t.closest(INTERACTIVE) ? 'link' : ''))
    }
    const press = () => el.classList.add('is-pressed')
    const release = () => el.classList.remove('is-pressed')
    const hide = () => {
      el.classList.remove('is-visible')
      placed = false
    }

    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerdown', press)
    document.addEventListener('pointerup', release)
    root.addEventListener('mouseleave', hide)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerdown', press)
      document.removeEventListener('pointerup', release)
      root.removeEventListener('mouseleave', hide)
      root.classList.remove('has-cursor')
    }
  }, [])

  return (
    <div ref={blob} className="cursor" aria-hidden="true">
      <span ref={label} className="cursor__label label" />
    </div>
  )
}
