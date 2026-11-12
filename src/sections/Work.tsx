import { useRef } from 'react'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'
import { useRevealRows } from '../lib/reveal'

type Project = (typeof site.work)[number]

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
        sizes="(min-width: 44rem) 40rem, 100vw"
        width={1600}
        height={1000}
        alt=""
        loading="lazy"
        decoding="async"
      />
    </div>
  )
}

/** One project: its screenshot with a "click me" scribbled on the corner, then the words */
function Card({ project }: { project: Project }) {
  return (
    <li className="card">
      <div className="card__media" aria-hidden="true">
        <Shot project={project} />
        <span className="card__note hand">click me ↗</span>
      </div>
      <div className="card__row">
        <h3 className="card__title">
          <a className="card__link" href={project.href} target="_blank" rel="noopener">
            {project.title}
            <span className="sr-only"> ({project.linkLabel}, opens in a new tab)</span>
          </a>
        </h3>
        <p className="card__year">{project.year}</p>
      </div>
      <p className="card__line">{project.line}</p>
      {project.detail && <p className="card__detail">{project.detail}</p>}
      <ul className="card__tags" aria-label="Built with">
        {project.tags.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>
    </li>
  )
}

export default function Work() {
  const list = useRef<HTMLOListElement>(null)
  useRevealRows(list, '.card', { stagger: 0.12 })

  return (
    <section id="work" className="section column" aria-labelledby="work-title">
      <SectionHead label="Projects" id="work-title" note="things I've made" />
      <ol ref={list} className="cards">
        {site.work.map((p) => (
          <Card key={p.title} project={p} />
        ))}
      </ol>
    </section>
  )
}
