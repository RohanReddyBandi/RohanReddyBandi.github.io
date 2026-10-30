import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { finePointer, reducedMotion } from '../lib/motion'

// No visible cursor shape: the page itself bugs out under the pointer
// (after ChainGPT Labs' WebGL footer). An invisible stepped region at the
// pointer slices what's behind it sideways in bands, pixelates it and splits
// it into red and cyan, harder the faster you move, and drops a short trail
// of fading glitch pieces along the path. A 4px square marks the exact point
// (with the system cursor hidden, flat background would otherwise show
// nothing). Over elements tagged data-cursor="open" a small tag says so. Over the hero it stays calm (just the marker), since the hero's
// lines and letters already move under the pointer.
// The glitch is an SVG filter run as backdrop-filter, which only Chromium
// supports; Safari and Firefox keep the system cursor and just get the tags.
// Mouse/trackpad with motion allowed only.

const INTERACTIVE = 'a, button, [role="button"], [role="slider"], summary, label'
const CALM = '.hero'
const LABELS: Record<string, string> = { open: 'Open ↗' }

// The region's outline, in % of its own box: stepped, so glitched areas have
// pixel-stair edges. The filtered box is larger than the shape (which sits in
// its middle 70%) so sideways shifts pull real page, not empty pixels.
const STEPS = [
  [25, 0], [75, 0], [75, 12.5], [87.5, 12.5], [87.5, 25], [100, 25], [100, 62.5],
  [87.5, 62.5], [87.5, 87.5], [62.5, 87.5], [62.5, 100], [25, 100], [25, 87.5],
  [12.5, 87.5], [12.5, 75], [0, 75], [0, 37.5], [12.5, 37.5], [12.5, 12.5], [25, 12.5],
]
const clip = `polygon(${STEPS.map(([x, y]) => `${15 + x * 0.7}% ${15 + y * 0.7}%`).join(', ')})`

const FILTER_MS = 55 // re-roll the glitch ~18 times a second: choppy on purpose
const IDLE_MS = 1400 // over plain page, settle and stop doing work after this
const HOVER_FLOOR = 0.3 // over anything clickable or big, never fully calm

const TRAIL = 8 // pieces in the trail pool
const DROP_EVERY = 16 // px of pointer travel between trail pieces
const TAG_OFFSET = { x: 16, y: 20 }

type Bit = { el: HTMLDivElement; t: number; life: number; strength: number; alive: boolean }

