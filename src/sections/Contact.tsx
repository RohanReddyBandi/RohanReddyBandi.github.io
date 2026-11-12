import { useRef } from 'react'
import Clock from '../components/Clock'
import SectionHead from '../components/SectionHead'
import Signature from '../components/Signature'
import { site } from '../content/site'
import { useRevealRows } from '../lib/reveal'

// The end of the page: "Contact me" starts an email, then the resume, GitHub
// and LinkedIn. Below a hand-drawn line, the signature signs itself as you
// arrive, next to the local time.

const links = [
  ...(__HAS_RESUME__ ? [{ label: 'Resume (PDF)', href: site.links.resume }] : []),
  { label: 'GitHub', href: site.links.github },
  { label: 'LinkedIn', href: site.links.linkedin },
]

export default function Contact() {
  const body = useRef<HTMLDivElement>(null)
  useRevealRows(body, '.contact__reveal', { stagger: 0.12 })

  return (
    <section id="contact" className="contact column" aria-labelledby="contact-title">
      <SectionHead label="Contact" id="contact-title" />
      <div ref={body} className="contact__body">
        <div className="contact__reveal">
          <a href={`mailto:${site.email}`} className="contact__cta">
            Contact me <span aria-hidden="true">↗</span>
          </a>
          <p className="label mt-2 text-muted">{site.email}</p>
        </div>
        <ul className="contact__links contact__reveal">
          {links.map((l) => (
            <li key={l.label}>
              <a href={l.href} target="_blank" rel="noopener" className="quiet-link">
                {l.label} ↗<span className="sr-only"> (opens in a new tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <footer className="foot">
        {/* a hairline that wobbles like it was drawn by hand */}
        <svg className="foot__rule" viewBox="0 0 640 8" preserveAspectRatio="none" aria-hidden="true">
          <path d="M1 4.6C80 3.4 150 5.2 230 4.2S390 3 460 4.4 580 5 639 3.6" />
        </svg>
        <div className="foot__row">
          <Signature when="view" className="foot__sig" />
          <Clock />
        </div>
      </footer>
    </section>
  )
}
