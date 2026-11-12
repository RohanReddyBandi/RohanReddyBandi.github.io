/** "scroll" in handwriting over a hairline with a slow bead of light. Jumps to the next section. */
export default function ScrollCue() {
  return (
    <a href="#experience" className="scroll-cue__link" aria-label="Scroll to the next section">
      <span className="hand text-lg">scroll</span>
      <span className="scroll-cue__track" aria-hidden="true">
        <span className="scroll-cue__bead" />
      </span>
    </a>
  )
}
