import { useRef } from 'react'
import Photo from '../components/Photo'
import SectionHead from '../components/SectionHead'
import Signature from '../components/Signature'
import { site } from '../content/site'
import { useRevealLines, useRevealRows } from '../lib/reveal'

export default function About() {
  const statement = useRef<HTMLParagraphElement>(null)
  const facts = useRef<HTMLDListElement>(null)
  useRevealLines(statement)
  useRevealRows(facts, '.about__fact', { delay: 0.15 })

  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <SectionHead label="About" id="about-title" />

      <div className="site-grid mt-14 gap-y-14 md:mt-20">
        <div className="col-span-full md:col-span-6 lg:col-span-7">
          <p ref={statement} className="about__statement">
            {site.about.line}
          </p>
          <Signature className="about__signature" />
          <dl ref={facts} className="about__facts">
            {site.about.facts.map((f) => (
              <div key={f.label} className="about__fact">
                <dt className="label text-muted">{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="about__photo col-span-full md:col-span-5 md:col-start-8 lg:col-span-4 lg:col-start-9">
          <Photo />
        </div>
      </div>
    </section>
  )
}