export default function Cursor() {
  const head = useRef<HTMLDivElement>(null)
  const trail = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const tag = useRef<HTMLSpanElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const filter = useRef<SVGFilterElement>(null)

  useEffect(() => {
    if (!finePointer.matches || reducedMotion.matches) return
    const html = document.documentElement
    const el = root.current!
    const full = 'userAgentData' in navigator && CSS.supports('backdrop-filter', 'url(#a)')
    // Without the glitch there's nothing to replace the system cursor with
    html.classList.add(...(full ? ['has-cursor', 'cursor-full'] : ['cursor-lite']))

    const noise = filter.current!.querySelector('feTurbulence')!
    const shift = filter.current!.querySelector('feDisplacementMap')!
    const [red, cyan] = filter.current!.querySelectorAll('feOffset')

    gsap.set([head.current, ...trail.current!.children], { xPercent: -50, yPercent: -50 })
    const headX = gsap.quickTo(head.current, 'x', { duration: 0.16, ease: 'power3.out' })
    const headY = gsap.quickTo(head.current, 'y', { duration: 0.16, ease: 'power3.out' })
    const dotX = gsap.quickSetter(dot.current, 'x', 'px')
    const dotY = gsap.quickSetter(dot.current, 'y', 'px')
    const tagX = gsap.quickSetter(tag.current, 'x', 'px')
    const tagY = gsap.quickSetter(tag.current, 'y', 'px')
    const bits: Bit[] = [...trail.current!.children].map((b) => ({
      el: b as HTMLDivElement,
      t: 0,
      life: 0,
      strength: 0,
      alive: false,
    }))

    let mode = ''
    let placed = false
    let last = { x: 0, y: 0, t: 0 }
    let lastDrop = { x: 0, y: 0 }
    let nextBit = 0
    let energy = 0 // 0 calm .. 1 full glitch
    let lastActive = 0
    let lastRoll = 0
    let nextSpike = 0
    let running = false

    const roll = (now: number) => {
      if (now - lastRoll < FILTER_MS) return
      lastRoll = now
      const e = energy
      noise.setAttribute('seed', String((Math.random() * 999) | 0))
      shift.setAttribute('scale', (16 + e * 58).toFixed(1))
      red.setAttribute('dx', (-3 - e * 6).toFixed(1))
      cyan.setAttribute('dx', (3 + e * 5).toFixed(1))
    }

    // Each trail piece fades out where it was dropped
    const fadeTrail = (now: number) => {
      let any = false
      for (const b of bits) {
        if (!b.alive) continue
        const k = (now - b.t) / b.life
        if (k >= 1) {
          b.alive = false
          b.el.style.visibility = 'hidden'
          continue
        }
        any = true
        b.el.style.opacity = ((1 - k) ** 1.2 * (0.55 + 0.45 * b.strength)).toFixed(3)
      }
      return any
    }

    const tick = () => {
      const now = performance.now() // same clock as lastActive
      energy *= 0.95
      if (mode) energy = Math.max(energy, HOVER_FLOOR)
      // every so often it twitches on its own
      if (now > nextSpike) {
        energy = Math.max(energy, 0.55 + Math.random() * 0.45)
        nextSpike = now + 700 + Math.random() * 1100
      }
      roll(now)
      const trailing = fadeTrail(now)
      if (!mode && !trailing && now - lastActive > IDLE_MS) {
        energy = 0
        roll(now + FILTER_MS)
        gsap.ticker.remove(tick)
        running = false
      }
    }
    const wake = (boost: number) => {
      energy = Math.min(1, Math.max(energy, boost))
      lastActive = performance.now()
      if (full && !running) {
        running = true
        gsap.ticker.add(tick)
      }
    }

    const drop = (x: number, y: number, strength: number, now: number) => {
      const b = bits[nextBit]
      nextBit = (nextBit + 1) % bits.length
      const size = (24 + strength * 40) / 0.7
      gsap.set(b.el, { x, y, width: size, height: size })
      b.t = now
      b.life = 280 + strength * 220 // gone within ~0.3–0.5s
      b.strength = strength
      b.alive = true
      b.el.style.visibility = 'visible'
    }

    const setMode = (next: string) => {
      if (next === mode) return
      mode = next
      el.dataset.mode = next
      const words = LABELS[next]
      if (words) tag.current!.textContent = words
      tag.current!.classList.toggle('is-shown', Boolean(words))
      if (next && next !== 'calm') wake(0.8) // landing on something clickable makes it bug out
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const now = performance.now()
      const { clientX: x, clientY: y } = e
      if (!placed) {
        // first sighting: appear under the pointer instead of flying in
        gsap.set(head.current, { x, y })
        placed = true
        last = { x, y, t: now }
        lastDrop = { x, y }
      }
      el.classList.add('is-visible')
      dotX(x)
      dotY(y)
      tagX(x + TAG_OFFSET.x)
      tagY(y + TAG_OFFSET.y)
      if (!full || mode === 'calm') return
      headX(x)
      headY(y)

      const speed = Math.hypot(x - last.x, y - last.y) / Math.max(8, now - last.t) // px per ms
      last = { x, y, t: now }
      const strength = Math.min(1, speed / 2.2)
      wake(strength)
      // leave a piece behind every so often along the path
      if (Math.hypot(x - lastDrop.x, y - lastDrop.y) >= DROP_EVERY) {
        drop(lastDrop.x, lastDrop.y, strength, now)
        lastDrop = { x, y }
      }
    }
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const t = e.target as Element
      const tagged = t.closest<HTMLElement>('[data-cursor]')?.dataset.cursor
      setMode(tagged ?? (t.closest(INTERACTIVE) ? 'link' : t.closest(CALM) ? 'calm' : ''))
    }
    const press = () => wake(1)
    const hide = () => {
      el.classList.remove('is-visible')
      placed = false
    }

    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerdown', press)
    html.addEventListener('mouseleave', hide)
    return () => {
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerdown', press)
      html.removeEventListener('mouseleave', hide)
      gsap.ticker.remove(tick)
      html.classList.remove('has-cursor', 'cursor-full', 'cursor-lite')
    }
  }, [])

  return (
    <>
      <div ref={root} className="cursor" aria-hidden="true">
        <div ref={head} className="cursor__glitch cursor__head" style={{ clipPath: clip }} />
        <div ref={trail} className="cursor__trail">
          {Array.from({ length: TRAIL }, (_, i) => (
            <div key={i} className="cursor__glitch cursor__bit" style={{ clipPath: clip }} />
          ))}
        </div>
        <div ref={dot} className="cursor__dot" />
        <span ref={tag} className="cursor__tag label" />
      </div>

      {/* The glitch: horizontal bands from 1D noise, stepped into a few
          discrete shifts, then pixelated and split into red and cyan */}
      <svg className="cursor__defs" aria-hidden="true" focusable="false">
        <filter
          ref={filter}
          id="cursor-glitch"
          x="0"
          y="0"
          width="100%"
          height="100%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence type="fractalNoise" baseFrequency="0 0.06" numOctaves={1} seed={3} result="noise" />
          <feComponentTransfer in="noise" result="bands">
            <feFuncR type="discrete" tableValues="0.15 0.5 0.5 0.85 0.3 0.5 0.7" />
            <feFuncG type="linear" slope={0} intercept={0.5} />
            <feFuncA type="linear" slope={0} intercept={1} />
          </feComponentTransfer>
          <feDisplacementMap
            in="SourceGraphic"
            in2="bands"
            scale={16}
            xChannelSelector="R"
            yChannelSelector="G"
            result="shifted"
          />
          <feFlood x={3} y={3} width={1} height={1} result="dot" />
          <feComposite in="dot" width={6} height={6} result="cell" />
          <feTile in="cell" result="grid" />
          <feComposite in="shifted" in2="grid" operator="in" result="sampled" />
          <feMorphology in="sampled" operator="dilate" radius={3} result="pixels" />
          <feColorMatrix in="pixels" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="r" />
          <feOffset in="r" dx={-3} result="redShift" />
          <feColorMatrix in="pixels" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
          <feOffset in="gb" dx={3} result="cyanShift" />
          <feBlend in="redShift" in2="cyanShift" mode="screen" />
        </filter>
      </svg>
    </>
  )
}
