import gsap from 'gsap'
import { useLayoutEffect, useRef, useState } from 'react'
import { site } from '../content/site'
import { finePointer, lockScroll } from '../lib/motion'
import { fontsLoaded, introWillPlay, markIntroSeen, markPageReady } from '../lib/sequence'
import './intro.css'

const WIPE_AT = 1 // s: counter hits 100, overlay lifts
const WIPE_FOR = 0.65 // s
const FONT_WAIT = 1200 // ms: longest we'll hold the wipe for fonts

/**
 * "Opening bell": one candle draws itself while a counter runs to 100, then
 * the overlay lifts and the hero makes its entrance underneath. About 1.65s.
 * Any click, tap or key fast-forwards it. Once per session; never with
 * reduced motion.
 */
export default function Intro() {
  const root = useRef<HTMLDivElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const [done, setDone] = useState(!introWillPlay)

  useLayoutEffect(() => {
    if (!introWillPlay) return
    markIntroSeen()
    lockScroll(true)
    const fonts = fontsLoaded(FONT_WAIT)
    let fontsIn = false
    fonts.then(() => (fontsIn = true))

    const counter = { v: 0 }
    let tl: gsap.core.Timeline
    const ctx = gsap.context(() => {
      tl = gsap
        .timeline({ onComplete: () => setDone(true) })
        .to(counter, {
          v: 100,
          duration: WIPE_AT,
          ease: 'power2.inOut',
          onUpdate: () => {
            count.current!.textContent = String(Math.round(counter.v)).padStart(3, '0')
          },
        })
        .fromTo('.intro__wick', { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.inOut' }, 0.05)
        .fromTo('.intro__body', { scaleY: 0 }, { scaleY: 1, duration: 0.7, ease: 'expo.out' }, 0.3)
        .fromTo('.intro__chrome', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, stagger: 0.05 }, 0)
        // Hold here if the fonts somehow aren't in yet
        .addPause(WIPE_AT, () => {
          if (fontsIn) tl.resume()
          else fonts.then(() => tl.resume())
        })
        .add(() => {
          lockScroll(false)
          markPageReady()
          tl.timeScale(Math.min(tl.timeScale(), 1.6))
        }, WIPE_AT)
        .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: WIPE_FOR, ease: 'expo.inOut' }, WIPE_AT)
        .to('.intro__inner', { yPercent: -18, duration: WIPE_FOR, ease: 'expo.inOut' }, WIPE_AT)
    }, root)

    // Fast-forward to the wipe, then let it play a bit quicker than usual
    const skip = () => {
      if (tl.time() < WIPE_AT) tl.timeScale(6)
    }
    const events = ['pointerdown', 'keydown', 'wheel', 'touchstart'] as const
    events.forEach((e) => window.addEventListener(e, skip, { passive: true }))

    return () => {
      events.forEach((e) => window.removeEventListener(e, skip))
      ctx.revert()
      lockScroll(false)
    }
  }, [])

  if (done) return null

  return (
    <div ref={root} className="intro" aria-hidden="true">
      <div className="intro__inner site-grid">
        <span className="intro__chrome intro__ticker col-span-2">{site.initials}</span>
        <span className="intro__chrome label col-span-2 col-start-3 justify-self-end text-muted md:col-span-4 md:col-start-9">
          {finePointer.matches ? 'Press any key to skip' : 'Tap to skip'}
        </span>

        <svg className="intro__candle" viewBox="0 0 40 200" aria-hidden="true">
          <line className="intro__wick" x1="20" y1="4" x2="20" y2="196" pathLength="1" />
          <rect className="intro__body" x="7" y="52" width="26" height="104" />
        </svg>

        <span className="intro__chrome label col-span-2 self-end text-muted">Opening bell</span>
        <span ref={count} className="intro__count col-span-2 col-start-3 md:col-span-6 md:col-start-7">
          000
        </span>
      </div>
    </div>
  )
}
