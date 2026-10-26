import { accent, accentRgba } from '../lib/accent'
import { aggregate, BASE_COUNT, gaussian, type Candle } from '../lib/market'

// Draws the hero's candlestick chart. The expensive part (every candle with
// its glow) is drawn once into an offscreen layer in white, then tinted with
// the accent. Each frame only composites that layer and draws the few moving
// bits: the spotlight around the handle, tick flashes, and the live last candle.

const MAX_DPR = 2
const FONT = '400 10px "JetBrains Mono", ui-monospace, monospace'
const CANDLE_ALPHA = 0.3
const SPOTLIGHT_ALPHA = 0.6
const LIVE_ALPHA = 0.75
const FLASH_MS = 900
const FLASHES_PER_SEC = 3.5
const LIVE_TICK_MS = 140

type Layout = {
  w: number
  h: number
  dpr: number
  pitch: number
  body: number
  plotRight: number
  axisRight: number
  top: number
  bottom: number
  min: number
  max: number
}

export class ChartRenderer {
  candles: Candle[] = []
  /** x (CSS px) of the drag handle; candles around it are drawn brighter */
  focusX: number | null = null
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private layout: Layout | null = null
  private base: Candle[]
  private factor = 1
  private glowLayer = document.createElement('canvas') // white candles + glow
  private tinted = document.createElement('canvas') // glowLayer in the accent
  private gridLayer = document.createElement('canvas') // price grid + labels
  private spot = document.createElement('canvas') // scratch for the spotlight
  private tintKey = ''
  private flashes: { i: number; t0: number }[] = []
  private live = { c: 0, h: 0, l: 0, target: 0, nextTick: 0 }
  private lastFrame = 0
  private rand = Math.random

