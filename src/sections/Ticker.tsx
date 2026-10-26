import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef, useState } from 'react'
import { site } from '../content/site'
import { reducedMotion } from '../lib/motion'
import { useRevealClip } from '../lib/reveal'

const SPEED = 70 // px per second at rest
const COPIES = 3 // per half of the track; enough to outrun a 2560px screen

function Arrow({ up }: { up: boolean }) {
  return (
    <svg className={`ticker__arrow ${up ? 'is-up' : 'is-down'}`} viewBox="0 0 10 8" aria-hidden="true">
      <path d={up ? 'M5 0L10 8H0Z' : 'M5 8L0 0H10Z'} />
    </svg>
  )
}

function Group() {
  return (
    <div className="ticker__group">
      {site.ticker.map((t) => (
        <span key={t.name} className="ticker__item">
          {t.name}
          <Arrow up={t.up} />
          <span className="ticker__sep">·</span>
        </span>
      ))}
    </div>
  )
}

/**
 * Stock-ticker marquee. Drifts on its own, follows the scroll direction and
 * speeds up with scroll speed, eases to a stop on hover, and pauses for good
 * with the Live button. Static with reduced motion.
 */
export default function Ticker() {
  const band = useRef<HTMLDivElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const animated = !reducedMotion.matches
  useRevealClip(band, { from: 'inset(0% 0% 0% 100%)' })

  useLayoutEffect(() => {
    if (!animated) return
    const el = band.current!
    let dir = 1
    let boost = 0
    let hover = false
    let rate = 1
    let loop: gsap.core.Tween

    // Ease the playback rate toward where it should be: stopped when hovered
    // or paused, otherwise the scroll direction plus a decaying speed boost
    const steer = () => {
      boost *= 0.94
      const target = hover || pausedRef.current ? 0 : dir * (1 + boost)
      rate += (target - rate) * 0.08
      loop.timeScale(Math.abs(rate) < 0.001 ? 0 : rate)
    }

    const ctx = gsap.context(() => {
      loop = gsap.to(track.current, {
        xPercent: -50,
        duration: track.current!.scrollWidth / 2 / SPEED,
        ease: 'none',
        repeat: -1,
        paused: true,
      })
      // Start deep into the repeats so it can also run backwards
      loop.totalTime(loop.duration() * 1000)

      // Only runs while the band is on screen
      ScrollTrigger.create({
        trigger: el,
        start: 'top bottom',
        end: 'bottom top',
        onToggle: (self) => {
          if (self.isActive) {
            loop.play()
            gsap.ticker.add(steer)
          } else {
            loop.pause()
            gsap.ticker.remove(steer)
          }
        },
        onUpdate: (self) => {
          dir = self.direction
          boost = Math.max(boost, Math.min(Math.abs(self.getVelocity()) / 600, 5))
        },
      })
    }, el)

    const enter = () => (hover = true)
    const leave = () => (hover = false)
    const viewport = el.querySelector('.ticker__viewport')!
    viewport.addEventListener('pointerenter', enter)
    viewport.addEventListener('pointerleave', leave)
    return () => {
      viewport.removeEventListener('pointerenter', enter)
      viewport.removeEventListener('pointerleave', leave)
      gsap.ticker.remove(steer)
      ctx.revert()
    }
  }, [animated])

  const toggle = () => {
    pausedRef.current = !pausedRef.current
    setPaused(pausedRef.current)
  }

  const spoken = site.ticker.map((t) => `${t.name} ${t.up ? 'up' : 'down'}`).join(', ')

  return (
    <div ref={band} className="ticker" role="marquee" aria-label="Ticker">
      {animated ? (
        <button type="button" className="ticker__live label" aria-pressed={paused} onClick={toggle}>
          <span className={paused ? 'ticker__paused' : 'live-dot'} aria-hidden="true" />
          {paused ? 'Paused' : 'Live'}
          <span className="sr-only">{paused ? ', press to resume the ticker' : ', press to pause the ticker'}</span>
        </button>
      ) : (
        <span className="ticker__live label">Ticker</span>
      )}
      <div className="ticker__viewport" aria-hidden="true">
        <div ref={track} className="ticker__track">
          {Array.from({ length: COPIES * 2 }, (_, i) => (
            <Group key={i} />
          ))}
        </div>
      </div>
      <p className="sr-only">{spoken}</p>
    </div>
  )
}
