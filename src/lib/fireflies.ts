import gsap from 'gsap'
import { glow } from './accent'

// Fireflies drifting over the page: small lights that wander and slowly
// blink, plus a few big out-of-focus ones close to the "camera". They drift
// off when the pointer moves through them; leave the pointer still for a
// moment and the nearest few wander over and circle it. Scrolling slides
// them past at different speeds, so the page has depth.
// One canvas behind the content, sprites drawn additively, at most 1.5x
// resolution (they're soft anyway). With reduced motion it draws one still
// frame.

const DENSITY = 40000 // px² of screen per firefly
const MIN = 12
const MAX = 36
const NEAR = 0.16 // share of them that are big, blurry and close
const SHY = 140 // px: how close a moving pointer pushes them away
const CURIOUS = 3 // how many come over to a still pointer
const CURIOUS_AFTER = 1.2 // s the pointer has to rest
const ORBIT = 54 // px they circle at

type Fly = {
  x: number
  y: number
  z: number // 0 far .. 1 close
  heading: number
  turn: [number, number, number, number] // noise for wandering
  blink: [number, number] // period (s), phase
  ex: number // pushed/pulled velocity on top of the wander
  ey: number
  near: boolean
}

function sprite(size: number, stops: [number, string][]) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [at, color] of stops) g.addColorStop(at, color)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  return c
}

export class Fireflies {
  private canvas: HTMLCanvasElement
  private ctx: CanvasRenderingContext2D
  private flies: Fly[] = []
  private dpr = 1
  private w = 0
  private h = 0
  private t = 0
  private pointer = { x: 0, y: 0, in: false, still: 0, moving: 0 }
  private scrollY = window.scrollY
  private light: HTMLCanvasElement
  private bokeh: HTMLCanvasElement
  private still: boolean
  private running = false

