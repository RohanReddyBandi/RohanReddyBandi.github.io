import gsap from 'gsap'
import type { Market } from '../lib/accent'
import { BASE_COUNT, generateSeries, marketDays, tickLabel } from '../lib/market'
import { reducedMotion } from '../lib/motion'
import { ChartRenderer } from './ChartRenderer'
import { HandlePhysics } from './physics'

// Runs the hero: the chart, the drag handle, and the BULL/BEAR call.
// Everything per-frame happens here outside React, writing transforms and
// text straight to the DOM.

const START_AT = 0.36 // mid-rally, so the first drag to the right finds the crash
const LOOK_BACK = 0.06 // trend window behind the handle, as a share of the series
const LOOK_AHEAD = 0.015
const FLIP_AT = 0.02 // ±2% over that window flips the state
const MIN_FLIP_MS = 250 // don't strobe through noisy stretches
const HINT_KEY = 'market-dragged'

export type HeroElements = {
  canvas: HTMLCanvasElement
  handle: HTMLElement
  line: HTMLElement
  hit: HTMLElement
  orb: HTMLElement
  readout: HTMLElement
  date: HTMLElement
  price: HTMLElement
  state: HTMLElement
  hint: HTMLElement
}

const series = generateSeries()

export class MarketHero {
  private el: HeroElements
  private onMarket: (market: Market, instant: boolean) => void
  private chart: ChartRenderer
  private physics = new HandlePhysics()
  private dates = marketDays(BASE_COUNT)
  private frac = START_AT
  private market: Market = 'bull'
  private marketKnown = false
  private lastFlip = -Infinity
  private onScreen = true
  private running = false
  private lastTime = 0
  private drag: { id: number; offset: number; startX: number; samples: { t: number; x: number }[] } | null = null
  private touched = false
  private shown = { pos: -1, side: '', market: '' }
  private labelWidth = { readout: 0, hint: 0 }
  private observers: (ResizeObserver | IntersectionObserver)[] = []

  constructor(el: HeroElements, onMarket: (market: Market, instant: boolean) => void) {
    this.el = el
    this.onMarket = onMarket
    this.chart = new ChartRenderer(el.canvas, series)
    this.physics.snap = (x) => this.chart.x(Math.round(this.chart.posAt(x)))
    try {
      this.touched = sessionStorage.getItem(HINT_KEY) === '1'
    } catch {
      // storage blocked: show the hint
    }
    if (this.touched) el.handle.dataset.touched = ''

    const resize = new ResizeObserver(([entry]) => this.resize(entry.contentRect.width, entry.contentRect.height))
    const visible = new IntersectionObserver(([entry]) => {
      this.onScreen = entry.isIntersecting
      this.sync()
    })
    resize.observe(el.canvas)
    visible.observe(el.canvas)
    this.observers = [resize, visible]

    for (const target of [el.hit, el.orb]) target.addEventListener('pointerdown', this.onPointerDown)
    el.orb.addEventListener('keydown', this.onKey)
    document.addEventListener('visibilitychange', this.sync)
    reducedMotion.addEventListener('change', this.sync)
    document.fonts.ready.then(() => {
      this.chart.refreshText()
      this.measureLabels()
      if (!this.running) this.renderStill()
    })
  }

  destroy() {
    gsap.ticker.remove(this.tick)
    this.observers.forEach((o) => o.disconnect())
    for (const target of [this.el.hit, this.el.orb]) target.removeEventListener('pointerdown', this.onPointerDown)
    this.el.orb.removeEventListener('keydown', this.onKey)
    document.removeEventListener('visibilitychange', this.sync)
    reducedMotion.removeEventListener('change', this.sync)
  }

  private get reduced() {
    return reducedMotion.matches
  }

  private resize(w: number, h: number) {
    this.chart.resize(w, h)
    if (!this.chart.ready) return
    const n = this.chart.count
    this.physics.setBounds(this.chart.x(0), this.chart.x(n - 1))
    this.physics.jump(this.chart.x(Math.round(this.frac * (n - 1))))
    // The grab strip covers the price area; the line runs a bit past it
    const { top, bottom } = this.chart.band
    this.el.hit.style.top = `${top}px`
    this.el.hit.style.height = `${bottom - top}px`
    const reach = h * 0.08
    this.el.line.style.top = `${Math.max(0, top - reach)}px`
    this.el.line.style.height = `${bottom - top + reach * 2}px`
    this.el.orb.setAttribute('aria-valuemax', String(n - 1))
    this.shown.pos = -1
    if (!this.running) this.renderStill()
  }