  constructor(canvas: HTMLCanvasElement, base: Candle[]) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.base = base
  }

  /** Fewer, fatter candles on narrow screens, same story. */
  private pickFactor(w: number) {
    const minPitch = w < 768 ? 6 : 8
    const factors = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16]
    return factors.find((f) => w / (BASE_COUNT / f) >= minPitch) ?? 16
  }

  /** `band` is the vertical span (CSS px) the price range is mapped into. */
  resize(w: number, h: number, band: { top: number; bottom: number }) {
    if (w === 0 || h === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    this.factor = this.pickFactor(w)
    this.candles = aggregate(this.base, this.factor)

    // Price labels end on the site gutter, same as --gutter in tokens.css
    const gutter = Math.min(44, Math.max(16, w * 0.032))
    const axisRight = w - gutter
    const plotRight = axisRight - (w < 768 ? 34 : 46)
    const pitch = plotRight / this.candles.length
    const lows = this.candles.map((c) => c.l)
    const highs = this.candles.map((c) => c.h)
    this.layout = {
      w,
      h,
      dpr,
      pitch,
      body: Math.max(2, pitch * 0.58),
      plotRight,
      axisRight,
      top: band.top,
      bottom: band.bottom,
      min: Math.min(...lows),
      max: Math.max(...highs),
    }

    for (const c of [this.canvas, this.glowLayer, this.tinted, this.gridLayer]) {
      c.width = Math.round(w * dpr)
      c.height = Math.round(h * dpr)
    }
    this.tintKey = ''
    this.flashes = []
    const last = this.candles[this.candles.length - 1]
    this.live = { c: last.c, h: last.h, l: last.l, target: last.c, nextTick: 0 }
    this.buildGlowLayer()
    this.buildGridLayer()
  }

  /** Redraw labels once the mono font has loaded. */
  refreshText() {
    if (this.layout) this.buildGridLayer()
  }

  get ready() {
    return this.layout !== null
  }

  get count() {
    return this.candles.length
  }

  /** Price area, CSS px */
  get band() {
    const { top, bottom, plotRight } = this.layout!
    return { top, bottom, right: plotRight }
  }

  /** x for a (fractional) candle position, CSS px */
  x(pos: number) {
    return (pos + 0.5) * this.layout!.pitch
  }

  /** Inverse of x() */
  posAt(x: number) {
    return x / this.layout!.pitch - 0.5
  }

  y(price: number) {
    const { top, bottom, min, max } = this.layout!
    return bottom - ((price - min) / (max - min)) * (bottom - top)
  }

  /** Close price at a fractional position, interpolated between candles */
  priceAt(pos: number) {
    const last = this.candles.length - 1
    const p = Math.min(last, Math.max(0, pos))
    const i = Math.floor(p)
    const a = this.closeAt(i)
    const b = this.closeAt(Math.min(last, i + 1))
    return a + (b - a) * (p - i)
  }

  /** Index into the un-merged daily series for a candle position */
  baseIndexAt(pos: number) {
    const i = Math.min(this.candles.length - 1, Math.max(0, Math.round(pos)))
    return Math.min(BASE_COUNT - 1, (i + 1) * this.factor - 1)
  }

  private closeAt(i: number) {
    return i === this.candles.length - 1 ? this.live.c : this.candles[i].c
  }

  /** One animated frame. `now` is in ms. */
  frame(now: number) {
    if (!this.layout) return
    const dt = this.lastFrame ? Math.min(now - this.lastFrame, 100) : 16
    this.lastFrame = now
    this.stepFlashes(now, dt)
    this.stepLive(now)
    this.draw(now)
  }

  /** A still frame, for reduced motion or while paused. */
  drawStill() {
    if (!this.layout) return
    this.flashes = []
    this.draw(0)
  }

  private stepFlashes(now: number, dt: number) {
    this.flashes = this.flashes.filter((f) => now - f.t0 < FLASH_MS)
    if (this.rand() < (dt / 1000) * FLASHES_PER_SEC) {
      this.flashes.push({ i: Math.floor(this.rand() * (this.candles.length - 1)), t0: now })
    }
  }

  // The last candle is "live": its close wanders and its wicks stretch.
  private stepLive(now: number) {
    const last = this.candles[this.candles.length - 1]
    const range = last.h - last.l || last.c * 0.01
    const live = this.live
    if (now >= live.nextTick) {
      live.target += gaussian(this.rand) * range * 0.18
      live.target = Math.min(last.h + range * 0.4, Math.max(last.l - range * 0.4, live.target))
      // drift back toward the real close so it never wanders off
      live.target += (last.c - live.target) * 0.08
      live.nextTick = now + LIVE_TICK_MS * (0.6 + this.rand() * 0.8)
    }
    live.c += (live.target - live.c) * 0.2
    live.h = Math.max(live.h, live.c)
    live.l = Math.min(live.l, live.c)
  }

  private draw(now: number) {
    const { h, dpr } = this.layout!
    const ctx = this.ctx
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.drawImage(this.gridLayer, 0, 0)

    this.retintIfNeeded()
    ctx.globalAlpha = CANDLE_ALPHA
    ctx.drawImage(this.tinted, 0, 0)
    ctx.globalAlpha = 1
    if (this.focusX !== null) this.drawSpotlight(ctx, this.focusX)

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.shadowColor = accentRgba(0.8)
    ctx.shadowBlur = 10 * dpr
    for (const f of this.flashes) {
      const t = (now - f.t0) / FLASH_MS
      const a = 0.6 * (1 - t) ** 2
      this.drawCandle(ctx, this.candles[f.i], f.i, accentRgba(a))
    }

    const lastIndex = this.candles.length - 1
    const last = this.candles[lastIndex]
    const live = { o: last.o, h: this.live.h, l: this.live.l, c: this.live.c }
    this.drawCandle(ctx, live, lastIndex, accentRgba(LIVE_ALPHA))
    ctx.shadowBlur = 0

    this.drawLastPrice(ctx, live.c, h)
  }

  // A brighter copy of the candles around the handle, faded out at both
  // sides with a gradient mask. Works in device pixels.
  private drawSpotlight(ctx: CanvasRenderingContext2D, focusX: number) {
    const { w, dpr } = this.layout!
    const r = Math.round(Math.max(90, w * 0.08) * dpr)
    const H = this.canvas.height
    const left = Math.round(focusX * dpr) - r
    const srcX = Math.max(0, left)
    const srcW = Math.min(this.canvas.width, left + 2 * r) - srcX
    if (srcW <= 0) return

    const s = this.spot
    if (s.width !== 2 * r || s.height !== H) {
      s.width = 2 * r
      s.height = H
    }
    const g = s.getContext('2d')!
    g.globalCompositeOperation = 'source-over'
    g.clearRect(0, 0, s.width, s.height)
    g.drawImage(this.tinted, srcX, 0, srcW, H, srcX - left, 0, srcW, H)
    g.globalCompositeOperation = 'destination-in'
    const mask = g.createLinearGradient(0, 0, 2 * r, 0)
    mask.addColorStop(0, 'rgba(0, 0, 0, 0)')
    mask.addColorStop(0.5, 'rgba(0, 0, 0, 1)')
    mask.addColorStop(1, 'rgba(0, 0, 0, 0)')
    g.fillStyle = mask
    g.fillRect(0, 0, s.width, s.height)

    ctx.globalAlpha = SPOTLIGHT_ALPHA
    ctx.drawImage(s, left, 0)
    ctx.globalAlpha = 1
  }

  // Dashed line at the live price, with a tag on the axis like a real chart
  private drawLastPrice(ctx: CanvasRenderingContext2D, price: number, h: number) {
    const { plotRight, axisRight } = this.layout!
    const y = Math.round(this.y(price)) + 0.5
    if (y < 0 || y > h) return
    ctx.strokeStyle = accentRgba(0.35)
    ctx.lineWidth = 1
    ctx.setLineDash([2, 4])
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(plotRight, y)
    ctx.stroke()
    ctx.setLineDash([])

    const label = price.toFixed(2)
    ctx.font = FONT
    const pad = 4
    const tw = ctx.measureText(label).width
    ctx.fillStyle = accentRgba(0.9)
    ctx.fillRect(axisRight - tw - pad, y - 8, tw + pad * 2, 16)
    ctx.fillStyle = '#0b0b0c'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(label, axisRight, y + 0.5)
    ctx.textAlign = 'left'
  }

  private drawCandle(ctx: CanvasRenderingContext2D, c: Candle, i: number, color: string) {
    const { body } = this.layout!
    const cx = Math.round(this.x(i)) + 0.5
    const yo = this.y(c.o)
    const yc = this.y(c.c)
    const up = c.c >= c.o
    const top = Math.min(yo, yc)
    const height = Math.max(1, Math.abs(yc - yo))
    const left = Math.round(cx - body / 2)

    ctx.strokeStyle = color
    ctx.fillStyle = color
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx, this.y(c.h))
    ctx.lineTo(cx, top)
    ctx.moveTo(cx, top + height)
    ctx.lineTo(cx, this.y(c.l))
    ctx.stroke()
    // Rising candles are solid, falling ones hollow: one color, still readable
    if (up) ctx.fillRect(left, top, Math.round(body), height)
    else ctx.strokeRect(left + 0.5, Math.round(top) + 0.5, Math.round(body) - 1, Math.max(1, Math.round(height) - 1))
  }

  private buildGlowLayer() {
    const { dpr } = this.layout!
    const g = this.glowLayer.getContext('2d')!
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, this.glowLayer.width, this.glowLayer.height)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)
    g.shadowColor = 'rgba(255, 255, 255, 0.85)'
    g.shadowBlur = 8 * dpr
    // The last candle is drawn live each frame instead
    for (let i = 0; i < this.candles.length - 1; i++) this.drawCandle(g, this.candles[i], i, '#fff')
  }

  private retintIfNeeded() {
    const key = `${Math.round(accent.r)},${Math.round(accent.g)},${Math.round(accent.b)}`
    if (key === this.tintKey) return
    this.tintKey = key
    const t = this.tinted.getContext('2d')!
    t.globalCompositeOperation = 'source-over'
    t.clearRect(0, 0, this.tinted.width, this.tinted.height)
    t.drawImage(this.glowLayer, 0, 0)
    t.globalCompositeOperation = 'source-in'
    t.fillStyle = accentRgba(1)
    t.fillRect(0, 0, this.tinted.width, this.tinted.height)
    t.globalCompositeOperation = 'source-over'
  }

  private buildGridLayer() {
    const { dpr, plotRight, axisRight, min, max } = this.layout!
    const g = this.gridLayer.getContext('2d')!
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, this.gridLayer.width, this.gridLayer.height)
    g.setTransform(dpr, 0, 0, dpr, 0, 0)

    const step = niceStep((max - min) / 5)
    g.font = FONT
    g.textAlign = 'right'
    g.textBaseline = 'middle'
    g.lineWidth = 1
    g.strokeStyle = 'rgba(237, 237, 232, 0.05)'
    g.fillStyle = 'rgba(138, 138, 133, 0.55)'
    for (let p = Math.ceil(min / step) * step; p <= max; p += step) {
      const y = Math.round(this.y(p)) + 0.5
      g.beginPath()
      g.moveTo(0, y)
      g.lineTo(plotRight, y)
      g.stroke()
      g.fillText(p.toFixed(0), axisRight, y)
    }
  }
}

function niceStep(raw: number) {
  const mag = 10 ** Math.floor(Math.log10(raw))
  const n = raw / mag
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * mag
}
