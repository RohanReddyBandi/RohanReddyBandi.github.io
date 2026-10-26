import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { site } from './content/site'
import './styles/global.css'

// 404: the site's type and grid, a big outlined 404 behind, and a way home.

function NotFound() {
  return (
    <main className="nf">
      <span className="nf__ghost" aria-hidden="true">
        404
      </span>

      <header className="site-grid py-5">
        <a href="/" className="topbar__logo col-span-2" aria-label={`${site.name.first} ${site.name.last}, home`}>
          {site.initials}
        </a>
      </header>

      <div className="nf__body site-grid">
        <p className="label col-span-full text-accent">Error 404</p>
        <h1 className="nf__title col-span-full">
          Page
          <br />
          not found.
        </h1>
        <p className="col-span-full mt-6 max-w-[34ch] text-lead text-muted md:col-span-6">
          This page doesn’t exist, or it moved.
        </p>
        <div className="col-span-full mt-10">
          <a className="btn" href="/">
            <span>Back home</span>
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </div>
      <div className="grain" aria-hidden="true" />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotFound />
  </StrictMode>,
)
