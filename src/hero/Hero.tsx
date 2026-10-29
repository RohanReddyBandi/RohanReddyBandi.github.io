import gsap from 'gsap'
import { Fragment, useEffect, useLayoutEffect, useRef } from 'react'
import ScrollCue from '../components/ScrollCue'
import { site } from '../content/site'
import { reducedMotion } from '../lib/motion'
import { useLetterPush } from '../lib/push'
import { fontsLoaded, pageReady } from '../lib/sequence'
import { GlyphField } from './GlyphField'
import './hero.css'

const FLICKER_MS = 260

/** One line of the name, split into words and letters for the push effect */
function Line({ text }: { text: string }) {
  return (
    <span className="hero-name__line">
      {text.split(' ').map((word, w) => (
        // the space sits between word boxes: inside one it would be trimmed
        <Fragment key={w}>
          {w > 0 && ' '}
          <span className="hero-name__word">
            {[...word].map((ch, i) => (
              <span key={i} className="hero-name__letter" data-push>
                {ch}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  )
}

export default function Hero() {
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const name = useRef<HTMLHeadingElement>(null)
  useLetterPush(name, section)

  // The glyph field behind the name
  useEffect(() => {
    const el = section.current!
    const field = new GlyphField(canvas.current!, reducedMotion.matches)
    let fontIn = false
    const fit = () => fontIn && field.resize(el.clientWidth, el.clientHeight)
    const resize = new ResizeObserver(fit)
    resize.observe(el)
    document.fonts.load('500 12px "JetBrains Mono"').then(() => {
      fontIn = true
      fit()
      pageReady.then(() => field.intro())
    })

    // Off screen or in a background tab, nothing runs
    let onScreen = true
    const sync = () => field.setVisible(onScreen && !document.hidden)
    const seen = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      sync()
    })
    seen.observe(el)
    document.addEventListener('visibilitychange', sync)
    const flicker = window.setInterval(() => field.flicker(), FLICKER_MS)

    // The pointer stirs it up (harder when it moves fast); a click or tap
    // sends a ring outward
    let last = { x: 0, y: 0, t: 0 }
    const local = (e: PointerEvent) => {
      const r = canvas.current!.getBoundingClientRect()
      return { x: e.clientX - r.left, y: e.clientY - r.top }
    }
    const move = (e: PointerEvent) => {
      const p = local(e)
      const speed = Math.hypot(p.x - last.x, p.y - last.y) / Math.max(8, e.timeStamp - last.t)
      last = { ...p, t: e.timeStamp }
      field.stir(p.x, p.y, Math.min(1, speed / 1.6))
    }
    const press = (e: PointerEvent) => {
      const p = local(e)
      field.pulse(p.x, p.y)
      field.stir(p.x, p.y, 1)
    }
    el.addEventListener('pointermove', move, { passive: true })
    el.addEventListener('pointerdown', press)

    return () => {
      field.destroy()
      resize.disconnect()
      seen.disconnect()
      document.removeEventListener('visibilitychange', sync)
      clearInterval(flicker)
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerdown', press)
    }
  }, [])

  // Entrance: the letters rise in, then the tagline and scroll cue. No masks,
  // so a letter the pointer pushes up never gets clipped.
  useLayoutEffect(() => {
    if (reducedMotion.matches) return
    let cancelled = false
    const ctx = gsap.context(() => {
      gsap.set('.hero-name__letter', { yPercent: 60, autoAlpha: 0 })
      gsap.set('.reveal-line', { yPercent: 110 })
      gsap.set('.scroll-cue', { autoAlpha: 0 })
    }, section)
    Promise.all([pageReady, fontsLoaded(2500)]).then(() => {
      if (cancelled) return
      ctx.add(() => {
        const lines = gsap.utils.toArray<HTMLElement>('.hero-name__line')
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
        lines.forEach((line, k) =>
          tl.to(line.querySelectorAll('.hero-name__letter'), { yPercent: 0, autoAlpha: 1, duration: 1.1, stagger: 0.04 }, 0.15 + k * 0.2),
        )
        tl.to('.reveal-line', { yPercent: 0, duration: 1.1, stagger: 0.1 }, 0.7).to(
          '.scroll-cue',
          { autoAlpha: 1, duration: 0.8, ease: 'power2.out' },
          1,
        )
      })
    })
    return () => {
      cancelled = true
      ctx.revert()
    }
  }, [])

  return (
    <section ref={section} id="top" className="glyph-hero" aria-labelledby="hero-title">
      <canvas ref={canvas} className="glyph-hero__field" aria-hidden="true" />

      <div className="hero__foot site-grid">
        <div className="hero__stack">
          <h1 ref={name} id="hero-title" className="hero-name">
            <span className="sr-only">
              {site.name.first} {site.name.last}
            </span>
            <span aria-hidden="true">
              <Line text={site.name.first} />
              <Line text={site.name.last} />
            </span>
          </h1>
          <div className="hero__aside">
            <p className="hero__tagline text-lead text-muted">
              <span className="reveal-mask">
                <span className="reveal-line">{site.tagline.lead}</span>
              </span>
              <span className="reveal-mask">
                <span className="reveal-line">{site.tagline.rest}</span>
              </span>
            </p>
            <ScrollCue />
          </div>
        </div>
      </div>
    </section>
  )
}