  // Animate only while visible on screen with motion allowed.
  private sync = () => {
    const animate = this.onScreen && !document.hidden && !this.reduced
    if (animate && !this.running) {
      this.lastTime = 0
      gsap.ticker.add(this.tick)
    }
    if (!animate && this.running) gsap.ticker.remove(this.tick)
    this.running = animate
    if (!animate && this.chart.ready) {
      this.physics.jump(this.physics.snap(this.physics.clamp(this.physics.target)))
      this.renderStill()
    }
  }

  private tick = (time: number) => {
    const now = time * 1000
    const dt = this.lastTime ? Math.min((now - this.lastTime) / 1000, 0.05) : 1 / 60
    this.lastTime = now
    this.physics.step(dt)
    this.render(now, false)
  }

  private renderStill() {
    this.render(performance.now(), true)
  }

  private render(now: number, still: boolean) {
    if (!this.chart.ready) return
    const chart = this.chart
    const n = chart.count
    const x = this.physics.x
    const pos = Math.min(n - 1, Math.max(0, chart.posAt(x)))
    const y = chart.y(chart.priceAt(pos))
    if (!this.drag) this.frac = pos / (n - 1)

    chart.focusX = x
    if (still) chart.drawStill()
    else chart.frame(now)

    this.placeHandle(x, y)
    this.updateMarket(pos, now)
    this.updateReadout(pos)
  }

  private placeHandle(x: number, y: number) {
    const { handle, orb, readout, hint } = this.el
    // Labels flip to the left before they'd run into the price axis
    const room = this.chart.band.right - x - 30
    const left = room < Math.max(this.labelWidth.readout, this.labelWidth.hint)
    const below = y < 170 // keep the readout clear of the top bar
    handle.style.transform = `translate3d(${x}px, 0, 0)`
    orb.style.transform = `translate3d(0, ${y}px, 0)`
    const rx = left ? 'calc(-100% - 18px)' : '18px'
    const ry = below ? `${y + 18}px` : `calc(${y - 18}px - 100%)`
    readout.style.transform = `translate3d(${rx}, ${ry}, 0)`
    hint.style.transform = `translate3d(${left ? 'calc(-100% - 30px)' : '30px'}, calc(${y}px - 50%), 0)`
    if (this.shown.side !== String(left)) {
      this.shown.side = String(left)
      hint.textContent = left ? '← Drag the market' : 'Drag the market →'
    }
  }

  private measureLabels() {
    this.labelWidth = {
      readout: this.el.readout.offsetWidth,
      hint: this.touched ? 0 : this.el.hint.offsetWidth,
    }
  }

  // BULL if the price is climbing into the handle, BEAR if it's falling.
  private updateMarket(pos: number, now: number) {
    const n = this.chart.count
    const p0 = this.chart.priceAt(pos - Math.max(2, n * LOOK_BACK))
    const p1 = this.chart.priceAt(pos + Math.max(1, n * LOOK_AHEAD))
    const change = (p1 - p0) / p0
    const next: Market = change > FLIP_AT ? 'bull' : change < -FLIP_AT ? 'bear' : this.market
    if (!this.marketKnown) {
      // First frame: match the starting spot without animating
      this.marketKnown = true
      this.market = next
      this.onMarket(next, true)
      return
    }
    if (next === this.market || now - this.lastFlip < MIN_FLIP_MS) return
    this.market = next
    this.lastFlip = now
    this.onMarket(next, this.reduced)
  }

