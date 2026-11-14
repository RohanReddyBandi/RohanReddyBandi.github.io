import gsap from 'gsap'
import { useLayoutEffect, useRef } from 'react'
import ScrollCue from '../components/ScrollCue'
import Signature from '../components/Signature'
import { site } from '../content/site'
import { reducedMotion } from '../lib/motion'
import { pageReady } from '../lib/sequence'
import './hero.css'
import Pond from './Pond'

export default function Hero() {
  const section = useRef<HTMLElement>(null)
  const stack = useRef<HTMLDivElement>(null)

  // Entrance: the name signs itself (Signature does that on its own), and
  // the tagline and scroll cue follow
  useLayoutEffect(() => {
    if (reducedMotion.matches) return
    let cancelled = false
    const ctx = gsap.context(() => {
      gsap.set('.reveal-line', { yPercent: 110 })
      gsap.set('.scroll-cue', { autoAlpha: 0 })
    }, section)
    pageReady.then(() => {
      if (cancelled) return
      ctx.add(() => {
        gsap
          .timeline({ defaults: { ease: 'expo.out' } })
          .to('.reveal-line', { yPercent: 0, duration: 1.1, stagger: 0.1 }, 0.9)
          .to('.scroll-cue', { autoAlpha: 1, duration: 0.8, ease: 'power2.out' }, 1.3)
      })
    })
    return () => {
      cancelled = true
      ctx.revert()
    }
  }, [])

  return (
    <section ref={section} id="top" className="hero" aria-labelledby="hero-title">
      <Pond hero={section} surface={stack} />

      <div className="hero__foot site-grid">
        <div ref={stack} className="hero__stack">
          <h1 id="hero-title" className="hero-name">
            <span className="sr-only">
              {site.name.first} {site.name.last}
            </span>
            <Signature when="ready" />
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
