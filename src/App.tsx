import Cursor from './components/Cursor'
import TopBar from './components/TopBar'
import Hero from './hero/Hero'

// Sections below the hero are still shells; each gets its real build in a
// later phase.
const sections = [
  { id: 'about', label: 'About' },
  { id: 'work', label: 'Selected work' },
  { id: 'experience', label: 'Experience' },
  { id: 'off-the-clock', label: 'Off the clock' },
  { id: 'contact', label: 'Contact' },
]

export default function App() {
  return (
    <>
      <TopBar />

      <main>
        <Hero />

        {sections.map((s) => (
          <section key={s.id} id={s.id} className="site-grid min-h-[80svh] border-t border-line py-24">
            <h2 className="col-span-full font-display text-title font-medium uppercase">{s.label}</h2>
            <p className="label col-span-full mt-6 text-muted">[Coming soon]</p>
          </section>
        ))}
      </main>

      <div className="grain" aria-hidden="true" />
      <Cursor />
    </>
  )
}
