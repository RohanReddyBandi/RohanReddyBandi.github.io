import gsap from 'gsap'
import { Fragment, useLayoutEffect, useRef } from 'react'
import ScrollCue from '../components/ScrollCue'
import { site } from '../content/site'
import { reducedMotion } from '../lib/motion'
import { fontsLoaded, pageReady } from '../lib/sequence'
import './hero.css'

/** One line of the name, split into words and letters for the entrance */
function Line({ text }: { text: string }) {
  return (
    <span className="hero-name__line">
      {text.split(' ').map((word, w) => (
        // the space sits between word boxes: inside one it would be trimmed
        <Fragment key={w}>
          {w > 0 && ' '}
          <span className="hero-name__word">
            {[...word].map((ch, i) => (
              <span key={i} className="hero-name__letter">
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

  // Entrance: the letters rise in, then the tagline and scroll cue
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
    <section ref={section} id="top" className="hero" aria-labelledby="hero-title">
      <div className="hero__foot site-grid">
        <div className="hero__stack">
          <h1 id="hero-title" className="hero-name">
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
