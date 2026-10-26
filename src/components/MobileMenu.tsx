import gsap from 'gsap'
import { useEffect, useRef, type MouseEvent, type RefObject } from 'react'
import { site } from '../content/site'
import { goTo, lockScroll, reducedMotion } from '../lib/motion'

/**
 * Full-screen menu for phones. Wipes down over the page, traps focus between
 * the Close button and its links, and closes on Escape.
 */
export default function MobileMenu({
  open,
  onClose,
  toggle,
}: {
  open: boolean
  onClose: () => void
  toggle: RefObject<HTMLButtonElement | null>
}) {
  const panel = useRef<HTMLDivElement>(null)
  const pending = useRef<string | null>(null)

  useEffect(() => {
    const el = panel.current!
    const links = el.querySelectorAll<HTMLElement>('.menu__link-inner')
    const still = reducedMotion.matches
    gsap.killTweensOf([el, links])

    if (open) {
      el.hidden = false
      lockScroll(true)
      el.querySelector<HTMLElement>('a')?.focus()
      if (still) return
      gsap.fromTo(el, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.8, ease: 'expo.inOut' })
      gsap.fromTo(links, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'expo.out', stagger: 0.06, delay: 0.3 })
      return
    }

    if (el.hidden) return
    lockScroll(false)
    // Navigate once scrolling is unlocked, while the panel wipes away
    if (pending.current) goTo(pending.current)
    else toggle.current?.focus()
    pending.current = null
    const done = () => {
      el.hidden = true
    }
    if (still) done()
    else gsap.to(el, { clipPath: 'inset(100% 0 0 0)', duration: 0.6, ease: 'expo.inOut', onComplete: done })
  }, [open, toggle])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key !== 'Tab') return
      // Keep Tab inside: the Close button plus the menu's own links
      const stops = [toggle.current, ...panel.current!.querySelectorAll<HTMLElement>('a')].filter(Boolean) as HTMLElement[]
      const i = stops.indexOf(document.activeElement as HTMLElement)
      const next = e.shiftKey ? (i <= 0 ? stops.length - 1 : i - 1) : i === stops.length - 1 ? 0 : i + 1
      e.preventDefault()
      stops[next].focus()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose, toggle])

  const go = (hash: string) => (e: MouseEvent) => {
    e.preventDefault()
    pending.current = hash
    onClose()
  }

  return (
    <div id="menu" ref={panel} className="menu" role="dialog" aria-modal="true" aria-label="Menu" hidden>
      <nav aria-label="Menu" className="site-grid">
        <ul className="col-span-full">
          {site.nav.map((item) => (
            <li key={item.href} className="menu__item">
              <a href={item.href} onClick={go(item.href)} className="menu__link">
                <span className="menu__link-inner">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="site-grid label mt-auto pb-8">
        <a href={site.links.resume} target="_blank" rel="noopener" className="col-span-2 py-3 text-accent">
          Resume ↗
        </a>
        <a href={site.links.github} target="_blank" rel="noopener" className="col-span-2 justify-self-end py-3 text-fg">
          GitHub ↗
        </a>
      </div>
    </div>
  )
}
