import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useLayoutEffect, useRef } from 'react'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'
import { reducedMotion } from '../lib/motion'
import { useRevealRows } from '../lib/reveal'

gsap.registerPlugin(ScrollTrigger)

// Experience, after wodniack.dev's work wall: the section pins, a wall of
// giant repeated place names (one row per place) sways in 3D as you scroll,
// and each place's card flies at you through it, one after another. With
// reduced motion it's a plain list of stacked rows instead.

type Entry = { title: string; short: string; code: string; caption: string; when: string; line: string }
type Item = Entry & { parent?: string }

// Purdue, then The Data Mine (under Purdue), then CMU
const items: Item[] = site.experience.flatMap(({ under, ...e }) => [e, ...under.map((u) => ({ ...u, parent: e.title }))])
const pad = (n: number) => String(n).padStart(2, '0')

// Enough repeats that a row still covers ultrawide screens while it slides
const repeatsFor = (word: string) => Math.max(6, Math.ceil(30 / (word.length + 1)))

const CARD_SPAN = 1.6 // each card's flight, in "card slots"; > 1 so they overlap
const SCROLL_PER_CARD = 0.95 // screens of scrolling per card while pinned
const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
// Fast in, lingers in the middle (so the card can be read), fast out
const linger = (t: number) => 0.5 + 4 * (t - 0.5) ** 3

// The rows run twice; the second set only shows on tall (portrait) screens
const rows = [...items, ...items]

function Wall() {
  return (
    <div className="xp-wall" aria-hidden="true">
      {rows.map((item, r) => (
        <div key={r} className="xp-wall__row">
          <div className="xp-wall__track">
            {Array.from({ length: repeatsFor(item.short) }, (_, i) => (
              <span key={i} className="xp-wall__word">
                {[...item.short].map((ch, j) => (
                  <span key={j} className="xp-wall__letter">
                    {ch === ' ' ? ' ' : ch}
                  </span>
                ))}
                <span className="xp-wall__sep">{r % 2 ? '✦' : '·'}</span>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function Scene() {
  const section = useRef<HTMLElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const n = items.length

  useLayoutEffect(() => {
    const el = section.current!
    const ctx = gsap.context(() => {
      const wall = el.querySelector<HTMLElement>('.xp-wall')!
      const tracks = gsap.utils.toArray<HTMLElement>('.xp-wall__track')
      const cards = gsap.utils.toArray<HTMLElement>('.xp-card')
      // Every letter wobbles on its own on wider screens; on phones whole
      // words do, to keep the number of moving 3D layers down
      const perLetter = window.matchMedia('(min-width: 48rem)').matches
      // cards drift off to the sides on wide screens, stay centered on phones
      const spread = perLetter ? 1 : 0.2
      const pieces = tracks.map((t) => [...t.querySelectorAll<HTMLElement>(perLetter ? '.xp-wall__letter' : '.xp-wall__word')])
      const units = n + CARD_SPAN - 1
      let shown = 0

      const render = (p: number) => {
        // the whole wall turns a little, like a camera drifting past it
        wall.style.transform = `rotateX(${lerp(16, -10, p)}deg) rotateY(${lerp(-12, 12, p)}deg)`

        tracks.forEach((track, r) => {
          // rows slide in alternate directions
          const x = r % 2 ? lerp(-38, -12, p) : lerp(-12, -38, p)
          track.style.transform = `translate3d(${x}%, 0, 0)`
          pieces[r].forEach((piece, i) => {
            const a = p * Math.PI * 4 + i * (perLetter ? 0.5 : 1.1) + r * 1.7
            const s = Math.sin(a)
            piece.style.transform = `translateZ(${(s * 70).toFixed(1)}px) rotateY(${(s * 30).toFixed(1)}deg) rotateZ(${(Math.cos(a * 0.8) * 6).toFixed(1)}deg)`
          })
        })

        // cards fly from deep behind the wall, hang in front of it, then pass you
        let current = shown
        let clearest = 0.01
        cards.forEach((card, i) => {
          const t = clamp01((p * units - i) / CARD_SPAN)
          const k = linger(t)
          // midpoint z = 0 with no rotation, so it's pixel-sharp while you read it
          const z = lerp(-2600, 2600, k)
          const side = i % 3 === 0 ? -1 : i % 3 === 1 ? 1 : 0
          const xvw = (side * 11 + (k - 0.5) * side * 14) * spread
          const fadeIn = clamp01(t / 0.3) // solidifies as it comes out of the distance
          const fadeOut = clamp01((0.84 - t) / 0.12) // gone before it fills the screen
          const opacity = z > 750 ? 0 : Math.min(fadeIn, fadeOut)
          card.style.opacity = opacity.toFixed(3)
          card.style.visibility = opacity > 0.01 ? 'visible' : 'hidden'
          card.style.transform = `translate(-50%, -50%) translate3d(${xvw.toFixed(2)}vw, 0, ${z.toFixed(0)}px) rotateY(${((0.5 - k) * 24 * (side || 1)).toFixed(1)}deg) rotateZ(${((k - 0.5) * 6 * (side || -1)).toFixed(1)}deg)`
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

      ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        end: () => `+=${window.innerHeight * SCROLL_PER_CARD * n}`,
        pin: true,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => render(self.progress),
        onRefresh: (self) => render(self.progress),
      })
      render(0)
    }, el)
    return () => ctx.revert()
  }, [n])

  return (
    <section ref={section} id="experience" className="xp-scene" aria-labelledby="xp-title">
      <div className="xp-scene__head">
        <SectionHead label="Experience" id="xp-title" />
      </div>

      <div className="xp-scene__stage">
        <Wall />
        <ol className="xp-cards">
          {items.map((item, i) => (
            <li key={item.title} className="xp-card">
              <p className="xp-card__code label">
                #{item.code}-{pad(i + 1)}/{pad(n)}
              </p>
              <h3 className="xp-card__title">{item.title}</h3>
              <p className="xp-card__meta label">
                {item.caption} · {item.when}
              </p>
              {item.parent && <p className="xp-card__parent label">At {item.parent}</p>}
              {item.line && <p className="xp-card__line">{item.line}</p>}
            </li>
          ))}
        </ol>
      </div>

      <div className="xp-scene__foot site-grid" aria-hidden="true">
        <span ref={count} className="label col-span-2">
          01 / {pad(n)}
        </span>
        <span className="label col-span-2 justify-self-end md:col-span-4 md:col-start-9">Keep scrolling</span>
      </div>
    </section>
  )
}

/** Reduced motion: the same content as calm stacked rows. */
function Rows() {
  const list = useRef<HTMLOListElement>(null)
  useRevealRows(list, '.xp-row', { stagger: 0.08 })

  return (
    <section id="experience" className="section" aria-labelledby="xp-title">
      <SectionHead label="Experience" id="xp-title" />
      <ol ref={list} className="xp-list">
        {items.map((e) => (
          <li key={e.title} className="xp-entry">
            <div className={`xp-row ${e.parent ? 'is-nested' : ''}`}>
              <h3 className="xp-row__title">{e.title}</h3>
              <div className="xp-row__meta">
                <p className="label text-muted">
                  {e.caption} · {e.when}
                </p>
                {e.line && <p className="xp-row__line">{e.line}</p>}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function Experience() {
  return reducedMotion.matches ? <Rows /> : <Scene />
}
