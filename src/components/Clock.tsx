import { useEffect, useRef } from 'react'
import { site } from '../content/site'

const format = new Intl.DateTimeFormat('en-US', {
  timeZone: site.clock.timeZone,
  hour: 'numeric',
  minute: '2-digit',
})

/** Local time where I am, with a softly glowing dot. Updates on the minute. */
export default function Clock({ className = '' }: { className?: string }) {
  const time = useRef<HTMLTimeElement>(null)

  useEffect(() => {
    let timer = 0
    const tick = () => {
      if (time.current) time.current.textContent = format.format(new Date())
      timer = window.setTimeout(tick, 60000 - (Date.now() % 60000))
    }
    tick()
    return () => clearTimeout(timer)
  }, [])

  return (
    <p className={`label flex items-center gap-2 text-muted ${className}`}>
      <span className="live-dot" aria-hidden="true" />
      <span>{site.clock.city}</span>
      <span aria-hidden="true">·</span>
      <span className="sr-only">local time</span>
      <time ref={time} className="tabular-nums">
        {format.format(new Date())}
      </time>
    </p>
  )
}
