import { useEffect, useRef } from 'react'
import { Fireflies } from '../lib/fireflies'
import { onScroll, reducedMotion } from '../lib/motion'

// The room the page sits in, fixed behind everything: warm light falling in
// from the top right, a film of grain, and fireflies (lib/fireflies.ts)
// that shy away from the pointer and come over when it rests.

export default function Ambient() {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const flies = new Fireflies(canvas.current!, reducedMotion.matches)
    const ro = new ResizeObserver(() => flies.resize())
    ro.observe(canvas.current!)
    const move = (e: PointerEvent) => flies.move(e.clientX, e.clientY)
    const leave = () => flies.leave()
    const stopScroll = onScroll((y) => flies.scroll(y))
    if (!reducedMotion.matches) {
      window.addEventListener('pointermove', move, { passive: true })
      document.documentElement.addEventListener('pointerleave', leave)
    }
    flies.start()
    return () => {
      ro.disconnect()
      stopScroll()
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('pointerleave', leave)
      flies.destroy()
    }
  }, [])

  return (
    <div className="ambient" aria-hidden="true">
      <div className="ambient__light">
        <div className="ambient__rays" />
      </div>
      <canvas ref={canvas} className="ambient__flies" />
      <div className="ambient__grain" />
    </div>
  )
}