  constructor(canvas: HTMLCanvasElement, still: boolean) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')!
    this.still = still
    const [r, g, b] = glow
    // a bright core in a yellow-green halo
    this.light = sprite(64, [
      [0, 'rgba(255, 252, 225, 1)'],
      [0.12, 'rgba(240, 250, 190, 0.95)'],
      [0.35, 'rgba(200, 235, 140, 0.28)'],
      [1, 'rgba(200, 235, 140, 0)'],
    ])
    // a firefly too close to be in focus: a soft disc of warm light
    this.bokeh = sprite(128, [
      [0, `rgba(${r}, ${g}, ${b}, 0.9)`],
      [0.45, `rgba(${r}, ${g}, ${b}, 0.7)`],
      [0.75, `rgba(${r}, ${g}, ${b}, 0.25)`],
      [1, `rgba(${r}, ${g}, ${b}, 0)`],
    ])
    this.resize()
    if (still) this.draw()
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas
    if (!w || !h) return
    const grew = w * h > this.w * this.h
    this.w = w
    this.h = h
    this.dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    const count = Math.round(Math.min(MAX, Math.max(MIN, (w * h) / DENSITY)))
    if (grew || this.flies.length > count) {
      while (this.flies.length < count) this.flies.push(this.spawn())
      this.flies.length = count
    }
    if (this.still) this.draw()
  }

  private spawn(): Fly {
    const near = Math.random() < NEAR
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)
    return {
      x: Math.random() * this.w,
      y: Math.random() * this.h,
      z: near ? rnd(0.85, 1) : rnd(0, 0.8) ** 1.4,
      heading: rnd(0, Math.PI * 2),
      turn: [rnd(0.2, 0.6), rnd(0, 6), rnd(0.5, 1.1), rnd(0, 6)],
      blink: [rnd(3, 7), rnd(0, 7)],
      ex: 0,
      ey: 0,
      near,
    }
  }

  move(x: number, y: number) {
    const p = this.pointer
    p.x = x
    p.y = y
    p.in = true
    p.still = 0
    p.moving = 0.35 // shy for a moment after each move
  }

  leave() {
    this.pointer.in = false
  }

  scroll(y: number) {
    const dy = y - this.scrollY
    this.scrollY = y
    if (Math.abs(dy) > this.h) return // a jump, not a scroll
    for (const f of this.flies) f.y -= dy * (0.06 + 0.4 * f.z)
    if (this.still) this.draw()
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

  private tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 0.05)
    this.t += dt
    this.step(dt)
    this.draw()
  }

  private step(dt: number) {
    const { flies, pointer: p, t } = this
    p.still += dt
    p.moving = Math.max(0, p.moving - dt)
    const damp = Math.pow(0.12, dt) // the extra velocity fades in ~1s

    // the few closest to a resting pointer get curious
    let curious: Fly[] = []
    if (p.in && p.still > CURIOUS_AFTER) {
      curious = flies
        .filter((f) => !f.near)
        .map((f) => [f, Math.hypot(f.x - p.x, f.y - p.y)] as const)
        .filter(([, d]) => d < 420)
        .sort((a, b) => a[1] - b[1])
        .slice(0, CURIOUS)
        .map(([f]) => f)
    }

    for (const f of flies) {
      const [a, pa, b, pb] = f.turn
      f.heading += (Math.sin(t * a + pa) + Math.sin(t * b + pb)) * 0.6 * dt
      const speed = 6 + 10 * f.z
      f.ex *= damp
      f.ey *= damp

      if (p.in && !f.near) {
        const dx = f.x - p.x
        const dy = f.y - p.y
        const d = Math.hypot(dx, dy) || 1
        if (p.moving > 0 && d < SHY) {
          const push = (1 - d / SHY) ** 2 * 220 * dt
          f.ex += (dx / d) * push
          f.ey += (dy / d) * push
        }
        const k = curious.indexOf(f)
        if (k >= 0) {
          // drift toward a spot on a slow circle around the pointer
          const ang = t * 0.35 + (k * Math.PI * 2) / CURIOUS
          const tx = p.x + Math.cos(ang) * ORBIT
          const ty = p.y + Math.sin(ang) * ORBIT * 0.8
          f.ex += (tx - f.x) * 0.9 * dt
          f.ey += (ty - f.y) * 0.9 * dt
        }
      }

      f.x += (Math.cos(f.heading) * speed + f.ex) * dt
      f.y += (Math.sin(f.heading) * speed + f.ey) * dt
      this.wrap(f)
    }
  }

  private wrap(f: Fly) {
    const m = f.near ? 80 : 20
    if (f.x < -m) f.x += this.w + m * 2
    else if (f.x > this.w + m) f.x -= this.w + m * 2
    if (f.y < -m) f.y += this.h + m * 2
    else if (f.y > this.h + m) f.y -= this.h + m * 2
  }

  private draw() {
    const { ctx, flies, dpr, t, pointer: p } = this
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.globalCompositeOperation = 'lighter'
    for (const f of flies) {
      const [period, phase] = f.blink
      // a slow blink: mostly dim, swelling up now and then
      const wave = 0.5 + 0.5 * Math.sin(((t + phase) / period) * Math.PI * 2)
      const on = this.still ? 0.6 : 0.18 + 0.82 * wave ** 3
      if (f.near) {
        const r = 22 + f.z * 26
        ctx.globalAlpha = 0.04 + 0.1 * on
        ctx.drawImage(this.bokeh, f.x - r, f.y - r, r * 2, r * 2)
      } else {
        // lit up a little when the pointer's close
        const d = p.in ? Math.hypot(f.x - p.x, f.y - p.y) : Infinity
        const near = d < 160 ? (1 - d / 160) * 0.5 : 0
        const r = 8 + f.z * 10
        ctx.globalAlpha = Math.min(1, (0.25 + 0.6 * f.z) * on + near)
        ctx.drawImage(this.light, f.x - r, f.y - r, r * 2, r * 2)
      }
    }
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }

  destroy() {
    this.stop()
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
  }
}
