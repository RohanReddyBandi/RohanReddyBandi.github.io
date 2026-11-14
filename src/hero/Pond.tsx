import { useEffect, useRef, type RefObject } from 'react'
import duckUrl from '../assets/duck.svg'
import { confetti } from '../lib/confetti'
import { finePointer, reducedMotion } from '../lib/motion'
import { quack } from '../lib/quack'
import { pageReady } from '../lib/sequence'
import { Pond as Scene } from './pondScene'

// The duck pond behind the hero (the scene itself is in pondScene.ts). This
// part wires it to the page: sizing, pointer and touch input, the button
// over the duck (so it can be grabbed, tabbed to and pressed), its speech
// bubble, and the hint.

type Props = {
  hero: RefObject<HTMLElement | null>
  /** the water rests just above this element (the name and tagline) */
  surface: RefObject<HTMLElement | null>
}

export default function Pond({ hero, surface }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const duck = useRef<HTMLButtonElement>(null)
  const bubble = useRef<HTMLSpanElement>(null)
  const hint = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    const el = hero.current!
    const still = reducedMotion.matches
    let bubbleTimer = 0
    const say = (text: string) => {
      const b = bubble.current!
      b.textContent = text
      b.classList.add('is-shown')
      clearTimeout(bubbleTimer)
      bubbleTimer = window.setTimeout(() => b.classList.remove('is-shown'), 1100)
    }
    const used = () => hint.current?.classList.add('is-done')
    const scene = new Scene(canvas.current!, duck.current!, still, { say, used })

    const img = new Image()
    img.src = duckUrl
    img
      .decode()
      .then(() => scene.setSprite(img))
      .catch(() => {})

    const fit = () => {
      const box = el.getBoundingClientRect()
      const top = surface.current!.getBoundingClientRect().top - box.top
      const gap = Math.max(36, box.height * 0.06)
      scene.layout(box.width, box.height, top - gap)
      // on the water's edge, or above the duck's head where it's too narrow
      // for the two to stay out of each other's way
      const lift = box.width < 720 ? scene.cell * 30 + 16 : 44
      hint.current!.style.top = `${Math.max(80, top - gap - lift)}px`
    }
    const resize = new ResizeObserver(fit)
    resize.observe(el)
    resize.observe(surface.current!)

    // only run while the hero's on screen
    const seen = new IntersectionObserver(([entry]) => (entry.isIntersecting ? scene.start() : scene.stop()))
    seen.observe(el)

    let live = true
    let enterTimer = 0
    let hintTimer = 0
    pageReady.then(() => {
      if (!live) return
      enterTimer = window.setTimeout(() => scene.enter(), still ? 0 : 250)
      hintTimer = window.setTimeout(() => hint.current?.classList.add('is-ready'), still ? 0 : 1800)
    })

    const local = (e: { clientX: number; clientY: number }) => {
      const box = el.getBoundingClientRect()
      return [e.clientX - box.left, e.clientY - box.top] as const
    }
    const onMove = (e: PointerEvent) => scene.pointerAt(...local(e), e.pointerType === 'mouse')
    const onOut = () => scene.pointerOut()
    const onClick = (e: MouseEvent) => {
      if ((e.target as Element).closest('a, button')) return
      scene.feed(...local(e))
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerleave', onOut)
    el.addEventListener('click', onClick)

    // the duck: drag to throw, press to quack
    const button = duck.current!
    let threw = false
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return
      button.setPointerCapture(e.pointerId)
      scene.grabStart(...local(e))
    }
    const onDrag = (e: PointerEvent) => scene.grabMove(...local(e))
    const onUp = () => {
      threw = scene.grabEnd() === 'throw'
    }
    const onPress = () => {
      if (threw) {
        threw = false
        return
      }
      quack()
      say('Quack!')
      if (still) return
      scene.quack()
      const head = scene.head()
      const box = el.getBoundingClientRect()
      confetti(box.left + head.x, box.top + head.y)
    }
    button.addEventListener('pointerdown', onDown)
    button.addEventListener('pointermove', onDrag)
    button.addEventListener('pointerup', onUp)
    button.addEventListener('pointercancel', onUp)
    button.addEventListener('click', onPress)

    return () => {
      live = false
      clearTimeout(bubbleTimer)
      clearTimeout(enterTimer)
      clearTimeout(hintTimer)
      resize.disconnect()
      seen.disconnect()
      scene.destroy()
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onOut)
      el.removeEventListener('click', onClick)
      button.removeEventListener('pointerdown', onDown)
      button.removeEventListener('pointermove', onDrag)
      button.removeEventListener('pointerup', onUp)
      button.removeEventListener('pointercancel', onUp)
      button.removeEventListener('click', onPress)
    }
  }, [hero, surface])

  const still = reducedMotion.matches
  return (
    <div className="pond">
      <canvas ref={canvas} className="pond__canvas" aria-hidden="true" />
      <p ref={hint} className="pond__hint label site-grid" aria-hidden="true">
        <span>
          {still
            ? 'Press the duck'
            : finePointer.matches
              ? 'Throw the duck · click to drop bread'
              : 'Throw the duck · tap to drop bread'}
        </span>
      </p>
      <button ref={duck} type="button" className="pond__duck is-away" aria-label="Ducky the rubber duck. Press to quack.">
        <span ref={bubble} className="pond__bubble label" aria-hidden="true" />
      </button>
    </div>
  )
}
