import Cursor from './components/Cursor'
import Duck from './components/Duck'
import Intro from './components/Intro'
import TopBar from './components/TopBar'
import Hero from './hero/Hero'
import Contact from './sections/Contact'
import Experience from './sections/Experience'
import Work from './sections/Work'

export default function App() {
  return (
    <>
      <TopBar />

      <main id="content">
        <Hero />
        <Experience />
        <Work />
        <Contact />
      </main>

      <Duck />
      <Intro />
      <div className="grain" aria-hidden="true" />
      <Cursor />
    </>
  )
}
