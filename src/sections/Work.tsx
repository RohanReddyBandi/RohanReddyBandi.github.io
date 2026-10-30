import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'
import { reducedMotion, scrollToY } from '../lib/motion'
import { useRevealRows } from '../lib/reveal'

gsap.registerPlugin(ScrollTrigger)

type Project = (typeof site.work)[number]

// Where the floating preview runs: a mouse/trackpad on a wide screen. Everywhere
// else each card shows its preview inline.
const FLOATING = '(hover: hover) and (pointer: fine) and (min-width: 48rem)'

// Screenshots: src/assets/work/<shot>-1600.webp and <shot>-800.webp (16:10).
// Drop a pair in and the project picks it up; without one it shows a placeholder.
const shots = import.meta.glob<string>('../assets/work/*.webp', { eager: true, import: 'default' })

function Shot({ project }: { project: Project }) {
  const large = shots[`../assets/work/${project.shot}-1600.webp`]
  const small = shots[`../assets/work/${project.shot}-800.webp`] ?? large
  if (!large) {
    return (
      <div className="shot">
        <span className="label">[Screenshot] {project.title}</span>
      </div>
    )
  }
  // Decorative: every Shot sits inside an aria-hidden wrapper
  return (
    <div className="shot">
      <img
        className="shot__img"
        src={small}
        srcSet={`${small} 800w, ${large} 1600w`}
        sizes="(min-width: 64rem) 28rem, (min-width: 48rem) 42vw, 100vw"
        width={1600}
        height={1000}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

function Row({ project, index }: { project: Project; index: number }) {
  return (
    <li className="work-row" data-index={index} data-cursor="open">
      <div className="work-row__media" aria-hidden="true">
        <Shot project={project} />
      </div>

      <h3 className="work-row__title">
        <a className="work-row__link" href={project.href} target="_blank" rel="noopener">
          {project.title}
          <span className="sr-only"> ({project.linkLabel}, opens in a new tab)</span>
        </a>
      </h3>

      <div className="work-row__meta">
        <p className="work-row__line">{project.line}</p>
        {project.detail && <p className="work-row__detail">{project.detail}</p>}
        <ul className="work-row__tags" aria-label="Built with">
          {project.tags.map((t) => (
            <li key={t} className="label">
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="work-row__end">
        <span className="label text-muted">{project.year}</span>
        <span className="work-row__arrow" aria-hidden="true">
          ↗
        </span>
      </div>
    </li>
  )
}

/** Reduced motion: full-width rows, with a screenshot that follows the mouse */
function WorkRows() {
  const list = useRef<HTMLOListElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const reel = useRef<HTMLDivElement>(null)
  useRevealRows(list, '.work-row', { stagger: 0.1 })

  // The floating preview: trails the cursor, tilts with its speed, and slides
  // its reel to whichever project is hovered
  useEffect(() => {
    if (!matchMedia(FLOATING).matches) return
    const el = list.current!
    const pv = preview.current!
    const still = reducedMotion.matches
    const follow = (prop: 'x' | 'y') =>
      still ? (v: number) => gsap.set(pv, { [prop]: v }) : gsap.quickTo(pv, prop, { duration: 0.6, ease: 'power3.out' })
    const xTo = follow('x')
    const yTo = follow('y')
    const tilt = gsap.quickTo(pv, 'rotation', { duration: 0.5, ease: 'power3.out' })
    let lastX = 0
    let settle = 0
    let active = -1

    const move = (e: PointerEvent) => {
      xTo(e.clientX)
      yTo(e.clientY)
      if (!still) {
        tilt(gsap.utils.clamp(-8, 8, (e.clientX - lastX) * 0.35))
        clearTimeout(settle)
        settle = window.setTimeout(() => tilt(0), 90)
      }
      lastX = e.clientX
    }
    const over = (e: PointerEvent) => {
      const row = (e.target as Element).closest<HTMLElement>('.work-row')
      if (!row) return
      const i = Number(row.dataset.index)
      if (i === active) return
      if (active === -1) {
        // first entry: jump there, then reveal
        gsap.set(pv, { x: e.clientX, y: e.clientY })
        gsap.set(reel.current, { yPercent: (-100 / site.work.length) * i })
        gsap.to(pv, { clipPath: 'inset(0% 0% 0% 0%)', duration: still ? 0 : 0.7, ease: 'expo.out', overwrite: 'auto' })
      } else {
        gsap.to(reel.current, { yPercent: (-100 / site.work.length) * i, duration: still ? 0 : 0.7, ease: 'expo.out' })
      }
      active = i
      lastX = e.clientX
    }
    const leave = () => {
      active = -1
      gsap.to(pv, { clipPath: 'inset(0% 0% 100% 0%)', duration: still ? 0 : 0.5, ease: 'power3.in', overwrite: 'auto' })
    }

    el.addEventListener('pointermove', move)
    el.addEventListener('pointerover', over)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerover', over)
      el.removeEventListener('pointerleave', leave)
      clearTimeout(settle)
    }
  }, [])

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <SectionHead label="Projects" id="work-title" />

      {/* Before the list on purpose: with no z-index, the rows paint on top,
          so the hovered title reads over the screenshot */}
      <div ref={preview} className="work-preview" aria-hidden="true">
        <div ref={reel} className="work-preview__reel" style={{ '--slides': site.work.length } as CSSProperties}>
          {site.work.map((p) => (
            <div key={p.title} className="work-preview__slide">
              <Shot project={p} />
            </div>
          ))}
        </div>
      </div>

      <ol ref={list} className="work-list">
        {site.work.map((p, i) => (
          <Row key={p.title} project={p} index={i} />
        ))}
      </ol>
    </section>
  )
}

// ---------------------------------------------------------------------------
// The gallery (after wodniack.dev's work wall): the section pins, a wall of
// giant repeated project names sways in 3D as you scroll, and each project's
// screenshot card flies out of the distance, hangs in front of the wall long
// enough to read, then rushes past. The last card is this site itself.

const CARD_SPAN = 1.6 // each card's flight, in "card slots"; > 1 so they overlap
const SCROLL_PER_CARD = 0.95 // screens of scrolling per card while pinned
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
// Fast in, lingers in the middle (so the card can be read), fast out
const linger = (t: number) => 0.5 + 4 * (t - 0.5) ** 3
const pad = (n: number) => String(n).padStart(2, '0')
// The wall spells PROJECTS down the screen, one letter per row, each letter
// repeated across it (after wodniack.dev's WORK wall)
const WORD = 'Projects'
const ROW_EM = 0.84 // line height; keep in sync with .fly-wall in sections.css
const LETTER_EM = 1.05 // a letter plus its gap, roughly
// Enough repeats that a row still covers the screen while it slides (rows
// move up to 38% of their width)
const repeatsFor = (w: number, h: number) => {
  const size = (1.1 * h) / (WORD.length * ROW_EM)
  return Math.min(40, Math.max(8, Math.ceil((1.75 * w) / (size * LETTER_EM)) + 2))
}

function Wall() {
  // grows (never shrinks) when the window gets wider
  const [repeats, setRepeats] = useState(() => repeatsFor(innerWidth, innerHeight))
  useEffect(() => {
    const grow = () => setRepeats((r) => Math.max(r, repeatsFor(innerWidth, innerHeight)))
    window.addEventListener('resize', grow)
    return () => window.removeEventListener('resize', grow)
  }, [])

  return (
    <div className="fly-wall" aria-hidden="true">
      {[...WORD].map((ch, r) => (
        <div key={r} className="fly-wall__row">
          <div className="fly-wall__track">
            {Array.from({ length: repeats }, (_, i) => (
              <span key={i} className="fly-wall__letter">
                {ch}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Real numbers about this build, read from git when the site is built */
function BuildFacts() {
  const date = new Date(__BUILD__.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <p className="fly-card__facts label">
      <span className="fly-card__live">
        <span className="live-dot" aria-hidden="true" />
        You are here
      </span>
      <span>Commit #{__BUILD__.commits}</span>
      <span>Built {date}</span>
    </p>
  )
}

function WorkGallery() {
  const section = useRef<HTMLElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const n = site.work.length

  useLayoutEffect(() => {
    const el = section.current!
    const ctx = gsap.context(() => {
      const wall = el.querySelector<HTMLElement>('.fly-wall')!
      const cards = gsap.utils.toArray<HTMLElement>('.fly-card')
      const units = n + CARD_SPAN - 1
      let shown = 0
      let wide = true
      let spread = 1
      let tracks: HTMLElement[] = []
      let pieces: HTMLElement[][] = []

      // Every letter wobbles on its own. Re-collected on refresh, since the
      // rows gain letters when the window gets wider.
      const collect = () => {
        wide = window.matchMedia('(min-width: 48rem)').matches
        // cards drift off to the sides on wide screens, stay centered on phones
        spread = wide ? 1 : 0.15
        tracks = gsap.utils.toArray<HTMLElement>('.fly-wall__track')
        pieces = tracks.map((t) => [...t.querySelectorAll<HTMLElement>('.fly-wall__letter')])
      }
      collect()

      const render = (p: number) => {
        // the whole wall turns a little, like a camera drifting past it
        wall.style.transform = `rotateX(${lerp(14, -8, p)}deg) rotateY(${lerp(-10, 10, p)}deg)`
        tracks.forEach((track, r) => {
          // rows slide in alternate directions
          const x = r % 2 ? lerp(-38, -12, p) : lerp(-12, -38, p)
          track.style.transform = `translate3d(${x}%, 0, 0)`
          pieces[r].forEach((piece, i) => {
            const a = p * Math.PI * 4 + i * 0.7 + r * 1.3
            const s = Math.sin(a)
            piece.style.transform = `translateZ(${(s * 60).toFixed(1)}px) rotateY(${(s * 28).toFixed(1)}deg) rotateZ(${(Math.cos(a * 0.8) * 5).toFixed(1)}deg)`
          })
        })

        // cards fly from deep behind the wall, hang in front of it, then pass you
        let current = shown
        let clearest = 0.01
        cards.forEach((card, i) => {
          const t = clamp01((p * units - i) / CARD_SPAN)
          const k = linger(t)
          // z = 0 with no rotation at the midpoint, so it's pixel-sharp while you read it
          const z = lerp(-2600, 2600, k)
          const side = i % 2 ? 1 : -1
          const xvw = (side * 10 + (k - 0.5) * side * 14) * spread
          const opacity = z > 750 ? 0 : Math.min(clamp01(t / 0.3), clamp01((0.84 - t) / 0.12))
          card.style.opacity = opacity.toFixed(3)
          // only the card you're looking at takes clicks
          card.style.pointerEvents = opacity > 0.6 ? 'auto' : 'none'
          card.style.transform = `translate(-50%, -50%) translate3d(${xvw.toFixed(2)}vw, 0, ${z.toFixed(0)}px) rotateY(${((0.5 - k) * 24 * side).toFixed(1)}deg) rotateZ(${((k - 0.5) * 6 * side).toFixed(1)}deg)`
          // the counter follows whichever card is most visible (and holds between them)
          if (opacity > clearest) {
            clearest = opacity
            current = i
          }
        })
        if (current !== shown && count.current) {
          shown = current
          count.current.textContent = `${pad(current + 1)} / ${pad(n)}`
        }
      }

      const pin = ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: () => `+=${window.innerHeight * SCROLL_PER_CARD * n}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => render(self.progress),
        onRefresh: (self) => {
          collect()
          render(self.progress)
        },
      })
      render(0)

      // Tabbing to a card jumps the scroll to the moment it hangs in view
      cards.forEach((card, i) => {
        card.addEventListener('focusin', () => {
          const p = (i + CARD_SPAN / 2) / units
          scrollToY(pin.start + (pin.end - pin.start) * p)
        })
      })
    }, el)
    return () => ctx.revert()
  }, [n])

  return (
    <section ref={section} id="work" className="fly-scene" aria-labelledby="work-title">
      <div className="fly-scene__stage">
        <Wall />
        <ol className="fly-cards">
          {site.work.map((p, i) => (
            <li key={p.title} className={`fly-card ${p.self ? 'is-self' : ''}`}>
              <a className="fly-card__link" href={p.href} target="_blank" rel="noopener" data-cursor="open">
                <div className="fly-card__shot" aria-hidden="true">
                  <Shot project={p} />
                </div>
                <div className="fly-card__body">
                  <p className="fly-card__code label">
                    #{p.code}-{pad(i + 1)}/{pad(n)}
                  </p>
                  <h3 className="fly-card__title">
                    {p.title}
                    <span className="sr-only"> ({p.linkLabel}, opens in a new tab)</span>
                  </h3>
                  <p className="fly-card__line">{p.line}</p>
                  {p.self && <p className="fly-card__detail">{p.detail}</p>}
                  {p.self && <BuildFacts />}
                  <p className="fly-card__meta label">
                    <span>{p.tags.join(' · ')}</span>
                    <span>
                      {p.year} <span aria-hidden="true">↗</span>
                    </span>
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ol>
      </div>

      {/* The wall fills the whole screen; just two small tags sit on it */}
      <div className="fly-scene__tags">
        <h2 id="work-title" className="fly-scene__tag label">
          Projects
          <span ref={count} aria-hidden="true">
            01 / {pad(n)}
          </span>
        </h2>
        <p className="fly-scene__tag label" aria-hidden="true">
          Keep scrolling
        </p>
      </div>
    </section>
  )
}

export default function Work() {
  return reducedMotion.matches ? <WorkRows /> : <WorkGallery />
}
