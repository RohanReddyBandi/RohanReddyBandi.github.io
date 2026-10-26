import { useEffect, useRef } from 'react'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'
import { reducedMotion } from '../lib/motion'
import { useRevealRows } from '../lib/reveal'
import { icons } from './otc-icons'

/**
 * A strip of hobbies. Each tile's icon plays its own reaction on hover (or
 * tap on touch screens). Five across on desktop; a swipeable strip below.
 */
export default function OffTheClock() {
  const strip = useRef<HTMLUListElement>(null)
  const { intro, tiles } = site.offTheClock
  useRevealRows(strip, '.otc-tile', { stagger: 0.07 })

  useEffect(() => {
    if (reducedMotion.matches) return
    const cleanups = [...strip.current!.querySelectorAll<HTMLElement>('.otc-tile')].map((tile) => {
      const svg = tile.querySelector('svg')!
      const tl = icons[tile.dataset.id!].react(svg)
      const play = (e: PointerEvent) => {
        // mouse plays on hover; touch and pen play on tap
        if ((e.type === 'pointerenter') !== (e.pointerType === 'mouse')) return
        if (!tl.isActive()) tl.restart()
      }
      tile.addEventListener('pointerenter', play)
      tile.addEventListener('pointerdown', play)
      return () => {
        tile.removeEventListener('pointerenter', play)
        tile.removeEventListener('pointerdown', play)
        tl.revert()
      }
    })
    return () => cleanups.forEach((c) => c())
  }, [])

  return (
    <section id="off-the-clock" className="section" aria-labelledby="otc-title">
      <SectionHead label="Off the clock" id="otc-title" />
      <p className="otc__intro site-grid">
        <span className="col-span-full md:col-span-6">{intro}</span>
        <span className="otc__swipe label col-span-full md:col-span-6" aria-hidden="true">
          Swipe →
        </span>
      </p>

      <ul ref={strip} className="otc__strip">
        {tiles.map((t) => (
          <li key={t.id} className="otc-tile" data-id={t.id}>
            <svg
              className="otc-tile__icon"
              viewBox="0 0 120 72"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              {icons[t.id].svg}
            </svg>
            <h3 className="otc-tile__name">{t.name}</h3>
            <p className="otc-tile__line">{t.line}</p>
            <p className="otc-tile__detail label">{t.detail}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
