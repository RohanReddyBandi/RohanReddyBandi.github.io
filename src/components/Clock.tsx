import { useEffect, useRef } from 'react'
import { site } from '../content/site'

const format = new Intl.DateTimeFormat('en-US', {
  timeZone: site.clock.timeZone,
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
})

/** Live local time with a pulsing dot. Ticks on the second. */
export default function Clock({ className = '' }: { className?: string }) {
  const time = useRef<HTMLTimeElement>(null)

  useEffect(() => {
    let timer = 0
    const tick = () => {
      if (time.current) time.current.textContent = format.format(new Date())
      timer = window.setTimeout(tick, 1000 - (Date.now() % 1000))
    }
    tick()
    return () => clearTimeout(timer)
  }, [])

  return (
    <p className={`label flex items-center gap-2.5 text-muted ${className}`}>
      <span className="live-dot" aria-hidden="true" />
      <span className="hidden lg:inline" aria-hidden="true">
        {site.clock.city}
      </span>
      <span className="sr-only">Local time in {site.clock.city}:</span>
      <time ref={time} className="tabular-nums">
        {format.format(new Date())}
      </time>
    </p>
  )
}
