import gsap from 'gsap'
import { useEffect, useRef, type ReactNode } from 'react'
import { finePointer, reducedMotion } from '../lib/motion'

/**
 * Pulls its child a little toward the cursor while hovered, then springs back.
 * Mouse/trackpad only, and off with reduced motion.
 */
export default function Magnetic({
  children,
  strength = 0.3,
  className = '',
}: {
  children: ReactNode
  strength?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current!
    if (!finePointer.matches || reducedMotion.matches) return
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' })

    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      // the rect includes our own offset, so measure from the resting center
      const cx = r.left + r.width / 2 - Number(gsap.getProperty(el, 'x'))
      const cy = r.top + r.height / 2 - Number(gsap.getProperty(el, 'y'))
      xTo((e.clientX - cx) * strength)
      yTo((e.clientY - cy) * strength)
    }
    const leave = () => {
      xTo(0)
      yTo(0)
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
      gsap.killTweensOf(el)
      gsap.set(el, { x: 0, y: 0 })
    }
  }, [strength])

  return (
    <span ref={ref} className={`inline-block ${className}`}>
      {children}
    </span>
  )
}
