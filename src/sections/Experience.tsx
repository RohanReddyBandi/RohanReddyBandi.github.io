import { useRef } from 'react'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'
import { useRevealRows } from '../lib/reveal'

// Education and experience as full-width rows. Entries listed under another
// (The Data Mine under Purdue) sit indented beneath it.

type Entry = { title: string; caption: string; when: string; line: string }
type Item = Entry & { nested: boolean }

const items: Item[] = site.experience.flatMap(({ under, ...e }) => [
  { ...e, nested: false },
  ...under.map((u) => ({ ...u, nested: true })),
])

export default function Experience() {
  const list = useRef<HTMLOListElement>(null)
  useRevealRows(list, '.xp-row', { stagger: 0.08 })

  return (
    <section id="experience" className="section" aria-labelledby="xp-title">
      <SectionHead label="Education" id="xp-title" />
      <ol ref={list} className="xp-list">
        {items.map((e) => (
          <li key={e.title} className="xp-entry">
            <div className={`xp-row ${e.nested ? 'is-nested' : ''}`}>
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
