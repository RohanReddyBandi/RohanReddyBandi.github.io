import gsap from 'gsap'
import { useEffect, useLayoutEffect, useRef } from 'react'
import ScrollCue from '../components/ScrollCue'
import { site } from '../content/site'
import { finePointer, reducedMotion } from '../lib/motion'
import { fontsLoaded, pageReady } from '../lib/sequence'
import { GlyphField, type Grid } from './GlyphField'
import './hero.css'

const FLICKER_MS = 260

export default function Hero() {
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const foot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = section.current!
    const reduced = reducedMotion.matches

    // Where the name goes, in cells: under the top bar, above the footer row,
    // inside the page gutters. Narrow screens stack it ROHAN / REDDY / BANDI.
    const layout = ({ cols, cell }: Grid) => {
      const narrow = cols < 72 || el.clientHeight > el.clientWidth * 1.15
      const lines = narrow ? [...site.name.first.split(' '), site.name.last] : [site.name.first, site.name.last]
      const gutter = Math.min(44, Math.max(16, el.clientWidth * 0.032))
      return {
        lines: lines.map((l) => l.toUpperCase()),
        topRows: Math.ceil(96 / cell),
        bottomRows: Math.ceil((foot.current!.offsetHeight + 24) / cell),
        margin: Math.round(gutter / cell),
      }
    }

    const field = new GlyphField(canvas.current!, layout, reduced)
    let fontsIn = false
    const fit = () => fontsIn && field.resize(el.clientWidth, el.clientHeight)
    const resize = new ResizeObserver(fit)
    resize.observe(el)
    // The name is carved with Clash Display and drawn in JetBrains Mono, so
    // both have to be in before the first layout
    Promise.all([fontsLoaded(2500), document.fonts.load('500 12px "JetBrains Mono"')]).then(() => {
      fontsIn = true
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

  // The footer row rises in as the field resolves
  useLayoutEffect(() => {
    if (reducedMotion.matches) return
    let cancelled = false
    const ctx = gsap.context(() => {
      gsap.set('.reveal-line', { yPercent: 110 })
      gsap.set(['.scroll-cue', '.hero__hint'], { autoAlpha: 0 })
    }, section)
    pageReady.then(() => {
      if (cancelled) return
      ctx.add(() =>
        gsap
          .timeline({ defaults: { ease: 'expo.out' }, delay: 0.6 })
          .to('.reveal-line', { yPercent: 0, duration: 1.1, stagger: 0.1 })
          .to(['.hero__hint', '.scroll-cue'], { autoAlpha: 1, duration: 0.8, stagger: 0.1 }, 0.3),
      )
    })
    return () => {
      cancelled = true
      ctx.revert()
    }
  }, [])

  return (
    <section ref={section} id="top" className="glyph-hero" aria-labelledby="hero-title">
      <canvas ref={canvas} className="glyph-hero__field" aria-hidden="true" />
      <h1 id="hero-title" className="sr-only">
        {site.name.first} {site.name.last}
      </h1>

      <div ref={foot} className="hero__foot site-grid">
        <p className="hero__tagline text-lead text-muted">
          <span className="reveal-mask">
            <span className="reveal-line">{site.tagline.lead}</span>
          </span>
          <span className="reveal-mask">
            <span className="reveal-line">{site.tagline.rest}</span>
          </span>
        </p>
        {!reducedMotion.matches && (
          <p className="hero__hint label" aria-hidden="true">
            {finePointer.matches ? 'Move to scramble · Click to ripple' : 'Tap to ripple'}
          </p>
        )}
        <ScrollCue />
      </div>
    </section>
  )
}
