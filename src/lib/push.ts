import gsap from 'gsap'
import { useEffect, type RefObject } from 'react'
import { finePointer, reducedMotion } from './motion'

/**
 * Letters inside `ref` (elements with data-push) lean away from the pointer,
 * more the closer it is, and settle back when it leaves `area` (or the
 * element's parent). Mouse/trackpad only, and off with reduced motion.
 */
export function useLetterPush(ref: RefObject<HTMLElement | null>, area?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const el = ref.current
    if (!el || !finePointer.matches || reducedMotion.matches) return
    const letters = [...el.querySelectorAll<HTMLElement>('[data-push]')].map((l) => ({
      el: l,
      x: gsap.quickTo(l, 'x', { duration: 0.7, ease: 'power3.out' }),
      y: gsap.quickTo(l, 'y', { duration: 0.7, ease: 'power3.out' }),
      r: gsap.quickTo(l, 'rotation', { duration: 0.7, ease: 'power3.out' }),
    }))
    const zone = area?.current ?? el.parentElement!

    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const size = parseFloat(getComputedStyle(letters[0].el).fontSize)
      const radius = size * 1.8
      for (const l of letters) {
        const r = l.el.getBoundingClientRect()
        // measure from the letter's resting spot, not where it's been pushed
        const cx = r.left + r.width / 2 - Number(gsap.getProperty(l.el, 'x'))
        const cy = r.top + r.height / 2 - Number(gsap.getProperty(l.el, 'y'))
        const dx = cx - e.clientX
        const dy = cy - e.clientY
        const d = Math.hypot(dx, dy) || 1
        const force = Math.max(0, 1 - d / radius) ** 2
        l.x((dx / d) * force * size * 0.22)
        l.y((dy / d) * force * size * 0.22)
        l.r((dx / d) * force * 12)
      }
    }
    const leave = () => letters.forEach((l) => (l.x(0), l.y(0), l.r(0)))
    zone.addEventListener('pointermove', move)
    zone.addEventListener('pointerleave', leave)
    return () => {
      zone.removeEventListener('pointermove', move)
      zone.removeEventListener('pointerleave', leave)
    }
  }, [ref, area])
}
