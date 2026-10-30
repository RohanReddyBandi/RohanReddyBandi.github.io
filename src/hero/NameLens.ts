import gsap from 'gsap'
import { accentRgba } from '../lib/accent'

// The hero name's x-ray: a soft round lens that drifts across the name, or
// follows the pointer, and shows the letters inside it as green wavy lines,
// magnified toward its center. The canvas sits over the name and, inside the
// lens, covers each letter in the background color before drawing its lines,
// so the page itself never repaints: each frame is canvas work only. Pauses
// off screen and in background tabs. Not used with reduced motion.

const SPACING = 4 // px between lines
const STEP = 8 // px between points along a line

/** Layout position of `el` inside `root`, ignoring transforms */
function offsetIn(el: HTMLElement, root: HTMLElement) {
  let x = 0
  let y = 0
  for (let n: HTMLElement | null = el; n && n !== root; n = n.offsetParent as HTMLElement | null) {
    x += n.offsetLeft
    y += n.offsetTop
  }
  return { x, y }
}

export class NameLens {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private name: HTMLElement
  // the letters, drawn once per layout, as the shape the lines are cut to
  private glyphs = document.createElement('canvas')
  private gctx = this.glyphs.getContext('2d')!
  // scratch canvas the lens is composed on
  private scratch = document.createElement('canvas')
  private sctx = this.scratch.getContext('2d')!
  private w = 0
  private dpr = 1
  private bg = '#0b0b0c'
  private drawn: { x: number; y: number; s: number } | null = null // last lens square, to clear
  private box = { x: 0, y: 0, w: 0, h: 0 } // the name's bounds
  private r = 0 // full lens radius
  private lx = 0
  private ly = 0
  private tx = 0
  private ty = 0
  private over = false
  private grow = 0 // 0..1, the lens opens up when it starts
  private t = 0
  private last = 0
  private running = false
  private started = false
  private visible = true

