import gsap from 'gsap'
import { accentRgba } from './accent'

// A one-off burst of square (pixel-ish) confetti in the accent color, drawn
// on a throwaway full-screen canvas that removes itself when done.

const COUNT = 70
const LIFE_MS = 1700

export function confetti(x: number, y: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const canvas = document.createElement('canvas')
  canvas.className = 'confetti'
  canvas.width = innerWidth * dpr
  canvas.height = innerHeight * dpr
  canvas.setAttribute('aria-hidden', 'true')
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  ctx.scale(dpr, dpr)

  const bits = Array.from({ length: COUNT }, () => {
    const angle = -Math.PI / 2 + gsap.utils.random(-1.15, 1.15)
    const speed = gsap.utils.random(5, 13)
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: gsap.utils.random([4, 5, 6, 7]),
      spin: gsap.utils.random(-0.3, 0.3),
      turn: 0,
      alpha: gsap.utils.random([1, 1, 0.65]),
    }
  })

  const start = performance.now()
  const step = () => {
    const age = performance.now() - start
    ctx.clearRect(0, 0, innerWidth, innerHeight)
    const fade = Math.max(0, 1 - Math.max(0, age - LIFE_MS * 0.55) / (LIFE_MS * 0.45))
    for (const b of bits) {
      b.vy += 0.32 // gravity
      b.vx *= 0.985
      b.vy *= 0.985
      b.x += b.vx
      b.y += b.vy
      b.turn += b.spin
      ctx.save()
      ctx.translate(b.x, b.y)
      ctx.rotate(b.turn)
      ctx.fillStyle = accentRgba(b.alpha * fade)
      ctx.fillRect(-b.size / 2, -b.size / 2, b.size, b.size)
      ctx.restore()
    }
    if (age > LIFE_MS) {
      gsap.ticker.remove(step)
      canvas.remove()
    }
  }
  gsap.ticker.add(step)
}
