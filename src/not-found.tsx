import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { site } from './content/site'
import './styles/global.css'

// 404: the same quiet column, a short note and a way home.

function NotFound() {
  return (
    <main className="nf column">
      <a href="/" className="topbar__logo" aria-label={`${site.name.first} ${site.name.last}, home`}>
        {site.initials}
      </a>
      <p className="hand mt-16 text-2xl text-accent">hmm, nothing here</p>
      <h1 className="nf__title">Page not found.</h1>
      <p className="mt-3 text-muted">This page doesn’t exist, or it moved.</p>
      <a className="nf__home" href="/">
        ← Back home
      </a>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NotFound />
  </StrictMode>,
)