  constructor(canvas: HTMLCanvasElement, name: HTMLElement) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.name = name
  }

  /** Re-measure the letters; call on resize and once the font is in */
  measure(hero: HTMLElement) {
    const w = hero.clientWidth
    const h = hero.clientHeight
    const letters = [...this.name.querySelectorAll<HTMLElement>('.hero-name__letter')]
    if (!w || !h || !letters.length) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.w = w
    for (const c of [this.canvas, this.glyphs]) {
      c.width = Math.round(w * this.dpr)
      c.height = Math.round(h * this.dpr)
    }
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.drawn = null // resizing cleared the canvas
    this.bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0b0b0c'

    const size = parseFloat(getComputedStyle(letters[0]).fontSize)
    const g = this.gctx
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    g.clearRect(0, 0, w, h)
    g.font = `600 ${size}px "Clash Display"`
    g.fillStyle = '#fff'
    // an inline box centers the font's content area on its line height, so
    // the baseline sits at half the line height plus half (ascent − descent)
    const m = g.measureText('R')
    const drop = (m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2
    const pos = letters.map((l) => offsetIn(l, hero))
    // a hair bigger than the letters, so their antialiased edges stay covered
    g.strokeStyle = '#fff'
    g.lineWidth = 1.5
    g.lineJoin = 'round'
    letters.forEach((l, i) => {
      const ch = (l.textContent ?? '').toUpperCase()
      const y = pos[i].y + l.offsetHeight / 2 + drop
      g.fillText(ch, pos[i].x, y)
      g.strokeText(ch, pos[i].x, y)
    })

    const left = Math.min(...pos.map((p) => p.x))
    const top = Math.min(...pos.map((p) => p.y))
    const right = Math.max(...pos.map((p, i) => p.x + letters[i].offsetWidth))
    const bottom = Math.max(...pos.map((p, i) => p.y + letters[i].offsetHeight))
    this.box = { x: left, y: top, w: right - left, h: bottom - top }
    this.r = Math.min(Math.max(size * 0.9, 90), 220)
    if (!this.started) {
      this.lx = this.box.x + this.box.w * 0.5
      this.ly = this.box.y + this.box.h * 0.5
    }
    this.draw()
  }

  pointer(x: number, y: number) {
    this.tx = x
    this.ty = y
    this.over = true
  }

  leave() {
    this.over = false
  }

  setVisible(v: boolean) {
    this.visible = v
    if (v) this.wake()
  }

  start() {
    this.started = true
    this.wake()
  }

  destroy() {
    gsap.ticker.remove(this.tick)
  }

  private wake() {
    if (this.running || !this.visible || !this.started) return
    this.running = true
    this.last = 0
    gsap.ticker.add(this.tick)
  }

  private tick = (time: number) => {
    if (!this.visible) {
      gsap.ticker.remove(this.tick)
      this.running = false
      return
    }
    const dt = this.last ? Math.min(time - this.last, 0.05) : 1 / 60
    this.last = time
    this.t += dt
    // Follow the pointer; without one, wander along the name
    const b = this.box
    const tx = this.over ? this.tx : b.x + b.w * (0.5 + 0.42 * Math.sin(this.t * 0.31))
    const ty = this.over ? this.ty : b.y + b.h * (0.5 + 0.3 * Math.sin(this.t * 0.57 + 1.3))
    const k = 1 - (1 - (this.over ? 0.2 : 0.035)) ** (dt * 60)
    this.lx += (tx - this.lx) * k
    this.ly += (ty - this.ly) * k
    this.grow += (1 - this.grow) * (1 - 0.95 ** (dt * 60))
    this.draw()
  }

  // Horizontal offset of the line that rests at x, at height y
  private offset(x: number, y: number) {
    const t = this.t
    // slow waves; amplitude × frequency stays well under 1 so lines never cross
    let d =
      Math.sin(x * 0.011 + y * 0.006 + t * 0.6) * 18 +
      Math.sin(x * 0.004 - y * 0.009 - t * 0.4) * 26 * Math.sin(y * 0.003 + t * 0.25)
    // magnified toward the lens center
    const dx = x + d - this.lx
    const dy = y - this.ly
    const s = this.r * 0.45
    d += dx * Math.exp(-(dx * dx + dy * dy) / (2 * s * s)) * 0.55
    return d
  }

  private draw() {
    const { ctx, sctx, dpr, w, lx, ly } = this
    if (!w) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    // only where the lens was last frame needs clearing
    if (this.drawn) ctx.clearRect(this.drawn.x, this.drawn.y, this.drawn.s, this.drawn.s)
    this.drawn = null
    const R = this.r * this.grow
    if (!this.started || R < 1) return

    const side = Math.ceil(R * 2 * dpr)
    if (this.scratch.width < side) this.scratch.width = this.scratch.height = side
    // draw in hero coordinates, landing at the scratch canvas' top left
    sctx.setTransform(dpr, 0, 0, dpr, (R - lx) * dpr, (R - ly) * dpr)
    sctx.globalCompositeOperation = 'source-over'
    sctx.clearRect(lx - R, ly - R, R * 2, R * 2)

    // the letters under the lens, in the background color, to cover the name
    sctx.drawImage(this.glyphs, (lx - R) * dpr, (ly - R) * dpr, R * 2 * dpr, R * 2 * dpr, lx - R, ly - R, R * 2, R * 2)
    sctx.globalCompositeOperation = 'source-in'
    sctx.fillStyle = this.bg
    sctx.fillRect(lx - R, ly - R, R * 2, R * 2)

    // lines on a fixed grid, so the lens moves over them
    sctx.beginPath()
    for (let x = Math.floor((lx - R - 48) / SPACING) * SPACING; x < lx + R + 48; x += SPACING) {
      const y0 = ly - R
      sctx.moveTo(x + this.offset(x, y0), y0)
      for (let y = y0 + STEP; y < ly + R + STEP; y += STEP) sctx.lineTo(x + this.offset(x, y), y)
    }
    // bright on the letters
    sctx.globalCompositeOperation = 'source-atop'
    sctx.lineWidth = 1.4
    sctx.strokeStyle = accentRgba(1)
    sctx.stroke()
    // and faint everywhere else
    sctx.globalCompositeOperation = 'destination-over'
    sctx.lineWidth = 1
    sctx.strokeStyle = accentRgba(0.16)
    sctx.stroke()
    // cut to a round lens with a soft edge, where the solid name shows back
    // through
    sctx.globalCompositeOperation = 'destination-in'
    const edge = sctx.createRadialGradient(lx, ly, 0, lx, ly, R)
    edge.addColorStop(0.55, '#000')
    edge.addColorStop(1, 'rgba(0, 0, 0, 0)')
    sctx.fillStyle = edge
    sctx.fillRect(lx - R, ly - R, R * 2, R * 2)
    sctx.globalCompositeOperation = 'source-over'

    ctx.drawImage(this.scratch, 0, 0, R * 2 * dpr, R * 2 * dpr, lx - R, ly - R, R * 2, R * 2)
    this.drawn = { x: lx - R - 2, y: ly - R - 2, s: R * 2 + 4 }
  }
}
