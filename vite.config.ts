import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// fileURLToPath, not URL.pathname: the latter leaves spaces as %20
const here = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// Facts for the "This Very Website" card. CI checks out full history
// (fetch-depth: 0 in deploy.yml) so the commit count is real.
const git = (cmd: string) => {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}
const build = { commits: Number(git('rev-list --count HEAD')) || 0, date: new Date().toISOString() }

// User site on GitHub Pages (rohanreddybandi.github.io), so it's served from the root.
export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  define: {
    // Resume links only render once public/resume.pdf exists, so the live
    // site never links to a 404. (Restart the dev server after adding it.)
    __HAS_RESUME__: JSON.stringify(existsSync(here('./public/resume.pdf'))),
    __BUILD__: JSON.stringify(build),
  },
  build: {
    rolldownOptions: {
      // GitHub Pages serves 404.html for any path that doesn't exist
      input: { main: here('./index.html'), notFound: here('./404.html') },
    },
  },
})
