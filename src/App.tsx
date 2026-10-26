import Cursor from './components/Cursor'
import Footer from './components/Footer'
import Intro from './components/Intro'
import TopBar from './components/TopBar'
import Hero from './hero/Hero'
import About from './sections/About'
import Contact from './sections/Contact'
import Experience from './sections/Experience'
import OffTheClock from './sections/OffTheClock'
import Ticker from './sections/Ticker'
import Work from './sections/Work'

export default function App() {
  return (
    <>
      <TopBar />

      <main>
        <Hero />
        <About />
        <Work />
        <Experience />
        <OffTheClock />
        <Ticker />
        <Contact />
      </main>

      <Footer />
      <Intro />
      <div className="grain" aria-hidden="true" />
      <Cursor />
    </>
  )
}
