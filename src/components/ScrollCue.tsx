import Magnetic from './Magnetic'

/** "Scroll" with a bead running down a hairline. Jumps to the next section. */
export default function ScrollCue() {
  return (
    <Magnetic className="scroll-cue">
      <a href="#work" className="scroll-cue__link label" aria-label="Scroll to the next section">
        <span>Scroll</span>
        <span className="scroll-cue__track" aria-hidden="true">
          <span className="scroll-cue__bead" />
        </span>
      </a>
    </Magnetic>
  )
}
