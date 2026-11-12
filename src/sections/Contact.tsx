import { useRef } from 'react'
import RollLink from '../components/RollLink'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'
import { useRevealRows } from '../lib/reveal'

// The end of the page: a big "Contact me" that starts an email, then the
// resume, GitHub and LinkedIn in one short row.

const links = [
  ...(__HAS_RESUME__ ? [{ label: 'Resume (PDF)', href: site.links.resume }] : []),
  { label: 'GitHub', href: site.links.github },
  { label: 'LinkedIn', href: site.links.linkedin },
]

export default function Contact() {
  const body = useRef<HTMLDivElement>(null)
  useRevealRows(body, '.contact__reveal', { stagger: 0.1 })

  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <SectionHead label="Contact" id="contact-title" />
      <div ref={body} className="contact__body site-grid">
        <div className="contact__main">
          <div className="contact__reveal">
            <RollLink href={`mailto:${site.email}`} className="contact__cta">
              Contact me ↗
            </RollLink>
          </div>
          <p className="contact__reveal label mt-3 text-muted">{site.email}</p>
        </div>
        <ul className="contact__links">
          {links.map((l) => (
            <li key={l.label} className="contact__reveal">
              <RollLink href={l.href} target="_blank" rel="noopener" className="label text-fg">
                {l.label} ↗<span className="sr-only"> (opens in a new tab)</span>
              </RollLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
