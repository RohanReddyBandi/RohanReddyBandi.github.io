import gsap from 'gsap'
import { useEffect, useRef, type CSSProperties } from 'react'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'
import { reducedMotion } from '../lib/motion'
import { useRevealRows } from '../lib/reveal'

type Project = (typeof site.work)[number]

// Where the floating preview runs: a mouse/trackpad on a wide screen. Everywhere
// else each card shows its preview inline.
const FLOATING = '(hover: hover) and (pointer: fine) and (min-width: 48rem)'

/** [SCREENSHOT] placeholder until a real image goes in src/assets/work/ */
function Shot({ project }: { project: Project }) {
  return (
    <div className="shot">
      <span className="label">[Screenshot] {project.title}</span>
    </div>
  )
}

function Row({ project, index }: { project: Project; index: number }) {
  const linked = Boolean(project.href)
  return (
    <li className="work-row" data-index={index} data-cursor={linked ? 'view' : 'soon'}>
      <div className="work-row__media" aria-hidden="true">
        <Shot project={project} />
      </div>

      <h3 className="work-row__title">
        {linked ? (
          <a className="work-row__link" href={project.href} target="_blank" rel="noopener">
            {project.title}
            <span className="sr-only"> ({project.linkLabel}, opens in a new tab)</span>
          </a>
        ) : (
          project.title
        )}
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
        {project.inProgress ? (
          <span className="work-row__status label">
            <span className="live-dot" aria-hidden="true" />
            In progress
          </span>
        ) : (
          <span className="label text-muted">{project.year}</span>
        )}
        {linked && (
          <span className="work-row__arrow" aria-hidden="true">
            ↗
          </span>
        )}
      </div>
    </li>
  )
}

export default function Work() {
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
      <SectionHead label="Selected work" id="work-title" />

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
