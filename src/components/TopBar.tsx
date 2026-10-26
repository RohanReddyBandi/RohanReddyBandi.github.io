import gsap from 'gsap'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { site } from '../content/site'
import { onScroll, reducedMotion } from '../lib/motion'
import { pageReady } from '../lib/sequence'
import Clock from './Clock'
import Magnetic from './Magnetic'
import MobileMenu from './MobileMenu'
import RollLink from './RollLink'

/**
 * Fixed top bar. Transparent over the hero; once you scroll it gets a solid
 * backing, tucks away while you scroll down and comes back when you scroll up.
 */
export default function TopBar() {
  const bar = useRef<HTMLElement>(null)
  const menuButton = useRef<HTMLButtonElement>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuOpenRef = useRef(false)

  useEffect(() => {
    menuOpenRef.current = menuOpen
  }, [menuOpen])

  useEffect(() => {
    let last = 0
    return onScroll((y) => {
      const el = bar.current
      if (!el) return
      el.dataset.scrolled = String(y > 8)
      if (Math.abs(y - last) < 6) return
      el.dataset.hidden = String(y > last && y > 160 && !menuOpenRef.current)
      last = y
    })
  }, [])

  useLayoutEffect(() => {
    if (reducedMotion.matches) return
    let cancelled = false
    const ctx = gsap.context(() => gsap.set('.topbar__item', { yPercent: -140, autoAlpha: 0 }), bar)
    pageReady.then(() => {
      if (cancelled) return
      ctx.add(() =>
        gsap.to('.topbar__item', { yPercent: 0, autoAlpha: 1, duration: 1, ease: 'expo.out', stagger: 0.05, delay: 0.9 }),
      )
    })
    return () => {
      cancelled = true
      ctx.revert()
    }
  }, [])

  return (
    <>
      <header ref={bar} className="topbar" data-menu={menuOpen}>
        <div className="site-grid items-center py-5">
          <div className="topbar__item col-span-1 md:col-span-2">
            <a href="#top" className="topbar__logo" aria-label={`${site.name.first} ${site.name.last}, back to top`}>
              {site.initials}
            </a>
          </div>

          <Clock className="topbar__item col-span-2 justify-self-center md:col-span-4 md:col-start-3 md:justify-self-start" />

          <nav aria-label="Primary" className="hidden justify-self-end md:col-span-6 md:col-start-7 md:block">
            <ul className="flex items-center gap-6 lg:gap-8">
              {site.nav.map((item) => (
                <li key={item.href} className="topbar__item">
                  <Magnetic>
                    <RollLink href={item.href} className="label text-fg">
                      {item.label}
                    </RollLink>
                  </Magnetic>
                </li>
              ))}
              {__HAS_RESUME__ && (
                <li className="topbar__item">
                  <Magnetic>
                    <RollLink href={site.links.resume} target="_blank" rel="noopener" className="label text-accent">
                      Resume ↗
                    </RollLink>
                  </Magnetic>
                </li>
              )}
            </ul>
          </nav>

          <button
            ref={menuButton}
            type="button"
            className="topbar__item label col-start-4 justify-self-end py-2 text-fg md:hidden"
            aria-expanded={menuOpen}
            aria-controls="menu"
            onClick={() => setMenuOpen((o) => !o)}
          >
            {menuOpen ? 'Close' : 'Menu'}
          </button>
        </div>
      </header>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} toggle={menuButton} />
    </>
  )
}
