import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { generateSeries } from '../lib/market'
import { reducedMotion } from '../lib/motion'
import { ChartRenderer } from './ChartRenderer'

const series = generateSeries()

/**
 * The hero's background chart. It animates only while it's on screen, the tab
 * is visible, and motion isn't reduced; otherwise it holds a still frame.
 */
export default function HeroChart() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current!
    const chart = new ChartRenderer(canvas, series)
    let onScreen = true
    let running = false

    const tick = (time: number) => chart.frame(time * 1000)
    const sync = () => {
      const animate = onScreen && !document.hidden && !reducedMotion.matches
      if (animate && !running) gsap.ticker.add(tick)
      if (!animate && running) gsap.ticker.remove(tick)
      if (!animate) chart.drawStill()
      running = animate
    }

    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      chart.resize(width, height)
      if (!running) chart.drawStill()
    })
    const visibility = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      sync()
    })
    resize.observe(canvas)
    visibility.observe(canvas)
    document.addEventListener('visibilitychange', sync)
    reducedMotion.addEventListener('change', sync)
    document.fonts.ready.then(() => {
      chart.refreshText()
      if (!running) chart.drawStill()
    })

    return () => {
      gsap.ticker.remove(tick)
      resize.disconnect()
      visibility.disconnect()
      document.removeEventListener('visibilitychange', sync)
      reducedMotion.removeEventListener('change', sync)
    }
  }, [])

  return <canvas ref={ref} aria-hidden="true" className="pointer-events-none absolute inset-0 h-full w-full" />
}
