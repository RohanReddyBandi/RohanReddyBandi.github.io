import { useRef } from 'react'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'
import { useRevealRows } from '../lib/reveal'

// Education as a short list. Entries listed under another (The Data Mine
// under Purdue) hang off it, indented.

export default function Experience() {
  const list = useRef<HTMLOListElement>(null)
  useRevealRows(list, '.xp', { stagger: 0.12 })

  return (
    <section id="experience" className="section column" aria-labelledby="xp-title">
      <SectionHead label="Education" id="xp-title" />
      <ol ref={list} className="xp-list">
        {site.experience.map((e) => (
          <li key={e.title} className="xp">
            <div className="xp__row">
              <h3 className="xp__title">{e.title}</h3>
              <p className="xp__when">{e.when}</p>
            </div>
            <p className="xp__caption">{e.caption}</p>
            {e.line && <p className="xp__line">{e.line}</p>}
            {e.under.length > 0 && (
              <ul className="xp__under">
                {e.under.map((u) => (
                  <li key={u.title} className="xp is-nested">
                    <div className="xp__row">
                      <h4 className="xp__title">{u.title}</h4>
                      <p className="xp__when">{u.when}</p>
                    </div>
                    <p className="xp__caption">{u.caption}</p>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  )
}
