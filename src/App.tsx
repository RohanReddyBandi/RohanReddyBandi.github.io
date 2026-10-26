import { site } from './content/site'
import Hero from './hero/Hero'

// Phase 0 shell: tokens, type, grain and smooth scroll. Each section gets
// replaced by its real build in later phases.
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
      <header className="site-grid fixed inset-x-0 top-0 z-50 items-center py-5">
        <a href="#top" className="label col-span-2 text-fg">
          {site.initials}
        </a>
        <nav aria-label="Primary" className="col-span-2 col-start-3 justify-self-end md:col-span-6 md:col-start-7">
          <ul className="flex gap-6">
            {site.nav.map((item) => (
              <li key={item.href} className="hidden md:block">
                <a href={item.href} className="label text-muted transition-colors duration-300 hover:text-accent">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </header>

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
    </>
  )
}
