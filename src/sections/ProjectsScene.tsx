import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { site } from '../content/site'
import { scrollToY } from '../lib/motion'

gsap.registerPlugin(ScrollTrigger)

// Projects, after wodniack.dev's work section. A green grid with a dark pill
// reading PROJECTS scrolls in; the section pins and you fly into the pill
// (the green layer scales up around it) while each letter's stacked copies fan
// out sideways into a wall: eight rows, P / R / O / J / E / C / T / S, each
// letter repeated across the screen, wobbling in 3D. The project cards then
// slide sideways across the wall in two lanes, weaving between the letters,
// and at the end it zooms back out to the pill.
//
// Everything is placed by one render(progress) driven by the scroll; nothing
// animates on its own, so it costs nothing while you're not scrolling.

const WORD = 'Projects'
const R = WORD.length
// Scroll length of each phase, in screen heights
const ZOOM_IN = 1.4
const PER_CARD = 1.15
const ZOOM_OUT = 1.1

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const pad = (n: number) => String(n).padStart(2, '0')

type Layout = {
  w: number
  h: number
  rowH: number // wall row height
  pitch: number // wall letter spacing
  k: number // copies used per row
  font: number // wall font size (px)
  capShift: number // moves a letter box so its caps sit centered on a point
  pillW: number
  pillH: number
  slot: number // pill letter spacing
  zoomMax: number // mask scale that puts the pill past the screen edges
  cardW: number
  wide: boolean
}

/** Copies needed per row to cover the screen while rows loop sideways. A
 *  tab that loads in the background can report a 0×0 window, so fall back. */
const copiesFor = (w: number, h: number) => (w > 0 && h > 0 ? Math.ceil(w / ((h * 1.04) / R * 0.92)) + 4 : 24)

/** Tanker's cap height and where its caps sit inside a line-height: 1 box */
function measureTanker() {
  const c = document.createElement('canvas').getContext('2d')!
  c.font = '400 100px Tanker'
  const m = c.measureText('H')
  const fa = m.fontBoundingBoxAscent || 90
  const fd = m.fontBoundingBoxDescent || 25
  const cap = m.actualBoundingBoxAscent || 72
  // baseline from the top of a 100px line box, then the caps' middle
  const baseline = (100 - (fa + fd)) / 2 + fa
  return { cap: cap / 100, capMid: (baseline - cap / 2) / 100 }
}

function computeLayout(el: HTMLElement): Layout {
  const w = el.clientWidth
  const h = el.clientHeight
  const wide = w >= 768
  const { cap, capMid } = measureTanker()
  const rowH = (h * 1.04) / R
  const font = (rowH * 0.88) / cap // caps fill 88% of a row
  const pitch = rowH * 0.92
  const pillH = Math.min(h * 0.8, w * 1.6)
  const slot = (pillH * 0.84) / R
  const pillW = Math.max(slot * 1.55, pillH * 0.2)
  return {
    w,
    h,
    rowH,
    pitch,
    k: Math.ceil(w / pitch) + 4,
    font,
    capShift: (0.5 - capMid) * font,
    pillW,
    pillH,
    slot,
    zoomMax: 1.25 * Math.max(w / pillW, h / pillH),
    cardW: wide ? Math.min(w * 0.32, 470) : w * 0.72,
    wide,
  }
}

/** The green layer's shapes: the fill with a pill-shaped hole, the grid
 *  squares and a ring around the hole */
function maskPaths({ w, h, pillW, pillH }: Layout) {
  const cx = w / 2
  const cy = h / 2
  const pill = (pw: number, ph: number) => {
    const r = pw / 2
    const x = cx - r
    const y = cy - ph / 2
    return `M ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + pw} ${y + r} L ${x + pw} ${y + ph - r} A ${r} ${r} 0 0 1 ${x} ${y + ph - r} Z`
  }
  const cell = Math.max(64, Math.min(w, h * 1.6) / 12)
  const lines: string[] = []
  for (let x = cx % cell; x < w; x += cell) lines.push(`M ${x.toFixed(1)} 0 V ${h}`)
  for (let y = cy % cell; y < h; y += cell) lines.push(`M 0 ${y.toFixed(1)} H ${w}`)
  return {
    fill: new Path2D(`M -2 -2 H ${w + 2} V ${h + 2} H -2 Z ${pill(pillW, pillH)}`),
    grid: new Path2D(lines.join(' ')),
    ring: new Path2D(pill(pillW + 22, pillH + 22)),
  }
}

