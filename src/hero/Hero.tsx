import gsap from 'gsap'
import { useEffect, useLayoutEffect, useRef } from 'react'
import ScrollCue from '../components/ScrollCue'
import { site } from '../content/site'
import { setMarket } from '../lib/accent'
import { reducedMotion } from '../lib/motion'
import { pageReady } from '../lib/sequence'
import './hero.css'
import HeroName from './HeroName'
import { MarketHero } from './MarketHero'
import { swapMood } from './tagline'

export default function Hero() {
  const section = useRef<HTMLElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const name = useRef<HTMLHeadingElement>(null)
  const handle = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLDivElement>(null)
  const hit = useRef<HTMLDivElement>(null)
  const orb = useRef<HTMLDivElement>(null)
  const readout = useRef<HTMLDivElement>(null)
  const date = useRef<HTMLSpanElement>(null)
  const price = useRef<HTMLSpanElement>(null)
  const state = useRef<HTMLSpanElement>(null)
  const hint = useRef<HTMLSpanElement>(null)
  const mood = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const hero = new MarketHero(
      {
        canvas: canvas.current!,
        name: name.current!,
        handle: handle.current!,
        line: line.current!,
        hit: hit.current!,
        orb: orb.current!,
        readout: readout.current!,
        date: date.current!,
        price: price.current!,
        state: state.current!,
        hint: hint.current!,
      },
      (market, instant) => {
        const still = instant || reducedMotion.matches
        setMarket(market, { instant: still })
        swapMood(mood.current!, site.tagline[market], market, still)
      },
    )
    return () => hero.destroy()
  }, [])

  // Entrance: the chart wipes in, the name's letters rise out of their masks,
  // then the subheadline, scroll cue and handle. Hidden before first paint.
  useLayoutEffect(() => {
    if (reducedMotion.matches) return
    let cancelled = false
    const ctx = gsap.context(() => {
      gsap.set('.hero__chart', { clipPath: 'inset(0 100% 0 0)' })
      gsap.set('.hero-name__letter', { yPercent: 110 })
      gsap.set('.reveal-line', { yPercent: 110 })
      gsap.set(['.scroll-cue', '.market-handle'], { autoAlpha: 0 })
    }, section)

    pageReady.then(() => {
      if (cancelled) return
      ctx.add(() => {
        const [first, last] = gsap.utils.toArray<HTMLElement>('.hero-name__mask')
        gsap
          .timeline({ defaults: { ease: 'expo.out' } })
          .to('.hero__chart', { clipPath: 'inset(0 0% 0 0)', duration: 1.8, ease: 'power3.inOut' }, 0)
          .to(first.querySelectorAll('.hero-name__letter'), { yPercent: 0, duration: 1.2, stagger: 0.035 }, 0.15)
          .to(last.querySelectorAll('.hero-name__letter'), { yPercent: 0, duration: 1.2, stagger: 0.035 }, 0.35)
          .to('.reveal-line', { yPercent: 0, duration: 1.1, stagger: 0.1 }, 0.75)
          .to('.scroll-cue', { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, 1.1)
          .to('.market-handle', { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, 1.2)
          .from('.market-handle__core', { scale: 0, duration: 0.9, ease: 'back.out(3)' }, 1.2)
          .from('.market-handle__line', { scaleY: 0, duration: 1.2, ease: 'expo.out' }, 1.2)
      })
    })
    return () => {
      cancelled = true
      ctx.revert()
    }
  }, [])

  return (
    <section ref={section} id="top" className="hero">
      <canvas ref={canvas} aria-hidden="true" className="hero__chart" />

      <div className="hero__foot site-grid">
        <div className="hero__stack">
          <HeroName ref={name} />
          <div className="hero__aside">
            <p className="hero__tagline text-lead text-muted">
              <span className="sr-only">
                {site.tagline.lead} {site.tagline.bull}
              </span>
              <span aria-hidden="true">
                <span className="reveal-mask">
                  <span className="reveal-line">{site.tagline.lead}</span>
                </span>
                <span className="reveal-mask">
                  <span className="reveal-line">
                    <span ref={mood} className="hero__mood">
                      {site.tagline.bull}
                    </span>
                  </span>
                </span>
              </span>
            </p>
            <ScrollCue />
          </div>
        </div>
      </div>

      <div ref={handle} className="market-handle">
        <div ref={line} className="market-handle__line" />
        <div ref={hit} className="market-handle__hit" data-cursor="drag" />
        <div
          ref={orb}
          className="market-handle__orb"
          role="slider"
          tabIndex={0}
          aria-label="Drag the market"
          aria-valuemin={0}
          aria-orientation="horizontal"
          data-cursor="drag"
        >
          <span className="market-handle__core" />
        </div>
        <div ref={readout} className="market-handle__readout label" aria-hidden="true">
          <span ref={date} />
          <span ref={price} className="text-fg" />
          <span ref={state} className="text-accent" />
        </div>
        <span ref={hint} className="market-handle__hint label" aria-hidden="true">
          Drag the market →
        </span>
      </div>
    </section>
  )
}
