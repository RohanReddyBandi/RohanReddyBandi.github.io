import gsap from 'gsap'

// The hero's pond: Ducky (the Duck Days duck) floating on a strip of pixel
// water across the screen. Everything is measured in cells, one cell being
// one pixel of the 38×32 duck sprite drawn P CSS px wide, so the water, the
// splashes and the bread share the duck's chunky pixels.
//
//  - Drag the duck and let go to throw it. It splashes down, bobs, rights
//    itself, and paddles about.
//  - Click (or tap) anywhere to drop a bit of bread. It paddles over and
//    eats it.
//  - Sweep the mouse through the surface and the water ripples.
//
// One canvas, physics in fixed 60Hz steps. The water is a row of springs,
// one per column, that pass their motion on to their neighbours. With
// reduced motion it's a still picture and the duck only quacks.

const W = 38 // sprite size
const H = 32
const PX = 19 // pivot, the duck's middle, in sprite pixels
const PY = 16
const BOTTOM = 11 // pivot to the bottom of the hull
const SUNK = 4 // rows of hull under water when it floats still
const HALF = 17 // half the duck's width
const BEAK = 14 // pivot to where it picks bread up
const REFLECT = 9 // rows of reflection before it fades out

const G = 200 // gravity, cells/s²
const BUOY = G / SUNK // so it floats SUNK rows deep
const STEP = 1 / 60

// the water's springs, per step
const TENSION = 0.025
const DAMPING = 0.02
const SPREAD = 0.22
const PASSES = 4

// colors: tokens.css --brand, --shadow, --fg, --muted
const BRAND = '#2bef6a'
const SHADOW = '#0b5c27'
const FG = '#edede8'
const MUTED = '#8a8a85'

// The eye in the sprite: rows and the columns of white in each. The pupil
// is a 3×3 blob (one corner off) normally at column 14, row 9.
const EYE: [number, number, number][] = [
  [8, 13, 16],
  [9, 12, 17],
  [10, 12, 17],
  [11, 12, 17],
  [12, 13, 16],
]
const PUPIL: [number, number][] = [
  [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2],
]
const INK = [0x17, 0x17, 0x1a]
const WHITE = [255, 255, 255]
const LID = [0xf2, 0xd9, 0x1c]

type Sprites = {
  look: Map<string, HTMLCanvasElement> // by pupil offset "dx,dy"
  blink: HTMLCanvasElement
  base: HTMLCanvasElement
  mirror: HTMLCanvasElement
}

type Drop = { x: number; y: number; vx: number; vy: number; color: string }
type Crumb = { x: number; y: number; vy: number; afloat: boolean; age: number; seed: number }

