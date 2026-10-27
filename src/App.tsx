import Cursor from './components/Cursor'
import Duck from './components/Duck'
import Footer from './components/Footer'
import Intro from './components/Intro'
import TopBar from './components/TopBar'
import Hero from './hero/Hero'
import About from './sections/About'
import Contact from './sections/Contact'
import Experience from './sections/Experience'
import Work from './sections/Work'

export default function App() {
  return (
    <>
      <TopBar />

      <main id="content">
        <Hero />
        <About />
        <Work />
        <Experience />
        <Contact />
      </main>

      <Footer />
      <Duck />
      <Intro />
      <div className="grain" aria-hidden="true" />
      <Cursor />
    </>
  )
}
