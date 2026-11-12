import { useRef, type ReactNode } from 'react'
import { useRevealRows } from '../lib/reveal'

/** A section's quiet title, with an optional handwritten note beside it. */
export default function SectionHead({ label, id, note }: { label: string; id?: string; note?: ReactNode }) {
  const head = useRef<HTMLDivElement>(null)
  useRevealRows(head, '.section-head__part', { stagger: 0.15 })

  return (
    <div ref={head} className="section-head">
      <h2 id={id} className="section-head__title section-head__part">
        {label}
      </h2>
      {note && <p className="section-head__note section-head__part hand">{note}</p>}
    </div>
  )
}