function Card({ project, index, n, children }: { project: (typeof site.work)[number]; index: number; n: number; children: ReactNode }) {
  return (
    <li className={`pj-card ${project.self ? 'is-self' : ''}`}>
      <a className="pj-card__link" href={project.href} target="_blank" rel="noopener" data-cursor="open">
        <span className="pj-card__tag label" aria-hidden="true">
          Click me ↗
        </span>
        <div className="pj-card__shot" aria-hidden="true">
          {children}
        </div>
        <p className="pj-card__caption label">
          <span>
            {project.title}
            <span className="pj-card__line"> · {project.line}</span>
            <span className="sr-only"> ({project.linkLabel}, opens in a new tab)</span>
          </span>
          <span aria-hidden="true">
            {project.self ? `Commit #${__BUILD__.commits} · ` : ''}#{project.code}-{pad(index + 1)}/{pad(n)}
          </span>
        </p>
      </a>
    </li>
  )
}

export default function ProjectsScene({ shot }: { shot: (project: (typeof site.work)[number]) => ReactNode }) {
  const section = useRef<HTMLElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const n = site.work.length
  const [layout, setLayout] = useState<Layout | null>(null)
  // copies rendered per row; only grows, so a resize never drops letters
  const [copies, setCopies] = useState(() => copiesFor(innerWidth, innerHeight))

  // Measure once Tanker is in (its cap height places the letters)
  useEffect(() => {
    let alive = true
    const measure = () => {
      if (!alive || !inner.current) return
      // nothing to lay out until the window has a size
      if (!inner.current.clientWidth || !inner.current.clientHeight) return
      const next = computeLayout(inner.current)
      setLayout(next)
      setCopies((c) => Math.max(c, next.k))
    }
    document.fonts.load('400 100px Tanker').then(measure)
    const ro = new ResizeObserver(() => measure())
    ro.observe(inner.current!)
    return () => {
      alive = false
      ro.disconnect()
    }
  }, [])

  useLayoutEffect(() => {
    if (!layout) return
    const el = section.current!
    const box = inner.current!
    const L = layout
    const mask = box.querySelector<HTMLCanvasElement>('.pj-mask')!
    const sizes = [1, 0.86, 0.94, 1.08]
    const rows = gsap.utils.toArray<HTMLElement>('.pj-row', box)
    const cards = gsap.utils.toArray<HTMLElement>('.pj-card', box)
    const letters = rows.map((r) => [...r.querySelectorAll<HTMLElement>('.pj-letter')])
    letters.forEach((row) =>
      row.forEach((l, i) => {
        l.style.fontSize = `${L.font}px`
        l.style.display = i < L.k ? '' : 'none'
      }),
    )

    // The green layer is drawn on a canvas at each frame's zoom. As a scaled
    // SVG the browser had to re-raster the whole screen at a new size every
    // frame, and Dia couldn't keep up: it showed holes and missing tiles.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    mask.width = Math.round(L.w * dpr)
    mask.height = Math.round(L.h * dpr)
    const mctx = mask.getContext('2d')!
    const paths = maskPaths(L)
    const root = getComputedStyle(document.documentElement)
    const brand = root.getPropertyValue('--brand').trim()
    const deep = root.getPropertyValue('--deep').trim()
    let drawnAt = 0
    const drawMask = (s: number) => {
      if (s === drawnAt) return
      drawnAt = s
      mctx.setTransform(1, 0, 0, 1, 0, 0)
      mctx.clearRect(0, 0, mask.width, mask.height)
      // scaled about the screen's center
      mctx.setTransform(dpr * s, 0, 0, dpr * s, (L.w / 2) * (1 - s) * dpr, (L.h / 2) * (1 - s) * dpr)
      mctx.fillStyle = brand
      mctx.fill(paths.fill, 'evenodd')
      mctx.save()
      mctx.clip(paths.fill, 'evenodd')
      mctx.strokeStyle = deep
      mctx.lineWidth = 1
      mctx.stroke(paths.grid)
      mctx.restore()
      mctx.globalAlpha = 0.7
      mctx.stroke(paths.ring)
      mctx.globalAlpha = 1
    }

    // Cards keep one size; the slight shrink for depth is a scale, so the
    // browser never has to lay them out or repaint them while they move
    cards.forEach((card, i) => (card.style.width = `${L.cardW * sizes[i % sizes.length]}px`))

    // Card timing within the middle phase: each crosses the screen over
    // SPAN of it, staggered so two are on screen at a time
    const SPAN = n > 1 ? 0.46 : 1
    const step = n > 1 ? (1 - SPAN) / (n - 1) : 0
    const total = ZOOM_IN + PER_CARD * n + ZOOM_OUT
    const inEnd = ZOOM_IN / total
    const outStart = 1 - ZOOM_OUT / total
    const lanes = L.wide ? [-0.2, 0.22] : [-0.19, 0.2]
    const loop = L.k * L.pitch

    const render = (p: number) => {
      // q: how far "into" the pill (0 = the pill, 1 = the wall)
      const q = p < inEnd ? easeInOut(p / inEnd) : p > outStart ? easeInOut(1 - (p - outStart) / (1 - outStart)) : 1
      // m: progress through the wall (the cards' time)
      const m = clamp01((p - inEnd) / (outStart - inEnd))

      // The green layer scales up around the pill, exponentially so the zoom
      // feels steady, and steps aside once it's past the screen edges
      const hidden = q > 0.995
      mask.style.visibility = hidden ? 'hidden' : 'visible'
      if (!hidden) drawMask(L.zoomMax ** q)

      const fan = q * q // copies fan out a beat after the zoom starts
      const grow = easeInOut(q)
      const sPill = L.slot / L.rowH
      letters.forEach((row, r) => {
        const yWall = (r + 0.5 - R / 2) * L.rowH
        const yPill = (r + 0.5 - R / 2) * L.slot
        const y = lerp(yPill, yWall, grow)
        const scale = lerp(sPill, 1, grow)
        // rows drift sideways in alternate directions, looping around
        const drift = (r % 2 ? 1 : -1) * (m * 2.4 + p * 0.6) * L.pitch * 1.3
        for (let i = 0; i < L.k; i++) {
          const l = row[i]
          if (!l) break
          // x on the wall: evenly spaced, wrapped so the row never runs out
          let x = (((i * L.pitch + drift) % loop) + loop) % loop - loop / 2
          x *= fan
          const a = m * Math.PI * 6 + i * 0.55 + r * 1.2
          const wob = Math.sin(a) * grow
          l.style.transform =
            `translate3d(${x.toFixed(1)}px, ${(y + L.capShift * scale + Math.cos(a * 0.7) * L.rowH * 0.04 * grow).toFixed(1)}px, ${(wob * 70).toFixed(1)}px) ` +
            `rotateY(${(wob * 38).toFixed(1)}deg) rotateZ(${(Math.cos(a * 0.9) * 4 * grow).toFixed(1)}deg) scale(${scale.toFixed(4)})`
        }
      })

      // Cards slide across left to right, alternating lanes
      cards.forEach((card, i) => {
        const t = (m - i * step) / SPAN
        const on = t > -0.05 && t < 1.05 && q > 0.98
        card.style.visibility = on ? 'visible' : 'hidden'
        if (!on) return
        // in front of the letters' biggest wobble (~90px), and shrunk by the
        // same amount the 1200px perspective enlarges it
        const z = 110 + Math.sin(t * Math.PI) * 16
        const shrink = 1 - z / 1200
        const w = L.cardW * sizes[i % sizes.length] * shrink
        const x = lerp(-L.w / 2 - w * 0.6, L.w / 2 + w * 0.6, t)
        const y = lanes[i % 2] * L.h
        card.style.transform = `translate(-50%, -50%) translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, ${z.toFixed(1)}px) rotateY(${((0.5 - t) * 10).toFixed(1)}deg) scale(${shrink.toFixed(4)})`
        card.style.pointerEvents = t > 0.05 && t < 0.95 ? 'auto' : 'none'
      })
    }

    const pin = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: () => `+=${window.innerHeight * total}`,
      pin: box,
      anticipatePin: 1,
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
    })
    render(pin.progress)

    // Tabbing to a card scrolls to the moment it's mid-screen
    const focus = cards.map((card, i) => {
      const go = () => {
        const p = inEnd + (outStart - inEnd) * (i * step + SPAN / 2)
        scrollToY(pin.start + (pin.end - pin.start) * p)
      }
      card.addEventListener('focusin', go)
      return () => card.removeEventListener('focusin', go)
    })
    return () => {
      focus.forEach((off) => off())
      pin.kill()
    }
  }, [layout, copies, n])

  return (
    <section ref={section} id="work" className="pj" aria-labelledby="work-title">
      <div ref={inner} className="pj__inner">
        <h2 id="work-title" className="sr-only">
          Projects
        </h2>
        <div className="pj__stage">
          <div className="pj__space">
            <div className="pj__wall" aria-hidden="true">
              {[...WORD].map((ch, r) => (
                <div key={r} className="pj-row">
                  {Array.from({ length: copies }, (_, i) => (
                    <span key={i} className="pj-letter">
                      {ch}
                    </span>
                  ))}
                </div>
              ))}
            </div>
            <ol className="pj__cards">
              {site.work.map((p, i) => (
                <Card key={p.title} project={p} index={i} n={n}>
                  {shot(p)}
                </Card>
              ))}
            </ol>
          </div>
        </div>
        <canvas className="pj-mask" aria-hidden="true" />
      </div>
    </section>
  )
}
