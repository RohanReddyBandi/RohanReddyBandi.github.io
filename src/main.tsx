import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startSmoothScroll } from './lib/motion'
import { fontsLoaded, introWillPlay, markPageReady } from './lib/sequence'
import './styles/global.css'

startSmoothScroll()
// With the intro, its wipe sets the page off instead
if (!introWillPlay) fontsLoaded().then(markPageReady)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
