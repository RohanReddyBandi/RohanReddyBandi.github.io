import gsap from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import ScrollCue from '../components/ScrollCue'
import Signature from '../components/Signature'
import { site } from '../content/site'
import { reducedMotion } from '../lib/motion'
import { pageReady } from '../lib/sequence'
import './hero.css'

export default function Hero() {
  const section = useRef<HTMLElement>(null)

  // Entrance: the signature writes itself (see Signature), and as the pen
  // gets going the tagline and the scroll cue fade up out of a soft blur
  useLayoutEffect(() => {
    if (reducedMotion.matches) return
    let cancelled = false
    const ctx = gsap.context(() => gsap.set('.hero__fade', { autoAlpha: 0, y: 10, filter: 'blur(6px)' }), section)
    pageReady.then(() => {
      if (cancelled) return
      ctx.add(() =>
        gsap.to('.hero__fade', {
          autoAlpha: 1,
          y: 0,
          filter: 'blur(0px)',
          duration: 1.6,
          ease: 'power2.out',
          stagger: 0.25,
          delay: 1.1,
          clearProps: 'filter,transform',
        }),
      )
    })
    return () => {
      cancelled = true
      ctx.revert()
    }
  }, [])

  return (
    <section ref={section} id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero__inner column">
        <h1 id="hero-title" className="hero__name">
          <span className="sr-only">
            {site.name.first} {site.name.last}
          </span>
          <Signature when="ready" />
        </h1>
        <p className="hero__tagline hero__fade">
          {site.tagline.lead}
          <br />
          <span className="text-muted">{site.tagline.rest}</span>
        </p>
      </div>
      <div className="hero__cue hero__fade">
        <ScrollCue />
      </div>
    </section>
  )
}
