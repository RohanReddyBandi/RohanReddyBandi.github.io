import { useRef } from 'react'
import { useRevealClip, useRevealLines } from '../lib/reveal'

/** Section label in mono with a hairline that draws across the grid. */
export default function SectionHead({ label, id }: { label: string; id?: string }) {
  const title = useRef<HTMLHeadingElement>(null)
  const rule = useRef<HTMLSpanElement>(null)
  useRevealLines(title)
  useRevealClip(rule, { from: 'inset(0% 100% 0% 0%)', delay: 0.1 })

  return (
    <div className="section-head site-grid">
      <h2 ref={title} id={id} className="label col-span-2 text-fg md:col-span-2">
        {label}
      </h2>
      <span ref={rule} className="section-head__rule col-span-2 md:col-span-10" aria-hidden="true" />
    </div>
  )
}
