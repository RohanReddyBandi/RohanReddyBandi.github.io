import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startSmoothScroll } from './lib/motion'
import { fontsLoaded, markPageReady } from './lib/sequence'
import './styles/global.css'

startSmoothScroll()
fontsLoaded().then(markPageReady)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
