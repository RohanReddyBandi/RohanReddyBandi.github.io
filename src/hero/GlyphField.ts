import gsap from 'gsap'
import { accentRgba } from '../lib/accent'

// The hero: a full-screen grid of mono glyphs with the name carved out of it.
// Background cells are faint 0s and 1s, the letters are dense bright glyphs.
// Moving over it (or tapping) scrambles the cells near the pointer into
// accent-colored noise that settles back; a click sends a ring outward; a few
// cells flicker on their own. It resolves out of noise when the page loads.
//
// Every glyph is pre-rendered once into an atlas, and each frame only redraws
// the cells that change, so even an ultrawide screen (~16k cells) stays cheap.

const FIELD = 0
const EDGE = 1
const INK = 2
const HOT = 3
const BLANK = 255
const CHARS = ['01', '+=:-', '#%&@$08', '!<>/\\[]{}=+*^?#01']
// Letters are inverse video: a solid off-white cell with the glyph cut out
// of it, so the name reads as solid blocks. Edge cells are half-strength.
const CELL_FILL = ['', 'rgba(237, 237, 232, 0.42)', '#edede8', '']
const GLYPH_COLOR = ['rgba(237, 237, 232, 0.13)', 'rgba(11, 11, 12, 0.55)', 'rgba(11, 11, 12, 0.72)', '']

const LINE_HEIGHT = 0.86 // of the font size, for the carved name
const TRACKING = -0.035 // em, same as the name used to have
const SAMPLES = 4 // mask resolution per cell, for smooth letter edges
const RESOLVE_MS = 1300
const HOT_WINDOW = 140 // ms a cell spends as noise before it settles
const ROLL_MS = 55 // noise re-rolls this often

export type Grid = { cols: number; rows: number; cell: number }
export type Layout = { lines: string[]; topRows: number; bottomRows: number; margin: number }

export class GlyphField {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private atlas = document.createElement('canvas')
  private dpr = 1
  private cell = 12 // CSS px per cell
  private cols = 0
  private rows = 0
  private style = new Uint8Array(0)
  private glyph = new Uint8Array(0)
  private until = new Float64Array(0) // cell is noise until this time
  private nextRoll = new Float64Array(0)
  private active = new Set<number>()
  private waves: { x: number; y: number; t0: number }[] = []
  private revealAt = new Float32Array(0)
  private shown = new Uint8Array(0)
  private introStart = -1
  private resolving = false
  private running = false
  private visible = true
  private ready = false
  readonly reduced: boolean
  private layout: (grid: Grid) => Layout

