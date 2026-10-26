import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { site } from './content/site'
import { accentRgba, setMarket } from './lib/accent'
import { aggregate, BASE_COUNT, generateSeries } from './lib/market'
import './styles/global.css'

// 404: "Market closed." The same seeded chart rallies, crashes, and then
// flatlines into a trading halt. Drawn once (and on resize); nothing ticks.

setMarket('bear', { instant: true })

const CRASH_END = 0.6 // share of the series shown before the flatline

function drawFlatline(canvas: HTMLCanvasElement, dot: HTMLElement) {
  const w = canvas.clientWidth
  const h = canvas.clientHeight
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(w * dpr)
  canvas.height = Math.round(h * dpr)
  const ctx = canvas.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  const gutter = Math.min(44, Math.max(16, w * 0.032))
  const plotRight = w - gutter - (w < 768 ? 46 : 58)
  const history = w * 0.58
  const raw = generateSeries().slice(0, Math.round(BASE_COUNT * CRASH_END))
  const factor = Math.max(1, Math.ceil(raw.length / (history / (w < 768 ? 6 : 8))))
  const candles = aggregate(raw, factor)
  const pitch = history / candles.length
  const top = h * 0.14
  const bottom = h * (w < 768 ? 0.52 : 0.6)
  const min = Math.min(...candles.map((c) => c.l))
  const max = Math.max(...candles.map((c) => c.h))
  const y = (p: number) => bottom - ((p - min) / (max - min)) * (bottom - top)

  ctx.clearRect(0, 0, w, h)
  ctx.lineWidth = 1
  ctx.strokeStyle = 'rgba(237, 237, 232, 0.05)'
  for (let i = 0; i <= 4; i++) {
    const gy = Math.round(top + ((bottom - top) * i) / 4) + 0.5
    ctx.beginPath()
    ctx.moveTo(0, gy)
    ctx.lineTo(plotRight, gy)
    ctx.stroke()
  }

  // The candles, faint, with a little glow
  ctx.shadowColor = accentRgba(0.6)
  ctx.shadowBlur = 8 * dpr
  const color = accentRgba(0.35)
  ctx.strokeStyle = color
  ctx.fillStyle = color
  const body = Math.max(2, pitch * 0.58)
  candles.forEach((c, i) => {
    const cx = Math.round((i + 0.5) * pitch) + 0.5
    const yo = y(c.o)
    const yc = y(c.c)
    const t = Math.min(yo, yc)
    const hgt = Math.max(1, Math.abs(yc - yo))
    ctx.beginPath()
    ctx.moveTo(cx, y(c.h))
    ctx.lineTo(cx, t)
    ctx.moveTo(cx, t + hgt)
    ctx.lineTo(cx, y(c.l))
    ctx.stroke()
    if (c.c >= c.o) ctx.fillRect(Math.round(cx - body / 2), t, Math.round(body), hgt)
    else ctx.strokeRect(Math.round(cx - body / 2) + 0.5, Math.round(t) + 0.5, Math.round(body) - 1, Math.max(1, Math.round(hgt) - 1))
  })

  // ...then nothing. A flat line to the edge, and the halt tag on the axis.
  const last = candles[candles.length - 1]
  const fy = Math.round(y(last.c)) + 0.5
  ctx.shadowBlur = 10 * dpr
  ctx.strokeStyle = accentRgba(0.9)
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(history, fy)
  ctx.lineTo(plotRight, fy)
  ctx.stroke()
  ctx.shadowBlur = 0

  ctx.font = '500 10px "JetBrains Mono", ui-monospace, monospace'
  const label = 'HALTED'
  const tw = ctx.measureText(label).width
  ctx.fillStyle = accentRgba(0.9)
  ctx.fillRect(w - gutter - tw - 8, fy - 8, tw + 8, 16)
  ctx.fillStyle = '#0b0b0c'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, w - gutter - tw - 4, fy + 0.5)

  dot.style.transform = `translate(${plotRight}px, ${fy}px)`
}

function NotFound() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const dot = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const draw = () => drawFlatline(canvas.current!, dot.current!)
    const ro = new ResizeObserver(draw)
    ro.observe(canvas.current!)
    document.fonts.ready.then(draw)
    return () => ro.disconnect()
  }, [])

  return (
    <main className="nf">
      <canvas ref={canvas} className="nf__chart" aria-hidden="true" />
      <span ref={dot} className="nf__dot" aria-hidden="true" />

      <header className="site-grid py-5">
        <a href="/" className="topbar__logo col-span-2" aria-label={`${site.name.first} ${site.name.last}, home`}>
          {site.initials}
        </a>
      </header>

      <div className="nf__body site-grid">
        <p className="label col-span-full text-accent">Error 404 · Trading halted</p>
        <h1 className="nf__title col-span-full">
          Market
          <br />
          closed.
        </h1>
        <p className="col-span-full mt-6 max-w-[34ch] text-lead text-muted md:col-span-6">
          This page doesn’t exist. Maybe it got delisted.
        </p>
        <div className="col-span-full mt-10">
          <a className="btn" href="/">
            <span>Back home</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
      <div className="grain" aria-hidden="true" />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotFound />
  </StrictMode>,
)
