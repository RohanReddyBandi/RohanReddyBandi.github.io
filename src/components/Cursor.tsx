import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { finePointer, reducedMotion } from '../lib/motion'

const INTERACTIVE = 'a, button, [role="button"], [role="slider"], summary, label'
const LABELS: Record<string, string> = { view: 'View', soon: 'Soon', drag: 'Drag' }

/**
 * A dot that tracks the mouse and a ring that trails it. The ring grows over
 * links; over elements with data-cursor="view" / "drag" it shows that word.
 * Only for a mouse or trackpad with motion allowed; otherwise the native
 * cursor stays.
 */
export default function Cursor() {
  const dot = useRef<HTMLDivElement>(null)
  const ring = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!finePointer.matches || reducedMotion.matches) return
    const root = document.documentElement
    root.classList.add('has-cursor')
    const dx = gsap.quickTo(dot.current, 'x', { duration: 0.1, ease: 'power3.out' })
    const dy = gsap.quickTo(dot.current, 'y', { duration: 0.1, ease: 'power3.out' })
    const rx = gsap.quickTo(ring.current, 'x', { duration: 0.45, ease: 'power3.out' })
    const ry = gsap.quickTo(ring.current, 'y', { duration: 0.45, ease: 'power3.out' })
    let mode = ''

    // The current mode lives on <html> as data-cursor-mode (not data-cursor,
    // or closest('[data-cursor]') below would find <html> itself)
    const setMode = (next: string) => {
      if (next === mode) return
      mode = next
      root.dataset.cursorMode = next
      if (LABELS[next]) label.current!.textContent = LABELS[next]
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      root.dataset.cursorVisible = ''
      dx(e.clientX)
      dy(e.clientY)
      rx(e.clientX)
      ry(e.clientY)
    }
    const over = (e: PointerEvent) => {
      const t = e.target as Element
      const tagged = t.closest<HTMLElement>('[data-cursor]')
      setMode(tagged?.dataset.cursor ?? (t.closest(INTERACTIVE) ? 'link' : ''))
    }
    const hide = () => delete root.dataset.cursorVisible

    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over)
    root.addEventListener('mouseleave', hide)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      root.removeEventListener('mouseleave', hide)
      root.classList.remove('has-cursor')
      delete root.dataset.cursorMode
      hide()
    }
  }, [])

  return (
    <div className="cursor" aria-hidden="true">
      <div ref={ring} className="cursor__ring">
        <span ref={label} className="cursor__label label" />
      </div>
      <div ref={dot} className="cursor__dot" />
    </div>
  )
}
