import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// fileURLToPath, not URL.pathname: the latter leaves spaces as %20
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// User site on GitHub Pages (rohanreddybandi.github.io), so it's served from the root.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  define: {
    // Resume links only render once public/resume.pdf exists, so the live
    // site never links to a 404. (Restart the dev server after adding it.)
    __HAS_RESUME__: JSON.stringify(existsSync(here('./public/resume.pdf'))),
  },
  build: {
    rolldownOptions: {
      // GitHub Pages serves 404.html for any path that doesn't exist
      input: { main: here('./index.html'), notFound: here('./404.html') },
    },
  },
})
