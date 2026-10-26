import { useRef } from 'react'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'
import { useRevealRows } from '../lib/reveal'

type Entry = Omit<(typeof site.experience)[number], 'under'>

function Row({ entry, nested = false }: { entry: Entry; nested?: boolean }) {
  const Title = nested ? 'h4' : 'h3'
  return (
    <div className={`xp-row ${nested ? 'is-nested' : ''}`}>
      <Title className="xp-row__title">{entry.title}</Title>
      <div className="xp-row__meta">
        <p className="label text-muted">
          {entry.caption} · {entry.when}
        </p>
        {entry.line && <p className="xp-row__line">{entry.line}</p>}
      </div>
    </div>
  )
}

/** Stacked rows; entries can nest others beneath them (The Data Mine under Purdue). */
export default function Experience() {
  const list = useRef<HTMLOListElement>(null)
  useRevealRows(list, '.xp-row', { stagger: 0.08 })

  return (
    <section id="experience" className="section" aria-labelledby="xp-title">
      <SectionHead label="Experience" id="xp-title" />
      <ol ref={list} className="xp-list">
        {site.experience.map((e) => (
          <li key={e.title} className="xp-entry">
            <Row entry={e} />
            {e.under.length > 0 && (
              <ol className="xp-under">
                {e.under.map((u) => (
                  <li key={u.title}>
                    <Row entry={u} nested />
                  </li>
                ))}
              </ol>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