  private updateReadout(pos: number) {
    const i = Math.round(pos)
    const price = this.chart.priceAt(this.drag || !this.physics.settled ? pos : i)
    const priceText = `$${price.toFixed(2)}`
    if (this.el.price.textContent !== priceText) this.el.price.textContent = priceText
    if (i === this.shown.pos && this.market === this.shown.market) return
    this.shown.pos = i
    this.shown.market = this.market
    const date = this.dates[this.chart.baseIndexAt(i)]
    const bull = this.market === 'bull'
    this.el.date.textContent = i === this.chart.count - 1 ? 'Today' : tickLabel(date)
    this.el.state.textContent = bull ? '▲ Bull' : '▼ Bear'
    this.measureLabels()
    // Screen readers get the candle's own close, not a mid-glide price
    const day = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    const close = `$${this.chart.priceAt(i).toFixed(2)}`
    this.el.orb.setAttribute('aria-valuenow', String(i))
    this.el.orb.setAttribute('aria-valuetext', `${day}, ${close}, ${bull ? 'bull' : 'bear'} market`)
  }

  private markTouched() {
    if (this.touched) return
    this.touched = true
    this.el.handle.dataset.touched = ''
    this.measureLabels()
    try {
      sessionStorage.setItem(HINT_KEY, '1')
    } catch {
      // fine, the hint just comes back next load
    }
  }

  private localX(clientX: number) {
    return clientX - this.el.canvas.getBoundingClientRect().left
  }

  private onPointerDown = (e: PointerEvent) => {
    if (e.button !== 0 || this.drag || !this.chart.ready) return
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)
    const x = this.localX(e.clientX)
    this.drag = { id: e.pointerId, offset: x - this.physics.x, startX: x, samples: [{ t: e.timeStamp, x }] }
    this.physics.startDrag()
    this.physics.target = this.physics.x
    // So arrow keys work right after a mouse drag (on touch it'd only flash a ring)
    if (e.pointerType === 'mouse') this.el.orb.focus({ preventScroll: true })
    document.documentElement.dataset.dragging = ''
    target.addEventListener('pointermove', this.onPointerMove)
    target.addEventListener('pointerup', this.onPointerUp)
    target.addEventListener('pointercancel', this.onPointerUp)
  }

  private onPointerMove = (e: PointerEvent) => {
    const drag = this.drag
    if (!drag || e.pointerId !== drag.id) return
    const x = this.localX(e.clientX)
    drag.samples.push({ t: e.timeStamp, x })
    drag.samples = drag.samples.filter((s) => e.timeStamp - s.t < 100)
    if (Math.abs(x - drag.startX) > 4) this.markTouched()
    this.physics.dragTo(x - drag.offset)
    if (this.reduced) {
      this.physics.jump(this.physics.clamp(this.physics.target))
      this.renderStill()
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    const drag = this.drag
    if (!drag || e.pointerId !== drag.id) return
    const target = e.currentTarget as HTMLElement
    target.removeEventListener('pointermove', this.onPointerMove)
    target.removeEventListener('pointerup', this.onPointerUp)
    target.removeEventListener('pointercancel', this.onPointerUp)
    delete document.documentElement.dataset.dragging

    // Velocity over the last ~100ms; a pause before letting go means no throw
    const s = drag.samples
    const first = s[0]
    const last = s[s.length - 1]
    const fresh = e.type === 'pointerup' && e.timeStamp - last.t < 60 && last.t > first.t
    const velocity = fresh && !this.reduced ? ((last.x - first.x) / (last.t - first.t)) * 1000 : 0
    this.drag = null
    this.physics.release(velocity)
    if (this.reduced) {
      this.physics.jump(this.physics.target)
      this.renderStill()
    }
  }

  private onKey = (e: KeyboardEvent) => {
    if (!this.chart.ready) return
    const n = this.chart.count
    const at = Math.round(this.chart.posAt(this.physics.target))
    const big = Math.max(5, Math.round(n / 16))
    const step: Record<string, number> = {
      ArrowRight: e.shiftKey ? big : 1,
      ArrowUp: e.shiftKey ? big : 1,
      ArrowLeft: e.shiftKey ? -big : -1,
      ArrowDown: e.shiftKey ? -big : -1,
      PageUp: big,
      PageDown: -big,
      Home: -n,
      End: n,
    }
    if (!(e.key in step)) return
    e.preventDefault()
    this.markTouched()
    const next = Math.min(n - 1, Math.max(0, at + step[e.key]))
    this.physics.moveTo(this.chart.x(next))
    if (this.reduced) {
      this.physics.jump(this.physics.target)
      this.renderStill()
    }
  }
}
