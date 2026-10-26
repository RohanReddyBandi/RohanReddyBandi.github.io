import { Fragment, type Ref } from 'react'
import { site } from '../content/site'

// "ROHAN REDDY" stays together on line one (it's one first name), "BANDI" on
// line two. Each letter sits in a per-line mask so it can slide up into view.

function Line({ text }: { text: string }) {
  return (
    <span className="hero-name__mask">
      {text.split(' ').map((word, w) => (
        // the space sits between word boxes: inside one it would be trimmed
        <Fragment key={w}>
          {w > 0 && ' '}
          <span className="hero-name__word">
            {[...word].map((ch, i) => (
              <span key={i} className="hero-name__letter">
                {ch}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </span>
  )
}

export default function HeroName({ ref }: { ref?: Ref<HTMLHeadingElement> }) {
  return (
    <h1 ref={ref} className="hero-name" aria-label={`${site.name.first} ${site.name.last}`}>
      <span aria-hidden="true">
        <Line text={site.name.first} />
        <Line text={site.name.last} />
      </span>
    </h1>
  )
}
