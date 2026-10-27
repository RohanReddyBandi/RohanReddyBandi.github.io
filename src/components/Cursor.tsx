import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { finePointer, reducedMotion } from '../lib/motion'

// A stepped, lopsided pixel block that makes whatever is under it bug out:
// the page behind it gets sliced sideways in bands, pixelated and split into
// red and cyan, harder the faster you move (after ChainGPT Labs' WebGL
// footer). It trails the pointer with some momentum while a small square
// marks the exact point. It grows and glitches over anything clickable, and
// over elements tagged data-cursor="open" | "copy" | "drag" it shows that
// action. Chromium runs the glitch as an SVG backdrop-filter; Safari and
// Firefox can't, so they get an inverted, scanlined block that jitters.
// Mouse/trackpad with motion allowed only.

const INTERACTIVE = 'a, button, [role="button"], [role="slider"], summary, label'
// Giant type: the block swells over it so there's plenty to break up.
// LET'S TALK gets the biggest, since its letters lean away from the pointer.
const BIG_TYPE = '.hero-name'
const HUGE_TYPE = '.contact__talk'
const LABELS: Record<string, string> = { open: 'Open ↗', copy: 'Copy', drag: 'Drag' }

// The shape, in % of its own box
const STEPS = [
  [25, 0], [75, 0], [75, 12.5], [87.5, 12.5], [87.5, 25], [100, 25], [100, 62.5],
  [87.5, 62.5], [87.5, 87.5], [62.5, 87.5], [62.5, 100], [25, 100], [25, 87.5],
  [12.5, 87.5], [12.5, 75], [0, 75], [0, 37.5], [12.5, 37.5], [12.5, 12.5], [25, 12.5],
]
// The filtered box is larger than the shape (which sits in its middle 70%),
// so sideways shifts pull real page from around it instead of empty pixels
const clip = `polygon(${STEPS.map(([x, y]) => `${15 + x * 0.7}% ${15 + y * 0.7}%`).join(', ')})`
const outline = STEPS.map(([x, y]) => `${x},${y}`).join(' ')

const FILTER_MS = 55 // re-roll the glitch ~18 times a second: choppy on purpose
const IDLE_MS = 1400 // over plain page, settle and stop doing work after this
const HOVER_FLOOR = 0.3 // over anything clickable or big, never fully calm

