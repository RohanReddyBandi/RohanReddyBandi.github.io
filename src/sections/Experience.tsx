import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { useLayoutEffect, useRef } from 'react'
import SectionHead from '../components/SectionHead'
import { site } from '../content/site'

gsap.registerPlugin(ScrollTrigger, SplitText)

// Wide screens with motion allowed get the pinned horizontal reel; phones and
// reduced motion get a plain vertical list (same markup, different CSS).
const REEL = '(min-width: 48rem) and (prefers-reduced-motion: no-preference)'
const LIST = '(max-width: 47.99rem) and (prefers-reduced-motion: no-preference)'

const pad = (n: number) => String(n).padStart(2, '0')

/** Rise a block's lines out of masks once `trigger` fires; skip after the first play. */
function riseLines(el: Element, scrollTrigger: ScrollTrigger.Vars) {
  let played = false
  return SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    aria: 'none', // lines keep words whole; no aria-label needed
    autoSplit: true,
    onSplit(self) {
      if (played) return
      return gsap.from(self.lines, {
        yPercent: 110,
        duration: 1.1,
        ease: 'expo.out',
        stagger: 0.08,
        scrollTrigger: { ...scrollTrigger, once: true },
        onStart: () => {
          played = true
        },
      })
    },
  })
}

export default function Experience() {
  const section = useRef<HTMLElement>(null)
  const track = useRef<HTMLOListElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const fill = useRef<HTMLSpanElement>(null)
  const total = site.experience.length

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()

    // Vertical scroll drives the track sideways while the section is pinned
    mm.add(
      REEL,
      () => {
        const el = track.current!
        const distance = () => el.offsetWidth - window.innerWidth
        const reel = gsap.to(el, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: section.current,
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: true,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              fill.current!.style.scale = `${self.progress} 1`
              count.current!.textContent = `${pad(Math.round(self.progress * (total - 1)) + 1)} / ${pad(total)}`
            },
          },
        })

        // Each panel's title and line rise as the panel slides into view
        // (the first is already in view when the pin starts)
        const splits = gsap.utils.toArray<HTMLElement>('.xp-panel').flatMap((panel, i) => {
          const trigger: ScrollTrigger.Vars =
            i === 0
              ? { trigger: section.current, start: 'top 65%' }
              : { trigger: panel, containerAnimation: reel, start: 'left 72%' }
          return [riseLines(panel.querySelector('.xp-panel__title')!, trigger), riseLines(panel.querySelector('.xp-panel__line')!, trigger)]
        })
        return () => splits.forEach((s) => s.revert())
      },
      section.current!,
    )

    // Phones: each entry rises out of its own mask as it scrolls in
    mm.add(
      LIST,
      () => {
        gsap.utils.toArray<HTMLElement>('.xp-panel').forEach((panel) => {
          gsap.fromTo(
            panel,
            { clipPath: 'inset(0% 0% 100% 0%)', yPercent: 30 },
            {
              clipPath: 'inset(0% 0% 0% 0%)',
              yPercent: 0,
              duration: 1.1,
              ease: 'expo.out',
              clearProps: 'clipPath,transform',
              scrollTrigger: { trigger: panel, start: 'top 88%', once: true },
            },
          )
        })
      },
      section.current!,
    )

    return () => mm.revert()
  }, [total])

  return (
    <section ref={section} id="experience" className="xp" aria-labelledby="xp-title">
      <SectionHead label="Experience" id="xp-title" />

      <div className="xp__viewport">
        <ol ref={track} className="xp__track">
          {site.experience.map((e) => (
            <li key={e.title} className="xp-panel">
              <p className="xp-panel__caption label">
                <span>{e.caption}</span>
                <span>{e.when}</span>
              </p>
              <div className="xp-panel__body">
                <h3 className="xp-panel__title">{e.title}</h3>
                <p className="xp-panel__line">{e.line}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="xp__progress" aria-hidden="true">
        <span ref={count} className="label">
          01 / {pad(total)}
        </span>
        <span className="xp__bar">
          <span ref={fill} className="xp__fill" />
        </span>
      </div>
    </section>
  )
}
