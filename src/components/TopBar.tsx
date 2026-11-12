import gsap from 'gsap'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { site } from '../content/site'
import { onScroll, reducedMotion } from '../lib/motion'
import { pageReady } from '../lib/sequence'
import MobileMenu from './MobileMenu'

/**
 * Fixed top bar over the column. Transparent over the hero; once you scroll
 * it gets a soft fade behind it, tucks away while you scroll down and comes
 * back when you scroll up.
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
    const el = bar.current!
    // Keyboard focus landing in the bar brings it back into view
    const reveal = () => (el.dataset.hidden = 'false')
    el.addEventListener('focusin', reveal)
    const stop = onScroll((y) => {
      el.dataset.scrolled = String(y > 8)
      if (Math.abs(y - last) < 6) return
      el.dataset.hidden = String(y > last && y > 160 && !menuOpenRef.current && !el.contains(document.activeElement))
      last = y
    })
    return () => {
      stop()
      el.removeEventListener('focusin', reveal)
    }
  }, [])

  useLayoutEffect(() => {
    if (reducedMotion.matches) return
    let cancelled = false
    const ctx = gsap.context(() => gsap.set('.topbar__item', { autoAlpha: 0, y: -6 }), bar)
    pageReady.then(() => {
      if (cancelled) return
      ctx.add(() =>
        gsap.to('.topbar__item', { autoAlpha: 1, y: 0, duration: 1.4, ease: 'power2.out', stagger: 0.08, delay: 2 }),
      )
    })
    return () => {
      cancelled = true
      ctx.revert()
    }
  }, [])

  return (
    <>
      <a href="#content" className="skip-link label">
        Skip to content
      </a>
      <header ref={bar} className="topbar" data-menu={menuOpen}>
        <div className="column flex items-center justify-between py-5">
          <a
            href="#top"
            className="topbar__item topbar__logo"
            aria-label={`${site.name.first} ${site.name.last}, back to top`}
          >
            {site.initials}
          </a>

          <nav aria-label="Primary" className="hidden md:block">
            <ul className="flex items-center gap-6">
              {site.nav.map((item) => (
                <li key={item.href} className="topbar__item">
                  <a href={item.href} className="quiet-link">
                    {item.label}
                  </a>
                </li>
              ))}
              {__HAS_RESUME__ && (
                <li className="topbar__item">
                  <a href={site.links.resume} target="_blank" rel="noopener" className="quiet-link text-accent">
                    Resume ↗
                  </a>
                </li>
              )}
            </ul>
          </nav>

          <button
            ref={menuButton}
            type="button"
            className="topbar__item quiet-link py-2 md:hidden"
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
