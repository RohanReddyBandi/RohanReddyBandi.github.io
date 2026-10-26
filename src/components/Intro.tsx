import gsap from 'gsap'
import { useLayoutEffect, useRef, useState } from 'react'
import { site } from '../content/site'
import { finePointer, lockScroll } from '../lib/motion'
import { fontsLoaded, introWillPlay, markIntroSeen, markPageReady } from '../lib/sequence'
import './intro.css'

const WIPE_AT = 0.9 // s: counter hits 100, overlay lifts
const WIPE_FOR = 0.6 // s
const FONT_WAIT = 1100 // ms: longest we'll hold the wipe for fonts

/**
 * The initials rise out of a mask and a line draws under them while a
 * counter runs to 100, then the overlay lifts and the hero makes its entrance
 * underneath. About 1.5s.
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
        .fromTo('.intro__letter', { yPercent: 110 }, { yPercent: 0, duration: 0.7, ease: 'expo.out', stagger: 0.07 }, 0.05)
        .fromTo('.intro__rule', { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'expo.inOut' }, 0.25)
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
        <span className="intro__chrome label col-span-2 col-start-3 justify-self-end text-muted md:col-span-4 md:col-start-9">
          {finePointer.matches ? 'Press any key to skip' : 'Tap to skip'}
        </span>

        <div className="intro__mark">
          <span className="intro__mask">
            {[...site.initials].map((ch, i) => (
              <span key={i} className="intro__letter">
                {ch}
              </span>
            ))}
          </span>
          <span className="intro__rule" />
        </div>

        <span className="intro__chrome label col-span-2 self-end text-muted">
          {site.name.first} {site.name.last}
        </span>
        <span ref={count} className="intro__count col-span-2 col-start-3 md:col-span-6 md:col-start-7">
          000
        </span>
      </div>
    </div>
  )
}
