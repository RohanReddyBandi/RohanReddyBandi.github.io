import gsap from 'gsap'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import duckUrl from '../assets/duck.svg'
import { confetti } from '../lib/confetti'
import { reducedMotion } from '../lib/motion'
import { quack } from '../lib/quack'
import { pageReady } from '../lib/sequence'

// The Duck Days duck, waddling along the bottom edge now and then. Click it:
// it quacks (the only sound on the site, and only on click), drops confetti
// in the accent color, and hurries off. ?duck in the URL summons it at once.

const FIRST = [18000, 40000] // ms after the page is ready
const AGAIN = [60000, 120000]
const MAX_VISITS = 3
const CROSSING_S = 11

const between = ([a, b]: number[]) => a + Math.random() * (b - a)

export default function Duck() {
  const root = useRef<HTMLButtonElement>(null)
  const bird = useRef<HTMLSpanElement>(null)
  const [walking, setWalking] = useState(false)
  const [said, setSaid] = useState(false)
  const walk = useRef<gsap.core.Timeline | null>(null)

  // Schedule visits
  useEffect(() => {
    if (reducedMotion.matches) return
    let timer = 0
    let visits = 0
    const summon = new URLSearchParams(location.search).has('duck')
    const next = (wait: number) => {
      timer = window.setTimeout(() => {
        if (document.hidden) return next(5000) // wait until someone's looking
        visits++
        setWalking(true)
      }, wait)
    }
    pageReady.then(() => next(summon ? 1500 : between(FIRST)))
    const onDone = () => {
      if (visits < MAX_VISITS) next(between(AGAIN))
    }
    window.addEventListener('duck:gone', onDone)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('duck:gone', onDone)
    }
  }, [])

  // One crossing, right to left (the duck faces left), with a waddle.
  // Layout effect so it's placed off-screen before its first paint.
  useLayoutEffect(() => {
    if (!walking) return
    const el = root.current!
    const ctx = gsap.context(() => {
      const width = el.offsetWidth
      gsap.to(bird.current, { rotation: 7, duration: 0.2, ease: 'sine.inOut', yoyo: true, repeat: -1, startAt: { rotation: -7 } })
      gsap.to(bird.current, { y: -3, duration: 0.1, ease: 'sine.inOut', yoyo: true, repeat: -1 })
      walk.current = gsap.timeline({
        onComplete: () => {
          setWalking(false)
          setSaid(false)
          window.dispatchEvent(new Event('duck:gone'))
        },
      })
      walk.current.fromTo(el, { x: window.innerWidth + width }, { x: -width * 1.5, duration: CROSSING_S, ease: 'none' })
    }, el)
    return () => ctx.revert()
  }, [walking])

  const onClick = () => {
    const r = bird.current!.getBoundingClientRect()
    quack()
    confetti(r.left + r.width / 2, r.top + r.height / 3)
    setSaid(true)
    gsap.fromTo(bird.current, { scale: 1 }, { scale: 1.25, duration: 0.12, yoyo: true, repeat: 1, ease: 'power2.out' })
    walk.current?.timeScale(2.6) // startled: off it goes
  }

  if (!walking) return null

  return (
    <button ref={root} type="button" className="duck" onClick={onClick} aria-label="A duck. Press it to quack.">
      <span className={`duck__bubble label ${said ? 'is-shown' : ''}`} aria-hidden="true">
        Quack!
      </span>
      <span ref={bird} className="duck__bird">
        <img src={duckUrl} alt="" width={38} height={32} />
      </span>
    </button>
  )
}