export type PondEvents = {
  /** the duck says something (a speech bubble) */
  say: (text: string) => void
  /** someone threw the duck or fed it: the hint can go */
  used: () => void
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const rand = (a: number, b: number) => a + Math.random() * (b - a)

function blank(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

/** The sprite with its eye looking each way, blinking, and mirrored */
function makeSprites(img: CanvasImageSource): Sprites {
  const base = blank(W, H)
  const bctx = base.getContext('2d')!
  bctx.drawImage(img, 0, 0, W, H)
  const src = bctx.getImageData(0, 0, W, H)

  const variant = (paint: (x: number, y: number) => number[]) => {
    const data = new ImageData(new Uint8ClampedArray(src.data), W, H)
    for (const [y, from, to] of EYE)
      for (let x = from; x <= to; x++) data.data.set([...paint(x, y), 255], (y * W + x) * 4)
    const c = blank(W, H)
    c.getContext('2d')!.putImageData(data, 0, 0)
    return c
  }

  const look = new Map<string, HTMLCanvasElement>()
  for (let dx = -2; dx <= 1; dx++)
    for (let dy = -1; dy <= 1; dy++) {
      const pupil = new Set(PUPIL.map(([x, y]) => `${14 + x + dx},${9 + y + dy}`))
      look.set(`${dx},${dy}`, variant((x, y) => (pupil.has(`${x},${y}`) ? INK : WHITE)))
    }
  const blink = variant((_x, y) => (y === 10 ? INK : LID))

  const mirror = blank(W, H)
  const mctx = mirror.getContext('2d')!
  mctx.scale(-1, 1)
  mctx.drawImage(base, -W, 0)
  return { look, blink, base, mirror }
}

export class Pond {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private hit: HTMLElement
  private events: PondEvents
  private still: boolean
  private sprites: Sprites | null = null

  private dpr = 1
  private P = 6 // CSS px per cell
  private cols = 0
  private rows = 0
  private rest = 0 // the row the surface rests at
  private h = new Float32Array(0) // each column's height off rest (down is +)
  private v = new Float32Array(0)
  private left = new Float32Array(0)
  private right = new Float32Array(0)
  private surfaceRow = new Int16Array(0)
  private fill: CanvasGradient | null = null

  private t = 0
  private acc = 0
  private running = false
  private entered = false

  private drops: Drop[] = []
  private crumbs: Crumb[] = []
  private duck = {
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    a: 0, // tilt, radians
    va: 0,
    facing: -1, // -1 left (as drawn), 1 right
    wet: false,
    squash: 0,
    dip: 0, // s left of a dabble
    blinkIn: 3,
    blinking: 0,
    wanderX: -1,
    wanderIn: 0,
  }
  private grab: null | {
    ox: number
    oy: number
    tx: number
    ty: number
    moved: number
    trail: { at: number; x: number; y: number }[]
  } = null
  private pointer = { x: 0, y: 0, at: -Infinity, mouse: false, in: false }

  constructor(canvas: HTMLCanvasElement, hit: HTMLElement, still: boolean, events: PondEvents) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.hit = hit
    this.still = still
    this.events = events
  }

  setSprite(img: CanvasImageSource) {
    this.sprites = makeSprites(img)
    this.draw()
  }

  /** Size to the hero; `surface` is the CSS y the water should rest at */
  layout(width: number, height: number, surface: number) {
    if (!width || !height) return
    // bigger pixels on bigger screens, but proportionally bigger on phones
    const P = clamp(Math.round(Math.min(Math.sqrt(width) / 4.2, height / 95)), 4, 10)
    const cols = Math.ceil(width / P)
    const rows = Math.ceil(height / P)
    const rest = Math.round(clamp(surface, height * 0.45, height * 0.85) / P)
    const d = this.duck
    if (this.cols) {
      // keep the duck where it was, relative to the pond
      d.x = (d.x / this.cols) * cols
      d.y += rest - this.rest
    } else {
      d.x = cols * 0.66
      d.y = rest + SUNK - BOTTOM
    }
    d.x = clamp(d.x, HALF, Math.max(HALF, cols - HALF))
    this.P = P
    this.cols = cols
    this.rows = rows
    this.rest = rest

    const n = cols + 2
    if (this.h.length !== n) {
      this.h = new Float32Array(n)
      this.v = new Float32Array(n)
      this.left = new Float32Array(n)
      this.right = new Float32Array(n)
      this.surfaceRow = new Int16Array(n)
    }

    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.canvas.width = Math.round(width * this.dpr)
    this.canvas.height = Math.round(height * this.dpr)
    // the water darkens down from the surface and fades out by the bottom,
    // so the hero runs into the next section without an edge
    const fill = this.ctx.createLinearGradient(0, rest, 0, rows)
    fill.addColorStop(0, 'rgba(4, 38, 17, 0.92)')
    fill.addColorStop(0.5, 'rgba(3, 26, 12, 0.85)')
    fill.addColorStop(1, 'rgba(11, 11, 12, 0)')
    this.fill = fill

    Object.assign(this.hit.style, {
      width: `${(HALF * 2) * P}px`,
      height: `${25 * P}px`,
      transformOrigin: `${HALF * P}px ${14 * P}px`,
    })
    this.place()
    this.draw()
  }

  /** The entrance: the duck drops in from above (or is just there) */
  enter() {
    if (this.entered) return
    this.entered = true
    const d = this.duck
    if (!this.still) {
      d.y = -PY - 8
      d.vy = 40
      d.a = -0.6
      d.va = 2.4
    }
    this.hit.classList.remove('is-away')
    this.place()
    this.draw()
  }

  start() {
    if (this.still || this.running) return
    this.running = true
    gsap.ticker.add(this.tick)
  }

  stop() {
    this.running = false
    gsap.ticker.remove(this.tick)
  }

  destroy() {
    this.stop()
  }

  // ---------------------------------------------------------------- input

  /** The pointer moved over the hero (CSS px from its corner) */
  pointerAt(px: number, py: number, mouse: boolean) {
    const x = px / this.P
    const y = py / this.P
    const p = this.pointer
    if (!this.still && mouse && p.in && !this.grab) {
      // through the surface: a ripple, bigger the faster it went
      const c = Math.round(x)
      if (c >= 0 && c < this.h.length) {
        const s = this.surfaceAt(c)
        if (p.y < s !== y < s) this.v[c] += clamp((y - p.y) * 0.35, -2.2, 2.2)
        else if (y > s && y - s < 6) this.v[c] += Math.min(Math.abs(x - p.x) * 0.05, 0.5) * (1 - (y - s) / 6)
      }
    }
    Object.assign(p, { x, y, at: this.t, mouse, in: true })
  }

  pointerOut() {
    this.pointer.in = false
  }

  /** Drop a bit of bread where someone clicked */
  feed(px: number, py: number) {
    if (this.still || !this.entered) return
    const x = clamp(px / this.P, 1, this.cols - 2)
    const y = py / this.P
    const s = this.surfaceAt(x)
    if (this.crumbs.length >= 10) this.crumbs.shift()
    const afloat = y >= s - 1
    this.crumbs.push({ x, y: afloat ? s - 1 : y, vy: 0, afloat, age: 0, seed: rand(0, 6) })
    if (afloat) this.ripple(x, 0.6)
    this.events.used()
  }

  grabStart(px: number, py: number) {
    if (this.still || !this.entered) return
    const x = px / this.P
    const y = py / this.P
    const d = this.duck
    this.grab = { ox: d.x - x, oy: d.y - y, tx: d.x, ty: d.y, moved: 0, trail: [{ at: performance.now(), x, y }] }
  }

  grabMove(px: number, py: number) {
    const g = this.grab
    if (!g) return
    const x = px / this.P
    const y = py / this.P
    const last = g.trail[g.trail.length - 1]
    g.moved += Math.hypot(x - last.x, y - last.y) * this.P
    g.tx = x + g.ox
    g.ty = y + g.oy
    const now = performance.now()
    g.trail.push({ at: now, x, y })
    while (g.trail.length > 2 && now - g.trail[0].at > 100) g.trail.shift()
  }

  /** Let go: a throw, or (if it barely moved) a click */
  grabEnd(): 'throw' | 'click' | null {
    const g = this.grab
    if (!g) return null
    this.grab = null
    if (g.moved < 6) return 'click'
    const a = g.trail[0]
    const b = g.trail[g.trail.length - 1]
    const span = Math.max(16, b.at - a.at) / 1000
    const d = this.duck
    d.vx = clamp((b.x - a.x) / span, -240, 240)
    d.vy = clamp((b.y - a.y) / span, -240, 240)
    d.va = d.vx * 0.03 + rand(-1.5, 1.5)
    this.events.used()
    return 'throw'
  }

  /** Clicked: a hop (the sound and confetti are the component's) */
  quack() {
    if (this.still) return
    const d = this.duck
    if (d.wet) d.vy -= 75
    d.va += rand(-3, 3)
    d.squash = 1
  }

  /** CSS px per cell */
  get cell() {
    return this.P
  }

  /** Where the duck's head is, in CSS px from the hero's corner */
  head() {
    const d = this.duck
    return { x: (d.x + d.facing * 4) * this.P, y: (d.y - 10) * this.P }
  }

  // ---------------------------------------------------------------- physics

  private tick = (_time: number, deltaMs: number) => {
    this.acc += Math.min(deltaMs / 1000, 0.05)
    while (this.acc >= STEP) {
      this.step(STEP)
      this.acc -= STEP
    }
    this.draw()
    this.place()
  }

  private swell(c: number) {
    const t = this.t
    return 0.45 * Math.sin(c * 0.21 + t * 1.7) + 0.3 * Math.sin(c * 0.083 - t * 1.1)
  }

  /** The surface row at column x (fractional) */
  private surfaceAt(x: number) {
    const n = this.h.length
    const i = clamp(Math.floor(x), 0, n - 1)
    const j = Math.min(i + 1, n - 1)
    const f = clamp(x - i, 0, 1)
    const h = this.h[i] * (1 - f) + this.h[j] * f
    return this.rest + this.swell(x) + h
  }

  /** The water level under the duck's hull */
  private hullLevel(x: number) {
    return (this.surfaceAt(x - 10) + this.surfaceAt(x - 4) + this.surfaceAt(x + 4) + this.surfaceAt(x + 10)) / 4
  }

  private ripple(x: number, push: number, width = 1) {
    const n = this.h.length
    for (let c = Math.round(x - width); c <= Math.round(x + width); c++) if (c >= 0 && c < n) this.v[c] += push
  }

  private splash(x: number, level: number, speed: number) {
    const power = Math.min(speed, 240)
    this.ripple(x, power * 0.006, 12)
    const count = Math.round(Math.min(40, power * 0.22))
    for (let i = 0; i < count; i++) {
      const side = i % 2 ? 1 : -1
      this.drops.push({
        x: x + side * rand(HALF * 0.3, HALF),
        y: level - 1,
        vx: side * rand(4, 32),
        vy: -rand(0.25, 0.8) * power * 0.85,
        color: i % 3 ? BRAND : FG,
      })
    }
    this.duck.squash = Math.min(1, power / 120)
  }

  private step(dt: number) {
    this.t += dt
    this.water()
    if (this.entered) this.moveDuck(dt)
    this.moveCrumbs(dt)
    this.moveDrops(dt)
  }

  private water() {
    const { h, v, left, right } = this
    const n = h.length
    for (let i = 0; i < n; i++) {
      v[i] += -TENSION * h[i] - DAMPING * v[i]
      h[i] += v[i]
    }
    for (let pass = 0; pass < PASSES; pass++) {
      for (let i = 0; i < n; i++) {
        left[i] = i > 0 ? SPREAD * (h[i] - h[i - 1]) : 0
        right[i] = i < n - 1 ? SPREAD * (h[i] - h[i + 1]) : 0
      }
      for (let i = 0; i < n; i++) {
        if (i > 0) {
          v[i - 1] += left[i]
          h[i - 1] += left[i]
        }
        if (i < n - 1) {
          v[i + 1] += right[i]
          h[i + 1] += right[i]
        }
      }
    }
    for (let i = 0; i < n; i++) h[i] = clamp(h[i], -30, 30)
  }

  /** Where the duck wants to paddle to, and how keen it is */
  private goal(dt: number): { x: number; face?: number; keen: number } | null {
    const d = this.duck
    let bread: Crumb | null = null
    for (const c of this.crumbs) if (c.afloat && (!bread || Math.abs(c.x - d.x) < Math.abs(bread.x - d.x))) bread = c
    if (bread) {
      const side = bread.x < d.x ? -1 : 1
      return { x: bread.x - side * BEAK, face: side, keen: 26 }
    }
    const p = this.pointer
    if (p.mouse && p.in && this.t - p.at < 5) {
      const side = p.x < d.x ? -1 : 1
      if (Math.abs(p.x - d.x) < 14) return { x: d.x, face: side, keen: 0 }
      return { x: p.x - side * 10, face: side, keen: 12 }
    }
    d.wanderIn -= dt
    if (d.wanderIn <= 0 || d.wanderX < 0) {
      d.wanderX = Math.random() < 0.3 ? d.x : rand(HALF + 4, this.cols - HALF - 4)
      d.wanderIn = rand(5, 10)
    }
    return { x: d.wanderX, keen: 7 }
  }

  private moveDuck(dt: number) {
    const d = this.duck
    const level = this.hullLevel(d.x)
    const under = clamp(d.y + BOTTOM - level, 0, 26)
    const wasWet = d.wet
    d.wet = under > 0

    if (this.grab) {
      const g = this.grab
      const k = 1 - Math.exp(-28 * dt)
      const nx = d.x + (g.tx - d.x) * k
      const ny = d.y + (g.ty - d.y) * k
      d.vx = (nx - d.x) / dt
      d.vy = (ny - d.y) / dt
      d.x = nx
      d.y = ny
      // swings as it's carried
      d.va += (clamp(d.vx * 0.006, -0.7, 0.7) - d.a) * 60 * dt
      d.va *= Math.exp(-10 * dt)
      d.a += d.va * dt
    } else {
      d.vy += G * dt
      if (d.wet) {
        d.vy -= Math.min(BUOY * under, 650) * dt
        d.vy *= Math.exp(-(2.2 + under * 0.25) * dt)
        d.vx *= Math.exp(-1.4 * dt)

        const goal = this.goal(dt)
        if (goal && goal.keen) {
          const dx = goal.x - d.x
          if (Math.abs(dx) > 1.5) d.vx += Math.sign(dx) * Math.min(goal.keen * 1.4, Math.abs(dx) * 2.5) * dt
        }
        if (Math.abs(d.vx) > 1.2) d.facing = Math.sign(d.vx)
        else if (goal?.face) d.facing = goal.face

        // a little wake off the tail
        if (Math.abs(d.vx) > 1) this.ripple(d.x - d.facing * HALF, Math.min(Math.abs(d.vx), 20) * 0.0015, 0)

        // tilt with the water, back upright if it landed on its head
        d.a = Math.atan2(Math.sin(d.a), Math.cos(d.a))
        const slope = (this.surfaceAt(d.x + 10) - this.surfaceAt(d.x - 10)) / 20
        d.va += (clamp(Math.atan(slope), -0.5, 0.5) - d.a) * 40 * dt
        d.va *= Math.exp(-7 * dt)
      } else {
        d.va *= Math.exp(-0.6 * dt)
      }
      d.a += d.va * dt
      d.x += d.vx * dt
      d.y += d.vy * dt
    }

    // the sides of the screen, and not too far off the top
    const lo = HALF
    const hi = Math.max(HALF, this.cols - HALF)
    if (d.x < lo) {
      d.x = lo
      d.vx = Math.abs(d.vx) * 0.5
    } else if (d.x > hi) {
      d.x = hi
      d.vx = -Math.abs(d.vx) * 0.5
    }
    if (d.y < -PY * 3) {
      d.y = -PY * 3
      d.vy = Math.abs(d.vy) * 0.3
    }

    if (!wasWet && d.wet && d.vy > 30) this.splash(d.x, level, d.vy)
    // its bobbing pushes the water about
    if (d.wet) this.ripple(d.x, d.vy * dt * 0.05, 12)

    // a dabble: eat any bread at its beak
    if (d.wet && !this.grab) {
      const beak = d.x + d.facing * BEAK
      const i = this.crumbs.findIndex((c) => c.afloat && Math.abs(c.x - beak) < 2.5)
      if (i >= 0) {
        this.crumbs.splice(i, 1)
        d.dip = 0.4
        this.ripple(beak, 0.5)
        this.events.say('nom')
      }
    }

    d.squash *= Math.exp(-8 * dt)
    d.dip = Math.max(0, d.dip - dt)
    d.blinking = Math.max(0, d.blinking - dt)
    d.blinkIn -= dt
    if (d.blinkIn <= 0) {
      d.blinking = 0.12
      d.blinkIn = rand(2.5, 6)
    }
  }

  private moveCrumbs(dt: number) {
    for (const c of this.crumbs) {
      if (!c.afloat) {
        c.vy = Math.min(c.vy + G * 0.5 * dt, 70)
        c.y += c.vy * dt
        const s = this.surfaceAt(c.x)
        if (c.y >= s - 1) {
          c.afloat = true
          this.ripple(c.x, Math.min(0.9, c.vy * 0.012))
        }
      } else {
        c.age += dt
        c.x = clamp(c.x + Math.sin(this.t * 0.7 + c.seed) * 0.6 * dt, 1, this.cols - 2)
        c.y = this.surfaceAt(c.x) - 1
      }
    }
    // soggy bread sinks after a while
    this.crumbs = this.crumbs.filter((c) => c.age < 40)
  }

  private moveDrops(dt: number) {
    this.drops = this.drops.filter((p) => {
      p.vy += G * dt
      p.x += p.vx * dt
      p.y += p.vy * dt
      if (p.x < -2 || p.x > this.cols + 2 || p.y > this.rows) return false
      if (p.vy > 0 && p.y > this.surfaceAt(p.x)) {
        this.ripple(p.x, 0.12, 0)
        return false
      }
      return true
    })
  }

  // ---------------------------------------------------------------- drawing

  /** Which way the pupil looks: at the pointer, the bread, or ahead */
  private gaze() {
    const d = this.duck
    if (d.blinking > 0) return this.sprites!.blink
    let tx: number | null = null
    let ty = 0
    const p = this.pointer
    if (p.in && p.mouse && this.t - p.at < 5) {
      tx = p.x
      ty = p.y
    } else {
      const c = this.crumbs[this.crumbs.length - 1]
      if (c) {
        tx = c.x
        ty = c.y
      }
    }
    let dx = -1 // ahead, as drawn
    let dy = 0
    if (tx !== null) {
      // the eye, then the target in the sprite's own (unrotated, unflipped) frame
      const ex = d.x + d.facing * 4
      const ey = d.y - 6
      const cos = Math.cos(-d.a)
      const sin = Math.sin(-d.a)
      let lx = (tx - ex) * cos - (ty - ey) * sin
      const ly = (tx - ex) * sin + (ty - ey) * cos
      if (d.facing > 0) lx = -lx
      const len = Math.hypot(lx, ly)
      if (len > 3) {
        dx = clamp(Math.round((lx / len) * 2), -2, 1)
        dy = clamp(Math.round((ly / len) * 1.4), -1, 1)
      } else dx = 0
    }
    return this.sprites!.look.get(`${dx},${dy}`)!
  }

  private drawDuck() {
    const { ctx } = this
    const d = this.duck
    const dip = d.dip > 0 ? d.facing * 0.5 * Math.sin(Math.PI * (1 - d.dip / 0.4)) : 0
    const sq = d.squash
    ctx.save()
    ctx.translate(d.x, d.y)
    ctx.rotate(d.a + dip)
    ctx.scale(-d.facing * (1 + 0.12 * sq), 1 - 0.18 * sq)
    ctx.drawImage(this.gaze(), -PX, -PY)
    ctx.restore()
  }

  /** The duck upside down in the water, wobbling, fading with depth */
  private drawReflection() {
    const { ctx } = this
    const d = this.duck
    const level = Math.round(this.hullLevel(d.x))
    const top = d.y - PY
    if (level - (top + 27) > 6) return // too high up to reflect
    const src = d.facing > 0 ? this.sprites!.mirror : this.sprites!.base
    for (let r = 27; r >= 0; r--) {
      const y = top + r
      if (y >= level) continue
      const depth = level - y - 1
      if (depth >= REFLECT) break
      ctx.globalAlpha = 0.2 * (1 - depth / REFLECT)
      const wobble = Math.round(Math.sin(this.t * 3 + r * 0.5) * 0.7)
      ctx.drawImage(src, 0, r, W, 1, Math.round(d.x - PX) + wobble, level + depth, W, 1)
    }
    ctx.globalAlpha = 1
  }

  private draw() {
    const { ctx, cols, rows, surfaceRow: row } = this
    if (!cols) return
    const s = this.dpr * this.P
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.setTransform(s, 0, 0, s, 0, 0)
    ctx.imageSmoothingEnabled = false

    const n = row.length
    for (let c = 0; c < n; c++) row[c] = Math.round(this.rest + this.swell(c) + this.h[c])

    // the duck first, so the water covers the part of it that's under
    const showDuck = this.sprites && this.entered
    if (showDuck) this.drawDuck()

    // the body of the water
    ctx.fillStyle = this.fill!
    ctx.beginPath()
    for (let c = 0; c < n; c++) ctx.rect(c, row[c], 1, rows - row[c] + 1)
    ctx.fill()

    // glints drifting along under the surface
    ctx.fillStyle = SHADOW
    ctx.globalAlpha = 0.6
    ctx.beginPath()
    const span = cols + 12
    for (let k = 0, m = Math.floor(cols / 9); k < m; k++) {
      const speed = (0.6 + (k % 4) * 0.35) * (k % 2 ? 1 : -1)
      const x = Math.round((((k * 37.3 + this.t * speed) % span) + span) % span) - 6
      const y = this.rest + 3 + ((k * 7) % 13) + Math.round(this.swell(x) * 0.5)
      if (y > row[clamp(x, 0, n - 1)] + 1) ctx.rect(x, y, 2 + (k % 3), 1)
    }
    ctx.fill()
    ctx.globalAlpha = 1

    if (showDuck) this.drawReflection()

    // the surface: a bright line over a dark one, joined up where it steps
    ctx.fillStyle = SHADOW
    ctx.beginPath()
    for (let c = 0; c < n; c++) ctx.rect(c, row[c] + 1, 1, 1)
    ctx.fill()
    ctx.fillStyle = BRAND
    ctx.beginPath()
    for (let c = 0; c < n; c++) {
      const lowest = Math.max(row[c - 1] ?? row[c], row[c + 1] ?? row[c]) - 1
      ctx.rect(c, row[c], 1, Math.max(1, lowest - row[c] + 1))
    }
    ctx.fill()

    // bread
    for (const c of this.crumbs) {
      const x = Math.round(c.x)
      const y = Math.round(c.y)
      ctx.fillStyle = FG
      ctx.fillRect(x - 1, y - 1, 2, 2)
      ctx.fillStyle = MUTED
      ctx.fillRect(x, y, 1, 1)
    }

    // spray
    for (const p of this.drops) {
      ctx.fillStyle = p.color
      ctx.fillRect(Math.round(p.x), Math.round(p.y), 1, 1)
    }
  }

  /** Keep the (invisible) button over the duck, so it can be grabbed */
  private place() {
    const d = this.duck
    const P = this.P
    this.hit.style.transform = `translate(${(d.x - HALF) * P}px, ${(d.y - 14) * P}px) rotate(${d.a}rad)`
    this.hit.classList.toggle('is-right', d.facing > 0)
    this.hit.classList.toggle('is-held', !!this.grab)
  }
}
