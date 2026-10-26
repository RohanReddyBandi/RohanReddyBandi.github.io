import { useEffect, useRef } from 'react'
import { site } from '../content/site'
import { setMarket } from '../lib/accent'
import { reducedMotion } from '../lib/motion'
import './hero.css'
import { MarketHero } from './MarketHero'
import { swapMood } from './tagline'

export default function Hero() {
  const canvas = useRef<HTMLCanvasElement>(null)
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

  return (
    <section id="top" className="site-grid relative min-h-svh content-end overflow-hidden pb-[12vh]">
      <canvas ref={canvas} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />

      <h1 className="hero-name relative col-span-full">
        <span>{site.name.first}</span>
        <span>{site.name.last}</span>
      </h1>

      <p className="relative col-span-full mt-8 text-lead text-muted md:col-span-8 lg:col-span-6">
        <span className="sr-only">
          {site.tagline.lead} {site.tagline.bull}
        </span>
        <span aria-hidden="true">
          <span className="block">{site.tagline.lead}</span>
          <span ref={mood} className="block min-h-[2lh] md:min-h-[1lh]">
            {site.tagline.bull}
          </span>
        </span>
      </p>

      <div ref={handle} className="market-handle">
        <div ref={line} className="market-handle__line" />
        <div ref={hit} className="market-handle__hit" />
        <div
          ref={orb}
          className="market-handle__orb"
          role="slider"
          tabIndex={0}
          aria-label="Drag the market"
          aria-valuemin={0}
          aria-orientation="horizontal"
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
