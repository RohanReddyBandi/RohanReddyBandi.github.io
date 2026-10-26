import { existsSync } from 'node:fs'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// User site on GitHub Pages (rohanreddybandi.github.io), so it's served from the root.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  define: {
    // Resume links only render once public/resume.pdf exists, so the live
    // site never links to a 404. (Restart the dev server after adding it.)
    __HAS_RESUME__: JSON.stringify(existsSync(new URL('./public/resume.pdf', import.meta.url))),
  },
})
