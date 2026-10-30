import gsap from 'gsap'

// The hero's backdrop on solid green: a field of thin vertical lines, warped by
// a slow travelling wave so they bunch into folds like fabric, and pushed
// apart around the pointer. Lines fade out toward `bottom` (where the name
// sits). Pauses off screen and in background tabs; one still frame with
// reduced motion.

const SPACING = 9 // px between lines
const STEP = 14 // px between points along a line
const INK = '2, 23, 10' // --deep as rgb
const FADE = 140 // px the lines fade over above `bottom`

export class LineField {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private bottom = 0
  private dpr = 1
  private running = false
  private visible = true
  private reduced: boolean
  private t = 0
  private last = 0
  // pointer, eased toward its target so the lines move smoothly
  private px = -9999
  private py = -9999
  private tx = -9999
  private ty = -9999
  private push = 0 // 0..1, eases in when the pointer is over the hero

  constructor(canvas: HTMLCanvasElement, reduced: boolean) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.reduced = reduced
  }

  /** `bottom`: y (CSS px) where the lines have faded out */
  resize(w: number, h: number, bottom: number) {
    if (!w || !h) return
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.w = w
    this.h = h
    this.bottom = bottom
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.draw()
  }

  pointer(x: number, y: number) {
    this.tx = x
    this.ty = y
    if (this.px < -999) {
      this.px = x
      this.py = y
    }
    this.wake()
  }

  leave() {
    this.tx = this.ty = -9999
    this.wake()
  }

  setVisible(v: boolean) {
    this.visible = v
    if (v) this.wake()
  }

  start() {
    this.wake()
  }

  destroy() {
    gsap.ticker.remove(this.tick)
  }

  private wake() {
    if (this.running || !this.visible || this.reduced) return
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
    const over = this.tx > -999
    this.push += ((over ? 1 : 0) - this.push) * 0.08
    if (over) {
      this.px += (this.tx - this.px) * 0.12
      this.py += (this.ty - this.py) * 0.12
    }
    this.draw()
  }

  // Horizontal offset of the line that rests at x, at height y
  private offset(x: number, y: number) {
    const t = this.t
    // two slow waves at different scales; amplitude × frequency stays under
    // ~0.9 so lines bunch into folds without crossing
    let d =
      Math.sin(x * 0.0085 + y * 0.0042 + t * 0.35) * 46 +
      Math.sin(x * 0.0031 - y * 0.0067 - t * 0.22) * 70 * Math.sin(y * 0.0021 + t * 0.15)
    // part around the pointer: dx·gaussian is smooth through the pointer, and
    // its slope stays above -1 so neighbouring lines never cross
    if (this.push > 0.01) {
      const dx = x + d - this.px
      const dy = y - this.py
      const fall = Math.exp(-(dx * dx + dy * dy * 0.35) / (2 * 120 * 120))
      d += dx * fall * 1.1 * this.push
    }
    return d
  }

  private draw() {
    const { ctx, w, h, dpr } = this
    if (!w) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
    ctx.lineWidth = 1
    ctx.strokeStyle = `rgba(${INK}, 0.85)`
    ctx.beginPath()
    const end = this.bottom
    for (let x = -SPACING * 8; x < w + SPACING * 8; x += SPACING) {
      ctx.moveTo(x + this.offset(x, 0), 0)
      for (let y = STEP; y < end + STEP; y += STEP) {
        const yy = Math.min(y, end)
        ctx.lineTo(x + this.offset(x, yy), yy)
      }
    }
    ctx.stroke()
    // then erase them toward `bottom` with a gradient, for a smooth fade
    const fade = ctx.createLinearGradient(0, end - FADE, 0, end)
    fade.addColorStop(0, 'rgba(0, 0, 0, 0)')
    fade.addColorStop(1, 'rgba(0, 0, 0, 1)')
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = fade
    ctx.fillRect(0, end - FADE, w, FADE + 1)
    ctx.globalCompositeOperation = 'source-over'
  }
}
