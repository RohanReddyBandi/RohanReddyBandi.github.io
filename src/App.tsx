import Cursor from './components/Cursor'
import Intro from './components/Intro'
import TopBar from './components/TopBar'
import Hero from './hero/Hero'
import About from './sections/About'
import Experience from './sections/Experience'
import Ticker from './sections/Ticker'
import Work from './sections/Work'

// Stand-in for a section still waiting on its real build in a later phase
function Shell({ id, label }: { id: string; label: string }) {
  return (
    <section id={id} className="site-grid min-h-[80svh] border-t border-line py-24">
      <h2 className="col-span-full font-display text-title font-medium uppercase">{label}</h2>
      <p className="label col-span-full mt-6 text-muted">[Coming soon]</p>
    </section>
  )
}

export default function App() {
  return (
    <>
      <TopBar />

      <main>
        <Hero />
        <About />
        <Work />
        <Experience />
        <Shell id="off-the-clock" label="Off the clock" />
        <Ticker />
        <Shell id="contact" label="Contact" />
      </main>

      <Intro />
      <div className="grain" aria-hidden="true" />
      <Cursor />
    </>
  )
}