export default function Cursor() {
  const root = useRef<HTMLDivElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const dot = useRef<HTMLDivElement>(null)
  const label = useRef<HTMLSpanElement>(null)
  const filter = useRef<SVGFilterElement>(null)

  useEffect(() => {
    if (!finePointer.matches || reducedMotion.matches) return
    const html = document.documentElement
    const el = root.current!
    const full = 'userAgentData' in navigator && CSS.supports('backdrop-filter', 'url(#a)')
    html.classList.add('has-cursor', full ? 'cursor-full' : 'cursor-lite')

    const noise = filter.current!.querySelector('feTurbulence')!
    const shift = filter.current!.querySelector('feDisplacementMap')!
    const [red, cyan] = filter.current!.querySelectorAll('feOffset')

    // the block trails with momentum; the dot is exact
    const xTo = gsap.quickTo(el, 'x', { duration: 0.42, ease: 'power3.out' })
    const yTo = gsap.quickTo(el, 'y', { duration: 0.42, ease: 'power3.out' })
    const skewTo = gsap.quickTo(body.current, 'skewX', { duration: 0.3, ease: 'power3.out' })
    const dotX = gsap.quickSetter(dot.current, 'x', 'px')
    const dotY = gsap.quickSetter(dot.current, 'y', 'px')

    let mode = ''
    let placed = false
    let last = { x: 0, y: 0, t: 0 }
    let energy = 0 // 0 calm .. 1 full glitch
    let lastActive = 0
    let lastRoll = 0
    let nextSpike = 0
    let running = false

    const roll = (now: number) => {
      if (now - lastRoll < FILTER_MS) return
      lastRoll = now
      const e = energy
      if (full) {
        noise.setAttribute('seed', String((Math.random() * 999) | 0))
        shift.setAttribute('scale', (16 + e * 58).toFixed(1))
        red.setAttribute('dx', (-3 - e * 6).toFixed(1))
        cyan.setAttribute('dx', (3 + e * 5).toFixed(1))
      } else {
        // no filter to drive: jitter the block itself in steps (a CSS var, so
        // its -50% centering stays a percentage as the shape resizes)
        box.current!.style.setProperty('--jitter', `${((Math.random() - 0.5) * (4 + e * 16)).toFixed(1)}px`)
      }
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
      if (!mode && now - lastActive > IDLE_MS) {
        energy = 0
        roll(now + FILTER_MS)
        gsap.ticker.remove(tick)
        running = false
      }
    }
    const wake = (boost: number) => {
      energy = Math.min(1, Math.max(energy, boost))
      lastActive = performance.now()
      if (!running) {
        running = true
        gsap.ticker.add(tick)
      }
    }

    const setMode = (next: string) => {
      if (next === mode) return
      mode = next
      el.dataset.mode = next
      if (LABELS[next]) label.current!.textContent = LABELS[next]
      if (next) wake(0.8) // landing on something clickable makes it bug out
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const now = performance.now()
      if (!placed) {
        // first sighting: appear under the pointer instead of flying in
        gsap.set(el, { x: e.clientX, y: e.clientY })
        placed = true
        last = { x: e.clientX, y: e.clientY, t: now }
      }
      el.classList.add('is-visible')
      dot.current!.classList.add('is-visible')
      dotX(e.clientX)
      dotY(e.clientY)
      xTo(e.clientX)
      yTo(e.clientY)

      const dt = Math.max(8, now - last.t)
      const vx = (e.clientX - last.x) / dt // px per ms
      const speed = Math.hypot(vx, (e.clientY - last.y) / dt)
      last = { x: e.clientX, y: e.clientY, t: now }
      skewTo(gsap.utils.clamp(-14, 14, -vx * 6))
      wake(Math.min(1, speed / 2.2))
    }
    const settle = () => skewTo(0)
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      if (html.hasAttribute('data-dragging')) return setMode('drag')
      const t = e.target as Element
      const tagged = t.closest<HTMLElement>('[data-cursor]')?.dataset.cursor
      const type = t.closest(HUGE_TYPE) ? 'huge' : t.closest(BIG_TYPE) ? 'big' : ''
      setMode(tagged ?? (t.closest(INTERACTIVE) ? 'link' : type))
    }
    const press = () => {
      el.classList.add('is-pressed')
      wake(1)
    }
    const release = () => el.classList.remove('is-pressed')
    const hide = () => {
      el.classList.remove('is-visible')
      dot.current!.classList.remove('is-visible')
      placed = false
    }

    let stillTimer = 0
    const onMove = (e: PointerEvent) => {
      move(e)
      clearTimeout(stillTimer)
      stillTimer = window.setTimeout(settle, 90)
    }

    document.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerdown', press)
    document.addEventListener('pointerup', release)
    html.addEventListener('mouseleave', hide)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerdown', press)
      document.removeEventListener('pointerup', release)
      html.removeEventListener('mouseleave', hide)
      gsap.ticker.remove(tick)
      clearTimeout(stillTimer)
      html.classList.remove('has-cursor', 'cursor-full', 'cursor-lite')
    }
  }, [])

  return (
    <>
      <div ref={root} className="cursor" aria-hidden="true">
        <div ref={body} className="cursor__body">
          <div ref={box} className="cursor__glitch" style={{ clipPath: clip }} />
          <svg className="cursor__outline" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points={outline} />
          </svg>
        </div>
        <span ref={label} className="cursor__label label" />
      </div>
      <div ref={dot} className="cursor__dot" aria-hidden="true" />

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
            scale={10}
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
          <feOffset in="r" dx={-2} result="redShift" />
          <feColorMatrix in="pixels" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" result="gb" />
          <feOffset in="gb" dx={2} result="cyanShift" />
          <feBlend in="redShift" in2="cyanShift" mode="screen" />
        </filter>
      </svg>
    </>
  )
}
