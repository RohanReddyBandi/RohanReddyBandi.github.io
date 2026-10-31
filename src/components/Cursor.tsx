import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { GlitchSmoke } from '../lib/glitchSmoke'
import { finePointer, reducedMotion } from '../lib/motion'

// The page bugs out under the pointer (after ChainGPT Labs' WebGL footer):
// a stepped region at the pointer slices what's behind it sideways in bands,
// pixelates it and turns it red with a white ghost split off, harder the
// faster you move. Behind it, the pointer stirs a thin red glitched smoke
// trail that swirls and fades (after lenvalproperties.com; see
// lib/glitchSmoke.ts). The system cursor stays: a page-drawn one only moves
// when the page draws a frame, so it lags behind the mouse, badly when the
// browser caps the frame rate (Chromium's Energy Saver runs pages at 30fps on
// a low battery). Over elements tagged data-cursor="open" a small tag says so.
// The region is an SVG filter run as backdrop-filter, which only Chromium
// supports; Safari and Firefox get the smoke and the tags. Mouse/trackpad
// with motion allowed only.

const INTERACTIVE = 'a, button, [role="button"], [role="slider"], summary, label'
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

const TAG_OFFSET = { x: 16, y: 20 }

export default function Cursor() {
  const head = useRef<HTMLDivElement>(null)
  const smokeCanvas = useRef<HTMLCanvasElement>(null)
  const tag = useRef<HTMLSpanElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const filter = useRef<SVGFilterElement>(null)

  useEffect(() => {
    if (!finePointer.matches || reducedMotion.matches) return
    const html = document.documentElement
    const el = root.current!
    const full = 'userAgentData' in navigator && CSS.supports('backdrop-filter', 'url(#a)')
    html.classList.add(full ? 'cursor-full' : 'cursor-lite')

    const noise = filter.current!.querySelector('feTurbulence')!
    const shift = filter.current!.querySelector('feDisplacementMap')!
    const [red, ghost] = filter.current!.querySelectorAll('feOffset')

    const smoke = GlitchSmoke.create(smokeCanvas.current!)
    const resize = () => smoke?.resize()
    window.addEventListener('resize', resize)

    gsap.set(head.current, { xPercent: -50, yPercent: -50 })
    // a short catch-up, so it stays on the pointer instead of trailing it
    const headX = gsap.quickTo(head.current, 'x', { duration: 0.06, ease: 'power2.out' })
    const headY = gsap.quickTo(head.current, 'y', { duration: 0.06, ease: 'power2.out' })
    const tagX = gsap.quickSetter(tag.current, 'x', 'px')
    const tagY = gsap.quickSetter(tag.current, 'y', 'px')

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
      noise.setAttribute('seed', String((Math.random() * 999) | 0))
      shift.setAttribute('scale', (24 + e * 84).toFixed(1))
      red.setAttribute('dx', (-3 - e * 7).toFixed(1))
      ghost.setAttribute('dx', (4 + e * 10).toFixed(1))
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
      if (full && !running) {
        running = true
        gsap.ticker.add(tick)
      }
    }

    const setMode = (next: string) => {
      if (next === mode) return
      mode = next
      el.dataset.mode = next
      const words = LABELS[next]
      if (words) tag.current!.textContent = words
      tag.current!.classList.toggle('is-shown', Boolean(words))
      if (next) wake(0.8) // landing on something clickable makes it bug out
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
      }
      smoke?.move(x, y)
      el.classList.add('is-visible')
      tagX(x + TAG_OFFSET.x)
      tagY(y + TAG_OFFSET.y)
      if (!full) return
      headX(x)
      headY(y)

      const speed = Math.hypot(x - last.x, y - last.y) / Math.max(8, now - last.t) // px per ms
      last = { x, y, t: now }
      const strength = Math.min(1, speed / 2.2)
      wake(strength)
    }
    const over = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      const t = e.target as Element
      const tagged = t.closest<HTMLElement>('[data-cursor]')?.dataset.cursor
      setMode(tagged ?? (t.closest(INTERACTIVE) ? 'link' : ''))
    }
    const press = () => wake(1)
    const hide = () => {
      el.classList.remove('is-visible')
      placed = false
      smoke?.lift()
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
      window.removeEventListener('resize', resize)
      gsap.ticker.remove(tick)
      smoke?.destroy()
      html.classList.remove('cursor-full', 'cursor-lite')
    }
  }, [])

  return (
    <>
      <div ref={root} className="cursor" aria-hidden="true">
        <div ref={head} className="cursor__glitch cursor__head" style={{ clipPath: clip }} />
        <canvas ref={smokeCanvas} className="cursor__smoke" />
        <span ref={tag} className="cursor__tag label" />
      </div>

      {/* The glitch: horizontal bands from 1D noise, stepped into a few
          discrete shifts, then pixelated, turned red (dark red where the page
          is dark) and given a white ghost offset the other way */}
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
          <feTurbulence type="fractalNoise" baseFrequency="0 0.08" numOctaves={1} seed={3} result="noise" />
          <feComponentTransfer in="noise" result="bands">
            <feFuncR type="discrete" tableValues="0 0.5 1 0.5 0.15 0.85 0.5 0.3" />
            <feFuncG type="linear" slope={0} intercept={0.5} />
            <feFuncA type="linear" slope={0} intercept={1} />
          </feComponentTransfer>
          <feDisplacementMap
            in="SourceGraphic"
            in2="bands"
            scale={24}
            xChannelSelector="R"
            yChannelSelector="G"
            result="shifted"
          />
          <feFlood x={3} y={3} width={1} height={1} result="dot" />
          <feComposite in="dot" width={6} height={6} result="cell" />
          <feTile in="cell" result="grid" />
          <feComposite in="shifted" in2="grid" operator="in" result="sampled" />
          <feMorphology in="sampled" operator="dilate" radius={3} result="pixels" />
          <feColorMatrix
            in="pixels"
            type="matrix"
            values="0.5 1 0.3 0 0.2  0.04 0.08 0.02 0 0.01  0.06 0.12 0.03 0 0.02  0 0 0 1 0"
            result="r"
          />
          <feOffset in="r" dx={-3} result="redShift" />
          <feColorMatrix
            in="pixels"
            type="matrix"
            values="0.2 0.4 0.1 0 0  0.2 0.4 0.1 0 0  0.2 0.4 0.1 0 0  0 0 0 1 0"
            result="white"
          />
          <feOffset in="white" dx={4} result="ghostShift" />
          <feBlend in="redShift" in2="ghostShift" mode="screen" />
        </filter>
      </svg>
    </>
  )
}
