// Spring physics for the drag handle, in CSS px along the time axis.

const DRAG = { k: 900, zeta: 1 } // trails the pointer with a little weight
const SETTLE = { k: 120, zeta: 0.7 } // after release: ~5% overshoot, settles in ~0.65s
const THROW_SECONDS = 0.2 // how far a flick carries: velocity × this
const EDGE_GIVE = 0.25 // rubber band when dragged past either end
const SUBSTEP = 1 / 240

export class HandlePhysics {
  x = 0
  v = 0
  target = 0
  dragging = false
  private min = 0
  private max = 0
  /** Resting positions snap to candle centers */
  snap: (x: number) => number = (x) => x

  setBounds(min: number, max: number) {
    this.min = min
    this.max = max
  }

  clamp(x: number) {
    return Math.min(this.max, Math.max(this.min, x))
  }

  startDrag() {
    this.dragging = true
  }

  dragTo(x: number) {
    const over = x > this.max ? x - this.max : x < this.min ? x - this.min : 0
    this.target = this.clamp(x) + over * EDGE_GIVE
  }

  /** Let go with the pointer's velocity (px/s): coast, ease out, overshoot a touch. */
  release(velocity: number) {
    this.dragging = false
    this.target = this.snap(this.clamp(this.x + velocity * THROW_SECONDS))
  }

  /** Spring to a new resting spot (keyboard). */
  moveTo(x: number) {
    this.target = this.snap(this.clamp(x))
  }

  /** Teleport with no motion (reduced motion, resize). */
  jump(x: number) {
    this.x = this.target = x
    this.v = 0
  }

  get settled() {
    return !this.dragging && Math.abs(this.x - this.target) < 0.05 && Math.abs(this.v) < 0.5
  }

  step(dt: number) {
    const { k, zeta } = this.dragging ? DRAG : SETTLE
    const c = 2 * zeta * Math.sqrt(k)
    for (let t = dt; t > 0; t -= SUBSTEP) {
      const h = Math.min(t, SUBSTEP)
      this.v += (-k * (this.x - this.target) - c * this.v) * h
      this.x += this.v * h
    }
    if (this.settled) this.jump(this.target)
  }
}
