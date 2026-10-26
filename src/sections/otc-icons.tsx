import gsap from 'gsap'
import type { ReactElement } from 'react'

// Line-art icons for Off the Clock, each with its own little reaction.
// All share a 120×72 box and draw in currentColor (the accent).

type Icon = {
  svg: ReactElement
  /** Builds the paused reaction timeline for this icon */
  react: (svg: SVGSVGElement) => gsap.core.Timeline
}

const q = (svg: SVGSVGElement, sel: string) => svg.querySelectorAll<SVGElement>(sel)

const tableTennis: Icon = {
  svg: (
    <>
      <line x1="0" y1="68" x2="120" y2="68" className="otc-dim" strokeDasharray="2 5" />
      <g className="paddle">
        <circle cx="34" cy="30" r="17" />
        <line x1="34" y1="47" x2="34" y2="62" strokeWidth="5" />
      </g>
      <circle className="ball" cx="98" cy="22" r="4" fill="currentColor" stroke="none" />
    </>
  ),
  // Two volleys: the ball arcs in, the paddle swings, the ball arcs back
  react: (svg) => {
    const ball = q(svg, '.ball')
    const paddle = q(svg, '.paddle')
    const tl = gsap.timeline({ paused: true })
    for (let i = 0; i < 2; i++) {
      tl.to(ball, { x: -44, duration: 0.32, ease: 'power1.in' })
        .to(ball, { y: -14, duration: 0.16, ease: 'sine.out', yoyo: true, repeat: 1 }, '<')
        .to(paddle, { rotation: -28, svgOrigin: '34 62', duration: 0.1, yoyo: true, repeat: 1 }, '<0.22')
        .to(ball, { x: 0, duration: 0.36, ease: 'power1.out' })
        .to(ball, { y: -18, duration: 0.18, ease: 'sine.out', yoyo: true, repeat: 1 }, '<')
    }
    return tl
  },
}

const cars: Icon = {
  svg: (
    <>
      <g className="streaks">
        <line x1="0" y1="34" x2="22" y2="34" />
        <line x1="4" y1="44" x2="22" y2="44" />
        <line x1="0" y1="54" x2="22" y2="54" />
      </g>
      <g className="car">
        <path d="M28 56V50C28 47 30 45 33 44L46 41L58 33C61 31 64 30 68 30H86C90 30 93 32 95 35L101 43L110 45C113 46 115 48 115 51V56Z" />
        <circle cx="46" cy="57" r="7" className="otc-wheel" />
        <circle cx="98" cy="57" r="7" className="otc-wheel" />
      </g>
    </>
  ),
  // Gone in a blink, then glides back in from the left
  react: (svg) => {
    const car = q(svg, '.car')
    const streaks = q(svg, '.streaks line')
    return gsap
      .timeline({ paused: true })
      .to(streaks, { scaleX: 2.4, transformOrigin: '100% 50%', duration: 0.25, ease: 'power2.in', stagger: 0.04 })
      .to(car, { x: 170, duration: 0.42, ease: 'power3.in' }, '<')
      .set(car, { x: -170 })
      .to(streaks, { scaleX: 1, duration: 0.5, ease: 'power2.out' })
      .to(car, { x: 0, duration: 0.8, ease: 'expo.out' }, '<')
  },
}

const watches: Icon = {
  svg: (
    <>
      <rect x="51" y="0" width="18" height="10" rx="2" />
      <rect x="51" y="62" width="18" height="10" rx="2" />
      <circle cx="60" cy="36" r="26" />
      {[0, 90, 180, 270].map((a) => (
        <line key={a} x1="60" y1="13" x2="60" y2="17" transform={`rotate(${a} 60 36)`} />
      ))}
      <line className="hour" x1="60" y1="36" x2="60" y2="24" strokeWidth="2.5" />
      <line className="minute" x1="60" y1="36" x2="74" y2="36" />
      <circle cx="60" cy="36" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  // Time flies: the minute hand whips round twice, the hour hand follows
  react: (svg) =>
    gsap
      .timeline({ paused: true })
      .to(q(svg, '.minute'), { rotation: '+=720', svgOrigin: '60 36', duration: 1.3, ease: 'power3.inOut' })
      .to(q(svg, '.hour'), { rotation: '+=60', svgOrigin: '60 36', duration: 1.3, ease: 'power3.inOut' }, '<'),
}

const fragrance: Icon = {
  svg: (
    <>
      <rect className="cap" x="50" y="10" width="16" height="9" rx="1.5" />
      <line className="cap" x1="66" y1="14" x2="71" y2="14" />
      <rect x="53" y="19" width="10" height="7" />
      <rect x="40" y="26" width="36" height="40" rx="3" />
      <line x1="48" y1="36" x2="48" y2="56" className="otc-dim" />
      {Array.from({ length: 8 }, (_, i) => (
        <circle key={i} className="mist" cx="74" cy="14" r="1.6" fill="currentColor" stroke="none" opacity="0" />
      ))}
    </>
  ),
  // A press of the atomizer and a puff of mist
  react: (svg) => {
    const mist = q(svg, '.mist')
    return gsap
      .timeline({ paused: true })
      .to(q(svg, '.cap'), { y: 3, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' })
      .fromTo(
        mist,
        { x: 0, y: 0, opacity: 1, scale: 0.6 },
        {
          x: () => gsap.utils.random(14, 44),
          y: () => gsap.utils.random(-14, 14),
          scale: () => gsap.utils.random(1, 2.2),
          opacity: 0,
          duration: 1,
          ease: 'power2.out',
          stagger: 0.03,
        },
        0.08,
      )
  },
}

const anime: Icon = {
  svg: (
    <>
      <g className="burst">
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="60" y1="2" x2="60" y2="10" transform={`rotate(${i * 30} 60 36)`} />
        ))}
      </g>
      <path
        className="spark"
        d="M60 12C61.5 28 64 32 82 36C64 40 61.5 44 60 60C58.5 44 56 40 38 36C56 32 58.5 28 60 12Z"
        fill="currentColor"
        stroke="none"
      />
    </>
  ),
  // Manga impact: speed lines punch out, the sparkle spins and pops
  react: (svg) =>
    gsap
      .timeline({ paused: true })
      .fromTo(q(svg, '.burst'), { scale: 0.55, opacity: 0, svgOrigin: '60 36' }, { scale: 1.15, opacity: 1, duration: 0.25, ease: 'power3.out' })
      .to(q(svg, '.spark'), { rotation: 180, scale: 1.35, svgOrigin: '60 36', duration: 0.5, ease: 'back.out(3)' }, '<')
      .to(q(svg, '.burst'), { opacity: 0, scale: 1.35, duration: 0.45, ease: 'power2.in' }, '>0.1')
      .to(q(svg, '.spark'), { rotation: 360, scale: 1, svgOrigin: '60 36', duration: 0.5, ease: 'power2.inOut' }, '<')
      .set(q(svg, '.spark'), { rotation: 0 }),
}

export const icons: Record<string, Icon> = {
  'table-tennis': tableTennis,
  cars,
  watches,
  fragrance,
  anime,
}
