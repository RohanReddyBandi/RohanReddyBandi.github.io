import Ambient from './components/Ambient'
import Duck from './components/Duck'
import TopBar from './components/TopBar'
import Hero from './hero/Hero'
import Contact from './sections/Contact'
import Experience from './sections/Experience'
import Work from './sections/Work'

export default function App() {
  return (
    <>
      <Ambient />
      <TopBar />

      <main id="content">
        <Hero />
        <Experience />
        <Work />
        <Contact />
      </main>

      <Duck />
    </>
  )
}
