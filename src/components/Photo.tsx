import gsap from 'gsap'
import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react'
import { finePointer, reducedMotion } from '../lib/motion'
import { useRevealClip } from '../lib/reveal'

/**
 * A 4:5 photo frame. It wipes in on scroll and drifts a little with it. On
 * hover, a lens follows the cursor showing the full-color image, slightly
 * magnified, over a grayscale base. Touch screens just get full color.
 * Without `children` it shows a [PHOTO] placeholder.
 */
export default function Photo({ children, label = '[PHOTO]' }: { children?: ReactNode; label?: string }) {
  const frame = useRef<HTMLDivElement>(null)
  useRevealClip(frame)

  // Gentle parallax while it crosses the screen (both layers move together)
  useLayoutEffect(() => {
    if (reducedMotion.matches) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        '.photo__drift',
        { yPercent: -5 },
        {
          yPercent: 5,
          ease: 'none',
          scrollTrigger: { trigger: frame.current, start: 'top bottom', end: 'bottom top', scrub: true },
        },
      )
    }, frame)
    return () => ctx.revert()
  }, [])

  // The lens: radius tweens open on enter, its center follows the pointer
  useEffect(() => {
    const el = frame.current!
    if (!finePointer.matches || reducedMotion.matches) return
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      el.style.setProperty('--mx', `${e.clientX - r.left}px`)
      el.style.setProperty('--my', `${e.clientY - r.top}px`)
    }
    const enter = (e: PointerEvent) => {
      move(e)
      const radius = el.offsetWidth * 0.36
      gsap.to(el, { '--lens': `${radius}px`, duration: 0.7, ease: 'expo.out', overwrite: true })
    }
    const leave = () => gsap.to(el, { '--lens': '0px', duration: 0.5, ease: 'power3.out', overwrite: true })
    el.addEventListener('pointerenter', enter)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointerenter', enter)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerleave', leave)
    }
  }, [])

  const content = children ?? (
    <div className="photo__placeholder">
      <span className="label">{label}</span>
    </div>
  )

  return (
    <div
      ref={frame}
      className="photo"
      role={children ? undefined : 'img'}
      aria-label={children ? undefined : 'Photo coming soon'}
    >
      <div className="photo__layer photo__base">
        <div className="photo__drift">{content}</div>
      </div>
      <div className="photo__layer photo__lens" aria-hidden="true">
        <div className="photo__drift">
          <div className="photo__magnify">{content}</div>
        </div>
      </div>
    </div>
  )
}
