import gsap from 'gsap'
import { Fragment, useEffect, useRef, useState } from 'react'
import Magnetic from '../components/Magnetic'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'
import { finePointer, reducedMotion } from '../lib/motion'
import { useRevealRows } from '../lib/reveal'

const TALK = 'Let’s talk'
const isUrl = (s: string) => /^https?:\/\//.test(s)

/**
 * "LET'S TALK", whose letters lean away from the cursor, then a contact sheet:
 * email (click to copy), GitHub, LinkedIn, and the resume download.
 */
export default function Contact() {
  const talk = useRef<HTMLParagraphElement>(null)
  const sheet = useRef<HTMLUListElement>(null)
  const [toast, setToast] = useState('')
  const toastTimer = useRef(0)
  useRevealRows(sheet, '.contact-row', { stagger: 0.07 })

  // Each letter leans away from the pointer, more the closer it is
  useEffect(() => {
    const el = talk.current!
    if (!finePointer.matches || reducedMotion.matches) return
    const letters = [...el.querySelectorAll<HTMLElement>('.talk__letter')].map((l) => ({
      el: l,
      x: gsap.quickTo(l, 'x', { duration: 0.7, ease: 'power3.out' }),
      y: gsap.quickTo(l, 'y', { duration: 0.7, ease: 'power3.out' }),
      r: gsap.quickTo(l, 'rotation', { duration: 0.7, ease: 'power3.out' }),
    }))
    const area = el.parentElement!

    const word = el.querySelector('.talk__word')!
    const move = (e: PointerEvent) => {
      const size = parseFloat(getComputedStyle(word).fontSize)
      const radius = size * 1.8
      for (const l of letters) {
        const r = l.el.getBoundingClientRect()
        // measure from the letter's resting spot, not where it's been pushed
        const cx = r.left + r.width / 2 - Number(gsap.getProperty(l.el, 'x'))
        const cy = r.top + r.height / 2 - Number(gsap.getProperty(l.el, 'y'))
        const dx = cx - e.clientX
        const dy = cy - e.clientY
        const d = Math.hypot(dx, dy) || 1
        const force = Math.max(0, 1 - d / radius) ** 2
        l.x((dx / d) * force * size * 0.22)
        l.y((dy / d) * force * size * 0.22)
        l.r((dx / d) * force * 12)
      }
    }
    const leave = () => letters.forEach((l) => (l.x(0), l.y(0), l.r(0)))
    area.addEventListener('pointermove', move)
    area.addEventListener('pointerleave', leave)
    return () => {
      area.removeEventListener('pointermove', move)
      area.removeEventListener('pointerleave', leave)
    }
  }, [])

  const say = (message: string) => {
    setToast(message)
    clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2400)
  }

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(site.email)
      say('Email copied')
    } catch {
      say(`Couldn’t copy. It’s ${site.email}`)
    }
  }

  return (
    <section id="contact" className="contact" aria-labelledby="contact-title">
      <SectionHead label="Contact" id="contact-title" />

      <div className="contact__talk site-grid">
        <p ref={talk} className="talk col-span-full">
          <span className="sr-only">{TALK}</span>
          <span aria-hidden="true">
            {TALK.split(' ').map((word, w) => (
              <Fragment key={w}>
                {w > 0 && ' '}
                <span className="talk__word">
                  {[...word].map((ch, i) => (
                    <span key={i} className="talk__letter">
                      {ch}
                    </span>
                  ))}
                </span>
              </Fragment>
            ))}
          </span>
        </p>
      </div>

      <div className="site-grid gap-y-10">
        <div className="contact__cta col-span-full md:col-span-4">
          {__HAS_RESUME__ ? (
            <Magnetic strength={0.25}>
              <a className="btn" href={site.links.resume} download="Rohan-Reddy-Bandi-Resume.pdf">
                <span>Download resume</span>
                <span aria-hidden="true">↓</span>
              </a>
            </Magnetic>
          ) : (
            <span className="btn" aria-disabled="true">
              <span>[RESUME PDF]</span>
            </span>
          )}
        </div>

        <ul ref={sheet} className="contact__sheet col-span-full md:col-span-8 md:col-start-5">
          <li className="contact-row">
            <span className="contact-row__label label">Email</span>
            <button type="button" className="contact-row__value contact-row__copy" onClick={copyEmail}>
              {site.email}
              <span className="contact-row__action label" aria-hidden="true">
                Copy
              </span>
              <span className="sr-only">, copy email address</span>
            </button>
          </li>
          <li className="contact-row">
            <span className="contact-row__label label">GitHub</span>
            <a className="contact-row__value" href={site.links.github} target="_blank" rel="noopener">
              {site.links.github.replace('https://github.com/', '')}
              <span className="contact-row__action" aria-hidden="true">
                ↗
              </span>
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </li>
          <li className="contact-row">
            <span className="contact-row__label label">LinkedIn</span>
            {isUrl(site.links.linkedin) ? (
              <a className="contact-row__value" href={site.links.linkedin} target="_blank" rel="noopener">
                {site.links.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '').replace(/\/$/, '')}
                <span className="contact-row__action" aria-hidden="true">
                  ↗
                </span>
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : (
              <span className="contact-row__value is-placeholder">{site.links.linkedin}</span>
            )}
          </li>
        </ul>
      </div>

      <p className={`toast label ${toast ? 'is-shown' : ''}`} role="status" aria-live="polite">
        <span className="live-dot" aria-hidden="true" />
        {toast}
      </p>
    </section>
  )
}