  constructor(canvas: HTMLCanvasElement, layout: (grid: Grid) => Layout, reduced: boolean) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.layout = layout
    this.reduced = reduced
  }

  /** Rebuild the grid for a new size. Call after fonts are in. */
  resize(width: number, height: number) {
    if (!width || !height) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 2)
    this.cell = Math.min(13, Math.max(8, Math.round(width / 120)))
    this.cols = Math.ceil(width / this.cell)
    this.rows = Math.ceil(height / this.cell)
    this.canvas.width = Math.round(this.cols * this.cell * this.dpr)
    this.canvas.height = Math.round(this.rows * this.cell * this.dpr)
    this.canvas.style.width = `${this.cols * this.cell}px`
    this.canvas.style.height = `${this.rows * this.cell}px`

    const n = this.cols * this.rows
    this.style = new Uint8Array(n)
    this.glyph = new Uint8Array(n)
    this.until = new Float64Array(n)
    this.nextRoll = new Float64Array(n)
    this.shown = new Uint8Array(n)
    this.active.clear()
    this.buildAtlas()
    this.carve()
    this.ready = true

    if (this.reduced || this.introStart >= 0) {
      // resized mid-intro or after it: just show the finished field
      this.resolving = false
      this.shown.fill(1)
      this.drawAll()
    } else {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }

  /** Resolve out of noise, from the middle outward. */
  intro() {
    if (!this.ready || this.introStart >= 0) return
    if (this.reduced) return
    const cx = this.cols / 2
    const cy = this.rows / 2
    const far = Math.hypot(cx, cy)
    this.revealAt = new Float32Array(this.cols * this.rows)
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        const d = Math.hypot((x - cx) * 0.6, y - cy) / far
        this.revealAt[y * this.cols + x] = HOT_WINDOW + d * (RESOLVE_MS - HOT_WINDOW) + Math.random() * 160
      }
    }
    this.introStart = performance.now()
    this.resolving = true
    this.wake()
  }

  setVisible(v: boolean) {
    this.visible = v
    if (v) this.wake()
  }

  /** Scramble the cells around a point (CSS px, relative to the canvas). */
  stir(px: number, py: number, strength = 1) {
    if (!this.ready || this.reduced) return
    const now = performance.now()
    const r = 5 + strength * 5 // cells
    const cx = px / this.cell
    const cy = py / this.cell
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(this.rows - 1, Math.ceil(cy + r)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(this.cols - 1, Math.ceil(cx + r)); x++) {
        const d = Math.hypot(x + 0.5 - cx, (y + 0.5 - cy) * 1.1) / r
        if (d > 1 || Math.random() < d * 0.55) continue // ragged edge
        this.heat(y * this.cols + x, now + 180 + (1 - d) * 420 * (0.6 + strength * 0.4))
      }
    }
    this.wake()
  }

  /** A ring of noise that rolls outward from a point. */
  pulse(px: number, py: number) {
    if (!this.ready || this.reduced) return
    this.waves.push({ x: px / this.cell, y: py / this.cell, t0: performance.now() })
    this.wake()
  }

  /** A few cells twitch on their own. */
  flicker() {
    if (!this.ready || this.reduced || !this.visible || this.introStart < 0) return
    const now = performance.now()
    for (let k = 0; k < 3; k++) {
      const i = (Math.random() * this.cols * this.rows) | 0
      if (this.style[i] !== BLANK) this.heat(i, now + 90 + Math.random() * 260)
    }
    this.wake()
  }

  destroy() {
    gsap.ticker.remove(this.tick)
  }

  // ------------------------------------------------------------------

  private heat(i: number, until: number) {
    if (until > this.until[i]) this.until[i] = until
    this.active.add(i)
  }

  private wake() {
    if (this.running || !this.visible || this.reduced) return
    this.running = true
    gsap.ticker.add(this.tick)
  }

  private tick = () => {
    const now = performance.now()
    let busy = false

    if (this.resolving) {
      const t = now - this.introStart
      if (t > RESOLVE_MS + 400) {
        // done: make sure every cell landed
        this.resolving = false
        this.shown.fill(1)
        this.drawAll()
      } else {
        busy = true
        for (let i = 0; i < this.revealAt.length; i++) {
          if (this.shown[i]) continue
          const at = this.revealAt[i]
          if (t >= at) {
            this.shown[i] = 1
            this.drawCell(i, this.style[i], this.glyph[i])
          } else if (t >= at - HOT_WINDOW) {
            this.drawCell(i, HOT, (Math.random() * CHARS[HOT].length) | 0)
          }
        }
      }
    }

    // rings: cells on the wavefront get a short burst of noise
    if (this.waves.length) {
      busy = true
      const reach = Math.hypot(this.cols, this.rows)
      this.waves = this.waves.filter((w) => {
        const r = ((now - w.t0) / 1000) * 70 // cells per second
        if (r > reach) return false
        const y0 = Math.max(0, Math.floor(w.y - r - 1))
        const y1 = Math.min(this.rows - 1, Math.ceil(w.y + r + 1))
        for (let y = y0; y <= y1; y++) {
          const dy = (y + 0.5 - w.y) * 1.1
          const span = r * r - dy * dy
          if (span < 0) continue
          const dx = Math.sqrt(span)
          for (const x of [Math.round(w.x - dx), Math.round(w.x + dx)]) {
            if (x >= 0 && x < this.cols && Math.random() < 0.8) this.heat(y * this.cols + x, now + 160)
          }
        }
        return true
      })
    }

    for (const i of this.active) {
      if (now >= this.until[i]) {
        this.active.delete(i)
        if (this.shown[i]) this.drawCell(i, this.style[i], this.glyph[i])
        continue
      }
      if (now >= this.nextRoll[i]) {
        this.nextRoll[i] = now + ROLL_MS + Math.random() * 40
        this.drawCell(i, HOT, (Math.random() * CHARS[HOT].length) | 0)
      }
    }
    if (this.active.size) busy = true

    if (!busy || !this.visible) {
      gsap.ticker.remove(this.tick)
      this.running = false
    }
  }

  private drawAll() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    for (let i = 0; i < this.style.length; i++) {
      if (this.style[i] !== BLANK) this.drawCell(i, this.style[i], this.glyph[i], false)
    }
  }

  private drawCell(i: number, style: number, glyph: number, clear = true) {
    const s = this.cell * this.dpr
    const x = (i % this.cols) * s
    const y = ((i / this.cols) | 0) * s
    if (clear) this.ctx.clearRect(x, y, s, s)
    if (style === BLANK) return
    this.ctx.drawImage(this.atlas, glyph * s, style * s, s, s, x, y, s, s)
  }

  // Every glyph in every color, one cell each
  private buildAtlas() {
    const s = this.cell * this.dpr
    const widest = Math.max(...CHARS.map((c) => c.length))
    this.atlas.width = widest * s
    this.atlas.height = CHARS.length * s
    const a = this.atlas.getContext('2d')!
    a.font = `500 ${Math.round(s * 0.86)}px "JetBrains Mono", ui-monospace, monospace`
    a.textAlign = 'center'
    a.textBaseline = 'middle'
    CHARS.forEach((chars, row) => {
      ;[...chars].forEach((ch, col) => {
        if (CELL_FILL[row]) {
          a.fillStyle = CELL_FILL[row]
          a.fillRect(col * s, row * s, s, s)
        }
        a.fillStyle = row === HOT ? accentRgba(1) : GLYPH_COLOR[row]
        a.fillText(ch, col * s + s / 2, row * s + s / 2 + s * 0.04)
      })
    })
  }

  // Draw the name into a fine mask, then give each cell a style by how much
  // of it the letters cover
  private carve() {
    const { lines, topRows, bottomRows, margin } = this.layout({ cols: this.cols, rows: this.rows, cell: this.cell })
    const S = SAMPLES
    const mask = document.createElement('canvas')
    mask.width = this.cols * S
    mask.height = this.rows * S
    const m = mask.getContext('2d', { willReadFrequently: true })!
    m.fillStyle = '#000'
    m.textBaseline = 'alphabetic'
    const setFont = (px: number) => {
      m.font = `600 ${px}px "Clash Display", sans-serif`
      if ('letterSpacing' in m) m.letterSpacing = `${(px * TRACKING).toFixed(2)}px`
    }

    // size the name to the free width, capped by the free height
    setFont(100)
    const widest = Math.max(...lines.map((l) => m.measureText(l).width))
    const freeW = (this.cols - margin * 2) * S
    const freeH = (this.rows - topRows - bottomRows) * S
    const px = Math.min((100 * freeW) / widest, freeH / (lines.length * LINE_HEIGHT))
    setFont(px)
    const block = lines.length * px * LINE_HEIGHT
    const top = topRows * S + (freeH - block) / 2
    lines.forEach((line, k) => m.fillText(line, margin * S, top + px * (LINE_HEIGHT * k + 0.74)))

    const data = m.getImageData(0, 0, mask.width, mask.height).data
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let cover = 0
        for (let sy = 0; sy < S; sy++) {
          const row = ((y * S + sy) * mask.width + x * S) * 4 + 3
          for (let sx = 0; sx < S; sx++) cover += data[row + sx * 4]
        }
        cover /= 255 * S * S
        const i = y * this.cols + x
        const style = cover > 0.5 ? INK : cover > 0.14 ? EDGE : Math.random() < 0.55 ? FIELD : BLANK
        this.style[i] = style
        this.glyph[i] = style === BLANK ? 0 : (Math.random() * CHARS[style].length) | 0
      }
    }
  }
}
